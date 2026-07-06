require "test_helper"

class ApplicationHelperTest < ActionView::TestCase
  test "集中度総量をkとmで短縮表示できる" do
    assert_equal "999", format_focus_volume(999)
    assert_equal "1k", format_focus_volume(1000)
    assert_equal "2.4k", format_focus_volume(2400)
    assert_equal "1.3m", format_focus_volume(1_250_000)
  end
end
