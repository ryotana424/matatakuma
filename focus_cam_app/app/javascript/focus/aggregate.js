// 1秒ごとの { score, state } 列を、API送信用の集計値に変換する
export function aggregateSession(samples, startedAt, endedAt) {
  const n = samples.length || 1
  const count = (state) => samples.filter((x) => x.state === state).length
  const avg = Math.round(samples.reduce((a, x) => a + x.score, 0) / n)

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
  }
}
