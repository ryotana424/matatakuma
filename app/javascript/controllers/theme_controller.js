import { Controller } from "@hotwired/stimulus"

// テーマ切替（自動 / ライト / ダーク）。
// - 自動: data-theme を外し、OS 設定（prefers-color-scheme）に追従する
// - ライト / ダーク: html 要素に data-theme を付与して固定する
// 選択は localStorage("fp-theme") に保存し、次回以降・全ページで復元する。
// （FOUC 回避のための初期復元は layout の head スクリプトが担当する）
export default class extends Controller {
  static targets = ["btn"]

  connect() {
    this.refresh()
  }

  select(event) {
    const theme = event.params.theme
    try {
      if (theme === "auto") {
        localStorage.removeItem("fp-theme")
      } else {
        localStorage.setItem("fp-theme", theme)
      }
    } catch (e) {
      // localStorage が使えない環境では保存を諦め、その場の切替のみ行う
    }
    this.apply(theme)
    this.refresh()
  }

  apply(theme) {
    const root = document.documentElement
    if (theme === "auto") {
      root.removeAttribute("data-theme")
    } else {
      root.setAttribute("data-theme", theme)
    }
  }

  // 現在の選択状態を読み、アクティブなボタンに印を付ける
  refresh() {
    const current = this.current()
    this.btnTargets.forEach((btn) => {
      const isActive = btn.dataset.themeThemeParam === current
      btn.classList.toggle("segmented__btn--active", isActive)
      btn.setAttribute("aria-pressed", isActive ? "true" : "false")
    })
  }

  current() {
    let stored = null
    try {
      stored = localStorage.getItem("fp-theme")
    } catch (e) {
      // 読めなければ data-theme 属性から判定する
    }
    if (stored === "light" || stored === "dark") return stored
    return "auto"
  }
}
