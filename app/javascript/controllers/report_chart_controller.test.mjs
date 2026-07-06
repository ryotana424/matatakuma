import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "report_chart_controller.js"), "utf8")

assert.equal(source.includes("chart.js/auto"), true, "importmapでピンしたChart.jsを使う")
assert.equal(source.includes("type: \"bar\""), true, "棒グラフを描画する")
assert.equal(source.includes("static values = { labels: Array, datasets: Array, suggestedMax: Number }"), true, "ラベルとデータセットをdata属性から受け取る")
assert.equal(source.includes("this.chart.destroy()"), true, "切断時にチャートを破棄する")
assert.equal(source.includes("maintainAspectRatio: false"), true, "親要素の高さに合わせて描画する")

console.log("report chart controller OK")
