class ReportsController < ApplicationController
  def index
    @dates = Session.order(started_at: :desc).pluck(:started_at).map(&:to_date).uniq
  end

  def show
    @date = Date.parse(params[:date])
    @report = DailyReport.for_date(@date)
    expire_stale_running_sessions
    @sessions = Session.on_date(@date).includes(:task).order(started_at: :asc)
    @avg_score = @sessions.average(:avg_score)&.round
    @total_duration = @sessions.sum(:duration_sec)
    @low_away_ratio = @sessions.any? ? ((@sessions.average(:low_ratio).to_f + @sessions.average(:away_ratio).to_f) * 100).round : nil
    @weakest_metric = weakest_metric(@sessions)
  end

  def update
    @date = Date.parse(params[:date])
    @report = DailyReport.for_date(@date)
    @report.update(report_params)
    redirect_to report_path(date: @date.iso8601), notice: "レポートを保存しました"
  end

  private

  def expire_stale_running_sessions
    Session.running.where("last_seen_at < ?", 90.seconds.ago).find_each do |session|
      session.update!(
        status: :interrupted,
        ended_at: session.last_seen_at,
        ended_reason: "timeout"
      )
    end
  end

  def weakest_metric(sessions)
    return nil if sessions.empty?

    metrics = {
      "視線" => sessions.average(:gaze_on_screen_ratio).to_f,
      "姿勢" => sessions.average(:head_stable_ratio).to_f,
      "まばたき" => sessions.average(:blink_normal_ratio).to_f,
      "継続性" => sessions.average(:session_continuity_ratio).to_f,
      "顔検出" => sessions.average(:face_present_ratio).to_f
    }
    label, value = metrics.min_by { |_label, metric_value| metric_value }
    { label: label, value: (value * 100).round }
  end

  def report_params
    params.require(:daily_report).permit(:measure_note, :reflection)
  end
end
