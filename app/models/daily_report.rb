class DailyReport < ApplicationRecord
  validates :report_date, presence: true, uniqueness: true

  # 指定日のレポートを取得、なければ作成する
  def self.for_date(date)
    find_or_create_by!(report_date: date)
  end
end
