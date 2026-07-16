import assert from "node:assert"
import {
  FACE_ABSENCE_TIMEOUT_MS,
  FACE_RETURN_CONFIRM_MS,
  FRAME_STALE_AFTER_MS,
  faceAbsenceDeadlineMs,
  faceReturnState,
  isFrameFresh,
} from "./absence_timeout.js"

const startedAt = Date.parse("2026-07-09T14:00:00Z")
const now = startedAt + 60_000

assert.equal(
  faceAbsenceDeadlineMs({
    sessionStartedAtMs: startedAt,
    latestFrame: { ts: now - 1000, faceDetected: true },
    faceAbsentSinceMs: null,
    nowMs: now,
  }),
  null,
  "直近で顔を検出できている間は終了期限を作らない",
)

assert.equal(
  faceAbsenceDeadlineMs({
    sessionStartedAtMs: startedAt,
    latestFrame: { ts: now, faceDetected: false },
    faceAbsentSinceMs: startedAt + 10_000,
    nowMs: now,
  }),
  startedAt + 10_000 + FACE_ABSENCE_TIMEOUT_MS,
  "連続離席は最初に顔を見失った時刻から30分で終了する",
)

assert.equal(
  faceAbsenceDeadlineMs({
    sessionStartedAtMs: startedAt,
    latestFrame: { ts: startedAt + 20_000, faceDetected: true },
    faceAbsentSinceMs: null,
    nowMs: startedAt + FACE_ABSENCE_TIMEOUT_MS + 30_000,
  }),
  startedAt + 20_000 + FACE_ABSENCE_TIMEOUT_MS,
  "スリープなどでフレームが止まった時間も離席として判定する",
)

assert.equal(
  faceAbsenceDeadlineMs({
    sessionStartedAtMs: startedAt,
    latestFrame: null,
    faceAbsentSinceMs: null,
    nowMs: now,
  }),
  startedAt + FACE_ABSENCE_TIMEOUT_MS,
  "開始後にフレームが一度も届かない場合も30分で終了する",
)

const returnStartedAt = now + 1000
assert.deepEqual(
  faceReturnState({
    faceDetected: true,
    faceDetectedSinceMs: null,
    nowMs: returnStartedAt,
  }),
  { faceDetectedSinceMs: returnStartedAt, confirmed: false },
  "復帰後の最初の顔検出時刻を保持する",
)

assert.deepEqual(
  faceReturnState({
    faceDetected: true,
    faceDetectedSinceMs: returnStartedAt,
    nowMs: returnStartedAt + FACE_RETURN_CONFIRM_MS,
  }),
  { faceDetectedSinceMs: returnStartedAt, confirmed: true },
  "顔を3秒間連続検出したら復帰を確定する",
)

assert.deepEqual(
  faceReturnState({
    faceDetected: false,
    faceDetectedSinceMs: returnStartedAt,
    nowMs: returnStartedAt + FACE_RETURN_CONFIRM_MS,
  }),
  { faceDetectedSinceMs: null, confirmed: false },
  "復帰確認中に顔を見失ったら検出時刻をリセットする",
)

assert.deepEqual(
  faceReturnState({
    faceDetected: true,
    faceDetectedSinceMs: returnStartedAt,
    lastFrameAtMs: returnStartedAt,
    nowMs: returnStartedAt + FRAME_STALE_AFTER_MS,
  }),
  { faceDetectedSinceMs: returnStartedAt + FRAME_STALE_AFTER_MS, confirmed: false },
  "カメラフレームが長く止まった後は復帰確認を最初からやり直す",
)

assert.equal(
  isFrameFresh({ ts: now - FRAME_STALE_AFTER_MS + 1 }, now),
  true,
  "5秒未満のフレームはスコア計算に利用できる",
)

assert.equal(
  isFrameFresh({ ts: now - FRAME_STALE_AFTER_MS }, now),
  false,
  "5秒以上更新されていないフレームはスコア計算に再利用しない",
)

assert.equal(isFrameFresh(null, now), false, "フレーム未取得時はスコア計算しない")

console.log("absence timeout OK")
