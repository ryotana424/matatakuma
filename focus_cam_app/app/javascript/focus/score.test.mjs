import assert from "node:assert"
import { calcScore, classifyState, computeMetrics } from "./score.js"

const metrics = computeMetrics([
  { faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.3, earRight: 0.3 },
  { faceDetected: true, gazeOnScreen: 0.5, headStable: 0.4, earLeft: 0.1, earRight: 0.1 },
  { faceDetected: false, gazeOnScreen: 0, headStable: 0, earLeft: 1, earRight: 1 },
])

assert.equal(metrics.facePresent, 2 / 3)
assert.equal(metrics.gazeOnScreen, 0.75)
assert.equal(metrics.headStable, 0.7)
assert.equal(metrics.blinkNormal, 0)
assert.equal(metrics.sessionContinuity, 0)
assert.equal(calcScore(metrics), 50)
assert.equal(classifyState(95, 0.4), "away")
assert.equal(classifyState(95, 0.9), "high")
assert.equal(classifyState(70, 0.9), "medium")
assert.equal(classifyState(40, 0.9), "low")

console.log("score OK")
