require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  test "一覧が表示できる" do
    Task.create!(name: "資料作成")
    get tasks_url
    assert_response :success
    assert_select "title", /Focus Pulse/
    assert_select ".app-brand__name", "Focus Pulse"
    assert_select "body", /資料作成/
  end

  test "タスクを作成できる" do
    assert_difference "Task.count", 1 do
      post tasks_url, params: { task: { name: "新規タスク" } }
    end
    assert_redirected_to tasks_url
  end

  test "計測時間合計が表示される" do
    task = Task.create!(name: "コーディング")
    task.sessions.create!(started_at: Time.current, ended_at: Time.current, duration_sec: 3661, avg_score: 80,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 0)
    get tasks_url
    assert_select "body", /1:01:01/
  end

  test "計測画面が表示できる" do
    task = Task.create!(name: "計測タスク")
    get measure_task_url(task)
    assert_response :success
    assert_select "body", /計測中: 計測タスク/
    assert_select "button", { text: /計測開始/, count: 0 }
    assert_select "button", /計測終了して保存/
  end
end
