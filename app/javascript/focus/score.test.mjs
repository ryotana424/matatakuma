import assert from "node:assert"
import { WEIGHTS, calcScore, classifyState, computeMetrics, isFaceTemporarilyAbsent } from "./score.js"

assert.deepEqual(WEIGHTS, { gaze: 0.35, head: 0.25, face: 0.10, blink: 0.15, continuity: 0.15 })
assert.equal(Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0), 1)

const metrics = computeMetrics([
  { faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.3, earRight: 0.3 },
  { faceDetected: false, gazeOnScreen: 0, headStable: 0, earLeft: 1, earRight: 1 },
  { faceDetected: true, gazeOnScreen: 0.5, headStable: 0.4, earLeft: 0.1, earRight: 0.1 },
])

assert.equal(metrics.facePresent, 2 / 3)
assert.equal(metrics.gazeOnScreen, 0.75)
assert.equal(metrics.headStable, 0.7)
assert.equal(metrics.blinkNormal, 0)
assert.equal(metrics.sessionContinuity, 0)
assert.equal(calcScore(metrics), 50)

assert.equal(calcScore({
  gazeOnScreen: 0.8,
  headStable: 0.7,
  blinkNormal: 0.9,
  sessionContinuity: 0.6,
  facePresent: 1.0,
}), 78)

const absentMetrics = computeMetrics([
  { faceDetected: false, gazeOnScreen: 0, headStable: 0, earLeft: 0, earRight: 0 },
  { faceDetected: false, gazeOnScreen: 0, headStable: 0, earLeft: 0, earRight: 0 },
])

assert.equal(absentMetrics.facePresent, 0)
assert.equal(absentMetrics.blinkNormal, 0)
assert.equal(calcScore(absentMetrics), 0)

const currentlyAbsentMetrics = computeMetrics([
  { faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.3, earRight: 0.3 },
  { faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.3, earRight: 0.3 },
  { faceDetected: false, gazeOnScreen: 0, headStable: 0, earLeft: 0, earRight: 0 },
])

assert.equal(currentlyAbsentMetrics.facePresent, 0)
assert.equal(calcScore(currentlyAbsentMetrics), 0)

const recentlyAbsentMetrics = computeMetrics([
  { ts: 1000, faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.3, earRight: 0.3 },
  { ts: 2000, faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.3, earRight: 0.3 },
  { ts: 4000, faceDetected: false, gazeOnScreen: 0, headStable: 0, earLeft: 0, earRight: 0 },
])

assert.equal(recentlyAbsentMetrics.facePresent, 0)
assert.equal(calcScore(recentlyAbsentMetrics), 0)

const absentForThreeSecondsMetrics = computeMetrics([
  { ts: 1000, faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.3, earRight: 0.3 },
  { ts: 2000, faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.3, earRight: 0.3 },
  { ts: 5000, faceDetected: false, gazeOnScreen: 0, headStable: 0, earLeft: 0, earRight: 0 },
])

assert.equal(absentForThreeSecondsMetrics.facePresent, 0)
assert.equal(calcScore(absentForThreeSecondsMetrics), 0)

const longClosedEyesMetrics = computeMetrics([
  { ts: 1000, faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.1, earRight: 0.1 },
  { ts: 6000, faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.1, earRight: 0.1 },
  { ts: 11000, faceDetected: true, gazeOnScreen: 1, headStable: 1, earLeft: 0.1, earRight: 0.1 },
])

assert.equal(longClosedEyesMetrics.closedEyesDurationMs, 10000)
assert.equal(calcScore(longClosedEyesMetrics), 64)
assert.equal(classifyState(calcScore(longClosedEyesMetrics), longClosedEyesMetrics.facePresent), "low")

assert.equal(isFaceTemporarilyAbsent([
  { ts: 1000, faceDetected: true },
  { ts: 2000, faceDetected: true },
  { ts: 4000, faceDetected: false },
]), true)

assert.equal(isFaceTemporarilyAbsent([
  { ts: 1000, faceDetected: true },
  { ts: 2000, faceDetected: true },
  { ts: 5000, faceDetected: false },
]), false)

assert.equal(isFaceTemporarilyAbsent([
  { ts: 1000, faceDetected: false },
  { ts: 2500, faceDetected: false },
]), true)

assert.equal(isFaceTemporarilyAbsent([
  { ts: 1000, faceDetected: false },
  { ts: 4000, faceDetected: false },
]), false)

assert.equal(classifyState(95, 0.4), "away")
assert.equal(classifyState(95, 0.9), "high")
assert.equal(classifyState(70, 0.9), "medium")
assert.equal(classifyState(40, 0.9), "low")

console.log("score OK")
