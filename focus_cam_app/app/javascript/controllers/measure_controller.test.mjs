import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "measure_controller.js"), "utf8")

assert.equal(source.includes(".drawImage("), false, "カメラ映像をcanvasへ描画しない")
assert.equal(source.includes("drawPrivacySurface"), true, "匿名化された表示面を描画する")
assert.equal(source.includes("static targets = [\"video\", \"canvas\", \"score\", \"state\", \"stopBtn\", \"placeholder\", \"message\"]"), true, "開始ボタンtargetを持たない")
assert.equal(source.includes("this.start()"), true, "画面表示時に自動で計測開始する")

console.log("measure controller privacy display OK")
