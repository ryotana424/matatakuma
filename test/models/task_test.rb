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
end
