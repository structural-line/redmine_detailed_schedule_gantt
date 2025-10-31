# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

class CreateIssueDailySchedule < ActiveRecord::Migration[7.2]
  def change
    create_table :issue_daily_schedules, id: :bigint, primary_key: :id do |t|
      t.references :issue, null: false, foreign_key: { to_table: :issues, on_delete: :cascade }, type: :integer
      t.date :schedule_date, null: false
      t.decimal :man_days, null: false, precision: 5, scale: 2, default: 0
    end
    add_index :issue_daily_schedules, [:issue_id, :schedule_date], unique: true, if_not_exists: true
    add_index :issue_daily_schedules, :schedule_date, if_not_exists: true
  end
end