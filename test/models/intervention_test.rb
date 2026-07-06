require "test_helper"

class InterventionTest < ActiveSupport::TestCase
  test "名前があれば有効" do
    intervention = Intervention.new(name: "ポモドーロ")
    assert intervention.valid?
  end

  test "名前がなければ無効" do
    intervention = Intervention.new(name: "")
    assert_not intervention.valid?
  end

  test "名前が重複すると無効" do
    Intervention.create!(name: "ポモドーロ")
    duplicate = Intervention.new(name: "ポモドーロ")
    assert_not duplicate.valid?
  end

  test "セッションと関連付けできる" do
    intervention = Intervention.create!(name: "ポモドーロ")
    task = Task.create!(name: "作業")
    session = task.sessions.create!(started_at: Time.current, intervention: intervention)
    assert_equal [session], intervention.sessions.to_a
  end

  test "施策を削除してもセッションは残り関連だけ外れる" do
    intervention = Intervention.create!(name: "ポモドーロ")
    task = Task.create!(name: "作業")
    session = task.sessions.create!(started_at: Time.current, intervention: intervention)
    intervention.destroy!
    assert_nil session.reload.intervention_id
  end
end
