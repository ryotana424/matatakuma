require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "説明ページが表示できる" do
    get about_url

    assert_response :success
    assert_select "title", /説明/
    assert_select "body", /Focus Pulse の計測方法/
    assert_select "body", /MediaPipe FaceMesh/
    assert_select "body", /認知的集中の直接測定ではありません/
    assert_select "body", /スコアは、画面に向かう状態がどれだけ続いたかを0〜100で表した目安です/
    assert_select "body", /GazeOnScreen（視線）/
    assert_select ".metrics-illustration", count: 0
    assert_select ".metric-thumb--gaze[aria-label='GazeOnScreen（視線）のイラスト']"
    assert_select ".metric-thumb--head[aria-label='HeadStable（頭の安定）のイラスト']"
    assert_select ".metric-thumb--blink[aria-label='BlinkNormal（まばたき）のイラスト']"
    assert_select ".metric-thumb--continuity[aria-label='SessionContinuity（継続）のイラスト']"
    assert_select ".metric-thumb--face[aria-label='FacePresent（顔検出）のイラスト']"
    assert_select ".metric-label", count: 0
    assert_select ".metrics-legend", count: 0
    assert_no_match(/処理場所/, response.body)
    assert_no_match(/既定ポート/, response.body)
  end
end
