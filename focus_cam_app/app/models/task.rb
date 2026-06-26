class Task < ApplicationRecord
  has_many :sessions, dependent: :destroy

  enum :status, { todo: 0, doing: 1, done: 2 }, default: :todo

  validates :name, presence: true

  # タスクに紐づく全セッションの計測秒数合計
  def total_duration_sec
    sessions.sum(:duration_sec)
  end
end
