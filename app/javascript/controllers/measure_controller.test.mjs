import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "measure_controller.js"), "utf8")

assert.equal(source.includes(".drawImage("), false, "カメラ映像をcanvasへ描画しない")
assert.equal(source.includes("drawPrivacySurface"), true, "匿名化された表示面を描画する")
assert.equal(source.includes("static targets = [\"video\", \"canvas\", \"score\", \"state\", \"stopBtn\", \"resumeBtn\", \"placeholder\", \"message\", \"cameraSelect\", \"pulseCanvas\", \"blinkCount\", \"sessionAverage\", \"miniSessionAverage\", \"sessionElapsed\", \"miniStatus\", \"interventionSelect\", \"dailyDuration\", \"dailyFocusVolume\", \"dailyAverage\", \"taskMeasurementStatus\", \"taskStopBtn\", \"taskResumeBtn\"]"), true, "カメラ選択・波形canvas・セッション指標・ミニ表示状態・施策選択・日次ステータス・再開ボタン・タスク行状態のtargetを持つ")
assert.equal(source.includes("this.start()"), true, "画面表示時に自動で計測開始する")
const startSource = source.slice(source.indexOf("async start()"), source.indexOf("\n  async populateCameraOptions("))
assert.equal(startSource.includes('error.name === "AbortError"'), true, "無効化された初期カメラ開始ではセッションを開始しない")
assert.equal(source.includes("enumerateDevices()"), true, "利用可能なカメラを列挙する")
assert.equal(source.includes("deviceId: { exact: deviceId }"), true, "選択したカメラIDで起動する")
assert.equal(source.includes("changeCamera("), true, "カメラ切替アクションを持つ")
assert.equal((source.match(/getUserMedia\(/g) || []).length, 1, "カメラ映像は開始処理ごとに1回だけ取得する")
assert.equal(source.includes("new Camera("), false, "カメラを再取得するMediaPipe Camera補助クラスを使わない")
assert.equal(source.includes("new MediaPipeFrameLoop("), true, "取得済み映像をMediaPipeへ渡すフレームループを使う")
assert.equal(source.includes("this.cameraStartGeneration = 0"), true, "カメラ開始処理を世代で無効化できる")
assert.equal(source.includes("const generation = ++this.cameraStartGeneration"), true, "カメラ開始ごとに新しい世代を発行する")
assert.equal(source.includes('document.addEventListener("visibilitychange"'), true, "タブの表示状態変更を監視する")
assert.equal(source.includes("this.frameLoop.setBackground(document.hidden)"), true, "別タブ中はバックグラウンド解析へ切り替える")
assert.equal(source.includes('document.removeEventListener("visibilitychange"'), true, "画面破棄時に表示状態監視を解除する")
assert.equal(source.includes("SCORE_HISTORY_MAX_POINTS = 30 * 60"), true, "スコア推移は最大過去30分を保持する")
assert.equal(source.includes("drawScoreTrend("), true, "スコア推移を折れ線グラフに描画する")
assert.equal(source.includes("const y = scoreToY(score)"), true, "スコア値をそのまま折れ線の高さへ変換する")
assert.equal(source.includes("const beat"), false, "心電図風の拍動補正を使わない")
assert.equal(source.includes("isFaceTemporarilyAbsent(this.frameBuffer)"), true, "一時的な顔ロスト中はスコア保存を待つ")
assert.equal(source.includes("isFrameFresh(latestFrame, now)"), true, "古いカメラフレームをスコアへ再利用しない")
assert.equal(source.includes("if (!isFrameFresh(latestFrame, now)) this.frameBuffer = []"), true, "5秒以上フレームが空いた後は停止前の解析値を捨てる")
assert.equal(source.includes("this.scoreTarget.textContent = \"—\""), true, "一時的な顔ロスト中はスコアを表示しない")
assert.equal(source.includes("this.stateTarget.dataset.state = \"interrupted\""), true, "一時的な顔ロスト中の表示状態を持つ")
assert.equal(source.includes("\"sessionAverage\""), true, "このセッションの平均スコア表示targetを持つ")
assert.equal(source.includes("updateSessionAverage()"), true, "サンプル追加時にこのセッション平均を更新する")
assert.equal(source.includes("averageFocusableScore"), true, "このセッション平均は離席サンプルを除いて計算する")
assert.equal(source.includes("this.sessionAverageTarget.textContent = average"), true, "このセッション平均を画面へ表示する")
assert.equal(source.includes("this.miniSessionAverageTarget.textContent = average"), true, "ミニ表示にもこのセッション平均を表示する")
assert.equal(source.includes("this.sessionElapsedTarget.textContent = this.formatDuration(elapsedSec)"), true, "ミニ表示の経過時間を毎秒更新する")
assert.equal(source.includes("CAMERA_DEVICE_COOKIE"), true, "前回選択したカメラを保存するCookie名を持つ")
assert.equal(source.includes("readCookie(CAMERA_DEVICE_COOKIE)"), true, "起動時に前回のカメラIDをCookieから読む")
assert.equal(source.includes("writeCookie(CAMERA_DEVICE_COOKIE, this.selectedDeviceId"), true, "起動・切替後に選択したカメラIDをCookieへ保存する")
assert.equal(source.includes("SameSite=Lax"), true, "CookieはSameSite=Laxで保存する")

const changeCameraSource = source.slice(
  source.indexOf("async changeCamera("),
  source.indexOf("\n  onResults("),
)
assert.equal(changeCameraSource.includes("this.waitingForReturn"), true, "復帰待ち中のカメラ切替後も復帰待ち表示を保つ")
assert.equal(changeCameraSource.includes('error.name === "AbortError"'), true, "無効化されたカメラ切替は開始失敗として表示しない")

const startVideoStreamSource = source.slice(
  source.indexOf("async startVideoStream("),
  source.indexOf("\n  async changeCamera("),
)
assert.equal(startVideoStreamSource.includes("await this.stopVideoStream({ cancelPendingStart: false })"), true, "旧MediaPipe処理の終了後に新しいカメラを開始する")
assert.equal(startVideoStreamSource.includes("generation !== this.cameraStartGeneration"), true, "待機中に無効化されたカメラ開始処理を破棄する")
assert.equal(startVideoStreamSource.includes("if (generation !== this.cameraStartGeneration) this.assertCameraStartCurrent(generation)"), true, "無効化後にgetUserMedia自体が失敗してもキャンセルとして扱う")
assert.equal(startVideoStreamSource.includes("this.frameBuffer = []"), true, "カメラ切替後は旧カメラの解析値を捨てる")

const stopVideoStreamSource = source.slice(
  source.indexOf("async stopVideoStream("),
  source.indexOf("\n  readCookie("),
)
assert.equal(stopVideoStreamSource.includes("frameLoop.stopAndDrain()"), true, "旧MediaPipe処理の完了を待てるように停止する")
assert.equal(stopVideoStreamSource.includes("this.cameraStartGeneration += 1"), true, "終了時は待機中のカメラ開始を無効化する")
assert.equal(stopVideoStreamSource.indexOf("track.stop()") < stopVideoStreamSource.indexOf("await drainPromise"), true, "MediaPipe完了待ちの前にカメラtrackを同期的に停止する")
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
assert.equal(source.includes("await this.saveProgress({ completed: true, endedAt })"), true, "停止時にcompletedとして最終保存する")

const stopSource = source.slice(
  source.indexOf("async stop()"),
  source.indexOf("\n  async stopForAbsence("),
)
assert.equal(stopSource.includes("window.location.href"), false, "手動終了後も計測画面に留まる")
assert.equal(stopSource.includes("if (!this.startedAt || !this.sessionId) return"), true, "セッション作成完了前は終了処理を始めない")
assert.equal(stopSource.includes("try"), true, "最終保存の通信例外を処理する")
assert.equal(stopSource.includes("catch"), true, "最終保存の通信例外後も再試行できる状態へ戻す")
assert.equal(stopSource.includes("this.showStoppedState()"), true, "保存成功後は再開できる終了表示へ切り替える")
assert.equal(stopSource.includes("this.commitCurrentSessionToDailyBase(endedAt)"), true, "保存したセッションを再開後の日次集計ベースへ加える")

const showStoppedStateSource = source.slice(
  source.indexOf("\n  showStoppedState()"),
  source.indexOf("\n  async resume("),
)
assert.equal(showStoppedStateSource.includes("this.stopBtnTarget.hidden = true"), true, "終了後は保存ボタンを隠す")
assert.equal(showStoppedStateSource.includes("this.resumeBtnTarget.hidden = false"), true, "終了後は再開ボタンを表示する")
assert.equal(showStoppedStateSource.includes('this.miniStatusTarget.textContent = "計測終了"'), true, "終了後の状態をスコアパネルにも表示する")
assert.equal(showStoppedStateSource.includes('this.taskMeasurementStatusTarget.textContent = "計測終了"'), true, "終了後のタスク行を計測終了表示へ切り替える")
assert.equal(showStoppedStateSource.includes("this.taskStopBtnTarget.hidden = true"), true, "終了後のタスク行に停止ボタンを残さない")
assert.equal(showStoppedStateSource.includes("this.taskResumeBtnTarget.hidden = false"), true, "終了後のタスク行に計測開始ボタンを表示する")

const resumeSource = source.slice(
  source.indexOf("async resume("),
  source.indexOf("\n  async stopForAbsence("),
)
assert.equal(resumeSource.includes("await this.start()"), true, "再開時はカメラと新しいセッションを開始する")
assert.equal(resumeSource.includes("this.resumeBtnTarget.disabled = true"), true, "再開処理中の二重操作を防ぐ")
assert.equal(source.includes("this.stopBtnTarget.hidden = false"), true, "新しいセッション開始後は保存ボタンを戻す")
assert.equal(source.includes("this.resumeBtnTarget.hidden = true"), true, "新しいセッション開始後は再開ボタンを隠す")
assert.equal(source.includes('this.taskMeasurementStatusTarget.textContent = "計測中"'), true, "再開後のタスク行を計測中へ戻す")
assert.equal(source.includes("this.taskStopBtnTarget.hidden = false"), true, "再開後のタスク行に停止ボタンを戻す")
assert.equal(source.includes("this.taskResumeBtnTarget.hidden = true"), true, "再開後はタスク行の計測開始ボタンを隠す")

const commitCurrentSessionSource = source.slice(
  source.indexOf("\n  commitCurrentSessionToDailyBase("),
  source.indexOf("\n  showStoppedState("),
)
assert.equal(commitCurrentSessionSource.includes("this.dailyBaseDurationSecValue += summary.duration_sec"), true, "保存した作業時間を日次ベースへ加算する")
assert.equal(commitCurrentSessionSource.includes("this.dailyBaseVolumeValue += summary.focus_volume"), true, "保存した集中度総量を日次ベースへ加算する")
assert.equal(commitCurrentSessionSource.includes("this.dailyBaseScoreSumValue += summary.avg_score"), true, "保存した平均スコアを日次ベースへ加算する")
assert.equal(commitCurrentSessionSource.includes("this.dailyBaseSessionCountValue += 1"), true, "保存したセッション数を日次ベースへ加算する")
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

const resetSessionMeasurementsSource = source.slice(
  source.indexOf("resetSessionMeasurements("),
  source.indexOf("\n  async beginSession("),
)
assert.equal(resetSessionMeasurementsSource.includes("this.miniStatusTarget.textContent = \"計測中\""), true, "新しいセッション開始時はミニ表示を計測中へ戻す")
assert.equal(resetSessionMeasurementsSource.includes("this.sessionElapsedTarget.textContent = \"0:00:00\""), true, "新しいセッション開始時は経過時間をリセットする")

const stopForAbsenceSource = source.slice(
  source.indexOf("async stopForAbsence("),
  source.indexOf("\n  shutdown()"),
)
assert.equal(stopForAbsenceSource.includes("window.location.href"), false, "離席終了後はタスク一覧へ移動しない")
assert.equal(stopForAbsenceSource.includes("this.stopVideoStream()"), false, "離席終了後も復帰検出用のカメラを止めない")
assert.equal(stopForAbsenceSource.includes("catch"), true, "離席終了の通信エラー時も失敗状態へ移れる")
assert.equal(stopForAbsenceSource.includes("this.commitCurrentSessionToDailyBase(endedAt)"), true, "離席終了したセッションも自動再開後の日次集計へ引き継ぐ")
assert.equal(stopForAbsenceSource.includes("this.miniStatusTarget.textContent = \"復帰待ち\""), true, "離席終了後のミニ表示は復帰待ちを示す")
assert.equal(stopForAbsenceSource.includes("this.sessionElapsedTarget.textContent = \"--\""), true, "離席終了後のミニ表示は古い経過時間を残さない")
assert.equal(stopForAbsenceSource.includes("this.miniSessionAverageTarget.textContent = \"--\""), true, "離席終了後のミニ表示は古い平均を残さない")

const shutdownSource = source.slice(
  source.indexOf("shutdown()"),
  source.indexOf("\n  async stopVideoStream("),
)
assert.equal(shutdownSource.includes("this.taskStopBtnTarget.disabled = true"), true, "停止中とセッション作成中はタスク行の終了操作を無効にする")
assert.equal(shutdownSource.includes("this.taskResumeBtnTarget.disabled = true"), true, "停止処理中はタスク行の開始操作も無効にする")

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
