require "test_helper"

class ApplicationCssTest < ActiveSupport::TestCase
  test "未着手の状態セレクトは白背景にならない" do
    css = Rails.root.join("app/assets/stylesheets/application.css").read

    assert_includes css, ".task-status-select.status-pill--todo"
    assert_match(/\.task-status-select\.status-pill--todo\s*\{[^}]*background-color:\s*var\(--surface-overlay\)/m, css)
  end

  test "計測画面のスコア推移は集計の直後から残り高さいっぱいに広がる" do
    css = Rails.root.join("app/assets/stylesheets/application.css").read

    # 右パネルは左カメラパネルと同じ高さまで伸びる（align-self:start で縮めない）
    assert_no_match(/\.measure-score\s*\{[^}]*align-self:\s*start/m, css)
    assert_match(/\.measure-score\s*\{[^}]*min-height:\s*0/m, css)
    # スコア推移は集計の直後（margin-top:8px）から始まり、余白で下へ押し出されない
    assert_match(/\.measure-pulse\s*\{[^}]*margin-top:\s*8px/m, css)
    assert_no_match(/\.measure-pulse\s*\{[^}]*margin-top:\s*auto/m, css)
    # 残り高さを埋めてチャートを縦に広げる
    assert_match(/\.measure-pulse\s*\{[^}]*flex:\s*1/m, css)
    assert_match(/\.measure-pulse__plot\s*\{[^}]*flex:\s*1/m, css)
  end
end
