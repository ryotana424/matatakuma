# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_06_30_000100) do
  create_table "daily_reports", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "measure_note"
    t.text "reflection"
    t.date "report_date", null: false
    t.datetime "updated_at", null: false
    t.index ["report_date"], name: "index_daily_reports_on_report_date", unique: true
  end

  create_table "sessions", force: :cascade do |t|
    t.integer "avg_score", default: 0, null: false
    t.float "away_ratio", default: 0.0, null: false
    t.float "blink_normal_ratio", default: 0.0, null: false
    t.datetime "created_at", null: false
    t.integer "duration_sec", default: 0, null: false
    t.datetime "ended_at"
    t.string "ended_reason"
    t.float "face_present_ratio", default: 0.0, null: false
    t.float "gaze_on_screen_ratio", default: 0.0, null: false
    t.float "head_stable_ratio", default: 0.0, null: false
    t.float "high_ratio", default: 0.0, null: false
    t.integer "interrupt_count", default: 0, null: false
    t.datetime "last_seen_at"
    t.integer "longest_away_streak_sec", default: 0, null: false
    t.integer "longest_low_streak_sec", default: 0, null: false
    t.float "low_ratio", default: 0.0, null: false
    t.float "medium_ratio", default: 0.0, null: false
    t.integer "save_count", default: 0, null: false
    t.integer "score_max", default: 0, null: false
    t.integer "score_min", default: 0, null: false
    t.float "score_stddev", default: 0.0, null: false
    t.float "session_continuity_ratio", default: 0.0, null: false
    t.datetime "started_at", null: false
    t.integer "status", default: 0, null: false
    t.integer "task_id", null: false
    t.datetime "updated_at", null: false
    t.index ["task_id"], name: "index_sessions_on_task_id"
  end

  create_table "tasks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.integer "status", default: 0, null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "sessions", "tasks"
end
