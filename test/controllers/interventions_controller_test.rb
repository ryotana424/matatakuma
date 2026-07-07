require "test_helper"

class InterventionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @task = Task.create!(name: "作業")
    @intervention = Intervention.create!(name: "ポモドーロ")
  end

  # 比較集計に必要な全属性を持つセッションを作成する
  # 注: ActionDispatch::Integration::Runner が同名の create_session(app) を内部で
  # method_missing 経由で呼び出すため、名前が衝突しないよう build_session とする
  def build_session(attrs = {})
    defaults = {
      started_at: Time.zone.local(2026, 7, 6, 10), ended_at: Time.zone.local(2026, 7, 6, 11),
      duration_sec: 3600, avg_score: 80, status: :completed,
      high_ratio: 0.5, medium_ratio: 0.3, low_ratio: 0.1, away_ratio: 0.1, interrupt_count: 2,
      gaze_on_screen_ratio: 0.8, head_stable_ratio: 0.7, blink_normal_ratio: 0.9,
      session_continuity_ratio: 0.6, face_present_ratio: 0.95
    }
    @task.sessions.create!(defaults.merge(attrs))
  end

  test "施策一覧が表示できる" do
    get interventions_url
    assert_response :success
    assert_select "body", /ポモドーロ/
  end

  test "施策を作成できる" do
    assert_difference "Intervention.count", 1 do
      post interventions_url, params: { intervention: { name: "スタンディング", description: "立って作業する" } }
    end
    assert_redirected_to interventions_url
  end

  test "Turbo Streamで施策作成後に計測画面の施策選択肢を更新できる" do
    assert_difference "Intervention.count", 1 do
      post interventions_url(format: :turbo_stream),
           params: { intervention: { name: "深呼吸", description: "作業前に呼吸を整える" } }
    end

    assert_response :success
    assert_equal Mime[:turbo_stream], response.media_type
    assert_includes response.body, "measure-intervention-select-frame"
    assert_includes response.body, "深呼吸"
    assert_includes response.body, "selected"
  end

  test "名前が空だと施策を作成できない" do
    assert_no_difference "Intervention.count" do
      post interventions_url, params: { intervention: { name: "" } }
    end
    assert_response :unprocessable_entity
  end

  test "施策名と説明を更新できる" do
    patch intervention_url(@intervention), params: { intervention: { name: "深呼吸", description: "作業前に呼吸を整える" } }

    assert_redirected_to intervention_url(@intervention)
    @intervention.reload
    assert_equal "深呼吸", @intervention.name
    assert_equal "作業前に呼吸を整える", @intervention.description
  end

  test "更新時に名前が空なら詳細画面を再表示する" do
    patch intervention_url(@intervention), params: { intervention: { name: "" } }

    assert_response :unprocessable_entity
    assert_equal "ポモドーロ", @intervention.reload.name
    assert_select ".field-error", /施策名/
  end

  test "施策を削除できセッションは残して紐付けだけ外す" do
    session = build_session(intervention: @intervention)

    assert_difference "Intervention.count", -1 do
      delete intervention_url(@intervention)
    end

    assert_redirected_to interventions_url
    assert_nil session.reload.intervention_id
  end

  test "施策詳細で適用・非適用セッションを比較表示する" do
    build_session(avg_score: 90, intervention: @intervention)
    build_session(avg_score: 60)

    get intervention_url(@intervention)

    assert_response :success
    assert_select "h2", text: "効果比較（全期間）"
    assert_select "form[action=?][method=?]", intervention_path(@intervention), "post" do
      assert_select "input[name=?][value=?]", "intervention[name]", "ポモドーロ"
      assert_select "textarea[name=?]", "intervention[description]"
    end
    assert_select "form[action=?][method=?]", intervention_path(@intervention), "post" do
      assert_select "input[name=?][value=?]", "_method", "delete"
      assert_select "button", text: "削除"
    end
    assert_select "td", text: "90"
    assert_select "td", text: "60"
    assert_select "canvas[data-controller=?]", "report-chart"
  end

  test "適用セッションがない施策は案内文を表示する" do
    get intervention_url(@intervention)
    assert_response :success
    assert_select "p", /この施策を適用したセッションはまだありません/
  end
end
