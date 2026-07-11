import { Controller } from "@hotwired/stimulus"
import Chart from "chart.js/auto"

// data属性で渡されたラベルとデータセットから棒グラフを描画する汎用コントローラ。
// canvas要素にアタッチして使う
export default class extends Controller {
  static values = { labels: Array, datasets: Array, suggestedMax: Number }

  // チャートの軸・グリッド・凡例・バーの色は CSS のデザイントークンから読む
  // （ライト/ダーク両テーマに追従。データセット側で色未指定ならトークン色を補う）
  themeColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
  }

  connect() {
    const axisColor = this.themeColor("--color-ink-3", "#828c9b")
    const gridColor = this.themeColor("--color-chart-grid", "rgba(42, 49, 60, 0.9)")
    const legendColor = this.themeColor("--color-ink", "#f2f5f8")
    const barColor = this.themeColor("--color-chart-bar", "#4E92AC")
    const barLowColor = this.themeColor("--color-chart-bar-low", "#B9C6CD")
    const palette = [barColor, barLowColor]

    const datasets = this.datasetsValue.map((dataset, index) => ({
      backgroundColor: palette[index % palette.length],
      ...dataset,
    }))

    this.chart = new Chart(this.element, {
      type: "bar",
      data: { labels: this.labelsValue, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: this.hasSuggestedMaxValue ? this.suggestedMaxValue : undefined,
            ticks: { color: axisColor },
            grid: { color: gridColor },
          },
          x: {
            ticks: { color: axisColor },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { labels: { color: legendColor } },
        },
      },
    })
  }

  disconnect() {
    if (this.chart) this.chart.destroy()
    this.chart = null
  }
}
