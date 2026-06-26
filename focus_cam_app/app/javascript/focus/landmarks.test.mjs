import assert from "node:assert"
import { LM, calcEAR, calcGazeOnScreen, calcHeadAngles, calcHeadStable } from "./landmarks.js"

const landmarks = []
const set = (idx, x, y) => {
  landmarks[idx] = { x, y }
}

set(LM.leftEye.outer, 0.3, 0.4)
set(LM.leftEye.inner, 0.5, 0.4)
set(LM.leftEye.top, 0.4, 0.36)
set(LM.leftEye.bot, 0.4, 0.44)
set(LM.rightEye.outer, 0.7, 0.4)
set(LM.rightEye.inner, 0.5, 0.4)
set(LM.rightEye.top, 0.6, 0.36)
set(LM.rightEye.bot, 0.6, 0.44)
set(LM.leftIris, 0.4, 0.4)
set(LM.rightIris, 0.6, 0.4)
set(LM.leftCheek, 0.25, 0.55)
set(LM.rightCheek, 0.75, 0.55)
set(LM.nose, 0.5, 0.5)
set(LM.chin, 0.5, 0.75)
set(LM.leftBrow, 0.35, 0.25)
set(LM.rightBrow, 0.65, 0.25)

assert.ok(Math.abs(calcEAR(landmarks, LM.leftEye) - 0.4) < 0.000001)
assert.equal(calcGazeOnScreen(landmarks), 1)
const centeredAngles = calcHeadAngles(landmarks)
assert.equal(centeredAngles.yaw, 0)
assert.ok(Math.abs(centeredAngles.pitch - -4) < 0.000001)
assert.ok(Math.abs(calcHeadStable(landmarks) - 0.85) < 0.000001)

set(LM.nose, 0.75, 0.5)
assert.equal(calcHeadStable(landmarks), 0)

console.log("landmarks OK")
