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
    @avg_score = average_of(@sessions, :avg_score)&.round
    @total_duration = @sessions.sum(&:duration_sec)
    @low_away_ratio = low_away_ratio(@sessions)
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

  # ロード済みセッション配列の指定カラム平均。空配列なら nil
  def average_of(sessions, attribute)
    return nil if sessions.empty?

    sessions.sum { |session| session.public_send(attribute) }.to_f / sessions.size
  end

  def low_away_ratio(sessions)
    return nil if sessions.empty?

    ((average_of(sessions, :low_ratio) + average_of(sessions, :away_ratio)) * 100).round
  end

  def weakest_metric(sessions)
    return nil if sessions.empty?

    metrics = {
      "視線" => average_of(sessions, :gaze_on_screen_ratio),
      "姿勢" => average_of(sessions, :head_stable_ratio),
      "まばたき" => average_of(sessions, :blink_normal_ratio),
      "継続性" => average_of(sessions, :session_continuity_ratio),
      "顔検出" => average_of(sessions, :face_present_ratio)
    }
    label, value = metrics.min_by { |_label, metric_value| metric_value }
    { label: label, value: (value * 100).round }
  end

  def report_params
    params.require(:daily_report).permit(:measure_note, :reflection)
  end
end
