require "test_helper"

class DailyReportTest < ActiveSupport::TestCase
  test "report_dateが必須" do
    report = DailyReport.new(report_date: nil)
    assert_not report.valid?
  end

  test "report_dateは一意" do
    DailyReport.create!(report_date: Date.new(2026, 6, 26))
    dup = DailyReport.new(report_date: Date.new(2026, 6, 26))
    assert_not dup.valid?
    assert_includes dup.errors[:report_date], "はすでに存在します"
  end

  test "指定日のレポートを取得または新規生成する" do
    report = DailyReport.for_date(Date.new(2026, 6, 26))
    assert report.persisted?
    again = DailyReport.for_date(Date.new(2026, 6, 26))
    assert_equal report.id, again.id
  end
end
