class SessionsController < ApplicationController
  # ローカル専用アプリかつJSON APIのためCSRFトークン検証はスキップ
  skip_before_action :verify_authenticity_token

  def create
    @task = Task.find(params[:task_id])
    @session = @task.sessions.build(start_params)
    @session.status = :running
    @session.last_seen_at ||= Time.current

    if @session.save
      render json: @session, status: :created
    else
      render json: { errors: @session.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    @task = Task.find(params[:task_id])
    @session = @task.sessions.find(params[:id])
    @session.assign_attributes(session_params)
    @session.last_seen_at = Time.current
    @session.save_count += 1

    if @session.save
      render json: @session, status: :ok
    else
      render json: { errors: @session.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def start_params
    params.require(:session).permit(:started_at)
  end

  # 受け取るのは集計済み数値のみ。映像・座標・画像は一切受け取らない
  def session_params
    params.require(:session).permit(
      :started_at, :ended_at, :duration_sec, :avg_score,
      :high_ratio, :medium_ratio, :low_ratio, :away_ratio, :interrupt_count,
      :gaze_on_screen_ratio, :head_stable_ratio, :blink_normal_ratio,
      :session_continuity_ratio, :face_present_ratio,
      :score_min, :score_max, :score_stddev,
      :longest_low_streak_sec, :longest_away_streak_sec,
      :status, :ended_reason
    )
  end
end
