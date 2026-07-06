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

  # 完了済みセッションの平均集中スコア * 計測分数。未計測なら nil
  def focus_volume
    average = average_score
    return nil unless average

    completed_duration_min = sessions.completed.sum(:duration_sec) / 60.0
    (average * completed_duration_min).round
  end
end
