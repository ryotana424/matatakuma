class InterventionsController < ApplicationController
  before_action :set_intervention, only: [:show, :update, :destroy]

  def index
    @interventions = Intervention.order(created_at: :desc)
    @intervention = Intervention.new
    load_index_comparison
  end

  def create
    @intervention = Intervention.new(intervention_params)
    if @intervention.save
      @interventions = Intervention.order(created_at: :desc)
      respond_to do |format|
        format.html { redirect_to interventions_path, notice: "施策を作成しました" }
        format.turbo_stream
      end
    else
      @interventions = Intervention.order(created_at: :desc)
      load_index_comparison
      render :index, status: :unprocessable_entity
    end
  end

  def show
    load_comparison
  end

  def update
    if @intervention.update(intervention_params)
      redirect_to intervention_path(@intervention), notice: "施策を更新しました"
    else
      load_comparison
      render :show, status: :unprocessable_entity
    end
  end

  def destroy
    @intervention.destroy!
    redirect_to interventions_path, notice: "施策を削除しました"
  end

  private

  def set_intervention
    @intervention = Intervention.find(params[:id])
  end

  # 一覧画面でベースライン（施策なしの平均スコア）と施策ごとの効果比較を作る。
  # 全セッションを1回だけロードし、施策IDで振り分けて配列上で集計する。
  def load_index_comparison
    all_sessions = Session.order(started_at: :desc).to_a
    baseline_sessions = all_sessions.select { |session| session.intervention_id.nil? }
    by_intervention = all_sessions.reject { |session| session.intervention_id.nil? }
      .group_by(&:intervention_id)

    baseline_summary = SessionAnalytics.summary(baseline_sessions)
    @baseline_score = baseline_summary[:avg_score]
    @baseline_count = baseline_summary[:count]

    @comparisons = @interventions.map do |intervention|
      sessions = by_intervention[intervention.id] || []
      summary = SessionAnalytics.summary(sessions)
      delta = if summary[:avg_score] && @baseline_score
        summary[:avg_score] - @baseline_score
      end
      {
        intervention: intervention,
        count: summary[:count],
        avg_score: summary[:avg_score],
        delta: delta
      }
    end
  end

  def load_comparison
    # 全期間のセッションを1回だけロードし、適用/非適用に分けて配列上で集計する
    all_sessions = Session.order(started_at: :desc).to_a
    applied, others = all_sessions.partition { |session| session.intervention_id == @intervention.id }
    @applied_summary = SessionAnalytics.summary(applied)
    @others_summary = SessionAnalytics.summary(others)
    @applied_metrics = SessionAnalytics.metric_averages(applied)
    @others_metrics = SessionAnalytics.metric_averages(others)
  end

  def intervention_params
    params.require(:intervention).permit(:name, :description)
  end
end
