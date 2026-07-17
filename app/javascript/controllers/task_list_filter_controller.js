import { Controller } from "@hotwired/stimulus"

// タスク一覧を「進行中」と「終了済」に切り替える。
// 行の状態分類はビュー側が担い、このコントローラは表示だけを制御する。
export default class extends Controller {
  static targets = ["button", "row", "empty"]

  connect() {
    this.show("active")
  }

  select(event) {
    this.show(event.params.filter)
  }

  show(filter) {
    this.rowTargets.forEach((row) => {
      row.hidden = row.dataset.taskListFilterGroup !== filter
    })

    this.buttonTargets.forEach((button) => {
      const isActive = button.dataset.taskListFilterFilterParam === filter
      button.classList.toggle("segmented__btn--active", isActive)
      button.setAttribute("aria-pressed", isActive ? "true" : "false")
    })

    const hasVisibleRows = this.rowTargets.some((row) => !row.hidden)
    this.emptyTargets.forEach((empty) => {
      empty.hidden = empty.dataset.taskListFilterGroup !== filter || hasVisibleRows
    })
  }
}
