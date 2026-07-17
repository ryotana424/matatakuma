import assert from "node:assert"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const controllerPath = join(currentDir, "task_list_filter_controller.js")

assert.equal(existsSync(controllerPath), true, "タスク表示切替コントローラが存在する")

const source = readFileSync(controllerPath, "utf8")

assert.equal(source.includes('static targets = ["button", "row", "empty"]'), true, "ボタン・行・空表示をtargetに持つ")
assert.equal(source.includes('this.show("active")'), true, "接続時は進行中を表示する")
assert.equal(source.includes("event.params.filter"), true, "押したボタンの表示グループを受け取る")
assert.equal(source.includes("row.hidden = row.dataset.taskListFilterGroup !== filter"), true, "選択外の行を隠す")
assert.equal(source.includes('classList.toggle("segmented__btn--active", isActive)'), true, "選択中ボタンを強調する")
assert.equal(source.includes('setAttribute("aria-pressed", isActive ? "true" : "false")'), true, "選択状態を支援技術へ伝える")

console.log("task list filter controller OK")
