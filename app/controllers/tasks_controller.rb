class TasksController < ApplicationController
  def index
    @tasks = Task.order(created_at: :desc)
    @task = Task.new
    @daily_sessions = load_daily_sessions
  end

  def create
    @task = Task.new(task_params)
    if @task.save
      redirect_to tasks_path, notice: "タスクを作成しました"
    else
      @tasks = Task.order(created_at: :desc)
      @daily_sessions = load_daily_sessions
      render :index, status: :unprocessable_entity
    end
  end

  def update
    @task = Task.find(params[:id])
    @task.update(task_params)
    redirect_to tasks_path
  end

  def measure
    @task = Task.find(params[:id])
    @task.doing! if @task.todo?
    @interventions = Intervention.order(created_at: :desc)
    @previous_session = @task.sessions.completed.order(started_at: :desc).first
    @tasks = Task.order(created_at: :desc)
    @new_task = Task.new
    @daily_sessions = load_daily_sessions
  end

  private

  # ステータスバー用に本日の完了セッションを配列でロードする
  def load_daily_sessions
    Session.completed.on_date(Date.current).to_a
  end

  def task_params
    params.require(:task).permit(:name, :status)
  end
end
