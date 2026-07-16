import assert from "node:assert"

let MediaPipeFrameLoop
try {
  ;({ MediaPipeFrameLoop } = await import("./media_pipe_frame_loop.js"))
} catch {
  // RED: 実装前は下の型チェックで意図どおり失敗させる。
}

assert.equal(typeof MediaPipeFrameLoop, "function", "既存の映像を直列処理するフレームループを提供する")

const scheduled = []
const cancelled = []
const processed = []
let resolveFrame
let nextFrameId = 0

const loop = new MediaPipeFrameLoop({
  onFrame: () => new Promise((resolve) => {
    processed.push("frame")
    resolveFrame = resolve
  }),
  requestFrame: (callback) => {
    scheduled.push(callback)
    nextFrameId += 1
    return nextFrameId
  },
  cancelFrame: (id) => cancelled.push(id),
})

loop.start()
assert.equal(scheduled.length, 1, "開始時に最初のフレームを予約する")

scheduled.shift()()
await Promise.resolve()
assert.equal(processed.length, 1, "予約されたフレームを処理する")
assert.equal(scheduled.length, 0, "MediaPipe処理中は次のフレームを重ねない")

resolveFrame()
await Promise.resolve()
await Promise.resolve()
assert.equal(scheduled.length, 1, "処理完了後に次のフレームを予約する")

loop.stop()
assert.deepEqual(cancelled, [2], "停止時に予約済みフレームを取り消す")

const inFlightCallbacks = []
let finishInFlight
const stoppedDuringFrame = new MediaPipeFrameLoop({
  onFrame: () => new Promise((resolve) => { finishInFlight = resolve }),
  requestFrame: (callback) => {
    inFlightCallbacks.push(callback)
    return inFlightCallbacks.length
  },
  cancelFrame: () => {},
})

stoppedDuringFrame.start()
inFlightCallbacks.shift()()
await Promise.resolve()
let drained = false
const drainPromise = stoppedDuringFrame.stopAndDrain().then(() => { drained = true })
await Promise.resolve()
assert.equal(drained, false, "停止処理は実行中のMediaPipe処理が終わるまで完了しない")
finishInFlight()
await drainPromise
assert.equal(drained, true, "実行中のMediaPipe処理が終わると停止処理が完了する")
assert.equal(inFlightCallbacks.length, 0, "処理中に停止した場合は次のフレームを予約しない")

const foregroundCallbacks = []
const backgroundCallbacks = []
const cancelledForeground = []
const cancelledBackground = []
const hybridLoop = new MediaPipeFrameLoop({
  onFrame: async () => {},
  requestFrame: (callback) => {
    foregroundCallbacks.push(callback)
    return foregroundCallbacks.length
  },
  cancelFrame: (id) => cancelledForeground.push(id),
  requestBackgroundFrame: (callback, delay) => {
    backgroundCallbacks.push({ callback, delay })
    return backgroundCallbacks.length
  },
  cancelBackgroundFrame: (id) => cancelledBackground.push(id),
})

hybridLoop.start()
assert.equal(foregroundCallbacks.length, 1, "表示中はrequestAnimationFrameで映像解析を予約する")

hybridLoop.setBackground(true)
assert.deepEqual(cancelledForeground, [1], "別タブへ移動したら表示中の予約を取り消す")
assert.equal(backgroundCallbacks.length, 1, "別タブ中はタイマーで映像解析を予約する")
assert.equal(backgroundCallbacks[0].delay, 1000, "別タブ中の映像解析は1秒間隔に抑える")

hybridLoop.setBackground(false)
assert.deepEqual(cancelledBackground, [1], "計測タブへ戻ったらバックグラウンド予約を取り消す")
assert.equal(foregroundCallbacks.length, 2, "計測タブへ戻ったらrequestAnimationFrameへ復帰する")

hybridLoop.stop()
assert.deepEqual(cancelledForeground, [1, 2], "停止時は現在の予約方式に応じて取り消す")

const switchedWhileProcessing = []
const switchedBackgroundCallbacks = []
let finishSwitchedFrame
const switchedLoop = new MediaPipeFrameLoop({
  onFrame: () => new Promise((resolve) => { finishSwitchedFrame = resolve }),
  requestFrame: (callback) => {
    switchedWhileProcessing.push(callback)
    return switchedWhileProcessing.length
  },
  cancelFrame: () => {},
  requestBackgroundFrame: (callback, delay) => {
    switchedBackgroundCallbacks.push({ callback, delay })
    return switchedBackgroundCallbacks.length
  },
  cancelBackgroundFrame: () => {},
})

switchedLoop.start()
switchedWhileProcessing.shift()()
await Promise.resolve()
switchedLoop.setBackground(true)
assert.equal(switchedBackgroundCallbacks.length, 0, "処理中の切替では映像解析を重複予約しない")
finishSwitchedFrame()
await Promise.resolve()
await Promise.resolve()
assert.equal(switchedBackgroundCallbacks.length, 1, "処理完了後は最新のタブ状態で次を予約する")
switchedLoop.stop()

console.log("media pipe frame loop OK")
