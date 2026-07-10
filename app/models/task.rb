class Task < ApplicationRecord
  has_many :sessions, dependent: :destroy

  enum :status, { todo: 0, doing: 1, done: 2, archived: 3, interrupted: 4 }, default: :todo

  validates :name, presence: true

  # タスクに紐づく全セッションの計測秒数合計
  def total_duration_sec
    sessions.sum(:duration_sec)
  end

  # 完了済みセッションの平均集中スコア。未計測なら nil
  def average_score
    sessions.completed.average(:avg_score)&.round
  end

  # 完了済みセッションの在席中の集中度総量。離席中は加算しない。
  def focus_volume
    completed_sessions = sessions.completed.to_a
    return nil if completed_sessions.empty?

    completed_sessions.sum(&:effective_focus_volume).round
  end
end
