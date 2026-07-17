require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "Aboutページが表示できる" do
    get about_url

    assert_response :success
    assert_select "title", /About/
    # 計測の流れ（番号付きステップ）
    assert_select ".flow-step", 4
    assert_select "body", /タスクを選んで計測開始/
    # カメラ位置の案内
    assert_select "body", /カメラは画面上部中央/
    assert_select "body", /横や下にずれていると/
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
    # 使い方ガイド（オンボーディング再生ボタン）
    assert_select "[data-controller='restart-onboarding']"
    assert_select "button[data-action='restart-onboarding#restart']", /オンボーディングをもう一度受ける/
    # 旧デザインの残骸がないこと
    assert_select ".metric-thumb", count: 0
    assert_select ".about-panel", count: 0
  end
end
