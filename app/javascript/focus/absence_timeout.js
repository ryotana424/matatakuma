export const FACE_ABSENCE_TIMEOUT_MS = 30 * 60 * 1000
export const FRAME_STALE_AFTER_MS = 5000

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
