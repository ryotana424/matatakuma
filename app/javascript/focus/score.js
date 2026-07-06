// PoC index.html から移植したスコア計算（純粋関数）
export const WEIGHTS = { gaze: 0.35, head: 0.25, face: 0.10, blink: 0.15, continuity: 0.15 }
export const EAR_CLOSED_THRESH = 0.20
const ABSENCE_GRACE_MS = 3000

// frames: [{ faceDetected, gazeOnScreen, headStable, earLeft, earRight }]
export function computeMetrics(frames) {
  if (frames.length === 0) return null

  const total = frames.length
  const detected = frames.filter((d) => d.faceDetected)
  const facePresent = detected.length / total

  if (detected.length === 0) {
    return absentMetrics()
  }

  if (!frames[frames.length - 1].faceDetected) {
    return absentMetrics()
  }

  const gazeOnScreen = detected.reduce((s, d) => s + d.gazeOnScreen, 0) / detected.length
  const headStable = detected.reduce((s, d) => s + d.headStable, 0) / detected.length
  const closedFrames = detected.filter((d) => (d.earLeft + d.earRight) / 2 < EAR_CLOSED_THRESH).length
  const closedRatio = closedFrames / detected.length
  const blinkNormal = Math.max(0, 1 - closedRatio * 3.5)

  let interruptCount = 0
  for (let i = 0; i < total; i++) {
    if (!frames[i].faceDetected || frames[i].gazeOnScreen < 0.65 || frames[i].headStable < 0.55) {
      interruptCount++
    }
  }
  const sessionContinuity = Math.max(0, 1 - (interruptCount / total) * 1.6)

  return { facePresent, gazeOnScreen, headStable, blinkNormal, sessionContinuity }
}

function absentMetrics() {
  return { facePresent: 0, gazeOnScreen: 0, headStable: 0, blinkNormal: 0, sessionContinuity: 0 }
}

export function isFaceTemporarilyAbsent(frames) {
  if (frames.length === 0) return false

  const latestFrame = frames[frames.length - 1]
  if (latestFrame.faceDetected) return false
  if (!Number.isFinite(latestFrame.ts)) return false

  const detected = frames.filter((d) => d.faceDetected)
  const latestSeen = detected[detected.length - 1]
  const baselineTs = latestSeen?.ts ?? frames[0].ts
  if (!Number.isFinite(baselineTs)) return false

  return latestFrame.ts - baselineTs < ABSENCE_GRACE_MS
}

export function calcScore(metrics) {
  return Math.round(100 * (
    WEIGHTS.gaze * metrics.gazeOnScreen +
    WEIGHTS.head * metrics.headStable +
    WEIGHTS.face * metrics.facePresent +
    WEIGHTS.blink * metrics.blinkNormal +
    WEIGHTS.continuity * metrics.sessionContinuity
  ))
}

export function classifyState(score, facePresent) {
  if (facePresent < 0.5) return "away"
  if (score >= 90 && facePresent >= 0.85) return "high"
  if (score >= 65) return "medium"
  return "low"
}
