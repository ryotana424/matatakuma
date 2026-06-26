require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "nameが必須" do
    task = Task.new(name: nil)
    assert_not task.valid?
    assert_includes task.errors[:name], "を入力してください"
  end

  test "statusのデフォルトはtodo" do
    task = Task.create!(name: "資料作成")
    assert_equal "todo", task.status
  end
end
