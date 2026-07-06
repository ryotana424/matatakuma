# 日次レポートのセッション内訳から、セッションに施策を後付け・変更・解除する
class SessionInterventionsController < ApplicationController
  def update
    session = Session.find(params[:session_id])
    session.update!(intervention_id: params.require(:session)[:intervention_id].presence)
    redirect_to report_path(date: session.started_at.to_date.iso8601), notice: "施策を更新しました"
  end
end
