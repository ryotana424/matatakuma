require "test_helper"

class SessionInterventionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @task = Task.create!(name: "作業")
    @intervention = Intervention.create!(name: "ポモドーロ")
    @session = @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10),
                                      ended_at: Time.zone.local(2026, 6, 26, 11),
                                      duration_sec: 3600, avg_score: 82,
                                      high_ratio: 0.6, medium_ratio: 0.3, low_ratio: 0.1,
                                      away_ratio: 0, interrupt_count: 2)
  end

  test "セッションに施策を後付けできる" do
    patch session_intervention_url(@session), params: { session: { intervention_id: @intervention.id } }

    assert_redirected_to report_url(date: "2026-06-26")
    assert_equal @intervention.id, @session.reload.intervention_id
  end

  test "施策の紐付けを解除できる" do
    @session.update!(intervention: @intervention)

    patch session_intervention_url(@session), params: { session: { intervention_id: "" } }

    assert_redirected_to report_url(date: "2026-06-26")
    assert_nil @session.reload.intervention_id
  end

  test "存在しない施策IDならレポートへ戻し施策は変更しない" do
    patch session_intervention_url(@session), params: { session: { intervention_id: 999_999 } }

    assert_redirected_to report_url(date: "2026-06-26")
    assert_nil @session.reload.intervention_id
  end
end
