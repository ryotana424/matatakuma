class SessionsController < ApplicationController
  # ローカル専用アプリかつJSON APIのためCSRFトークン検証はスキップ
  skip_before_action :verify_authenticity_token

  def create
    @task = Task.find(params[:task_id])
    @session = @task.sessions.build(session_params)
    if @session.save
      render json: @session, status: :created
    else
      render json: { errors: @session.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  # 受け取るのは集計済み数値のみ。映像・座標・画像は一切受け取らない
  def session_params
    params.require(:session).permit(
      :started_at, :ended_at, :duration_sec, :avg_score,
      :high_ratio, :medium_ratio, :low_ratio, :away_ratio, :interrupt_count
    )
  end
end
