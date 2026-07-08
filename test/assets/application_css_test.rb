require "test_helper"

class ApplicationCssTest < ActiveSupport::TestCase
  test "未着手の状態セレクトは白背景にならない" do
    css = Rails.root.join("app/assets/stylesheets/application.css").read

    assert_includes css, ".task-status-select.status-pill--todo"
    assert_match(/\.task-status-select\.status-pill--todo\s*\{[^}]*background-color:\s*var\(--surface-overlay\)/m, css)
  end
end
