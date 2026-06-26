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
      started_at ended_at duration_sec avg_score
      high_ratio medium_ratio low_ratio away_ratio interrupt_count
    ].sort
    actual = (Session.column_names - %w[id task_id created_at updated_at]).sort
    assert_equal expected, actual, "Sessionのカラムが集計値以外を含む"
  end
end
