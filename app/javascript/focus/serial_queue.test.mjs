import assert from "node:assert"
import { SerialQueue } from "./serial_queue.js"

const queue = new SerialQueue()
const events = []
let releaseFirst
const firstGate = new Promise((resolve) => { releaseFirst = resolve })

const first = queue.enqueue(async () => {
  events.push("first:start")
  await firstGate
  events.push("first:end")
  return "first"
})
const second = queue.enqueue(async () => {
  events.push("second")
  return "second"
})

await new Promise((resolve) => setTimeout(resolve, 0))
assert.deepEqual(events, ["first:start"], "前の処理が終わるまで次の処理を開始しない")

releaseFirst()
assert.deepEqual(await Promise.all([first, second]), ["first", "second"])
assert.deepEqual(events, ["first:start", "first:end", "second"], "追加順に処理する")

await assert.rejects(queue.enqueue(async () => { throw new Error("save failed") }), /save failed/)
assert.equal(await queue.enqueue(async () => "recovered"), "recovered", "失敗後も後続処理を実行できる")

console.log("serial queue OK")
