import { Controller } from "@hotwired/stimulus"

// 説明・日次レポートを計測を止めずにモーダルで開くためのコントローラ。
// turbo-frame#modal に中身が読み込まれたらオーバーレイを表示し、
// ✕ / 背景クリック / Esc で閉じる。閉じる時はフレームを空にして再表示できるようにする。
export default class extends Controller {
  static targets = ["dialog", "frame"]

  connect() {
    // turbo-frame に中身が入ったタイミングで開く
    this.onFrameLoad = this.onFrameLoad.bind(this)
    this.frameTarget.addEventListener("turbo:frame-load", this.onFrameLoad)
  }

  disconnect() {
    this.frameTarget.removeEventListener("turbo:frame-load", this.onFrameLoad)
  }

  onFrameLoad() {
    // 空フレームのロード（閉じる際のリセット）では開かない
    if (this.frameTarget.innerHTML.trim() === "") return
    this.open()
  }

  open() {
    this.element.classList.add("open")
  }

  close() {
    if (!this.element.classList.contains("open")) return
    this.element.classList.remove("open")
    // 次回同じリンクを開けるようフレームを空に戻す
    this.frameTarget.removeAttribute("src")
    this.frameTarget.innerHTML = ""
  }

  // 背景（ダイアログ外）クリックで閉じる
  backdrop(event) {
    if (event.target === this.element) this.close()
  }
}
