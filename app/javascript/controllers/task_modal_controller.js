import { Controller } from "@hotwired/stimulus"

// タスク追加フォームをモーダルで開閉するコントローラ。
// フォームは通常のPOST送信（Turboのページ遷移）で、バリデーションエラー時は
// サーバ側で open value を立てて再描画するため、接続直後に自動で開き直す。
export default class extends Controller {
  static targets = ["overlay"]
  static values = { open: Boolean }

  connect() {
    if (this.openValue) this.open()
  }

  open() {
    this.overlayTarget.classList.add("open")
    this.overlayTarget.querySelector("input")?.focus()
  }

  close() {
    this.overlayTarget.classList.remove("open")
  }

  // 背景（ダイアログ外）クリックで閉じる
  backdrop(event) {
    if (event.target === this.overlayTarget) this.close()
  }
}
