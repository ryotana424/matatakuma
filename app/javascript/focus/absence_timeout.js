export const FACE_ABSENCE_TIMEOUT_MS = 30 * 60 * 1000
export const FRAME_STALE_AFTER_MS = 5000
export const FACE_RETURN_CONFIRM_MS = 3 * 1000

export function isFrameFresh(latestFrame, nowMs, staleAfterMs = FRAME_STALE_AFTER_MS) {
  return Boolean(latestFrame) && nowMs - latestFrame.ts < staleAfterMs
}

// 顔が見えない状態、またはカメラフレームが届かない状態の終了期限を返す。
// null は直近のフレームで顔を検出できており、計測を継続できる状態。
export function faceAbsenceDeadlineMs({
  sessionStartedAtMs,
  latestFrame,
  faceAbsentSinceMs,
  nowMs,
  timeoutMs = FACE_ABSENCE_TIMEOUT_MS,
  staleAfterMs = FRAME_STALE_AFTER_MS,
}) {
  let absentSinceMs = Number.isFinite(faceAbsentSinceMs) ? faceAbsentSinceMs : null

  if (absentSinceMs === null) {
    if (!latestFrame) {
      absentSinceMs = sessionStartedAtMs
    } else if (!latestFrame.faceDetected) {
      absentSinceMs = latestFrame.ts
    } else if (nowMs - latestFrame.ts >= staleAfterMs) {
      // スリープやバックグラウンド化でフレームが止まった場合は、最後に
      // 計測できた時刻から離席扱いにする。
      absentSinceMs = latestFrame.ts
    }
  }

  return Number.isFinite(absentSinceMs) ? absentSinceMs + timeoutMs : null
}

// 離席タイムアウト後、顔を連続検出できた時間から自動再開可否を返す。
// 一度でも顔を見失った場合は連続検出の起点を破棄する。
export function faceReturnState({
  faceDetected,
  faceDetectedSinceMs,
  lastFrameAtMs = null,
  nowMs,
  confirmMs = FACE_RETURN_CONFIRM_MS,
  staleAfterMs = FRAME_STALE_AFTER_MS,
}) {
  if (!faceDetected) return { faceDetectedSinceMs: null, confirmed: false }

  const frameWasStale = Number.isFinite(lastFrameAtMs) && nowMs - lastFrameAtMs >= staleAfterMs
  const detectedSinceMs = Number.isFinite(faceDetectedSinceMs) && !frameWasStale ? faceDetectedSinceMs : nowMs
  return {
    faceDetectedSinceMs: detectedSinceMs,
    confirmed: nowMs - detectedSinceMs >= confirmMs,
  }
}
