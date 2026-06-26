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
end
