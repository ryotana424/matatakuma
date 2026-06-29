require "test_helper"

class ReportsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @task = Task.create!(name: "作業")
    @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10), ended_at: Time.zone.local(2026, 6, 26, 11),
                           duration_sec: 3600, avg_score: 82,
                           high_ratio: 0.6, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0, interrupt_count: 2)
  end

  test "レポート一覧が表示できる" do
    get reports_url
    assert_response :success
  end

  test "指定日のレポートで当日平均スコアが表示される" do
    get report_url(date: "2026-06-26")
    assert_response :success
    assert_select "body", /82/
  end

  test "施策メモと振り返りを保存できる" do
    patch report_url(date: "2026-06-26"), params: { daily_report: { measure_note: "ポモドーロ導入", reflection: "午前は集中できた" } }
    assert_redirected_to report_url(date: "2026-06-26")
    report = DailyReport.find_by(report_date: Date.new(2026, 6, 26))
    assert_equal "ポモドーロ導入", report.measure_note
  end

  test "日次レポートに改善指標を表示する" do
    @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10), ended_at: Time.zone.local(2026, 6, 26, 11),
                           duration_sec: 3600, avg_score: 72,
                           high_ratio: 0.2, medium_ratio: 0.5, low_ratio: 0.2, away_ratio: 0.1,
                           interrupt_count: 4,
                           gaze_on_screen_ratio: 0.55,
                           head_stable_ratio: 0.8,
                           blink_normal_ratio: 0.9,
                           session_continuity_ratio: 0.6,
                           face_present_ratio: 0.95,
                           score_min: 20,
                           score_max: 94,
                           score_stddev: 18.5,
                           longest_low_streak_sec: 12,
                           longest_away_streak_sec: 5)

    get report_url(date: "2026-06-26")

    assert_response :success
    assert_select ".report-stat__label", text: "低集中・離席比率"
    assert_select "td", text: "視線 55%"
    assert_select "td", text: "低集中 12秒"
  end

  test "更新が止まったrunningセッションを中断扱いにする" do
    session = @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10),
                                     duration_sec: 120,
                                     avg_score: 65,
                                     high_ratio: 0.1, medium_ratio: 0.5, low_ratio: 0.3, away_ratio: 0.1,
                                     interrupt_count: 3,
                                     status: :running,
                                     last_seen_at: 10.minutes.ago,
                                     save_count: 2,
                                     gaze_on_screen_ratio: 0.6,
                                     head_stable_ratio: 0.7,
                                     blink_normal_ratio: 0.8,
                                     session_continuity_ratio: 0.5,
                                     face_present_ratio: 0.9,
                                     score_min: 20,
                                     score_max: 82,
                                     score_stddev: 15.0,
                                     longest_low_streak_sec: 20,
                                     longest_away_streak_sec: 8)

    get report_url(date: "2026-06-26")

    assert_response :success
    session.reload
    assert session.interrupted?
    assert_equal "timeout", session.ended_reason
    assert_equal session.last_seen_at.to_i, session.ended_at.to_i
  end
end
