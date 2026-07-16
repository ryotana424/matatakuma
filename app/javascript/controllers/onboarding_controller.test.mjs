import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "onboarding_controller.js"), "utf8")

// 純ロジック/永続化モジュールを使い、コントローラ側で再実装していないこと
assert.equal(source.includes("from \"onboarding/tour_steps\""), true, "ステップ定義を純モジュールから読む")
assert.equal(source.includes("from \"onboarding/tour_storage\""), true, "永続化ラッパを使う")

// targets
;["backdrop", "highlight", "bubble", "title", "body", "nextBtn"].forEach((t) => {
  assert.equal(source.includes(`"${t}"`), true, `${t} を target に持つ`)
})

// 起動条件: 完了済みなら出さない
assert.equal(source.includes("isDoneStored"), true, "完了済み判定を参照する")

// 現在画面の判定に使うDOM手がかり
assert.equal(source.includes(".fp-page") || source.includes("measure"), true, "計測画面を判定する手がかりを持つ")
assert.equal(source.includes("report-detail"), true, "レポート詳細を判定する")

// スキップ/完了
assert.equal(source.includes("skip("), true, "skipアクションを持つ")
assert.equal(source.includes("markDone"), true, "完了記録する")

// 各 advance 種別を監視する分岐が存在すること
assert.equal(source.includes("ADVANCE.TOUR_BUTTON"), true, "ボタン待ち分岐")
assert.equal(source.includes("ADVANCE.CLICK_TARGET"), true, "クリック待ち分岐")
assert.equal(source.includes("ADVANCE.MODAL_OPEN"), true, "モーダルopen待ち分岐")
assert.equal(source.includes("ADVANCE.NAVIGATE"), true, "遷移待ち分岐（次ページで復元）")
assert.equal(source.includes("ADVANCE.CAMERA_START"), true, "カメラ開始待ち分岐")
assert.equal(source.includes("ADVANCE.TIMER"), true, "タイマー分岐")
assert.equal(source.includes("ADVANCE.ELEMENT_APPEAR"), true, "要素出現待ち分岐")
assert.equal(source.includes("MutationObserver"), true, "DOM変化の監視にMutationObserverを使う")
// 対象要素が未出現のときは出現を待って配置し直す
assert.equal(source.includes("waitForTarget") || source.includes("ELEMENT_APPEAR"), true, "対象出現待ちの仕組みを持つ")
// positionFor は fixed 座標系（getBoundingClientRect をそのまま使い scroll オフセットを足さない）
assert.equal(source.includes("window.scrollY"), false, "fixed座標なのでscrollYを足さない")
assert.equal(source.includes("window.scrollX"), false, "fixed座標なのでscrollXを足さない")

console.log("onboarding controller OK")
