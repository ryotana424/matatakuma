class AddSessionRecoveryAndImprovementMetrics < ActiveRecord::Migration[8.1]
  def change
    change_column_null :sessions, :ended_at, true
    change_column_default :sessions, :duration_sec, from: nil, to: 0
    change_column_default :sessions, :avg_score, from: nil, to: 0
    change_column_default :sessions, :high_ratio, from: nil, to: 0.0
    change_column_default :sessions, :medium_ratio, from: nil, to: 0.0
    change_column_default :sessions, :low_ratio, from: nil, to: 0.0
    change_column_default :sessions, :away_ratio, from: nil, to: 0.0
    change_column_default :sessions, :interrupt_count, from: nil, to: 0

    add_column :sessions, :status, :integer, null: false, default: 0
    add_column :sessions, :last_seen_at, :datetime
    add_column :sessions, :save_count, :integer, null: false, default: 0
    add_column :sessions, :ended_reason, :string
    add_column :sessions, :gaze_on_screen_ratio, :float, null: false, default: 0.0
    add_column :sessions, :head_stable_ratio, :float, null: false, default: 0.0
    add_column :sessions, :blink_normal_ratio, :float, null: false, default: 0.0
    add_column :sessions, :session_continuity_ratio, :float, null: false, default: 0.0
    add_column :sessions, :face_present_ratio, :float, null: false, default: 0.0
    add_column :sessions, :score_min, :integer, null: false, default: 0
    add_column :sessions, :score_max, :integer, null: false, default: 0
    add_column :sessions, :score_stddev, :float, null: false, default: 0.0
    add_column :sessions, :longest_low_streak_sec, :integer, null: false, default: 0
    add_column :sessions, :longest_away_streak_sec, :integer, null: false, default: 0
  end
end
