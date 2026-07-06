class InterventionsController < ApplicationController
  def index
    @interventions = Intervention.order(created_at: :desc)
    @intervention = Intervention.new
    # 一覧で施策ごとの適用セッション数を出すための1クエリ集計
    @session_counts = Session.where.not(intervention_id: nil).group(:intervention_id).count
  end

  def create
    @intervention = Intervention.new(intervention_params)
    if @intervention.save
      redirect_to interventions_path, notice: "施策を作成しました"
    else
      @interventions = Intervention.order(created_at: :desc)
      @session_counts = Session.where.not(intervention_id: nil).group(:intervention_id).count
      render :index, status: :unprocessable_entity
    end
  end

  def show
    @intervention = Intervention.find(params[:id])
    # 全期間のセッションを1回だけロードし、適用/非適用に分けて配列上で集計する
    all_sessions = Session.order(started_at: :desc).to_a
    applied, others = all_sessions.partition { |session| session.intervention_id == @intervention.id }
    @applied_summary = SessionAnalytics.summary(applied)
    @others_summary = SessionAnalytics.summary(others)
    @applied_metrics = SessionAnalytics.metric_averages(applied)
    @others_metrics = SessionAnalytics.metric_averages(others)
  end

  private

  def intervention_params
    params.require(:intervention).permit(:name, :description)
  end
end
