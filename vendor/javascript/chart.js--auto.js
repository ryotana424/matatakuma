// chart.js/auto 相当のローカルラッパー。
// dist/chart.js（vendor/javascript/chart.js.js）から Chart と registerables を読み、
// 全コンポーネントを登録済みの Chart を default export する。
// jspm の pin だと dist が相対import参照で404になるため、自己完結ESMバンドルを直接vendorして解決している。
import { Chart, registerables } from "chart.js"
Chart.register(...registerables)
export default Chart
export * from "chart.js"
