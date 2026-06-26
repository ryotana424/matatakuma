class CreateSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :sessions do |t|
      # task は references で既定の index 付き
      t.references :task, null: false, foreign_key: true
      t.datetime :started_at, null: false
      t.datetime :ended_at, null: false
      t.integer :duration_sec, null: false
      t.integer :avg_score, null: false
      t.float :high_ratio, null: false
      t.float :medium_ratio, null: false
      t.float :low_ratio, null: false
      t.float :away_ratio, null: false
      t.integer :interrupt_count, null: false

      t.timestamps
    end
  end
end
