class ReportsController < ApplicationController
  def index
    # 全セッションを1回だけロードし、日付ごとに配列上で集計する（追加クエリを出さない）
    sessions = Session.includes(:task).order(started_at: :desc).to_a
    days = sessions.group_by { |session| session.started_at.to_date }.map do |date, day_sessions|
      summary = SessionAnalytics.summary(day_sessions)
      {
        date: date,
        avg_score: summary[:avg_score],
        total_duration_sec: summary[:total_duration_sec]
      }
    end.sort_by { |day| day[:date] }.reverse
    # 月（年月）ごとにグループ化して新しい月から並べる
    @months = days.group_by { |day| [day[:date].year, day[:date].month] }
      .sort_by { |(year, month), _days| [-year, -month] }
      .map do |(year, month), month_days|
        { label: "#{year}年#{month}月", days: month_days }
      end
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
