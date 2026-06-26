require "application_system_test_case"

class MeasureTest < ApplicationSystemTestCase
  test "計測画面が表示され開始ボタンがある" do
    task = Task.create!(name: "計測タスク")

    visit measure_task_path(task)

    assert_text "計測中: 計測タスク"
    assert_button "計測開始"
    assert_button "計測終了して保存", disabled: true
  end
end
