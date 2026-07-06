import { Controller } from "@hotwired/stimulus"
import { LM, calcEAR, calcGazeOnScreen, calcHeadStable } from "focus/landmarks"
import { computeMetrics, calcScore, classifyState, EAR_CLOSED_THRESH, isFaceTemporarilyAbsent } from "focus/score"
import { aggregateSession } from "focus/aggregate"

const WINDOW_MS = 30000
const PULSE_MAX_POINTS = 72
const CAMERA_DEVICE_COOKIE = "focus_pulse_camera_device_id"
const CAMERA_DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

// 映像解析はブラウザ内で完結し、終了時に集計値だけをPOSTする。
export default class extends Controller {
  static targets = ["video", "canvas", "score", "state", "stopBtn", "placeholder", "message", "cameraSelect", "pulseCanvas", "blinkCount", "sessionAverage", "interventionSelect"]
  static values = { taskId: Number, createUrl: String }

  connect() {
    this.frameBuffer = []
    this.samples = []
    this.pulsePoints = []
    this.blinkCount = 0
    this.eyeClosed = false
    this.running = false
    this.sessionId = null
    this.autosaveTick = null
    this.selectedDeviceId = this.readCookie(CAMERA_DEVICE_COOKIE)
    this.ctx = this.canvasTarget.getContext("2d")
    this.pulseCtx = this.pulseCanvasTarget.getContext("2d")
    this.drawIdleCanvas()
    this.drawPulseGraph()
    this.start()
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

      await this.populateCameraOptions()
      await this.startVideoStream(this.selectedDeviceId)
      await this.populateCameraOptions()

      this.running = true
      this.startedAt = new Date()
      await this.createSession()
      this.frameBuffer = []
      this.samples = []
      this.blinkCount = 0
      this.eyeClosed = false
      this.updateBlinkCount()
      this.updateSessionAverage()
      this.stopBtnTarget.disabled = false
      this.placeholderTarget.hidden = true
      this.messageTarget.textContent = "計測中です。映像は端末内でのみ解析されます。"
      this.tick = setInterval(() => this.sampleOnce(), 1000)
      this.autosaveTick = setInterval(() => this.saveProgress(), 15000)
    } catch (error) {
      this.messageTarget.textContent = `カメラを開始できません: ${error.message}`
      this.shutdown()
    }
  }

  async populateCameraOptions() {
    if (!navigator.mediaDevices?.enumerateDevices) return

    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((device) => device.kind === "videoinput")
    this.cameraSelectTarget.innerHTML = ""

    if (cameras.length === 0) {
      this.cameraSelectTarget.append(new Option("利用できるカメラがありません", ""))
      this.cameraSelectTarget.disabled = true
      return
    }

    cameras.forEach((camera, index) => {
      const label = camera.label || `カメラ ${index + 1}`
      this.cameraSelectTarget.append(new Option(label, camera.deviceId))
    })

    if (!this.selectedDeviceId || !cameras.some((camera) => camera.deviceId === this.selectedDeviceId)) {
      this.selectedDeviceId = cameras[0].deviceId
    }

    this.cameraSelectTarget.value = this.selectedDeviceId
    this.cameraSelectTarget.disabled = cameras.length <= 1
  }

  async startVideoStream(deviceId = null) {
    this.stopVideoStream()

    const video = deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
      : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }

    const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false })
    this.videoTarget.srcObject = stream
    await this.videoTarget.play()

    const track = stream.getVideoTracks()[0]
    this.selectedDeviceId = track?.getSettings?.().deviceId || deviceId
    if (this.selectedDeviceId) this.writeCookie(CAMERA_DEVICE_COOKIE, this.selectedDeviceId, CAMERA_DEVICE_COOKIE_MAX_AGE)

    this.camera = new Camera(this.videoTarget, {
      onFrame: async () => {
        await this.faceMesh.send({ image: this.videoTarget })
      },
      width: 640,
      height: 480,
    })
    this.camera.start()
  }

  async changeCamera() {
    const deviceId = this.cameraSelectTarget.value
    if (!deviceId || deviceId === this.selectedDeviceId) return

    this.selectedDeviceId = deviceId
    this.messageTarget.textContent = "カメラを切り替えています..."
    this.cameraSelectTarget.disabled = true

    try {
      await this.startVideoStream(deviceId)
      await this.populateCameraOptions()
      this.writeCookie(CAMERA_DEVICE_COOKIE, this.selectedDeviceId, CAMERA_DEVICE_COOKIE_MAX_AGE)
      this.messageTarget.textContent = "計測中です。映像は端末内でのみ解析されます。"
    } catch (error) {
      this.messageTarget.textContent = `カメラを切り替えられません: ${error.message}`
      await this.populateCameraOptions()
    }
  }

  onResults(results) {
    this.drawPrivacySurface()

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
      this.detectBlink((earLeft + earRight) / 2)
      this.drawLandmarks(lms)
    }

    const now = Date.now()
    this.frameBuffer.push({ ts: now, ...frame })
    const cutoff = now - WINDOW_MS
    this.frameBuffer = this.frameBuffer.filter((f) => f.ts >= cutoff)
  }

  sampleOnce() {
    if (isFaceTemporarilyAbsent(this.frameBuffer)) {
      this.scoreTarget.textContent = "--"
      this.stateTarget.textContent = this.stateLabel("interrupted")
      this.stateTarget.dataset.state = "interrupted"
      return
    }

    const metrics = computeMetrics(this.frameBuffer)
    if (!metrics) return

    const score = calcScore(metrics)
    const state = classifyState(score, metrics.facePresent)
    this.samples.push({ score, state, metrics })
    this.updateSessionAverage()
    this.pulsePoints.push(score)
    if (this.pulsePoints.length > PULSE_MAX_POINTS) this.pulsePoints.shift()
    this.scoreTarget.textContent = score
    this.stateTarget.textContent = this.stateLabel(state)
    this.stateTarget.dataset.state = state
    this.drawPulseGraph()
  }

  // EARの立ち下がり（開→閉）エッジで瞬きを1回カウントする。
  // 閉/開の閾値に差（ヒステリシス）を持たせ、境界付近のチャタリングで多重カウントしないようにする。
  detectBlink(ear) {
    const EAR_OPEN_THRESH = EAR_CLOSED_THRESH + 0.04

    if (!this.eyeClosed && ear < EAR_CLOSED_THRESH) {
      this.eyeClosed = true
      this.blinkCount += 1
      this.updateBlinkCount()
    } else if (this.eyeClosed && ear > EAR_OPEN_THRESH) {
      this.eyeClosed = false
    }
  }

  updateBlinkCount() {
    if (this.hasBlinkCountTarget) this.blinkCountTarget.textContent = this.blinkCount
  }

  updateSessionAverage() {
    if (!this.hasSessionAverageTarget) return

    if (this.samples.length === 0) {
      this.sessionAverageTarget.textContent = "--"
      return
    }

    const total = this.samples.reduce((sum, sample) => sum + sample.score, 0)
    const average = Math.round(total / this.samples.length)
    this.sessionAverageTarget.textContent = average
  }

  async createSession() {
    const response = await fetch(this.createUrlValue, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: { started_at: this.startedAt.toISOString() } }),
    })

    if (!response.ok) throw new Error("セッションを開始できません")

    const body = await response.json()
    this.sessionId = body.id
  }

  // 計測画面で選択中の施策ID。未選択（空文字）はnullを送り、セッションの紐付けを外す
  selectedInterventionId() {
    if (!this.hasInterventionSelectTarget) return null
    const value = this.interventionSelectTarget.value
    return value === "" ? null : Number(value)
  }

  async saveProgress({ completed = false } = {}) {
    if (!this.sessionId || !this.startedAt) return true

    const now = new Date()
    const payload = aggregateSession(this.samples, this.startedAt, now)
    payload.intervention_id = this.selectedInterventionId()
    if (completed) {
      payload.status = "completed"
      payload.ended_reason = "stopped"
      payload.ended_at = now.toISOString()
    }

    const response = await fetch(`${this.createUrlValue}/${this.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: payload }),
    })

    return response.ok
  }

  async stop() {
    if (!this.startedAt) return

    this.shutdown()
    this.stopBtnTarget.disabled = true
    this.messageTarget.textContent = "保存中です..."

    const saved = await this.saveProgress({ completed: true })

    if (saved) {
      window.location.href = "/tasks"
    } else {
      this.messageTarget.textContent = "保存に失敗しました。ページを再読み込みしてもう一度試してください。"
    }
  }

  shutdown() {
    this.running = false
    if (this.tick) clearInterval(this.tick)
    this.tick = null
    if (this.autosaveTick) clearInterval(this.autosaveTick)
    this.autosaveTick = null
    this.stopVideoStream()
    if (this.hasStopBtnTarget) this.stopBtnTarget.disabled = true
    if (this.hasPlaceholderTarget) this.placeholderTarget.hidden = false
    if (this.hasCameraSelectTarget) this.cameraSelectTarget.disabled = true
  }

  stopVideoStream() {
    if (this.camera) this.camera.stop()
    this.camera = null
    if (this.videoTarget.srcObject) {
      this.videoTarget.srcObject.getTracks().forEach((track) => track.stop())
      this.videoTarget.srcObject = null
    }
  }

  readCookie(name) {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${encodeURIComponent(name)}=`))
    return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null
  }

  writeCookie(name, value, maxAge) {
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`
  }

  drawPrivacySurface() {
    this.syncCanvasSize()
    this.ctx.fillStyle = "#111720"
    this.ctx.fillRect(0, 0, this.canvasTarget.width, this.canvasTarget.height)
  }

  drawIdleCanvas() {
    this.ctx.fillStyle = "#111720"
    this.ctx.fillRect(0, 0, this.canvasTarget.width, this.canvasTarget.height)
  }

  drawPulseGraph() {
    const canvas = this.pulseCanvasTarget
    const ctx = this.pulseCtx
    const width = canvas.width
    const height = canvas.height
    const pad = 10

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#111720"
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = "rgba(42, 49, 60, 0.9)"
    ctx.lineWidth = 1
    for (let x = 0; x <= width; x += 24) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += 24) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    if (this.pulsePoints.length === 0) {
      ctx.fillStyle = "rgba(130, 140, 155, 0.8)"
      ctx.font = "12px JetBrains Mono, monospace"
      ctx.fillText("WAITING", pad, height / 2 + 4)
      return
    }

    ctx.beginPath()
    this.pulsePoints.forEach((score, index) => {
      const x = pad + (index / Math.max(PULSE_MAX_POINTS - 1, 1)) * (width - pad * 2)
      const normalized = Math.max(0, Math.min(1, score / 100))
      const beat = index % 9 === 0 ? -10 : index % 9 === 1 ? 8 : 0
      const y = height - pad - normalized * (height - pad * 2) + beat
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = "#2dd4a7"
    ctx.lineWidth = 2
    ctx.shadowColor = "rgba(45, 212, 167, 0.65)"
    ctx.shadowBlur = 8
    ctx.stroke()
    ctx.shadowBlur = 0
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
    return { high: "High", medium: "Medium", low: "Low", away: "Away", interrupted: "検出中断" }[state] || "--"
  }
}
