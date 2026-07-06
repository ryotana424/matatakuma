# 集中力改善のために試す施策。セッションに紐付けて適用/非適用の効果を比較する
class Intervention < ApplicationRecord
  has_many :sessions, dependent: :nullify

  validates :name, presence: true, uniqueness: true
end
