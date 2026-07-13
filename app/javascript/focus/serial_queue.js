// 保存リクエストを追加順に実行する。前の処理が失敗しても後続は止めない。
export class SerialQueue {
  constructor() {
    this.tail = Promise.resolve()
  }

  enqueue(operation) {
    const result = this.tail.catch(() => undefined).then(operation)
    this.tail = result.catch(() => undefined)
    return result
  }
}
