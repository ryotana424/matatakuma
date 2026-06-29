import assert from "node:assert"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, "measure_controller.js"), "utf8")

assert.equal(source.includes(".drawImage("), false, "カメラ映像をcanvasへ描画しない")
assert.equal(source.includes("drawPrivacySurface"), true, "匿名化された表示面を描画する")
assert.equal(source.includes("static targets = [\"video\", \"canvas\", \"score\", \"state\", \"stopBtn\", \"placeholder\", \"message\", \"cameraSelect\", \"pulseCanvas\"]"), true, "カメラ選択と波形canvasのtargetを持つ")
assert.equal(source.includes("this.start()"), true, "画面表示時に自動で計測開始する")
assert.equal(source.includes("enumerateDevices()"), true, "利用可能なカメラを列挙する")
assert.equal(source.includes("deviceId: { exact: deviceId }"), true, "選択したカメラIDで起動する")
assert.equal(source.includes("changeCamera("), true, "カメラ切替アクションを持つ")
assert.equal(source.includes("drawPulseGraph("), true, "集中度を心電図風グラフに描画する")
assert.equal(source.includes("CAMERA_DEVICE_COOKIE"), true, "前回選択したカメラを保存するCookie名を持つ")
assert.equal(source.includes("readCookie(CAMERA_DEVICE_COOKIE)"), true, "起動時に前回のカメラIDをCookieから読む")
assert.equal(source.includes("writeCookie(CAMERA_DEVICE_COOKIE, this.selectedDeviceId"), true, "起動・切替後に選択したカメラIDをCookieへ保存する")
assert.equal(source.includes("SameSite=Lax"), true, "CookieはSameSite=Laxで保存する")

assert.equal(source.includes("this.sessionId = null"), true, "開始時に作成したSession IDを保持する")
assert.equal(source.includes("this.autosaveTick = setInterval(() => this.saveProgress(), 15000)"), true, "計測中に定期保存する")
assert.equal(source.includes("await this.createSession()"), true, "計測開始時にrunningセッションを作成する")
assert.equal(source.includes("await this.saveProgress({ completed: true })"), true, "停止時にcompletedとして最終保存する")

console.log("measure controller privacy display OK")
