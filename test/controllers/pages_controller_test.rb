require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "計測方法ページが表示できる" do
    get about_url

    assert_response :success
    assert_select "title", /計測方法/
    # 計測の流れ（番号付きステップ）
    assert_select ".flow-step", 4
    assert_select "body", /タスクを選んで計測開始/
    # スコアの計算（式・指標行）
    assert_select ".formula-box"
    assert_select ".metric-row", 5
    assert_select "body", /視線/
    # 根拠・限界
    assert_select "body", /MediaPipe FaceMesh/
    assert_select "body", /認知的集中の直接測定ではありません/
    # プライバシー
    assert_select ".privacy-list li", 4
    assert_select "body", /ブラウザ内だけで処理されます/
    # 旧デザインの残骸がないこと
    assert_select ".metric-thumb", count: 0
    assert_select ".about-panel", count: 0
  end
end
