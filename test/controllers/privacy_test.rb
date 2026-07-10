require "test_helper"

class PrivacyTest < ActiveSupport::TestCase
  test "Sessionに映像・画像・座標カラムが存在しない" do
    forbidden = %w[image video frame landmark photo blob frames coordinates]
    Session.column_names.each do |column|
      forbidden.each do |word|
        assert_not column.downcase.include?(word), "Sessionに映像系カラム #{column} が存在する"
      end
    end
  end

  test "Sessionの保存カラムは集計値のみ" do
    expected = %w[
      started_at ended_at duration_sec avg_score focus_volume
      high_ratio medium_ratio low_ratio away_ratio interrupt_count
      status last_seen_at save_count ended_reason
      gaze_on_screen_ratio head_stable_ratio blink_normal_ratio
      session_continuity_ratio face_present_ratio
      score_min score_max score_stddev
      longest_low_streak_sec longest_away_streak_sec
    ].sort
    actual = (Session.column_names - %w[id task_id intervention_id created_at updated_at]).sort
    assert_equal expected, actual, "Sessionのカラムが集計値以外を含む"
  end
end
