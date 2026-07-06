import { Controller } from "@hotwired/stimulus"
import Chart from "chart.js/auto"

// data属性で渡されたラベルとデータセットから棒グラフを描画する汎用コントローラ。
// canvas要素にアタッチして使う
export default class extends Controller {
  static values = { labels: Array, datasets: Array, suggestedMax: Number }

  connect() {
    this.chart = new Chart(this.element, {
      type: "bar",
      data: { labels: this.labelsValue, datasets: this.datasetsValue },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: this.hasSuggestedMaxValue ? this.suggestedMaxValue : undefined,
            ticks: { color: "#828c9b" },
            grid: { color: "rgba(42, 49, 60, 0.9)" },
          },
          x: {
            ticks: { color: "#828c9b" },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { labels: { color: "#f2f5f8" } },
        },
      },
    })
  }

  disconnect() {
    if (this.chart) this.chart.destroy()
    this.chart = null
  }
}
