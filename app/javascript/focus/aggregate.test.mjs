import assert from "node:assert"
import { aggregateSession, averageFocusableScore, focusVolume } from "./aggregate.js"

const samples = [
  {
    score: 90,
    state: "high",
    metrics: { gazeOnScreen: 1, headStable: 0.9, blinkNormal: 1, sessionContinuity: 0.9, facePresent: 1 },
  },
  {
    score: 85,
    state: "high",
    metrics: { gazeOnScreen: 0.8, headStable: 0.8, blinkNormal: 1, sessionContinuity: 0.8, facePresent: 1 },
  },
  {
    score: 40,
    state: "low",
    metrics: { gazeOnScreen: 0.2, headStable: 0.4, blinkNormal: 0.6, sessionContinuity: 0.3, facePresent: 0.9 },
  },
  {
    score: 0,
    state: "away",
    metrics: { gazeOnScreen: 0, headStable: 0, blinkNormal: 1, sessionContinuity: 0, facePresent: 0 },
  },
  {
    score: 95,
    state: "high",
    metrics: { gazeOnScreen: 1, headStable: 1, blinkNormal: 1, sessionContinuity: 1, facePresent: 1 },
  },
]
const start = new Date("2026-06-26T10:00:00Z")
const end = new Date("2026-06-26T10:00:05Z")
const r = aggregateSession(samples, start, end)

assert.equal(r.avg_score, 78)
assert.equal(r.focus_volume, 5.17)
assert.equal(r.high_ratio, 0.6)
assert.equal(r.medium_ratio, 0)
assert.equal(r.low_ratio, 0.2)
assert.equal(r.away_ratio, 0.2)
assert.equal(r.interrupt_count, 1)
assert.equal(r.duration_sec, 5)
assert.equal(r.gaze_on_screen_ratio, 0.6)
assert.equal(r.head_stable_ratio, 0.62)
assert.equal(r.blink_normal_ratio, 0.92)
assert.equal(r.session_continuity_ratio, 0.6)
assert.equal(r.face_present_ratio, 0.78)
assert.equal(r.score_min, 0)
assert.equal(r.score_max, 95)
assert.equal(r.score_stddev, 36.69)
assert.equal(r.longest_low_streak_sec, 1)
assert.equal(r.longest_away_streak_sec, 1)

assert.equal(averageFocusableScore(samples), 78)
assert.equal(averageFocusableScore([{ score: 0, state: "away", metrics: { facePresent: 0 } }]), 0)
assert.equal(focusVolume([{ score: 60, state: "medium" }, { score: 100, state: "away" }]), 1)

console.log("aggregate OK")
