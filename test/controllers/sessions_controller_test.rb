require "test_helper"

class SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @task = Task.create!(name: "計測対象")
  end

  test "計測開始時にrunningセッションを作成する" do
    assert_difference "@task.sessions.count", 1 do
      post task_sessions_url(@task), params: { session: { started_at: "2026-06-26T10:00:00" } }, as: :json
    end

    assert_response :created
    session = @task.sessions.last
    assert session.running?
    assert_nil session.ended_at
    assert_equal 0, session.avg_score
    assert_equal 0, session.save_count
    assert_not_nil session.last_seen_at
  end

  test "計測中の集計値をrunningセッションへ上書き保存する" do
    session = @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10),
                                     duration_sec: 0, avg_score: 0,
                                     high_ratio: 0, medium_ratio: 0, low_ratio: 0, away_ratio: 0,
                                     interrupt_count: 0,
                                     status: :running,
                                     last_seen_at: Time.zone.local(2026, 6, 26, 10),
                                     save_count: 0)

    patch task_session_url(@task, session), params: {
      session: {
        duration_sec: 60,
        avg_score: 78,
        high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.15, away_ratio: 0.05,
        interrupt_count: 4,
        gaze_on_screen_ratio: 0.82,
        head_stable_ratio: 0.75,
        blink_normal_ratio: 0.91,
        session_continuity_ratio: 0.68,
        face_present_ratio: 0.94,
        score_min: 32,
        score_max: 96,
        score_stddev: 14.25,
        longest_low_streak_sec: 12,
        longest_away_streak_sec: 4
      }
    }, as: :json

    assert_response :ok
    session.reload
    assert session.running?
    assert_equal 78, session.avg_score
    assert_equal 0.82, session.gaze_on_screen_ratio
    assert_equal 1, session.save_count
    assert_not_nil session.last_seen_at
  end

  test "正常終了時にcompletedとして確定する" do
    session = @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10),
                                     duration_sec: 60, avg_score: 78,
                                     high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.15, away_ratio: 0.05,
                                     interrupt_count: 4,
                                     status: :running,
                                     last_seen_at: Time.zone.local(2026, 6, 26, 10, 1),
                                     save_count: 1)

    patch task_session_url(@task, session), params: {
      session: {
        ended_at: "2026-06-26T10:30:00",
        duration_sec: 1800,
        avg_score: 80,
        status: "completed",
        ended_reason: "stopped"
      }
    }, as: :json

    assert_response :ok
    session.reload
    assert session.completed?
    assert_equal "stopped", session.ended_reason
    assert_equal 1800, session.duration_sec
    assert_equal 2, session.save_count
  end

  test "不正な値ではエラーを返す" do
    session = @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10),
                                     status: :running, last_seen_at: Time.zone.local(2026, 6, 26, 10),
                                     save_count: 0)

    patch task_session_url(@task, session), params: { session: { avg_score: 999, duration_sec: 10 } }, as: :json
    assert_response :unprocessable_entity
  end

  test "許可外キー（映像・座標）は無視されSessionに保存されない" do
    session = @task.sessions.create!(started_at: Time.zone.local(2026, 6, 26, 10),
                                     status: :running, last_seen_at: Time.zone.local(2026, 6, 26, 10),
                                     save_count: 0)

    payload = { session: {
      ended_at: "2026-06-26T10:30:00",
      duration_sec: 1800, avg_score: 78,
      high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.15, away_ratio: 0.05,
      interrupt_count: 4,
      frame_image: "BASE64DATA", landmarks: [[0.1, 0.2]] # 受け取られないはず
    } }
    patch task_session_url(@task, session), params: payload, as: :json
    assert_response :ok
    session.reload
    # Sessionに映像・座標を保存する属性が存在しないこと（プライバシー境界）
    assert_not session.attributes.key?("frame_image")
    assert_not session.attributes.key?("landmarks")
  end
end
