import { Controller } from "@hotwired/stimulus"
import { resetStored } from "onboarding/tour_storage"

// オンボーディングツアーを何度でも再生するためのコントローラ（Aboutページの再生ボタン用）。
// 完了/進行フラグを localStorage から消して初回状態に戻し、ツアー開始画面（タスク一覧）へ
// 全画面遷移する。遷移先で onboarding コントローラが初回として起動する。
export default class extends Controller {
  static values = { url: { type: String, default: "/tasks" } }

  restart(event) {
    event.preventDefault()
    resetStored(window.localStorage)
    // About は turbo-frame モーダル内で開かれるため、_top 相当の全画面遷移にする
    window.location.href = this.urlValue
  }
}
