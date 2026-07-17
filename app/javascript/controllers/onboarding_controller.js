import { Controller } from "@hotwired/stimulus"
import { SCREENS, ADVANCE, stepById, resolveVisibleStep, nextStepId, isLastStep } from "onboarding/tour_steps"
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
  // 計測画面にもタスク一覧（.task-panel）があるため、計測を先に判定する。
  detectScreen() {
    if (document.querySelector(".fp-page[data-controller~=\"measure\"]")) return SCREENS.MEASURE
    if (document.querySelector(".task-panel")) return SCREENS.TASK_LIST
    return null
  }

  // 現在の保存ステップと画面から、表示すべき吹き出しを描く。
  // この画面で表示すべきものが無ければ非表示のまま待機する。
  renderCurrent() {
    // 再描画のたびに前回の完了トリガー監視を掃除してから張り直す（重複防止）。
    this.teardownAdvanceWatch()
    // 保存ステップ自体が存在しない（ステップ定義変更後の範囲外値など）なら、
    // 中途半端な状態で残さず完了扱いにして畳む。
    if (!stepById(this.currentStepId)) {
      this.finish()
      return
    }
    this.screen = this.detectScreen()
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
    this.setupAdvanceWatch(step)
  }

  // target があればその要素の位置にハイライト＋吹き出しを寄せる。無ければ中央表示。
  positionFor(step) {
    const el = step.target ? document.querySelector(step.target) : null
    if (!el) {
      // 中央表示。対象がまだ無いステップ（target指定あり）は出現を待って配置し直す
      this.bubbleTarget.classList.add("onboarding__bubble--center")
      this.highlightTarget.hidden = true
      return
    }
    this.bubbleTarget.classList.remove("onboarding__bubble--center")
    const rect = el.getBoundingClientRect()
    // .onboarding は position:fixed のため、getBoundingClientRect の値（ビューポート基準）をそのまま使う
    this.highlightTarget.hidden = false
    this.highlightTarget.style.top = `${rect.top}px`
    this.highlightTarget.style.left = `${rect.left}px`
    this.highlightTarget.style.width = `${rect.width}px`
    this.highlightTarget.style.height = `${rect.height}px`
    // 吹き出しは対象の下に置く（画面端は CSS 側で clamp）
    this.bubbleTarget.style.top = `${rect.bottom + 12}px`
    this.bubbleTarget.style.left = `${rect.left}px`
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

  // ステップの完了トリガーを監視する。検出したら goToNext() を呼ぶ。
  setupAdvanceWatch(step) {
    // ハイライト配置と完了トリガーは別物として扱う。
    // target がまだ無い場合はハイライトだけ出現を待って更新するが、
    // 完了トリガー（attachAdvance）は target の有無に関わらず必ず張る。
    if (step.target && !document.querySelector(step.target)) {
      this.waitForTarget(step.target, () => this.positionFor(step))
    }
    this.attachAdvance(step)
  }

  attachAdvance(step) {
    switch (step.advance) {
      case ADVANCE.TOUR_BUTTON:
        // ボタンの click は advanceByButton() が拾う。追加監視は不要。
        break
      case ADVANCE.MODAL_OPEN:
        this.watchModalOpen(step.modalTarget)
        break
      case ADVANCE.CAMERA_START:
        this.watchCameraStart()
        break
      case ADVANCE.TIMER:
        this.watchTimer(step.timerMs || 5000)
        break
      case ADVANCE.SAVE_COMPLETE:
        this.watchSaveComplete()
        break
      case ADVANCE.NAVIGATE:
        // 対象の操作でページ遷移する。遷移「前」に次ステップを保存しておき、
        // 遷移先ページの connect で resolveVisibleStep が次ステップを復元できるようにする。
        this.watchNavigate(step.target)
        break
    }
  }

  // 対象要素が DOM に現れるまで待ち、現れたら cb を1度だけ呼ぶ。
  waitForTarget(selector, cb) {
    const existing = document.querySelector(selector)
    if (existing) { cb(); return }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect()
        cb()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    this.cleanupFns.push(() => observer.disconnect())
  }

  // 対象モーダルに open クラスが付いたら次へ。
  watchModalOpen(modalSelector) {
    const modal = document.querySelector(modalSelector)
    if (!modal) return
    if (modal.classList.contains("open")) { this.goToNext(); return }
    const observer = new MutationObserver(() => {
      if (modal.classList.contains("open")) {
        observer.disconnect()
        this.goToNext()
      }
    })
    observer.observe(modal, { attributes: true, attributeFilter: ["class"] })
    this.cleanupFns.push(() => observer.disconnect())
  }

  // 計測画面の video が再生を始めたら（カメラ許可完了）次へ。
  // placeholder が hidden になるか、video の playing を検出する。
  watchCameraStart() {
    const video = document.querySelector("[data-measure-target=\"video\"]")
    const placeholder = document.querySelector("[data-measure-target=\"placeholder\"]")
    let videoCleanup = null
    let phObserver = null

    const cleanup = () => {
      if (typeof videoCleanup === "function") videoCleanup()
      if (phObserver) phObserver.disconnect()
    }
    const done = () => { cleanup(); this.goToNext() }

    if (video) {
      if (video.srcObject && !video.paused) { done(); return }
      const onPlaying = () => done()
      video.addEventListener("playing", onPlaying, { once: true })
      videoCleanup = () => video.removeEventListener("playing", onPlaying)
      this.cleanupFns.push(() => { if (typeof videoCleanup === "function") videoCleanup() })
    }

    if (placeholder) {
      if (placeholder.hidden) { done(); return }
      phObserver = new MutationObserver(() => {
        if (placeholder.hidden) done()
      })
      phObserver.observe(placeholder, { attributes: true, attributeFilter: ["hidden"] })
      this.cleanupFns.push(() => { if (phObserver) phObserver.disconnect() })
    }
  }

  watchTimer(ms) {
    const id = setTimeout(() => this.goToNext(), ms)
    this.cleanupFns.push(() => clearTimeout(id))
  }

  // 保存成功後、計測画面内の「計測を再開」ボタンが表示されたら締めの案内へ進む。
  watchSaveComplete() {
    const resumeButton = document.querySelector("[data-measure-target=\"resumeBtn\"]")
    if (!resumeButton) return
    if (!resumeButton.hidden) { this.goToNext(); return }

    const observer = new MutationObserver(() => {
      if (!resumeButton.hidden) {
        observer.disconnect()
        this.goToNext()
      }
    })
    observer.observe(resumeButton, { attributes: true, attributeFilter: ["hidden"] })
    this.cleanupFns.push(() => observer.disconnect())
  }

  // ページ遷移を伴うステップ。対象の操作（フォームは submit、リンク/ボタンは click）を捉え、
  // 遷移前に次ステップを保存だけする。実際の画面遷移は既存UIに任せ、こちらは阻害しない。
  watchNavigate(selector) {
    const el = document.querySelector(selector)
    if (!el) return
    // <form> 自体、またはフォームを含む要素なら submit を、それ以外は click を待つ。
    const form = el.tagName === "FORM" ? el : el.querySelector("form")
    if (form) {
      const onSubmit = () => this.advanceStored()
      form.addEventListener("submit", onSubmit, { once: true })
      this.cleanupFns.push(() => form.removeEventListener("submit", onSubmit))
      return
    }
    const onClick = () => this.advanceStored()
    el.addEventListener("click", onClick, { once: true })
    this.cleanupFns.push(() => el.removeEventListener("click", onClick))
  }

  // 次ステップ番号を保存するだけ（再描画しない）。ページ遷移する NAVIGATE 用。
  advanceStored() {
    const next = nextStepId(this.currentStepId)
    if (next == null) {
      markDone(this.storage)
      return
    }
    writeStep(this.storage, next)
  }

  teardownAdvanceWatch() {
    if (!this.cleanupFns) return
    this.cleanupFns.forEach((fn) => fn())
    this.cleanupFns = []
  }
}
