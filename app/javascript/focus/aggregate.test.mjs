import assert from "node:assert"
import { aggregateSession } from "./aggregate.js"

const samples = [
  { score: 90, state: "high" },
  { score: 85, state: "high" },
  { score: 40, state: "low" },
  { score: 95, state: "high" },
]
const start = new Date("2026-06-26T10:00:00Z")
const end = new Date("2026-06-26T10:00:04Z")
const r = aggregateSession(samples, start, end)

assert.equal(r.avg_score, 78)
assert.equal(r.high_ratio, 0.75)
assert.equal(r.medium_ratio, 0)
assert.equal(r.low_ratio, 0.25)
assert.equal(r.away_ratio, 0)
assert.equal(r.interrupt_count, 1)
assert.equal(r.duration_sec, 4)

console.log("aggregate OK")
