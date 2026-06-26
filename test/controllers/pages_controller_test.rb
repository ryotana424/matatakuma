require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "説明ページが表示できる" do
    get about_url

    assert_response :success
    assert_select "title", /説明/
    assert_select "body", /Focus Pulse の計測方法/
    assert_select "body", /MediaPipe FaceMesh/
    assert_select "body", /認知的集中の直接測定ではありません/
  end
end
