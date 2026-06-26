import { Controller } from "@hotwired/stimulus"
import { LM, calcEAR, calcGazeOnScreen, calcHeadStable } from "focus/landmarks"
import { computeMetrics, calcScore, classifyState } from "focus/score"
import { aggregateSession } from "focus/aggregate"

const WINDOW_MS = 30000

// 映像解析はブラウザ内で完結し、終了時に集計値だけをPOSTする。
export default class extends Controller {
  static targets = ["video", "canvas", "score", "state", "startBtn", "stopBtn", "placeholder", "message"]
  static values = { taskId: Number, createUrl: String }

  connect() {
    this.frameBuffer = []
    this.samples = []
    this.running = false
    this.ctx = this.canvasTarget.getContext("2d")
    this.drawIdleCanvas()
  }

  disconnect() {
    this.shutdown()
  }

  async start() {
    if (this.running) return

    try {
      this.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      })
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      this.faceMesh.onResults((results) => this.onResults(results))

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      this.videoTarget.srcObject = stream
      await this.videoTarget.play()

      this.camera = new Camera(this.videoTarget, {
        onFrame: async () => {
          await this.faceMesh.send({ image: this.videoTarget })
        },
        width: 640,
        height: 480,
      })
      this.camera.start()

      this.running = true
      this.startedAt = new Date()
      this.frameBuffer = []
      this.samples = []
      this.startBtnTarget.disabled = true
      this.stopBtnTarget.disabled = false
      this.placeholderTarget.hidden = true
      this.messageTarget.textContent = "計測中です。映像は端末内でのみ解析されます。"
      this.tick = setInterval(() => this.sampleOnce(), 1000)
    } catch (error) {
      this.messageTarget.textContent = `カメラを開始できません: ${error.message}`
      this.shutdown()
    }
  }

  onResults(results) {
    this.drawFrame(results.image)

    const lms = results.multiFaceLandmarks && results.multiFaceLandmarks[0]
    const faceDetected = Boolean(lms)
    let frame = { faceDetected, gazeOnScreen: 0, headStable: 0, earLeft: 0, earRight: 0 }

    if (faceDetected) {
      const earLeft = calcEAR(lms, LM.leftEye)
      const earRight = calcEAR(lms, LM.rightEye)
      frame = {
        faceDetected: true,
        gazeOnScreen: calcGazeOnScreen(lms),
        headStable: calcHeadStable(lms),
        earLeft,
        earRight,
      }
      this.drawLandmarks(lms)
    }

    const now = Date.now()
    this.frameBuffer.push({ ts: now, ...frame })
    const cutoff = now - WINDOW_MS
    this.frameBuffer = this.frameBuffer.filter((f) => f.ts >= cutoff)
  }

  sampleOnce() {
    const metrics = computeMetrics(this.frameBuffer)
    if (!metrics) return

    const score = calcScore(metrics)
    const state = classifyState(score, metrics.facePresent)
    this.samples.push({ score, state })
    this.scoreTarget.textContent = score
    this.stateTarget.textContent = this.stateLabel(state)
    this.stateTarget.dataset.state = state
  }

  async stop() {
    if (!this.startedAt) return

    const payload = aggregateSession(this.samples, this.startedAt, new Date())
    this.shutdown()
    this.stopBtnTarget.disabled = true
    this.messageTarget.textContent = "保存中です..."

    const response = await fetch(this.createUrlValue, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: payload }),
    })

    if (response.ok) {
      window.location.href = "/tasks"
    } else {
      this.startBtnTarget.disabled = false
      this.messageTarget.textContent = "保存に失敗しました。もう一度試してください。"
    }
  }

  shutdown() {
    this.running = false
    if (this.tick) clearInterval(this.tick)
    this.tick = null
    if (this.camera) this.camera.stop()
    this.camera = null
    if (this.videoTarget.srcObject) {
      this.videoTarget.srcObject.getTracks().forEach((track) => track.stop())
      this.videoTarget.srcObject = null
    }
    if (this.hasStartBtnTarget) this.startBtnTarget.disabled = false
    if (this.hasStopBtnTarget) this.stopBtnTarget.disabled = true
    if (this.hasPlaceholderTarget) this.placeholderTarget.hidden = false
  }

  drawFrame(image) {
    if (!image) return
    this.syncCanvasSize()
    this.ctx.save()
    this.ctx.scale(-1, 1)
    this.ctx.translate(-this.canvasTarget.width, 0)
    this.ctx.drawImage(image, 0, 0, this.canvasTarget.width, this.canvasTarget.height)
    this.ctx.restore()
  }

  drawIdleCanvas() {
    this.ctx.fillStyle = "#111720"
    this.ctx.fillRect(0, 0, this.canvasTarget.width, this.canvasTarget.height)
  }

  drawLandmarks(lm) {
    const w = this.canvasTarget.width
    const h = this.canvasTarget.height
    const drawPoint = (idx, size, color) => {
      const x = (1 - lm[idx].x) * w
      const y = lm[idx].y * h
      this.ctx.beginPath()
      this.ctx.arc(x, y, size, 0, Math.PI * 2)
      this.ctx.fillStyle = color
      this.ctx.fill()
    }

    drawPoint(LM.leftIris, 4, "#2dd4a7")
    drawPoint(LM.rightIris, 4, "#2dd4a7")
    drawPoint(LM.nose, 3, "rgba(242, 245, 248, 0.75)")
  }

  syncCanvasSize() {
    const width = this.videoTarget.videoWidth || 640
    const height = this.videoTarget.videoHeight || 480
    if (this.canvasTarget.width !== width) this.canvasTarget.width = width
    if (this.canvasTarget.height !== height) this.canvasTarget.height = height
  }

  stateLabel(state) {
    return { high: "High", medium: "Medium", low: "Low", away: "Away" }[state] || "--"
  }
}
