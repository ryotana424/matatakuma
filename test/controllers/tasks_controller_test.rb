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

  test "計測済みタスクを完了に変更できる" do
    task = Task.create!(name: "資料作成", status: :doing)
    task.sessions.create!(started_at: Time.current, duration_sec: 60)

    patch task_url(task), params: { task: { status: "done" } }

    assert_redirected_to tasks_url
    assert task.reload.done?
  end

  test "計測済みタスクをアーカイブに変更できる" do
    task = Task.create!(name: "古い作業", status: :doing)
    task.sessions.create!(started_at: Time.current, duration_sec: 60)

    patch task_url(task), params: { task: { status: "archived" } }

    assert_redirected_to tasks_url
    assert task.reload.archived?
  end

  test "計測済みタスクを中断に変更できる" do
    task = Task.create!(name: "保留作業", status: :doing)
    task.sessions.create!(started_at: Time.current, duration_sec: 60)

    patch task_url(task), params: { task: { status: "interrupted" } }

    assert_redirected_to tasks_url
    assert task.reload.interrupted?
  end

  test "計測時間合計が表示される" do
    task = Task.create!(name: "コーディング")
    task.sessions.create!(started_at: Time.current, ended_at: Time.current, duration_sec: 3661, avg_score: 80,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 0)
    get tasks_url
    assert_select "body", /1:01:01/
  end

  test "タスク一覧に平均集中スコアが表示される" do
    task = Task.create!(name: "コーディング")
    task.sessions.create!(started_at: 2.hours.ago, ended_at: 1.hour.ago, duration_sec: 3600, avg_score: 71,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 0,
                          status: :completed)
    task.sessions.create!(started_at: 30.minutes.ago, ended_at: 5.minutes.ago, duration_sec: 1500, avg_score: 84,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 0,
                          status: :completed)
    task.sessions.create!(started_at: 1.minute.ago, duration_sec: 0, avg_score: 10, status: :running)

    get tasks_url

    assert_select "th", "平均集中スコア"
    assert_select "td[data-label='平均集中スコア']", "78"
  end

  test "タスク一覧に集中度総量が平均集中スコアの左に表示される" do
    task = Task.create!(name: "コーディング")
    task.sessions.create!(started_at: 2.hours.ago, ended_at: 1.hour.ago, duration_sec: 1200, avg_score: 70,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 0,
                          status: :completed)
    task.sessions.create!(started_at: 30.minutes.ago, ended_at: 5.minutes.ago, duration_sec: 600, avg_score: 90,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 0,
                          status: :completed)

    get tasks_url

    assert_select "thead th:nth-child(4)", "集中度総量"
    assert_select "thead th:nth-child(5)", "平均集中スコア"
    assert_select "td[data-label='集中度総量']", "2.1k"
  end

  test "計測済みタスクは状態欄のプルダウンで変更できる" do
    task = Task.create!(name: "コーディング", status: :doing)
    task.sessions.create!(started_at: Time.current, duration_sec: 60)

    get tasks_url

    assert_select "td[data-label='状態'] form[action='#{task_path(task)}'] select[name='task[status]'][onchange='this.form.requestSubmit()']"
    assert_select "option[value=todo]", "未着手"
    assert_select "option[value=doing][selected=selected]", "着手中"
    assert_select "option[value=done]", "完了"
    assert_select "option[value=archived]", "アーカイブ"
    assert_select "option[value=interrupted]", "中断"
    assert_select "td[data-label='操作'] form[action='#{task_path(task)}']", count: 0
  end

  test "未計測タスクは状態欄に表示だけ出す" do
    Task.create!(name: "未計測")

    get tasks_url

    assert_select "td[data-label='状態'] .status-pill", "未着手"
    assert_select "td[data-label='状態'] select[name='task[status]']", count: 0
  end

  test "計測画面が表示できる" do
    task = Task.create!(name: "計測タスク")
    get measure_task_url(task)
    assert_response :success
    assert_select "h1.page-title", "計測タスク"
    assert_select "body", { text: /計測中: 計測タスク/, count: 0 }
    assert_select "button", { text: /計測開始/, count: 0 }
    assert_select "button", /計測終了して保存/
  end

  test "未着手タスクの計測画面を開くと着手中にする" do
    task = Task.create!(name: "計測タスク")

    get measure_task_url(task)

    assert_response :success
    assert task.reload.doing?
  end

  test "計測画面にこのセッション平均と前回セッション平均が表示される" do
    task = Task.create!(name: "計測タスク")
    older = task.sessions.create!(started_at: 2.hours.ago, ended_at: 1.hour.ago,
                                  duration_sec: 3600, avg_score: 71, status: :completed)
    task.sessions.create!(started_at: 30.minutes.ago, ended_at: 5.minutes.ago,
                          duration_sec: 1500, avg_score: 84, status: :completed)
    task.sessions.create!(started_at: 1.minute.ago, duration_sec: 0,
                          avg_score: 10, status: :running)

    get measure_task_url(task)

    assert_response :success
    assert_select "[data-measure-target='sessionAverage']", "--"
    assert_select ".measure-breakdown__item", text: /前回セッション平均\s+84/
    assert_not_includes response.body, ">#{older.avg_score}<"
  end

  test "計測画面に施策ドロップダウンが表示される" do
    task = Task.create!(name: "計測タスク")
    Intervention.create!(name: "ポモドーロ")

    get measure_task_url(task)

    assert_response :success
    assert_select "select#measure-intervention-select option", text: "施策なし"
    assert_select "select#measure-intervention-select option", text: "ポモドーロ"
  end

  test "一覧ページにタスク追加モーダルが閉じた状態で含まれる" do
    get tasks_url
    assert_response :success
    assert_select ".task-panel[data-task-modal-open-value='false']"
    assert_select ".task-modal form input[name='task[name]']"
    assert_select "button", /タスク追加/
  end

  test "作成失敗時はモーダルが開いた状態で一覧を再表示する" do
    post tasks_url, params: { task: { name: "" } }
    assert_response :unprocessable_entity
    assert_select ".task-panel[data-task-modal-open-value='true']"
    assert_select ".field-error"
  end

  test "一覧ページにカメラプレースホルダーが表示される" do
    get tasks_url
    assert_select ".measure-camera__empty", /タスクを選んで計測開始/
  end

  test "一覧ページに本日のステータスバーが表示される" do
    task = Task.create!(name: "コーディング")
    task.sessions.create!(started_at: 2.hours.ago, ended_at: 1.hour.ago, duration_sec: 1800,
                          avg_score: 80, status: :completed)
    task.sessions.create!(started_at: 1.hour.ago, ended_at: 30.minutes.ago, duration_sec: 600,
                          avg_score: 60, status: :completed)

    get tasks_url

    assert_select ".daily-status-bar" do
      # 作業時間 1800+600 秒 = 0:40:00
      assert_select "[data-measure-target='dailyDuration']", "0:40:00"
      # 集中度総量 80*30 + 60*10 = 3000 → 3k
      assert_select "[data-measure-target='dailyFocusVolume']", "3k"
      # 平均 (80+60)/2 = 70
      assert_select "[data-measure-target='dailyAverage']", "70"
    end
  end

  test "本日のセッションがなければステータスバーはプレースホルダー表示" do
    get tasks_url
    assert_select ".daily-status-bar" do
      assert_select "[data-measure-target='dailyDuration']", "0:00:00"
      assert_select "[data-measure-target='dailyFocusVolume']", "--"
      assert_select "[data-measure-target='dailyAverage']", "--"
    end
  end

  test "計測ページに本日のステータスバーが表示される" do
    task = Task.create!(name: "計測対象")
    get measure_task_url(task)
    assert_response :success
    assert_select ".daily-status-bar"
  end

  test "計測ページにタスク一覧が表示され計測中タスクにはリンクが出ない" do
    task = Task.create!(name: "計測対象")
    Task.create!(name: "別タスク")

    get measure_task_url(task)

    assert_response :success
    assert_select ".task-panel .task-table"
    assert_select "body", /別タスク/
    # 計測中の行は「計測中」ラベルになり計測開始リンクを出さない
    assert_select ".measure-link--current", "計測中"
  end
end
