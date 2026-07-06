# 日次レポートのセッション内訳から、セッションに施策を後付け・変更・解除する
class SessionInterventionsController < ApplicationController
  # 施策が削除された後などで存在しないIDが来ても、500ではなくレポートへ戻す
  rescue_from ActiveRecord::InvalidForeignKey do
    redirect_to report_path(date: @session.started_at.to_date.iso8601), alert: "施策が見つかりません"
  end

  def update
    @session = Session.find(params[:session_id])
    @session.update!(intervention_id: params.require(:session)[:intervention_id].presence)
    redirect_to report_path(date: @session.started_at.to_date.iso8601), notice: "施策を更新しました"
  end
end
