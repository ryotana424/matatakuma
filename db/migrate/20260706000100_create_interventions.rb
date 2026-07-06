class CreateInterventions < ActiveRecord::Migration[8.1]
  def change
    create_table :interventions do |t|
      t.string :name, null: false
      t.text :description
      t.timestamps
    end
    add_index :interventions, :name, unique: true

    add_reference :sessions, :intervention, null: true, foreign_key: true
  end
end
