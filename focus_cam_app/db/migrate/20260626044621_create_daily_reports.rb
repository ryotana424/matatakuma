class CreateDailyReports < ActiveRecord::Migration[8.1]
  def change
    create_table :daily_reports do |t|
      t.date :report_date, null: false
      t.text :measure_note
      t.text :reflection

      t.timestamps
    end
    add_index :daily_reports, :report_date, unique: true
  end
end
