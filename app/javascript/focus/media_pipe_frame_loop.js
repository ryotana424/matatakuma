// 取得済みvideoのフレームを1件ずつMediaPipeへ渡す。
// stop後やカメラ切替後に古い非同期処理がループを再開しないよう世代で管理する。
export class MediaPipeFrameLoop {
  constructor({
    onFrame,
    onError = (error) => console.error(error),
    requestFrame = (callback) => requestAnimationFrame(callback),
    cancelFrame = (id) => cancelAnimationFrame(id),
    requestBackgroundFrame = (callback, delay) => setTimeout(callback, delay),
    cancelBackgroundFrame = (id) => clearTimeout(id),
    backgroundIntervalMs = 1000,
  }) {
    this.onFrame = onFrame
    this.onError = onError
    this.requestFrame = requestFrame
    this.cancelFrame = cancelFrame
    this.requestBackgroundFrame = requestBackgroundFrame
    this.cancelBackgroundFrame = cancelBackgroundFrame
    this.backgroundIntervalMs = backgroundIntervalMs
    this.running = false
    this.background = false
    this.generation = 0
    this.frameRequestId = null
    this.frameRequestWasBackground = false
    this.processingGeneration = null
    this.processingPromise = null
  }

  start() {
    if (this.running) return

    this.running = true
    this.generation += 1
    this.schedule(this.generation)
  }

  stop() {
    this.running = false
    this.generation += 1
    this.cancelScheduledFrame()
  }

  stopAndDrain() {
    this.stop()
    return this.processingPromise || Promise.resolve()
  }

  setBackground(background) {
    const nextBackground = Boolean(background)
    if (this.background === nextBackground) return

    this.background = nextBackground
    if (!this.running) return

    this.cancelScheduledFrame()
    if (this.processingGeneration !== this.generation) this.schedule(this.generation)
  }

  schedule(generation) {
    this.frameRequestWasBackground = this.background
    this.frameRequestId = this.background
      ? this.requestBackgroundFrame(() => this.process(generation), this.backgroundIntervalMs)
      : this.requestFrame(() => this.process(generation))
  }

  cancelScheduledFrame() {
    if (this.frameRequestId === null) return

    if (this.frameRequestWasBackground) {
      this.cancelBackgroundFrame(this.frameRequestId)
    } else {
      this.cancelFrame(this.frameRequestId)
    }
    this.frameRequestId = null
  }

  async process(generation) {
    this.frameRequestId = null
    if (!this.running || generation !== this.generation) return

    this.processingGeneration = generation
    let resolveProcessing
    const processingPromise = new Promise((resolve) => { resolveProcessing = resolve })
    this.processingPromise = processingPromise
    try {
      await this.onFrame()
    } catch (error) {
      this.onError(error)
    } finally {
      resolveProcessing()
    }

    if (this.processingGeneration === generation) this.processingGeneration = null
    if (this.processingPromise === processingPromise) this.processingPromise = null
    if (this.running && generation === this.generation) this.schedule(generation)
  }
}
