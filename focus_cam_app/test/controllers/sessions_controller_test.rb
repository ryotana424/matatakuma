require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @task = Task.create!(name: "計測対象")
  end

  test "集計値を受け取りSessionを作成する" do
    payload = {
      session: {
        started_at: "2026-06-26T10:00:00",
        ended_at: "2026-06-26T10:30:00",
        duration_sec: 1800,
        avg_score: 78,
        high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.15, away_ratio: 0.05,
        interrupt_count: 4
      }
    }
    assert_difference "@task.sessions.count", 1 do
      post task_sessions_url(@task), params: payload, as: :json
    end
    assert_response :created
    body = JSON.parse(response.body)
    assert_equal 78, body["avg_score"]
  end

  test "不正な値ではエラーを返す" do
    post task_sessions_url(@task), params: { session: { avg_score: 999, duration_sec: 10 } }, as: :json
    assert_response :unprocessable_entity
  end

  test "許可外キー（映像・座標）は無視されSessionに保存されない" do
    payload = { session: {
      started_at: "2026-06-26T10:00:00", ended_at: "2026-06-26T10:30:00",
      duration_sec: 1800, avg_score: 78,
      high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.15, away_ratio: 0.05,
      interrupt_count: 4,
      frame_image: "BASE64DATA", landmarks: [[0.1, 0.2]] # 受け取られないはず
    } }
    assert_difference "@task.sessions.count", 1 do
      post task_sessions_url(@task), params: payload, as: :json
    end
    assert_response :created
    session = @task.sessions.last
    # Sessionに映像・座標を保存する属性が存在しないこと（プライバシー境界）
    assert_not session.attributes.key?("frame_image")
    assert_not session.attributes.key?("landmarks")
  end
end
