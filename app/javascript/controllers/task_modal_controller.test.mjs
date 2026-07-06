import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "task_modal_controller.js"), "utf8")

assert.equal(source.includes("static targets = [\"overlay\"]"), true, "モーダルオーバーレイをtargetに持つ")
assert.equal(source.includes("static values = { open: Boolean }"), true, "初期表示で開くかをvalueで受ける")
assert.equal(source.includes("if (this.openValue) this.open()"), true, "バリデーションエラー時は接続直後にモーダルを開く")
assert.equal(source.includes("classList.add(\"open\")"), true, "openクラスの付与で表示する")
assert.equal(source.includes("classList.remove(\"open\")"), true, "openクラスの除去で非表示にする")
assert.equal(source.includes("querySelector(\"input\")"), true, "開いた時にタスク名入力へフォーカスする")
assert.equal(source.includes("backdrop(event)"), true, "背景クリックで閉じるアクションを持つ")
assert.equal(source.includes("event.target === this.overlayTarget"), true, "ダイアログ内クリックでは閉じない")

console.log("task modal controller OK")
