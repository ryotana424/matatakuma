class ReportsController < ApplicationController
  def index
    @dates = Session.order(started_at: :desc).pluck(:started_at).map(&:to_date).uniq
  end

  def show
    @date = Date.parse(params[:date])
    @report = DailyReport.for_date(@date)
    expire_stale_running_sessions
    # ビューでテーブル描画のため全件ロードするので、集計も配列上で行い追加クエリを発生させない
    @sessions = Session.on_date(@date).includes(:task).order(started_at: :asc).to_a
    summary = SessionAnalytics.summary(@sessions)
    @avg_score = summary[:avg_score]
    @total_duration = summary[:total_duration_sec]
    @low_away_ratio = summary[:low_away_ratio]
    @weakest_metric = SessionAnalytics.weakest_metric(@sessions)
    @hourly_focus = SessionAnalytics.hourly_focus(@sessions)
    @task_summaries = SessionAnalytics.task_summaries(@sessions)
    @interventions = Intervention.order(created_at: :desc)
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

  def report_params
    params.require(:daily_report).permit(:measure_note, :reflection)
  end
end
