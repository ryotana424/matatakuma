// PoC index.html から移植したランドマーク特徴抽出（純粋関数）
export const LM = {
  leftEye: { outer: 33, inner: 133, top: 159, bot: 145 },
  rightEye: { outer: 362, inner: 263, top: 386, bot: 374 },
  leftIris: 468,
  rightIris: 473,
  nose: 1,
  chin: 199,
  leftCheek: 234,
  rightCheek: 454,
  leftBrow: 70,
  rightBrow: 300,
}

export const HEAD_YAW_THRESH = 18
export const HEAD_PITCH_THRESH = 12

export function calcEAR(lm, eye) {
  const p1 = lm[eye.outer]
  const p2 = lm[eye.inner]
  const p3 = lm[eye.top]
  const p4 = lm[eye.bot]
  const horizontal = Math.hypot(p1.x - p2.x, p1.y - p2.y)
  const vertical = Math.hypot(p3.x - p4.x, p3.y - p4.y)
  return horizontal > 0 ? vertical / horizontal : 0
}

export function calcGazeOnScreen(lm) {
  function irisOffset(iris, eye) {
    const cx = (lm[eye.outer].x + lm[eye.inner].x) / 2
    const cy = (lm[eye.outer].y + lm[eye.inner].y) / 2
    const w = Math.abs(lm[eye.outer].x - lm[eye.inner].x)
    const h = Math.abs(lm[eye.top].y - lm[eye.bot].y)
    if (w < 0.001 || h < 0.001) return 0
    const offsetX = Math.abs(lm[iris].x - cx) / w
    const offsetY = Math.abs(lm[iris].y - cy) / h
    return offsetX * 0.7 + offsetY * 0.3
  }

  const leftOff = irisOffset(LM.leftIris, LM.leftEye)
  const rightOff = irisOffset(LM.rightIris, LM.rightEye)
  const avgOff = (leftOff + rightOff) / 2
  return Math.max(0, Math.min(1, 1 - (avgOff - 0.03) / 0.17))
}

export function calcHeadAngles(lm) {
  const leftCx = lm[LM.leftCheek].x
  const rightCx = lm[LM.rightCheek].x
  const noseCx = lm[LM.nose].x
  const faceW = rightCx - leftCx
  const yawRaw = faceW > 0 ? ((noseCx - leftCx) / faceW - 0.5) * 2 : 0
  const yaw = yawRaw * 60

  const noseY = lm[LM.nose].y
  const chinY = lm[LM.chin].y
  const browY = (lm[LM.leftBrow].y + lm[LM.rightBrow].y) / 2
  const faceH = chinY - browY
  const pitchRaw = faceH > 0 ? ((noseY - browY) / faceH - 0.55) * 2 : 0
  const pitch = pitchRaw * 40

  return { yaw, pitch }
}

export function calcHeadStable(lm) {
  const { yaw, pitch } = calcHeadAngles(lm)
  const yawRatio = Math.abs(yaw) / HEAD_YAW_THRESH
  const pitchRatio = Math.abs(pitch) / HEAD_PITCH_THRESH
  return Math.max(0, Math.min(1, 1 - (yawRatio * 0.55 + pitchRatio * 0.45)))
}
