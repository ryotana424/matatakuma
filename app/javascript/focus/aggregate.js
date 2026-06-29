// 1秒ごとの { score, state, metrics } 列を、API送信用の集計値に変換する
export function aggregateSession(samples, startedAt, endedAt) {
  const n = samples.length || 1
  const count = (state) => samples.filter((x) => x.state === state).length
  const scores = samples.map((x) => x.score)
  const scoreTotal = scores.reduce((sum, score) => sum + score, 0)
  const avg = Math.round(scoreTotal / n)

  let interrupt = 0
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1].state
    const cur = samples[i].state
    if ((prev === "high" || prev === "medium") && (cur === "low" || cur === "away")) {
      interrupt++
    }
  }

  return {
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_sec: Math.round((endedAt - startedAt) / 1000),
    avg_score: avg,
    high_ratio: count("high") / n,
    medium_ratio: count("medium") / n,
    low_ratio: count("low") / n,
    away_ratio: count("away") / n,
    interrupt_count: interrupt,
    gaze_on_screen_ratio: roundRatio(avgMetric(samples, "gazeOnScreen")),
    head_stable_ratio: roundRatio(avgMetric(samples, "headStable")),
    blink_normal_ratio: roundRatio(avgMetric(samples, "blinkNormal")),
    session_continuity_ratio: roundRatio(avgMetric(samples, "sessionContinuity")),
    face_present_ratio: roundRatio(avgMetric(samples, "facePresent")),
    score_min: scores.length ? Math.min(...scores) : 0,
    score_max: scores.length ? Math.max(...scores) : 0,
    score_stddev: roundRatio(stddev(scores)),
    longest_low_streak_sec: longestStreak(samples, "low"),
    longest_away_streak_sec: longestStreak(samples, "away"),
  }
}

function avgMetric(samples, key) {
  if (samples.length === 0) return 0
  return samples.reduce((sum, sample) => sum + (sample.metrics?.[key] ?? 0), 0) / samples.length
}

function stddev(values) {
  if (values.length === 0) return 0
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function longestStreak(samples, state) {
  let current = 0
  let longest = 0
  for (const sample of samples) {
    if (sample.state === state) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }
  return longest
}

function roundRatio(value) {
  return Math.round(value * 100) / 100
}
