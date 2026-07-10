class AddFocusVolumeToSessions < ActiveRecord::Migration[8.1]
  def up
    add_column :sessions, :focus_volume, :float

    # 既存セッションには在席サンプル累計がないため、離席率を使って近似する。
    execute <<~SQL.squish
      UPDATE sessions
      SET focus_volume = avg_score * (duration_sec / 60.0) * (1.0 - away_ratio)
    SQL
  end

  def down
    remove_column :sessions, :focus_volume
  end
end
