require "test_helper"

class SessionTest < ActiveSupport::TestCase
  setup do
    @task = Task.create!(name: "テスト")
  end

  test "taskが必須" do
    session = Session.new(duration_sec: 60, avg_score: 50)
    assert_not session.valid?
  end

  test "avg_scoreは0〜100の範囲" do
    session = @task.sessions.build(started_at: Time.current, ended_at: Time.current,
                                   duration_sec: 60, avg_score: 120,
                                   high_ratio: 1, medium_ratio: 0, low_ratio: 0, away_ratio: 0,
                                   interrupt_count: 0)
    assert_not session.valid?
    assert_includes session.errors[:avg_score], "は100以下の値にしてください"
  end

  test "指定日のセッションを引けるスコープ" do
    @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10), ended_at: Time.zone.local(2026, 6, 26, 11),
                           duration_sec: 3600, avg_score: 80,
                           high_ratio: 0.6, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0, interrupt_count: 3)
    assert_equal 1, Session.on_date(Date.new(2026, 6, 26)).count
    assert_equal 0, Session.on_date(Date.new(2026, 6, 25)).count
  end
end
