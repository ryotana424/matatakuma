import assert from "node:assert"
import { STORAGE_KEYS, readStep, writeStep, isDoneStored, markDone, resetStored } from "./tour_storage.js"

// メモリ上の localStorage スタブ
function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  }
}

// 初期状態: 保存ステップなし・未完了
let s = makeStorage()
assert.equal(readStep(s), null, "初期は保存ステップなし")
assert.equal(isDoneStored(s), false, "初期は未完了")

// ステップ保存/復元
writeStep(s, 3)
assert.equal(readStep(s), 3, "保存したステップを読み戻せる")
assert.equal(s._map.get(STORAGE_KEYS.step), "3")

// 不正値は null 扱い
s._map.set(STORAGE_KEYS.step, "abc")
assert.equal(readStep(s), null, "数値化できない保存値は null")

// 空文字・空白・負数・小数・16進は不正値として null（Number("")===0 の罠を避ける）
for (const bad of ["", "  ", "-1", "3.5", "0x3", "abc"]) {
  s._map.set(STORAGE_KEYS.step, bad)
  assert.equal(readStep(s), null, `不正値 ${JSON.stringify(bad)} は null`)
}
// 正当な非負整数は読める
s._map.set(STORAGE_KEYS.step, "0")
assert.equal(readStep(s), 0, "0は正当なステップ")
s._map.set(STORAGE_KEYS.step, "7")
assert.equal(readStep(s), 7)

// 完了フラグ
s = makeStorage()
markDone(s)
assert.equal(isDoneStored(s), true, "完了フラグを立てられる")

// reset で両方消える
writeStep(s, 5)
resetStored(s)
assert.equal(readStep(s), null)
assert.equal(isDoneStored(s), false)

// storage 例外時（プライベートモード等）でも throw しない
const throwing = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("blocked") }, removeItem: () => { throw new Error("blocked") } }
assert.doesNotThrow(() => readStep(throwing), "読み取り失敗で例外を投げない")
assert.equal(readStep(throwing), null)
assert.doesNotThrow(() => writeStep(throwing, 1), "書き込み失敗で例外を投げない")
assert.doesNotThrow(() => markDone(throwing))
assert.equal(isDoneStored(throwing), false)

console.log("tour_storage OK")
