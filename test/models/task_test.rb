require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "nameが必須" do
    task = Task.new(name: nil)
    assert_not task.valid?
    assert_includes task.errors[:name], "を入力してください"
  end

  test "statusのデフォルトはtodo" do
    task = Task.create!(name: "資料作成")
    assert_equal "todo", task.status
  end

  test "statusは未着手・着手中・完了・アーカイブ・中断を持つ" do
    assert_equal %w[todo doing done archived interrupted], Task.statuses.keys
  end

  test "計測時間合計をsessionsから算出できる" do
    task = Task.create!(name: "コーディング")
    task.sessions.create!(started_at: Time.current, ended_at: Time.current, duration_sec: 600, avg_score: 80,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 2)
    task.sessions.create!(started_at: Time.current, ended_at: Time.current, duration_sec: 300, avg_score: 70,
                          high_ratio: 0.4, medium_ratio: 0.4, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 1)
    assert_equal 900, task.total_duration_sec
  end

  test "セッションが無いタスクの計測時間合計は0" do
    task = Task.create!(name: "未計測")
    assert_equal 0, task.total_duration_sec
  end

  test "平均集中スコアは完了済みセッションの平均を整数で返す" do
    task = Task.create!(name: "平均集計")
    task.sessions.create!(started_at: 2.hours.ago, ended_at: 1.hour.ago, duration_sec: 600, avg_score: 71,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 2,
                          status: :completed)
    task.sessions.create!(started_at: 30.minutes.ago, ended_at: 10.minutes.ago, duration_sec: 300, avg_score: 84,
                          high_ratio: 0.4, medium_ratio: 0.4, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 1,
                          status: :completed)
    task.sessions.create!(started_at: Time.current, duration_sec: 0, avg_score: 10, status: :running)

    assert_equal 78, task.average_score
  end

  test "完了済みセッションが無いタスクの平均集中スコアはnil" do
    task = Task.create!(name: "未完了")
    task.sessions.create!(started_at: Time.current, duration_sec: 0, avg_score: 10, status: :running)

    assert_nil task.average_score
  end

  test "集中度総量は完了済みセッションの平均集中スコアと計測分数から算出できる" do
    task = Task.create!(name: "総量集計")
    task.sessions.create!(started_at: 2.hours.ago, ended_at: 1.hour.ago, duration_sec: 1200, avg_score: 70,
                          high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 2,
                          status: :completed)
    task.sessions.create!(started_at: 30.minutes.ago, ended_at: 10.minutes.ago, duration_sec: 600, avg_score: 90,
                          high_ratio: 0.4, medium_ratio: 0.4, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 1,
                          status: :completed)
    task.sessions.create!(started_at: Time.current, duration_sec: 300, avg_score: 10, status: :running)

    assert_equal 2400, task.focus_volume
  end

  test "完了済みセッションが無いタスクの集中度総量はnil" do
    task = Task.create!(name: "未完了")
    task.sessions.create!(started_at: Time.current, duration_sec: 300, avg_score: 10, status: :running)

    assert_nil task.focus_volume
  end
end
