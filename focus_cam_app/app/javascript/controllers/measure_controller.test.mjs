import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "measure_controller.js"), "utf8")

assert.equal(source.includes(".drawImage("), false, "カメラ映像をcanvasへ描画しない")
assert.equal(source.includes("drawPrivacySurface"), true, "匿名化された表示面を描画する")
assert.equal(source.includes("this.startBtnTarget.hidden = true"), true, "計測中は開始ボタンを非表示にする")

console.log("measure controller privacy display OK")
