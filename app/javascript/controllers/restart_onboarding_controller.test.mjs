import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "restart_onboarding_controller.js"), "utf8")

// 永続化ラッパの resetStored を使って初回状態に戻すこと
assert.equal(source.includes("from \"onboarding/tour_storage\""), true, "永続化ラッパを使う")
assert.equal(source.includes("resetStored"), true, "完了/進行フラグをリセットする")

// restart アクションを持ち、遷移先を value で受ける
assert.equal(source.includes("restart("), true, "restartアクションを持つ")
assert.equal(source.includes("event.preventDefault()"), true, "既定動作を止める")
assert.equal(source.includes("window.location"), true, "全画面遷移でツアー開始画面へ移動する")

console.log("restart onboarding controller OK")
