import { Controller } from "@hotwired/stimulus"
import { LM, calcEAR, calcGazeOnScreen, calcHeadStable } from "focus/landmarks"
import { computeMetrics, calcScore, classifyState, EAR_CLOSED_THRESH, isFaceTemporarilyAbsent } from "focus/score"
import { aggregateSession, averageFocusableScore, focusVolume } from "focus/aggregate"
import { faceAbsenceDeadlineMs, faceReturnState, isFrameFresh } from "focus/absence_timeout"
import { MediaPipeFrameLoop } from "focus/media_pipe_frame_loop"
import { SerialQueue } from "focus/serial_queue"

const WINDOW_MS = 30000
// スコア推移グラフは「直近30分」を実時間で描く。各サンプルは記録時刻(t)を持つ。
const TREND_WINDOW_MS = 30 * 60 * 1000
// サンプル間隔(=1秒)より十分大きい間隔が空いたら「離席などで途切れた」とみなし線を分割する
const TREND_GAP_MS = 5000
// メモリ上限（1秒1点で30分ぶん + 余裕）。実際の可視範囲は t で判定する
const SCORE_HISTORY_MAX_POINTS = 30 * 60 + 60
const CAMERA_DEVICE_COOKIE = "matatakuma_camera_device_id"
const CAMERA_DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

// 映像解析はブラウザ内で完結し、終了時に集計値だけをPOSTする。
export default class extends Controller {
  static targets = ["video", "canvas", "score", "state", "stopBtn", "resumeBtn", "placeholder", "message", "cameraSelect", "pulseCanvas", "blinkCount", "sessionAverage", "miniSessionAverage", "sessionElapsed", "miniStatus", "interventionSelect", "dailyDuration", "dailyFocusVolume", "dailyAverage", "taskMeasurementStatus", "taskStopBtn", "taskResumeBtn"]
  static values = {
    taskId: Number,
    createUrl: String,
    dailyBaseDurationSec: Number,
    dailyBaseVolume: Number,
    dailyBaseScoreSum: Number,
    dailyBaseSessionCount: Number,
  }

  connect() {
    this.frameBuffer = []
    this.samples = []
    this.scoreHistory = []
    this.blinkCount = 0
    this.eyeClosed = false
    this.running = false
    this.stopping = false
    this.waitingForReturn = false
    this.restarting = false
    this.restartFailed = false
    this.sessionId = null
    this.faceAbsentSinceMs = null
    this.faceDetectedSinceMs = null
    this.lastReturnFrameAtMs = null
    this.autosaveTick = null
    this.frameLoop = null
    this.frameLoopDrainPromise = null
    this.cameraStartGeneration = 0
    this.saveQueue = new SerialQueue()
    this.debugMode = this.isDebugModeEnabled()
    this.debugRows = {}
    this.selectedDeviceId = this.readCookie(CAMERA_DEVICE_COOKIE)
    this.ctx = this.canvasTarget.getContext("2d")
    this.pulseCtx = this.pulseCanvasTarget.getContext("2d")
    this.drawIdleCanvas()
    this.drawScoreTrend()
    this.initDebugPanel()
    // ウィンドウ幅・高さの変化でパルスチャートを描き直す（表示サイズ追従）
    this.onResize = () => this.drawScoreTrend()
    window.addEventListener("resize", this.onResize)
    this.onVisibilityChange = () => {
      if (this.frameLoop) this.frameLoop.setBackground(document.hidden)
    }
    document.addEventListener("visibilitychange", this.onVisibilityChange)
    this.start()
  }

  disconnect() {
    if (this.onResize) window.removeEventListener("resize", this.onResize)
    if (this.onVisibilityChange) document.removeEventListener("visibilitychange", this.onVisibilityChange)
    this.shutdown()
  }

  async start() {
    if (this.running) return

    const initialCameraGeneration = this.cameraStartGeneration
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
      this.assertCameraStartCurrent(initialCameraGeneration)
      const cameraGeneration = await this.startVideoStream(this.selectedDeviceId)
      await this.populateCameraOptions()
      this.assertCameraStartCurrent(cameraGeneration)

      this.running = true
      await this.beginSession()
      this.tick = setInterval(() => this.sampleOnce(), 1000)
    } catch (error) {
      if (error.name === "AbortError") return
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
    const generation = ++this.cameraStartGeneration
    await this.stopVideoStream({ cancelPendingStart: false })
    this.assertCameraStartCurrent(generation)

    const video = deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
      : { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }

    let stream = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video, audio: false })
      this.assertCameraStartCurrent(generation)
      this.videoTarget.srcObject = stream
      await this.videoTarget.play()
      this.assertCameraStartCurrent(generation)

      const track = stream.getVideoTracks()[0]
      this.selectedDeviceId = track?.getSettings?.().deviceId || deviceId
      if (this.selectedDeviceId) this.writeCookie(CAMERA_DEVICE_COOKIE, this.selectedDeviceId, CAMERA_DEVICE_COOKIE_MAX_AGE)

      this.frameBuffer = []
      this.frameLoop = new MediaPipeFrameLoop({
        onFrame: async () => {
          if (generation !== this.cameraStartGeneration) return
          await this.faceMesh.send({ image: this.videoTarget })
        },
        onError: (error) => console.error("MediaPipe frame processing failed", error),
      })
      this.frameLoop.setBackground(document.hidden)
      this.frameLoop.start()
      return generation
    } catch (error) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        if (this.videoTarget.srcObject === stream) this.videoTarget.srcObject = null
      }
      if (generation !== this.cameraStartGeneration) this.assertCameraStartCurrent(generation)
      throw error
    }
  }

  assertCameraStartCurrent(generation) {
    if (generation === this.cameraStartGeneration) return

    const error = new Error("Camera start cancelled")
    error.name = "AbortError"
    throw error
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
      this.messageTarget.textContent = this.waitingForReturn
        ? "離席によりセッションを区切りました。復帰すると自動で計測を再開します。"
        : "計測中です。映像は端末内でのみ解析されます。"
    } catch (error) {
      if (error.name === "AbortError") return
      this.messageTarget.textContent = `カメラを切り替えられません: ${error.message}`
      await this.populateCameraOptions()
    }
  }

  onResults(results) {
    this.drawPrivacySurface()

    const lms = results.multiFaceLandmarks && results.multiFaceLandmarks[0]
    const faceDetected = Boolean(lms)
    let frame = { faceDetected, gazeOnScreen: 0, headStable: 0, earLeft: 0, earRight: 0, avgEar: 0 }

    if (faceDetected) {
      const earLeft = calcEAR(lms, LM.leftEye)
      const earRight = calcEAR(lms, LM.rightEye)
      const avgEar = (earLeft + earRight) / 2
      frame = {
        faceDetected: true,
        gazeOnScreen: calcGazeOnScreen(lms),
        headStable: calcHeadStable(lms),
        earLeft,
        earRight,
        avgEar,
      }
      if (!this.waitingForReturn && !this.restarting && !this.stopping) this.detectBlink(avgEar)
      this.drawLandmarks(lms)
    }

    const now = Date.now()
    const latestFrame = this.frameBuffer[this.frameBuffer.length - 1]
    if (!isFrameFresh(latestFrame, now)) this.frameBuffer = []
    if (this.waitingForReturn && !this.restarting && !this.restartFailed && !this.stopping) {
      const returnState = faceReturnState({
        faceDetected,
        faceDetectedSinceMs: this.faceDetectedSinceMs,
        lastFrameAtMs: this.lastReturnFrameAtMs,
        nowMs: now,
      })
      this.faceDetectedSinceMs = returnState.faceDetectedSinceMs
      this.lastReturnFrameAtMs = now
      if (returnState.confirmed) void this.restartAfterAbsence()
    } else if (!this.waitingForReturn) {
      if (faceDetected) {
        this.faceAbsentSinceMs = null
      } else if (!Number.isFinite(this.faceAbsentSinceMs)) {
        this.faceAbsentSinceMs = now
      }
    }
    this.frameBuffer.push({ ts: now, ...frame })
    const cutoff = now - WINDOW_MS
    this.frameBuffer = this.frameBuffer.filter((f) => f.ts >= cutoff)
  }

  sampleOnce() {
    if (this.waitingForReturn || this.restarting || this.stopping) return
    const now = Date.now()
    if (this.endIfFaceAbsentTooLong(now)) return

    this.updateDailyStatus()

    const latestFrame = this.frameBuffer[this.frameBuffer.length - 1]
    if (!isFrameFresh(latestFrame, now) || isFaceTemporarilyAbsent(this.frameBuffer)) {
      this.scoreTarget.textContent = "—"
      this.scoreTarget.dataset.state = "interrupted"
      this.stateTarget.textContent = this.stateLabel("interrupted")
      this.stateTarget.dataset.state = "interrupted"
      this.updateDebugPanel({ interrupted: true })
      return
    }

    const metrics = computeMetrics(this.frameBuffer)
    if (!metrics) {
      this.updateDebugPanel({ waiting: true })
      return
    }

    const score = calcScore(metrics)
    const state = classifyState(score, metrics.facePresent)
    this.samples.push({ score, state, metrics })
    this.updateSessionAverage()
    // 記録時刻つきで保持し、グラフは実時間で描く（離席で途切れた区間も正しく空く）
    this.scoreHistory.push({ t: now, score })
    // 直近30分より古いサンプルは捨てる（安全のため件数上限も併用）
    while (
      this.scoreHistory.length > 0 &&
      (now - this.scoreHistory[0].t > TREND_WINDOW_MS || this.scoreHistory.length > SCORE_HISTORY_MAX_POINTS)
    ) {
      this.scoreHistory.shift()
    }
    this.scoreTarget.textContent = score
    this.scoreTarget.dataset.state = state
    this.stateTarget.textContent = this.stateLabel(state)
    this.stateTarget.dataset.state = state
    this.drawScoreTrend()
    this.updateDebugPanel({ score, state, metrics })
  }

  endIfFaceAbsentTooLong(nowMs = Date.now()) {
    if (!this.startedAt || this.stopping || this.waitingForReturn) return false

    const latestFrame = this.frameBuffer[this.frameBuffer.length - 1]
    const deadlineMs = faceAbsenceDeadlineMs({
      sessionStartedAtMs: this.startedAt.getTime(),
      latestFrame,
      faceAbsentSinceMs: this.faceAbsentSinceMs,
      nowMs,
    })
    if (deadlineMs === null || nowMs < deadlineMs) return false

    void this.stopForAbsence(new Date(deadlineMs))
    return true
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
    if (!this.hasSessionAverageTarget && !this.hasMiniSessionAverageTarget) return

    if (this.samples.length === 0) {
      if (this.hasSessionAverageTarget) this.sessionAverageTarget.textContent = "--"
      if (this.hasMiniSessionAverageTarget) this.miniSessionAverageTarget.textContent = "--"
      return
    }

    const average = averageFocusableScore(this.samples)
    if (this.hasSessionAverageTarget) this.sessionAverageTarget.textContent = average
    if (this.hasMiniSessionAverageTarget) this.miniSessionAverageTarget.textContent = average
  }

  // 本日ステータスバーを「保存済みセッションの集計＋計測中セッションの見込み値」で更新する。
  // 計測中セッションは、離席を除いた1秒ごとのスコア累計から算出する
  updateDailyStatus() {
    if (!this.startedAt) return

    const elapsedSec = Math.max(0, Math.floor((Date.now() - this.startedAt.getTime()) / 1000))
    if (this.hasSessionElapsedTarget) this.sessionElapsedTarget.textContent = this.formatDuration(elapsedSec)
    if (!this.hasDailyDurationTarget) return

    const currentAvg = this.samples.length > 0 ? averageFocusableScore(this.samples) : null

    this.dailyDurationTarget.textContent = this.formatDuration(this.dailyBaseDurationSecValue + elapsedSec)

    const count = this.dailyBaseSessionCountValue + (currentAvg === null ? 0 : 1)
    if (count === 0) {
      this.dailyFocusVolumeTarget.textContent = "--"
      this.dailyAverageTarget.textContent = "--"
      return
    }

    // 離席サンプルは総量へ加算しない。未検出でサンプル自体がない時間も増えない。
    const currentVolume = focusVolume(this.samples)
    this.dailyFocusVolumeTarget.textContent = this.formatFocusVolume(this.dailyBaseVolumeValue + currentVolume)

    const scoreSum = this.dailyBaseScoreSumValue + (currentAvg ?? 0)
    this.dailyAverageTarget.textContent = String(Math.round(scoreSum / count))
  }

  // 秒数を H:MM:SS へ整形（ApplicationHelper#format_duration と同じ表記）
  formatDuration(totalSec) {
    const sec = Math.floor(totalSec)
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // 1000以上を k / 1000000以上を m 表記（ApplicationHelper#format_focus_volume と同じ表記）
  formatFocusVolume(value) {
    if (Math.abs(value) >= 1_000_000) return `${Math.round((value / 1_000_000) * 10) / 10}m`
    if (Math.abs(value) >= 1_000) return `${Math.round((value / 1_000) * 10) / 10}k`
    return String(Math.round(value))
  }

  isDebugModeEnabled() {
    const params = new URLSearchParams(window.location.search)
    const debug = params.get("debug")
    return debug === "1" || debug === "true"
  }

  initDebugPanel() {
    if (!this.debugMode) return

    const panel = document.createElement("section")
    panel.className = "measure-debug"
    panel.setAttribute("aria-label", "デバッグ指標")

    const title = document.createElement("div")
    title.className = "measure-debug__title"
    title.textContent = "DEBUG"
    panel.append(title)

    const rows = [
      ["score", "Score (総合スコア)"],
      ["state", "State (状態)"],
      ["facePresent", "Face (顔検出率)"],
      ["gazeOnScreen", "Gaze (視線)"],
      ["headStable", "Head (頭部安定)"],
      ["blinkNormal", "Blink (瞬き正常度)"],
      ["sessionContinuity", "Continuity (継続度)"],
      ["closedEyesDurationMs", "Closed eyes (閉眼時間)"],
      ["avgEar", "EAR (目の開き)"],
      ["blinkCount", "Blinks (瞬き回数)"],
      ["frameCount", "Frames (計測フレーム)"],
    ]

    rows.forEach(([key, label]) => {
      const row = document.createElement("div")
      row.className = "measure-debug__row"

      const labelEl = document.createElement("span")
      labelEl.textContent = label

      const valueEl = document.createElement("strong")
      valueEl.setAttribute("data-measure-debug-key", key)
      valueEl.textContent = "--"

      row.append(labelEl, valueEl)
      panel.append(row)
      this.debugRows[key] = valueEl
    })

    const scorePanel = this.stateTarget.closest(".measure-score") || this.element
    scorePanel.append(panel)
  }

  updateDebugPanel({ score = null, state = null, metrics = null, interrupted = false, waiting = false } = {}) {
    if (!this.debugMode) return

    const latestFrame = this.frameBuffer[this.frameBuffer.length - 1]
    const fallbackState = interrupted ? "interrupted" : waiting ? "waiting" : state
    const values = {
      score: interrupted || waiting ? "--" : score,
      state: fallbackState ? this.stateLabel(fallbackState) : "--",
      facePresent: metrics ? this.formatRatio(metrics.facePresent) : "--",
      gazeOnScreen: metrics ? this.formatRatio(metrics.gazeOnScreen) : "--",
      headStable: metrics ? this.formatRatio(metrics.headStable) : "--",
      blinkNormal: metrics ? this.formatRatio(metrics.blinkNormal) : "--",
      sessionContinuity: metrics ? this.formatRatio(metrics.sessionContinuity) : "--",
      closedEyesDurationMs: metrics ? `${Math.round(metrics.closedEyesDurationMs)}ms` : "--",
      avgEar: latestFrame?.faceDetected ? this.formatNumber(latestFrame.avgEar, 3) : "--",
      blinkCount: this.blinkCount,
      frameCount: this.frameBuffer.length,
    }

    Object.entries(values).forEach(([key, value]) => {
      if (this.debugRows[key]) this.debugRows[key].textContent = value
    })
  }

  formatRatio(value) {
    return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "--"
  }

  formatNumber(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : "--"
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

  resetSessionMeasurements(startedAt = new Date()) {
    this.startedAt = startedAt
    this.sessionId = null
    this.frameBuffer = []
    this.samples = []
    this.scoreHistory = []
    this.blinkCount = 0
    this.eyeClosed = false
    this.faceAbsentSinceMs = null
    this.faceDetectedSinceMs = null
    this.lastReturnFrameAtMs = null
    this.updateBlinkCount()
    this.updateSessionAverage()
    this.miniStatusTarget.textContent = "計測中"
    this.sessionElapsedTarget.textContent = "0:00:00"
    this.scoreTarget.textContent = "—"
    delete this.scoreTarget.dataset.state
    this.stateTarget.textContent = "待機中"
    delete this.stateTarget.dataset.state
    this.drawScoreTrend()
  }

  async beginSession() {
    this.resetSessionMeasurements()
    await this.createSession()
    this.waitingForReturn = false
    this.restarting = false
    this.restartFailed = false
    this.stopping = false
    this.stopBtnTarget.disabled = false
    this.stopBtnTarget.hidden = false
    this.resumeBtnTarget.hidden = true
    this.resumeBtnTarget.disabled = false
    this.taskMeasurementStatusTarget.textContent = "計測中"
    this.taskStopBtnTarget.hidden = false
    this.taskStopBtnTarget.disabled = false
    this.taskResumeBtnTarget.hidden = true
    this.taskResumeBtnTarget.disabled = false
    this.placeholderTarget.hidden = true
    this.messageTarget.textContent = "計測中です。映像は端末内でのみ解析されます。"
    this.autosaveTick = setInterval(() => this.saveProgress(), 15000)
  }

  async restartAfterAbsence() {
    if (!this.waitingForReturn || this.restarting || this.stopping) return

    this.restarting = true
    this.messageTarget.textContent = "復帰を検出しました。新しいセッションを開始しています..."

    try {
      await this.beginSession()
    } catch (error) {
      this.startedAt = null
      this.sessionId = null
      this.restarting = false
      this.restartFailed = true
      this.faceDetectedSinceMs = null
      this.messageTarget.textContent = `セッションを自動再開できません: ${error.message}。ページを再読み込みしてください。`
    }
  }

  // 計測画面で選択中の施策ID。未選択（空文字）はnullを送り、セッションの紐付けを外す
  selectedInterventionId() {
    if (!this.hasInterventionSelectTarget) return null
    const value = this.interventionSelectTarget.value
    return value === "" ? null : Number(value)
  }

  saveProgress({ completed = false, interrupted = false, endedAt = null } = {}) {
    if (!this.sessionId || !this.startedAt) return Promise.resolve(true)

    const now = endedAt || new Date()
    const payload = aggregateSession(this.samples, this.startedAt, now)
    const updateUrl = `${this.createUrlValue}/${this.sessionId}`
    payload.intervention_id = this.selectedInterventionId()
    if (completed) {
      payload.status = "completed"
      payload.ended_reason = "stopped"
      payload.ended_at = now.toISOString()
    } else if (interrupted) {
      payload.status = "interrupted"
      payload.ended_reason = "timeout"
      payload.ended_at = now.toISOString()
    }

    return this.saveQueue.enqueue(async () => {
      const response = await fetch(updateUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: payload }),
      })

      return response.ok
    })
  }

  async stop() {
    if (this.stopping || this.restarting) return

    if (!this.startedAt || !this.sessionId) return

    this.stopping = true
    this.shutdown()
    this.stopBtnTarget.disabled = true
    this.messageTarget.textContent = "保存中です..."

    const endedAt = new Date()
    let saved = false
    try {
      saved = await this.saveProgress({ completed: true, endedAt })
    } catch {
      saved = false
    }

    if (saved) {
      this.updateDailyStatus()
      this.commitCurrentSessionToDailyBase(endedAt)
      this.sessionId = null
      this.startedAt = null
      this.showStoppedState()
    } else {
      this.stopping = false
      this.stopBtnTarget.disabled = false
      this.messageTarget.textContent = "保存に失敗しました。ページを再読み込みしてもう一度試してください。"
    }
  }

  commitCurrentSessionToDailyBase(endedAt) {
    if (!this.startedAt) return

    const summary = aggregateSession(this.samples, this.startedAt, endedAt)
    this.dailyBaseDurationSecValue += summary.duration_sec
    this.dailyBaseVolumeValue += summary.focus_volume
    this.dailyBaseScoreSumValue += summary.avg_score
    this.dailyBaseSessionCountValue += 1
  }

  showStoppedState() {
    this.stopping = false
    this.stopBtnTarget.hidden = true
    this.resumeBtnTarget.hidden = false
    this.resumeBtnTarget.disabled = false
    this.taskMeasurementStatusTarget.textContent = "計測終了"
    this.taskStopBtnTarget.hidden = true
    this.taskResumeBtnTarget.hidden = false
    this.taskResumeBtnTarget.disabled = false
    this.miniStatusTarget.textContent = "計測終了"
    this.messageTarget.textContent = "保存しました。再開すると新しいセッションとして計測を続けられます。"
  }

  async resume() {
    if (this.running || this.stopping || this.restarting) return

    this.resumeBtnTarget.disabled = true
    this.taskResumeBtnTarget.disabled = true
    this.messageTarget.textContent = "計測を再開しています..."
    await this.start()

    if (!this.running) {
      this.resumeBtnTarget.hidden = false
      this.resumeBtnTarget.disabled = false
      this.taskResumeBtnTarget.hidden = false
      this.taskResumeBtnTarget.disabled = false
    }
  }

  async stopForAbsence(endedAt) {
    if (!this.startedAt || this.stopping) return

    this.stopping = true
    this.waitingForReturn = true
    this.taskStopBtnTarget.disabled = true
    if (this.autosaveTick) clearInterval(this.autosaveTick)
    this.autosaveTick = null
    this.messageTarget.textContent = "離席が30分続いたため、セッションを終了しています..."
    this.miniStatusTarget.textContent = "終了処理中"

    let saved = false
    try {
      saved = await this.saveProgress({ interrupted: true, endedAt })
    } catch {
      saved = false
    }
    if (saved) {
      this.updateDailyStatus()
      this.commitCurrentSessionToDailyBase(endedAt)
      this.sessionId = null
      this.startedAt = null
      this.stopping = false
      this.restartFailed = false
      this.faceDetectedSinceMs = null
      this.lastReturnFrameAtMs = null
      this.scoreTarget.textContent = "—"
      delete this.scoreTarget.dataset.state
      this.stateTarget.textContent = "復帰待ち"
      delete this.stateTarget.dataset.state
      this.miniStatusTarget.textContent = "復帰待ち"
      this.sessionElapsedTarget.textContent = "--"
      this.miniSessionAverageTarget.textContent = "--"
      this.messageTarget.textContent = "離席によりセッションを区切りました。復帰すると自動で計測を再開します。"
    } else {
      this.waitingForReturn = false
      this.shutdown()
      this.miniStatusTarget.textContent = "終了失敗"
      this.messageTarget.textContent = "セッションの自動終了に失敗しました。ページを再読み込みしてください。"
    }
  }

  shutdown() {
    this.running = false
    if (this.tick) clearInterval(this.tick)
    this.tick = null
    if (this.autosaveTick) clearInterval(this.autosaveTick)
    this.autosaveTick = null
    void this.stopVideoStream()
    if (this.hasStopBtnTarget) this.stopBtnTarget.disabled = true
    if (this.hasTaskStopBtnTarget) this.taskStopBtnTarget.disabled = true
    if (this.hasTaskResumeBtnTarget) this.taskResumeBtnTarget.disabled = true
    if (this.hasPlaceholderTarget) this.placeholderTarget.hidden = false
    if (this.hasCameraSelectTarget) this.cameraSelectTarget.disabled = true
  }

  async stopVideoStream({ cancelPendingStart = true } = {}) {
    if (cancelPendingStart) this.cameraStartGeneration += 1

    const frameLoop = this.frameLoop
    this.frameLoop = null
    const previousDrainPromise = this.frameLoopDrainPromise || Promise.resolve()
    const currentDrainPromise = frameLoop ? frameLoop.stopAndDrain() : Promise.resolve()
    const drainPromise = Promise.all([previousDrainPromise, currentDrainPromise])
    this.frameLoopDrainPromise = drainPromise

    const stream = this.videoTarget.srcObject
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      this.videoTarget.srcObject = null
    }

    await drainPromise
    if (this.frameLoopDrainPromise === drainPromise) this.frameLoopDrainPromise = null
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

  // canvas 描画色は CSS のデザイントークンから読む（ライト/ダーク両テーマに追従）
  themeColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
  }

  drawPrivacySurface() {
    this.syncCanvasSize()
    this.ctx.fillStyle = this.themeColor("--color-surface-sunken", "#111720")
    this.ctx.fillRect(0, 0, this.canvasTarget.width, this.canvasTarget.height)
  }

  drawIdleCanvas() {
    this.ctx.fillStyle = this.themeColor("--color-surface-sunken", "#111720")
    this.ctx.fillRect(0, 0, this.canvasTarget.width, this.canvasTarget.height)
  }

  // パルスキャンバスの描画バッファを実際の表示サイズ（CSS px × DPR）に合わせる。
  // パネルが縦に伸びてもチャートがぼやけず、CSS px 座標で描けるよう変換を掛ける。
  resizePulseCanvas() {
    const canvas = this.pulseCanvasTarget
    const cssWidth = canvas.clientWidth || canvas.width
    const cssHeight = canvas.clientHeight || canvas.height
    const dpr = window.devicePixelRatio || 1
    const bufferWidth = Math.round(cssWidth * dpr)
    const bufferHeight = Math.round(cssHeight * dpr)
    if (canvas.width !== bufferWidth) canvas.width = bufferWidth
    if (canvas.height !== bufferHeight) canvas.height = bufferHeight
    // 以降の描画は CSS px 座標で行う
    this.pulseCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { width: cssWidth, height: cssHeight }
  }

  drawScoreTrend() {
    const ctx = this.pulseCtx
    const { width, height } = this.resizePulseCanvas()
    // 軸ラベルは HTML 側（.measure-pulse__y / __x）で重ねるため、canvas は全幅で描く
    const plotWidth = width
    const scoreToY = (score) => {
      const normalized = Math.max(0, Math.min(1, score / 100))
      // 上端 1px / 下端 1px の余白を残す（デザインのグリッド線位置に合わせる）
      return 1 + (1 - normalized) * (height - 2)
    }

    const gridColor = this.themeColor("--color-chart-grid", "rgba(42, 49, 60, 0.9)")
    const lineColor = this.themeColor("--color-chart-bar", "#2dd4a7")

    // 背景は塗らずパネル面へ直置きする（デザインのフラットなチャートに合わせる）
    ctx.clearRect(0, 0, width, height)

    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    // 縦グリッド（-30/-20/-10/現在 の目盛りに合わせて等間隔）
    for (let i = 1; i < 4; i++) {
      const x = (i / 4) * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    // 横グリッド（100 / 50 / 0）
    ;[0, 50, 100].forEach((score) => {
      const y = scoreToY(score)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    })

    if (this.scoreHistory.length === 0) return

    // X軸は「直近30分」の実時間で固定する。右端(=plotWidth)が現在(now)、左端(=0)が30分前。
    // 各サンプルは記録時刻 t から x を求めるので、離席で記録が途切れた区間は自然に空く。
    const now = Date.now()
    const xForTime = (t) => plotWidth - ((now - t) / TREND_WINDOW_MS) * plotWidth

    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1.5
    ctx.lineJoin = "round"

    // 連続サンプル（間隔が TREND_GAP_MS 以内）ごとに区切って線を引く。
    // 途切れをまたいで直線で結ばないことで、離席の空白を表現する。
    let segment = []
    const flush = () => {
      if (segment.length === 1) {
        // 単独サンプルは線が引けないので点を打つ
        ctx.fillStyle = lineColor
        ctx.beginPath()
        ctx.arc(segment[0].x, segment[0].y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (segment.length > 1) {
        ctx.beginPath()
        segment.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
        ctx.stroke()
      }
      segment = []
    }

    let prevT = null
    this.scoreHistory.forEach(({ t, score }) => {
      if (prevT !== null && t - prevT > TREND_GAP_MS) flush()
      segment.push({ x: xForTime(t), y: scoreToY(score) })
      prevT = t
    })
    flush()

    // 現在地マーカー（最新サンプルを右端付近に点で示す）
    const last = this.scoreHistory[this.scoreHistory.length - 1]
    ctx.fillStyle = lineColor
    ctx.beginPath()
    ctx.arc(xForTime(last.t), scoreToY(last.score), 2, 0, Math.PI * 2)
    ctx.fill()
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

    const irisColor = this.themeColor("--color-accent", "#2dd4a7")
    drawPoint(LM.leftIris, 4, irisColor)
    drawPoint(LM.rightIris, 4, irisColor)
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
