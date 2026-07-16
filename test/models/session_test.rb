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

  test "比率は0〜1の範囲" do
    session = @task.sessions.build(started_at: Time.current, ended_at: Time.current,
                                   duration_sec: 60, avg_score: 50,
                                   high_ratio: 1.5, medium_ratio: 0, low_ratio: 0, away_ratio: 0,
                                   interrupt_count: 0)
    assert_not session.valid?
  end

  test "改善用メトリクスは0〜1の範囲" do
    session = @task.sessions.build(started_at: Time.current, ended_at: Time.current,
                                   duration_sec: 60, avg_score: 50,
                                   high_ratio: 0.2, medium_ratio: 0.5, low_ratio: 0.2, away_ratio: 0.1,
                                   interrupt_count: 1,
                                   gaze_on_screen_ratio: 1.2,
                                   head_stable_ratio: 0.8,
                                   blink_normal_ratio: 0.9,
                                   session_continuity_ratio: 0.7,
                                   face_present_ratio: 0.95,
                                   score_min: 20, score_max: 90, score_stddev: 12.5,
                                   longest_low_streak_sec: 8, longest_away_streak_sec: 3)

    assert_not session.valid?
    assert_includes session.errors[:gaze_on_screen_ratio], "は1以下の値にしてください"
  end

  test "スコア範囲と連続秒数を検証する" do
    session = @task.sessions.build(started_at: Time.current, ended_at: Time.current,
                                   duration_sec: 60, avg_score: 50,
                                   high_ratio: 0.2, medium_ratio: 0.5, low_ratio: 0.2, away_ratio: 0.1,
                                   interrupt_count: 1,
                                   gaze_on_screen_ratio: 0.7,
                                   head_stable_ratio: 0.8,
                                   blink_normal_ratio: 0.9,
                                   session_continuity_ratio: 0.7,
                                   face_present_ratio: 0.95,
                                   score_min: -1, score_max: 101, score_stddev: -0.1,
                                   longest_low_streak_sec: -1, longest_away_streak_sec: -2)

    assert_not session.valid?
    assert_includes session.errors[:score_min], "は0以上の値にしてください"
    assert_includes session.errors[:score_max], "は100以下の値にしてください"
    assert_includes session.errors[:score_stddev], "は0以上の値にしてください"
    assert_includes session.errors[:longest_low_streak_sec], "は0以上の値にしてください"
    assert_includes session.errors[:longest_away_streak_sec], "は0以上の値にしてください"
  end

  test "runningセッションはended_atなしで保存できる" do
    session = @task.sessions.build(started_at: Time.current,
                                   duration_sec: 0,
                                   avg_score: 0,
                                   high_ratio: 0, medium_ratio: 0, low_ratio: 0, away_ratio: 0,
                                   interrupt_count: 0,
                                   status: :running,
                                   last_seen_at: Time.current,
                                   save_count: 0,
                                   gaze_on_screen_ratio: 0,
                                   head_stable_ratio: 0,
                                   blink_normal_ratio: 0,
                                   session_continuity_ratio: 0,
                                   face_present_ratio: 0,
                                   score_min: 0, score_max: 0, score_stddev: 0,
                                   longest_low_streak_sec: 0, longest_away_streak_sec: 0)

    assert session.valid?
  end

  test "終了理由は許可した値のみ" do
    session = @task.sessions.build(started_at: Time.current,
                                   ended_at: Time.current,
                                   duration_sec: 60, avg_score: 50,
                                   high_ratio: 0.2, medium_ratio: 0.5, low_ratio: 0.2, away_ratio: 0.1,
                                   interrupt_count: 1,
                                   status: :completed,
                                   ended_reason: "power_loss",
                                   last_seen_at: Time.current,
                                   save_count: 1,
                                   gaze_on_screen_ratio: 0.7,
                                   head_stable_ratio: 0.8,
                                   blink_normal_ratio: 0.9,
                                   session_continuity_ratio: 0.7,
                                   face_present_ratio: 0.95,
                                   score_min: 20, score_max: 90, score_stddev: 12.5,
                                   longest_low_streak_sec: 8, longest_away_streak_sec: 3)

    assert_not session.valid?
    assert_includes session.errors[:ended_reason], "は一覧にありません"
  end

  test "指定日のセッションを引けるスコープ" do
    @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10), ended_at: Time.zone.local(2026, 6, 26, 11),
                           duration_sec: 3600, avg_score: 80,
                           high_ratio: 0.6, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0, interrupt_count: 3)
    assert_equal 1, Session.on_date(Date.new(2026, 6, 26)).count
    assert_equal 0, Session.on_date(Date.new(2026, 6, 25)).count
  end

  test "終了済みスコープは完了と中断を含み計測中を除く" do
    completed = @task.sessions.create!(started_at: 3.minutes.ago, ended_at: 2.minutes.ago,
                                       duration_sec: 60, avg_score: 70, status: :completed)
    interrupted = @task.sessions.create!(started_at: 2.minutes.ago, ended_at: 1.minute.ago,
                                         duration_sec: 60, avg_score: 60, status: :interrupted,
                                         ended_reason: "timeout")
    @task.sessions.create!(started_at: 1.minute.ago, duration_sec: 30, avg_score: 50, status: :running)

    assert_respond_to Session, :finished
    assert_equal [completed.id, interrupted.id].sort, Session.finished.pluck(:id).sort
  end
end
