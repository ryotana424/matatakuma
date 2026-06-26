class Session < ApplicationRecord
  belongs_to :task

  validates :avg_score, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :duration_sec, numericality: { greater_than_or_equal_to: 0 }
  # 各状態の比率は 0.0〜1.0 の範囲
  validates :high_ratio, :medium_ratio, :low_ratio, :away_ratio,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }

  # started_at の日付で当日セッションを引く
  scope :on_date, ->(date) {
    where(started_at: date.all_day)
  }
end
