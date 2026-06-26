require "application_system_test_case"

class MeasureTest < ApplicationSystemTestCase
  test "計測画面は開始ボタンなしで終了ボタンだけを表示する" do
    task = Task.create!(name: "計測タスク")

    visit measure_task_path(task)

    assert_text "計測中: 計測タスク"
    assert_no_button "計測開始"
    assert_button "計測終了して保存", disabled: true
    assert_selector "label", text: "カメラ"
    assert_selector "select[disabled]", count: 1
    assert_selector "canvas.measure-pulse__canvas"
  end
end
