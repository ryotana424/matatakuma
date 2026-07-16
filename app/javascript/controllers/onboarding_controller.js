import { Controller } from "@hotwired/stimulus"
import { STEPS, SCREENS, ADVANCE, stepById, resolveVisibleStep, nextStepId, isLastStep } from "onboarding/tour_steps"
import { readStep, writeStep, isDoneStored, markDone } from "onboarding/tour_storage"

// オンボーディングツアーの DOM アダプタ。
// 進行ロジックは onboarding/tour_steps、永続化は onboarding/tour_storage に委譲し、
// ここでは「現在画面の判定」「対象要素の探索と吹き出し配置」「完了トリガーの監視」を担う。
// 既存コントローラ（measure / task-modal / modal）は改変せず、DOM セレクタ経由で参照する。
export default class extends Controller {
  static targets = ["backdrop", "highlight", "bubble", "title", "body", "nextBtn"]

  connect() {
    this.storage = window.localStorage
    // 完了/スキップ済みなら何もしない
    if (isDoneStored(this.storage)) return

    // 初回（保存ステップなし）はステップ0から。以降は保存ステップを復元。
    this.currentStepId = readStep(this.storage)
    if (this.currentStepId == null) {
      this.currentStepId = 0
      writeStep(this.storage, 0)
    }

    this.screen = this.detectScreen()
    this.cleanupFns = []
    this.renderCurrent()
  }

  disconnect() {
    this.teardownAdvanceWatch()
  }

  // 現在ページがどの画面かを DOM から判定する。
  detectScreen() {
    if (document.querySelector(".report-detail")) return SCREENS.REPORT_DETAIL
    if (document.querySelector(".report-index")) return SCREENS.REPORT_INDEX
    if (document.querySelector(".fp-page[data-controller~=\"measure\"]")) return SCREENS.MEASURE
    if (document.querySelector(".task-panel")) return SCREENS.TASK_LIST
    return null
  }

  // 現在の保存ステップと画面から、表示すべき吹き出しを描く。
  // この画面で表示すべきものが無ければ非表示のまま待機する。
  renderCurrent() {
    const step = resolveVisibleStep(this.currentStepId, this.screen)
    if (!step) {
      this.hide()
      return
    }
    this.showStep(step)
  }

  showStep(step) {
    this.element.hidden = false
    this.titleTarget.textContent = step.title || ""
    this.titleTarget.hidden = !step.title
    this.bodyTarget.textContent = step.body

    // TOUR_BUTTON のステップだけ「はじめる/完了」ボタンを出す
    const usesButton = step.advance === ADVANCE.TOUR_BUTTON
    this.nextBtnTarget.hidden = !usesButton
    if (usesButton) this.nextBtnTarget.textContent = isLastStep(step.id) ? "完了" : "はじめる"

    this.positionFor(step)
    this.setupAdvanceWatch(step) // 実装は Task5
  }

  // target があればその要素の位置にハイライト＋吹き出しを寄せる。無ければ中央表示。
  positionFor(step) {
    const el = step.target ? document.querySelector(step.target) : null
    if (!el) {
      // 中央表示。対象がまだ無いステップ（target指定あり）は出現を待つ（Task5）
      this.bubbleTarget.classList.add("onboarding__bubble--center")
      this.highlightTarget.hidden = true
      return
    }
    this.bubbleTarget.classList.remove("onboarding__bubble--center")
    const rect = el.getBoundingClientRect()
    this.highlightTarget.hidden = false
    this.highlightTarget.style.top = `${rect.top + window.scrollY}px`
    this.highlightTarget.style.left = `${rect.left + window.scrollX}px`
    this.highlightTarget.style.width = `${rect.width}px`
    this.highlightTarget.style.height = `${rect.height}px`
    // 吹き出しは対象の下に置く（画面端は CSS 側で clamp）
    this.bubbleTarget.style.top = `${rect.bottom + window.scrollY + 12}px`
    this.bubbleTarget.style.left = `${rect.left + window.scrollX}px`
  }

  hide() {
    this.element.hidden = true
  }

  // 吹き出しの「はじめる/完了」ボタン。最終ステップなら完了、そうでなければ次へ。
  advanceByButton() {
    const step = stepById(this.currentStepId)
    if (step && isLastStep(step.id)) {
      this.finish()
    } else {
      this.goToNext()
    }
  }

  // 次のステップへ進み、保存して再描画する。
  goToNext() {
    const next = nextStepId(this.currentStepId)
    this.teardownAdvanceWatch()
    if (next == null) {
      this.finish()
      return
    }
    this.currentStepId = next
    writeStep(this.storage, next)
    this.renderCurrent()
  }

  // スキップ = 完了扱い。
  skip() {
    this.finish()
  }

  finish() {
    this.teardownAdvanceWatch()
    markDone(this.storage)
    this.hide()
  }

  // --- 以下、完了トリガー監視は Task5 で実装する ---
  setupAdvanceWatch(_step) {}
  teardownAdvanceWatch() {
    if (!this.cleanupFns) return
    this.cleanupFns.forEach((fn) => fn())
    this.cleanupFns = []
  }
}
