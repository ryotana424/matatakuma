require "application_system_test_case"

class TaskListFilterTest < ApplicationSystemTestCase
  test "進行中と終了済をページ遷移せずに切り替える" do
    Task.create!(name: "表示中の未着手", status: :todo)
    Task.create!(name: "表示中の中断", status: :interrupted)
    Task.create!(name: "切替後の完了", status: :done)
    Task.create!(name: "切替後のアーカイブ", status: :archived)

    visit tasks_path

    assert_selector "button[aria-pressed='true']", text: "進行中"
    assert_text "表示中の未着手"
    assert_text "表示中の中断"
    assert_no_text "切替後の完了"
    assert_no_text "切替後のアーカイブ"

    click_button "終了済"

    assert_current_path tasks_path
    assert_selector "button[aria-pressed='true']", text: "終了済"
    assert_no_text "表示中の未着手"
    assert_no_text "表示中の中断"
    assert_text "切替後の完了"
    assert_text "切替後のアーカイブ"
  end
end
