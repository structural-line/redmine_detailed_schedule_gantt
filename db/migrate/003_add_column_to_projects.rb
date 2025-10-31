# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

class AddColumnToProjects < ActiveRecord::Migration[7.2]
  def change
    # 接頭辞（project_）を着けないとRedmineのstart_dateとコンフリクトしてうまく使えない
    add_column :projects, :project_start_date, :date, null: true
    add_column :projects, :end_date, :date, null: true
    add_column :projects, :estimated_days, :decimal, precision: 7, scale: 2, null: false, default: 0
    add_column :projects, :schedule_days, :decimal, precision: 7, scale: 2, null: false, default: 0
    add_column :projects, :check_days, :decimal, precision: 7, scale: 2, null: true

    add_index  :projects, :project_start_date, if_not_exists: true
    add_index  :projects, :end_date, if_not_exists: true
  end
end