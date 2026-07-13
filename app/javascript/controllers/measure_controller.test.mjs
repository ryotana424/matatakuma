import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "measure_controller.js"), "utf8")

assert.equal(source.includes(".drawImage("), false, "カメラ映像をcanvasへ描画しない")
assert.equal(source.includes("drawPrivacySurface"), true, "匿名化された表示面を描画する")
assert.equal(source.includes("static targets = [\"video\", \"canvas\", \"score\", \"state\", \"stopBtn\", \"placeholder\", \"message\", \"cameraSelect\", \"pulseCanvas\", \"blinkCount\", \"sessionAverage\", \"interventionSelect\", \"dailyDuration\", \"dailyFocusVolume\", \"dailyAverage\"]"), true, "カメラ選択・波形canvas・平均スコア・施策選択・日次ステータスのtargetを持つ")
assert.equal(source.includes("this.start()"), true, "画面表示時に自動で計測開始する")
assert.equal(source.includes("enumerateDevices()"), true, "利用可能なカメラを列挙する")
assert.equal(source.includes("deviceId: { exact: deviceId }"), true, "選択したカメラIDで起動する")
assert.equal(source.includes("changeCamera("), true, "カメラ切替アクションを持つ")
assert.equal(source.includes("SCORE_HISTORY_MAX_POINTS = 30 * 60"), true, "スコア推移は最大過去30分を保持する")
assert.equal(source.includes("drawScoreTrend("), true, "スコア推移を折れ線グラフに描画する")
assert.equal(source.includes("const y = scoreToY(score)"), true, "スコア値をそのまま折れ線の高さへ変換する")
assert.equal(source.includes("const beat"), false, "心電図風の拍動補正を使わない")
assert.equal(source.includes("isFaceTemporarilyAbsent(this.frameBuffer)"), true, "一時的な顔ロスト中はスコア保存を待つ")
assert.equal(source.includes("this.scoreTarget.textContent = \"—\""), true, "一時的な顔ロスト中はスコアを表示しない")
assert.equal(source.includes("this.stateTarget.dataset.state = \"interrupted\""), true, "一時的な顔ロスト中の表示状態を持つ")
assert.equal(source.includes("\"sessionAverage\""), true, "このセッションの平均スコア表示targetを持つ")
assert.equal(source.includes("updateSessionAverage()"), true, "サンプル追加時にこのセッション平均を更新する")
assert.equal(source.includes("averageFocusableScore"), true, "このセッション平均は離席サンプルを除いて計算する")
assert.equal(source.includes("this.sessionAverageTarget.textContent = average"), true, "このセッション平均を画面へ表示する")
assert.equal(source.includes("CAMERA_DEVICE_COOKIE"), true, "前回選択したカメラを保存するCookie名を持つ")
assert.equal(source.includes("readCookie(CAMERA_DEVICE_COOKIE)"), true, "起動時に前回のカメラIDをCookieから読む")
assert.equal(source.includes("writeCookie(CAMERA_DEVICE_COOKIE, this.selectedDeviceId"), true, "起動・切替後に選択したカメラIDをCookieへ保存する")
assert.equal(source.includes("SameSite=Lax"), true, "CookieはSameSite=Laxで保存する")

const changeCameraSource = source.slice(
  source.indexOf("async changeCamera("),
  source.indexOf("\n  onResults("),
)
assert.equal(changeCameraSource.includes("this.waitingForReturn"), true, "復帰待ち中のカメラ切替後も復帰待ち表示を保つ")
assert.equal(source.includes("isDebugModeEnabled()"), true, "URLパラメータでデバッグモードを判定する")
assert.equal(source.includes("new URLSearchParams(window.location.search)"), true, "クエリ文字列からdebugパラメータを読む")
assert.equal(source.includes("this.debugMode = this.isDebugModeEnabled()"), true, "接続時にデバッグモードを保持する")
assert.equal(source.includes("if (!this.debugMode) return"), true, "通常URLではデバッグUIを作らない")
assert.equal(source.includes("data-measure-debug-key"), true, "デバッグ指標をキー付きで更新できるDOMにする")
assert.equal(source.includes("updateDebugPanel({ score, state, metrics })"), true, "スコアサンプルごとにデバッグ指標を更新する")
assert.equal(source.includes("updateDebugPanel({ interrupted: true })"), true, "顔ロスト中もデバッグ表示を更新する")
assert.equal(source.includes("facePresent"), true, "顔検出率をデバッグ表示する")
assert.equal(source.includes("gazeOnScreen"), true, "視線スコアをデバッグ表示する")
assert.equal(source.includes("headStable"), true, "頭部安定スコアをデバッグ表示する")
assert.equal(source.includes("blinkNormal"), true, "瞬き正常度をデバッグ表示する")
assert.equal(source.includes("sessionContinuity"), true, "継続度をデバッグ表示する")
assert.equal(source.includes("closedEyesDurationMs"), true, "閉眼時間をデバッグ表示する")
assert.equal(source.includes("Score (総合スコア)"), true, "デバッグ指標名に日本語名を併記する")
assert.equal(source.includes("Face (顔検出率)"), true, "顔検出率の日本語名を併記する")
assert.equal(source.includes("Gaze (視線)"), true, "視線スコアの日本語名を併記する")
assert.equal(source.includes("Head (頭部安定)"), true, "頭部安定スコアの日本語名を併記する")
assert.equal(source.includes("Blink (瞬き正常度)"), true, "瞬き正常度の日本語名を併記する")
assert.equal(source.includes("Continuity (継続度)"), true, "継続度の日本語名を併記する")

assert.equal(source.includes("this.sessionId = null"), true, "開始時に作成したSession IDを保持する")
assert.equal(source.includes("this.autosaveTick = setInterval(() => this.saveProgress(), 15000)"), true, "計測中に定期保存する")
assert.equal(source.includes("await this.createSession()"), true, "計測開始時にrunningセッションを作成する")
assert.equal(source.includes("await this.saveProgress({ completed: true })"), true, "停止時にcompletedとして最終保存する")
assert.equal(source.includes("faceAbsenceDeadlineMs"), true, "顔の連続未検出から自動終了期限を判定する")
assert.equal(source.includes("void this.stopForAbsence(new Date(deadlineMs))"), true, "離席が30分続いた時点で自動終了する")
assert.equal(source.includes("this.faceAbsentSinceMs = null"), true, "顔を再検出したら連続離席時間をリセットする")
assert.equal(source.includes("payload.status = \"interrupted\""), true, "離席による自動終了を中断セッションとして保存する")
assert.equal(source.includes("this.waitingForReturn = true"), true, "離席終了後は画面を閉じず復帰待ちへ移る")
assert.equal(source.includes("faceReturnState"), true, "顔の連続検出時間から復帰を判定する")
assert.equal(source.includes("void this.restartAfterAbsence()"), true, "復帰確認後に新しいセッションを自動開始する")
assert.equal(source.includes("this.restartFailed = true"), true, "自動再開の応答不明時に重複セッション作成を繰り返さない")
assert.equal(source.includes("resetSessionMeasurements()"), true, "自動再開時にセッション単位の計測値をリセットする")
assert.equal(source.includes("delete this.scoreTarget.dataset.state"), true, "自動再開時に前セッションのスコア表示状態を消す")
assert.equal(source.includes("delete this.stateTarget.dataset.state"), true, "自動再開時に前セッションの状態表示を消す")

const stopForAbsenceSource = source.slice(
  source.indexOf("async stopForAbsence("),
  source.indexOf("\n  shutdown()"),
)
assert.equal(stopForAbsenceSource.includes("window.location.href"), false, "離席終了後はタスク一覧へ移動しない")
assert.equal(stopForAbsenceSource.includes("this.stopVideoStream()"), false, "離席終了後も復帰検出用のカメラを止めない")
assert.equal(stopForAbsenceSource.includes("catch"), true, "離席終了の通信エラー時も失敗状態へ移れる")

assert.equal(source.includes("payload.intervention_id = this.selectedInterventionId()"), true, "定期保存と終了保存で選択中の施策IDを送る")
assert.equal(source.includes("return value === \"\" ? null : Number(value)"), true, "施策未選択はnullとして送り紐付けを外せる")

assert.equal(source.includes("updateDailyStatus()"), true, "毎秒サンプリング時に日次ステータスバーを更新する")
assert.equal(source.includes("dailyBaseDurationSecValue"), true, "保存済みの本日作業秒数をベース値として受け取る")
assert.equal(source.includes("dailyBaseVolumeValue"), true, "保存済みの本日集中度総量をベース値として受け取る")
assert.equal(source.includes("dailyBaseScoreSumValue"), true, "保存済みセッションのスコア合計をベース値として受け取る")
assert.equal(source.includes("dailyBaseSessionCountValue"), true, "保存済みセッション数をベース値として受け取る")
assert.equal(source.includes("focusVolume(this.samples)"), true, "離席を除いた集中度総量を共通関数で算出する")
assert.equal(source.includes("if (!this.hasDailyDurationTarget"), true, "日次ステータスバーが無い画面では何もしない")

console.log("measure controller privacy display OK")
