// ツアーの純ロジック。DOM・localStorage・イベントには一切依存しない。
// Stimulus コントローラ側がここから読んだメタデータを使って DOM を操作する。

// 画面種別。onboarding_controller が現在ページを判定してこの値のいずれかを渡す。
export const SCREENS = {
  TASK_LIST: "task_list", // ルート / 計測画面のタスク一覧部分（ヘッダーもここ扱い）
  MEASURE: "measure",     // 計測画面
}

// advance（完了トリガー）の種別。実際の監視方法は onboarding_controller が解釈する。
export const ADVANCE = {
  TOUR_BUTTON: "tour_button",   // 吹き出し内の「はじめる」「完了」ボタン
  MODAL_OPEN: "modal_open",     // 対象モーダルに open クラスが付く
  NAVIGATE: "navigate",         // 別ページへ遷移（次ページで復元）
  CAMERA_START: "camera_start", // カメラ映像が開始する
  TIMER: "timer",               // 一定時間経過
}

// ステップ定義。target が null のものは画面中央に表示する。
// ツアーは「タスク登録 → 計測 → 保存」まで。日次レポートは締めの案内で触れるだけにし、
// Turbo frame モーダル内の操作誘導は行わない（開閉と画面判定の競合を避けるため）。
export const STEPS = [
  {
    id: 0, screen: SCREENS.TASK_LIST, target: null, advance: ADVANCE.TOUR_BUTTON,
    title: "ようこそ",
    body: "Matatakuma へようこそ。集中を計測する一連の流れを、実際に触りながら一緒にやってみましょう。",
  },
  {
    id: 1, screen: SCREENS.TASK_LIST, target: ".task-panel__add", advance: ADVANCE.MODAL_OPEN,
    modalTarget: ".task-modal",
    body: "まずタスクを1つ登録します。「＋ タスク追加」を押してください。",
  },
  {
    id: 2, screen: SCREENS.TASK_LIST, target: ".task-form--modal", advance: ADVANCE.NAVIGATE,
    body: "タスク名を入れて「追加」を押してください。",
  },
  {
    id: 3, screen: SCREENS.TASK_LIST, target: ".task-grid__row .task-btn", advance: ADVANCE.NAVIGATE,
    body: "登録できました。追加したタスク（一覧の先頭）の「計測開始」を押すと計測画面へ進みます。",
  },
  {
    id: 4, screen: SCREENS.MEASURE, target: null, advance: ADVANCE.CAMERA_START,
    body: "ブラウザ上部にカメラの許可を求める表示が出ます。「許可」を選んでください。映像は端末内だけで処理され、サーバーには送られません。",
  },
  {
    id: 5, screen: SCREENS.MEASURE, target: ".measure-score", advance: ADVANCE.TIMER,
    timerMs: 5000,
    body: "集中度が1秒ごとに更新されます。少し画面を見てみましょう。",
  },
  {
    id: 6, screen: SCREENS.MEASURE, target: ".btn--finish", advance: ADVANCE.NAVIGATE,
    body: "終わったら「計測終了して保存」を押します。保存すると一覧に戻ります。",
  },
  {
    id: 7, screen: SCREENS.TASK_LIST, target: null, advance: ADVANCE.TOUR_BUTTON,
    title: "お疲れさまでした",
    body: "計測が保存されました。ヘッダーの「日次レポート」から今日の詳細を振り返れます。これでツアーは完了です。",
  },
]

export function stepById(id) {
  return STEPS.find((s) => s.id === id) || null
}

// 保存済みステップ番号と現在画面から、いま表示すべきステップを返す。
// 画面が一致しない（＝別ページで待機すべき）場合は null。
export function resolveVisibleStep(savedStepId, currentScreen) {
  const step = stepById(savedStepId)
  if (!step) return null
  if (step.screen !== currentScreen) return null
  return step
}

export function nextStepId(currentId) {
  const idx = STEPS.findIndex((s) => s.id === currentId)
  if (idx === -1 || idx === STEPS.length - 1) return null
  return STEPS[idx + 1].id
}

export function isLastStep(id) {
  return STEPS.length > 0 && STEPS[STEPS.length - 1].id === id
}
