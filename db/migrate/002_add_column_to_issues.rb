# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

class AddColumnToIssues < ActiveRecord::Migration[7.2]
  def change
    add_column :issues, :estimated_days, :decimal, precision: 5, scale: 2, null: false, default: 0
    add_column :issues, :schedule_days, :decimal, precision: 5, scale: 2, null: false, default: 0
    add_column :issues, :check_days, :decimal, precision: 5, scale: 2, null: true
    add_column :issues, :external_link, :string, limit: 2048, null: true
    add_column :issues, :color_id, :integer, null: true
  end
end