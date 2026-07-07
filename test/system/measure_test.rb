require "application_system_test_case"

class MeasureTest < ApplicationSystemTestCase
  test "計測画面は開始ボタンなしで終了ボタンだけを表示する" do
    task = Task.create!(name: "計測タスク")

    visit measure_task_path(task)

    # 計測ヘッダーに対象タスク名が表示される
    assert_selector "h1.page-title", text: "計測タスク"
    # 開始ボタンは無く、終了ボタンだけが無効状態で出る
    assert_no_button "計測開始"
    assert_button "計測終了して保存", disabled: true
    assert_selector "label", text: "カメラ"
    # 無効なのはカメラ選択セレクトのみ（下部タスク一覧のステータスセレクトは有効）
    assert_selector "select[disabled]", count: 1
    assert_selector "canvas.measure-pulse__canvas"
    # 統合ページ化で計測画面の下部にもタスク一覧が並び、計測中タスクは「計測中」表示になる
    assert_selector ".measure-link--current", text: "計測中"
  end
end
