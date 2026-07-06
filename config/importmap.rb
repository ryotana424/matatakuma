# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin_all_from "app/javascript/focus", under: "focus"
# Chart.js はローカル完結のためvendorしたESMバンドルをpinする（CDN送信なし）。
# chart.js--auto.js が chart.js（dist本体）と @kurkle/color を登録して default export する。
pin "chart.js/auto", to: "chart.js--auto.js" # @4.5.1
pin "chart.js", to: "chart.js.js" # @4.5.1
pin "@kurkle/color", to: "@kurkle--color.js" # @0.3.4
