// ツアー進行状態の永続化ラッパ。storage（localStorage 互換）を引数で受け取り、
// Node からもテストできるようにする。プライベートモード等で throw しても握りつぶす。

export const STORAGE_KEYS = {
  step: "matatakuma_onboarding_step", // 現在の進行ステップ番号
  done: "matatakuma_onboarding_done", // 完了/スキップ済みフラグ
}

// 現在の保存ステップ番号を返す。未保存・不正値（空文字/非整数/負数）は null。
export function readStep(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEYS.step)
    if (raw == null) return null
    const trimmed = String(raw).trim()
    // 非負整数の表記だけを受け付ける（"", " ", "3.5", "-1", "0x3", "abc" は弾く）
    if (!/^\d+$/.test(trimmed)) return null
    return Number(trimmed)
  } catch {
    return null
  }
}

export function writeStep(storage, stepId) {
  try {
    storage.setItem(STORAGE_KEYS.step, String(stepId))
  } catch {
    // 保存できない環境ではツアーは単発表示になるが、致命ではないので無視する
  }
}

export function isDoneStored(storage) {
  try {
    return storage.getItem(STORAGE_KEYS.done) === "1"
  } catch {
    return false
  }
}

export function markDone(storage) {
  try {
    storage.setItem(STORAGE_KEYS.done, "1")
    storage.removeItem(STORAGE_KEYS.step)
  } catch {
    // 無視（次回また表示される可能性はあるが実害は小さい）
  }
}

export function resetStored(storage) {
  try {
    storage.removeItem(STORAGE_KEYS.step)
    storage.removeItem(STORAGE_KEYS.done)
  } catch {
    // 無視
  }
}
