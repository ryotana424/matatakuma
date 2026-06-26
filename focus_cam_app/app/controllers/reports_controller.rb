class ReportsController < ApplicationController
  def index
    @dates = Session.order(started_at: :desc).pluck(:started_at).map(&:to_date).uniq
  end

  def show
    @date = Date.parse(params[:date])
    @report = DailyReport.for_date(@date)
    @sessions = Session.on_date(@date).includes(:task).order(started_at: :asc)
    @avg_score = @sessions.average(:avg_score)&.round
    @total_duration = @sessions.sum(:duration_sec)
  end

  def update
    @date = Date.parse(params[:date])
    @report = DailyReport.for_date(@date)
    @report.update(report_params)
    redirect_to report_path(date: @date.iso8601), notice: "レポートを保存しました"
  end

  private

  def report_params
    params.require(:daily_report).permit(:measure_note, :reflection)
  end
end
