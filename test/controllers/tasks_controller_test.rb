require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  test "一覧が表示できる" do
    Task.create!(name: "資料作成")
    get tasks_url
    assert_response :success
    assert_select "title", /Matatakuma/
    assert_select ".fp-brand__name", "Matatakuma"
    assert_select "body", /資料作成/
  end

  test "タスク一覧は進行中を初期表示し終了済へ切り替えられる" do
    Task.create!(name: "未着手タスク", status: :todo)
    Task.create!(name: "着手中タスク", status: :doing)
    Task.create!(name: "中断タスク", status: :interrupted)
    Task.create!(name: "完了タスク", status: :done)
    Task.create!(name: "アーカイブタスク", status: :archived)

    get tasks_url

    assert_select ".task-list-filter.segmented[aria-label='タスク表示切替']" do
      assert_select "button.segmented__btn--active[aria-pressed='true']", "進行中"
      assert_select "button[aria-pressed='false']", "終了済"
    end
    assert_select ".task-grid__row[data-task-list-filter-group='active']:not([hidden])", /未着手タスク/
    assert_select ".task-grid__row[data-task-list-filter-group='active']:not([hidden])", /着手中タスク/
    assert_select ".task-grid__row[data-task-list-filter-group='active']:not([hidden])", /中断タスク/
    assert_select ".task-grid__row[data-task-list-filter-group='finished'][hidden]", /完了タスク/
    assert_select ".task-grid__row[data-task-list-filter-group='finished'][hidden]", /アーカイブタスク/
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

    assert_select ".task-grid__head span", "平均集中スコア"
    assert_select ".task-grid__row .task-grid__score", /78/
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

    assert_select ".task-grid__head span:nth-child(4)", "集中度総量"
    assert_select ".task-grid__head span:nth-child(5)", "平均集中スコア"
    assert_select ".task-grid__row", /2\.1k/
  end

  test "計測済みタスクは状態欄のプルダウンで変更できる" do
    task = Task.create!(name: "コーディング", status: :doing)
    task.sessions.create!(started_at: Time.current, duration_sec: 60)

    get tasks_url

    assert_select ".task-grid__row form[action='#{task_path(task)}'] select[name='task[status]'][onchange='this.form.requestSubmit()']"
    assert_select "option[value=todo]", "未着手"
    assert_select "option[value=doing][selected=selected]", "着手中"
    assert_select "option[value=done]", "完了"
    assert_select "option[value=archived]", "アーカイブ"
    assert_select "option[value=interrupted]", "中断"
    assert_select ".task-grid__ops form[action='#{task_path(task)}']", count: 0
  end

  test "未計測の未着手タスクも状態欄のプルダウンで変更できる" do
    task = Task.create!(name: "未計測")

    get tasks_url

    assert_select ".task-grid__row form[action='#{task_path(task)}'] select[name='task[status]'][onchange='this.form.requestSubmit()']"
    assert_select "option[value=todo][selected=selected]", "未着手"

    patch task_url(task), params: { task: { status: "doing" } }

    assert_redirected_to tasks_url
    assert task.reload.doing?
  end

  test "計測画面が表示できる" do
    task = Task.create!(name: "計測タスク")
    get measure_task_url(task)
    assert_response :success
    assert_select ".measure-camera__task", "計測タスク"
    assert_select ".measure-mini__task", "計測タスク"
    assert_select "[data-measure-target='sessionElapsed']", "0:00:00"
    assert_select "[data-measure-target='miniSessionAverage']", "—"
    assert_select "body", { text: /計測中: 計測タスク/, count: 0 }
    assert_select "button", /計測終了して保存/
    # 計測開始は他タスク行にはあり得るが、リンク（a要素）であってbuttonではない
    assert_select "button", { text: /計測開始/, count: 0 }
  end

  test "未着手タスクの計測画面を開くと着手中にする" do
    task = Task.create!(name: "計測タスク")

    get measure_task_url(task)

    assert_response :success
    assert task.reload.doing?
  end

  test "計測画面の前回セッション平均は中断セッションも対象にする" do
    task = Task.create!(name: "計測タスク")
    older = task.sessions.create!(started_at: 2.hours.ago, ended_at: 1.hour.ago,
                                  duration_sec: 3600, avg_score: 71, status: :completed)
    task.sessions.create!(started_at: 30.minutes.ago, ended_at: 5.minutes.ago,
                          duration_sec: 1500, avg_score: 84, status: :interrupted,
                          ended_reason: "timeout")
    task.sessions.create!(started_at: 1.minute.ago, duration_sec: 0,
                          avg_score: 10, status: :running)

    get measure_task_url(task)

    assert_response :success
    assert_select "[data-measure-target='sessionAverage']", "—"
    assert_select ".measure-stats__num--muted", "84"
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
    assert_select ".measure-camera__empty", /「計測開始」を押すと計測が始まります/
  end

  test "一覧ページの本日集計は完了と中断セッションを対象にする" do
    # 相対時刻が日付境界（UTC 0〜2時台）をまたいで前日扱いにならないよう、当日正午に固定する
    travel_to Time.current.change(hour: 12) do
      task = Task.create!(name: "コーディング")
      task.sessions.create!(started_at: 2.hours.ago, ended_at: 1.hour.ago, duration_sec: 1800,
                            avg_score: 80, status: :completed)
      task.sessions.create!(started_at: 1.hour.ago, ended_at: 30.minutes.ago, duration_sec: 600,
                            avg_score: 60, status: :interrupted, ended_reason: "timeout")

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
  end

  test "本日のセッションがなければステータスバーはプレースホルダー表示" do
    get tasks_url
    assert_select ".daily-status-bar" do
      assert_select "[data-measure-target='dailyDuration']", "0:00:00"
      assert_select "[data-measure-target='dailyFocusVolume']", "--"
      assert_select "[data-measure-target='dailyAverage']", "--"
    end
  end

  test "計測ページのスコアパネルに本日の集計が表示される" do
    task = Task.create!(name: "計測対象")
    get measure_task_url(task)
    assert_response :success
    # 本日の集計はスコアパネル内の「本日」ブロックへ統合されている
    assert_select ".measure-stats__group--today" do
      assert_select "[data-measure-target='dailyDuration']"
      assert_select "[data-measure-target='dailyFocusVolume']"
      assert_select "[data-measure-target='dailyAverage']"
    end
  end

  test "計測ページにタスク一覧が表示され計測中タスクにはリンクが出ない" do
    task = Task.create!(name: "計測対象")
    Task.create!(name: "別タスク")

    get measure_task_url(task)

    assert_response :success
    assert_select ".task-panel .task-grid"
    assert_select "body", /別タスク/
    # 計測中の行は「計測中」ラベルになり計測開始リンクを出さない
    assert_select ".task-grid__row--measuring .task-grid__measuring", /計測中/
  end

  test "終了済タスクの計測画面でも計測中の行を進行中として表示する" do
    task = Task.create!(name: "再計測タスク", status: :archived)

    get measure_task_url(task)

    assert_response :success
    assert_select ".task-grid__row--measuring[data-task-list-filter-group='active']:not([hidden])", /再計測タスク/
  end
end
