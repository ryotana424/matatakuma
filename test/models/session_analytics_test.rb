require "test_helper"

class SessionAnalyticsTest < ActiveSupport::TestCase
  setup do
    @task = Task.create!(name: "作業")
  end

  # 集計対象のセッションをデフォルト値付きで組み立てる（DB保存はしない）
  def build_session(attrs = {})
    defaults = {
      task: @task,
      started_at: Time.zone.local(2026, 7, 6, 10),
      ended_at: Time.zone.local(2026, 7, 6, 11),
      duration_sec: 3600,
      avg_score: 80,
      status: :completed,
      high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1,
      gaze_on_screen_ratio: 0.8, head_stable_ratio: 0.7, blink_normal_ratio: 0.9,
      session_continuity_ratio: 0.6, face_present_ratio: 0.95,
      interrupt_count: 2
    }
    Session.new(defaults.merge(attrs))
  end

  test "summaryは件数・平均スコア・合計時間・低集中離席比率・平均中断回数を返す" do
    sessions = [
      build_session(avg_score: 80, duration_sec: 3600, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 2),
      build_session(avg_score: 60, duration_sec: 1800, low_ratio: 0.3, away_ratio: 0.1, interrupt_count: 4)
    ]

    summary = SessionAnalytics.summary(sessions)

    assert_equal 2, summary[:count]
    assert_equal 70, summary[:avg_score]
    assert_equal 5400, summary[:total_duration_sec]
    assert_equal 30, summary[:low_away_ratio]
    assert_equal 3.0, summary[:avg_interrupt_count]
  end

  test "summaryは空配列で件数0とnilを返す" do
    summary = SessionAnalytics.summary([])

    assert_equal 0, summary[:count]
    assert_nil summary[:avg_score]
    assert_equal 0, summary[:total_duration_sec]
    assert_nil summary[:low_away_ratio]
    assert_nil summary[:avg_interrupt_count]
  end

  test "metric_averagesは5指標の平均を%で返す" do
    sessions = [build_session(gaze_on_screen_ratio: 0.5), build_session(gaze_on_screen_ratio: 0.7)]

    averages = SessionAnalytics.metric_averages(sessions)

    assert_equal 60, averages["視線"]
    assert_equal %w[視線 姿勢 まばたき 継続性 顔検出], averages.keys
  end

  test "metric_averagesは空配列でnilを返す" do
    assert_nil SessionAnalytics.metric_averages([])
  end

  test "weakest_metricは最も低い指標を返す" do
    sessions = [build_session(gaze_on_screen_ratio: 0.55, head_stable_ratio: 0.8,
                              blink_normal_ratio: 0.9, session_continuity_ratio: 0.6,
                              face_present_ratio: 0.95)]

    assert_equal({ label: "視線", value: 55 }, SessionAnalytics.weakest_metric(sessions))
  end

  test "weakest_metricは空配列でnilを返す" do
    assert_nil SessionAnalytics.weakest_metric([])
  end
end
