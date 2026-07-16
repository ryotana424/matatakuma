import assert from "node:assert"
import { STEPS, stepById, resolveVisibleStep, nextStepId, isLastStep, SCREENS } from "./tour_steps.js"

// --- ステップ定義の健全性 ---
assert.equal(STEPS.length, 10, "0〜9の10ステップ")
assert.deepEqual(STEPS.map((s) => s.id), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "idは0..9で連番")
STEPS.forEach((s) => {
  assert.ok(typeof s.body === "string" && s.body.length > 0, `step ${s.id} は文言を持つ`)
  assert.ok(Object.values(SCREENS).includes(s.screen), `step ${s.id} の screen は既知の値`)
  assert.ok(typeof s.advance === "string" && s.advance.length > 0, `step ${s.id} は advance種別を持つ`)
})

// 中央表示ステップ（0,4,5,9）は target を持たない、それ以外は持つ
STEPS.forEach((s) => {
  const centered = [0, 4, 9].includes(s.id)
  assert.equal(s.target == null, centered, `step ${s.id} の target有無`)
})

// --- stepById ---
assert.equal(stepById(3).id, 3)
assert.equal(stepById(99), null, "存在しないidはnull")

// --- resolveVisibleStep: 保存ステップと現在画面の突き合わせ ---
assert.equal(resolveVisibleStep(1, SCREENS.TASK_LIST)?.id, 1)
assert.equal(resolveVisibleStep(1, SCREENS.MEASURE), null, "画面不一致なら表示しない")
assert.equal(resolveVisibleStep(4, SCREENS.MEASURE)?.id, 4)
assert.equal(resolveVisibleStep(5, SCREENS.MEASURE)?.id, 5)
assert.equal(resolveVisibleStep(7, SCREENS.TASK_LIST)?.id, 7, "step7は一覧/ヘッダーで表示")
assert.equal(resolveVisibleStep(8, SCREENS.REPORT_INDEX)?.id, 8)
assert.equal(resolveVisibleStep(9, SCREENS.REPORT_DETAIL)?.id, 9)

// --- nextStepId / isLastStep ---
assert.equal(nextStepId(0), 1)
assert.equal(nextStepId(8), 9)
assert.equal(nextStepId(9), null, "最終ステップの次はnull")
assert.equal(isLastStep(9), true)
assert.equal(isLastStep(3), false)

console.log("tour_steps OK")
