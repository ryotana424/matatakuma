class Session < ApplicationRecord
  belongs_to :task

  enum :status, { running: 0, completed: 1, interrupted: 2 }

  validates :avg_score, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :duration_sec, numericality: { greater_than_or_equal_to: 0 }
  # 各状態・改善指標の比率は 0.0〜1.0 の範囲
  validates :high_ratio, :medium_ratio, :low_ratio, :away_ratio,
            :gaze_on_screen_ratio, :head_stable_ratio, :blink_normal_ratio,
            :session_continuity_ratio, :face_present_ratio,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }
  validates :score_min, :score_max,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :score_stddev, numericality: { greater_than_or_equal_to: 0 }
  validates :interrupt_count, :save_count, :longest_low_streak_sec, :longest_away_streak_sec,
            numericality: { greater_than_or_equal_to: 0 }
  validates :ended_reason, inclusion: { in: %w[stopped timeout error], message: "は一覧にありません" }, allow_nil: true

  # started_at の日付で当日セッションを引く
  scope :on_date, ->(date) {
    where(started_at: date.all_day)
  }
end
