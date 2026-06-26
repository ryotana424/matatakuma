class TasksController < ApplicationController
  def index
    @tasks = Task.order(created_at: :desc)
    @task = Task.new
  end

  def create
    @task = Task.new(task_params)
    if @task.save
      redirect_to tasks_path, notice: "タスクを作成しました"
    else
      @tasks = Task.order(created_at: :desc)
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
  end

  private

  def task_params
    params.require(:task).permit(:name, :status)
  end
end
