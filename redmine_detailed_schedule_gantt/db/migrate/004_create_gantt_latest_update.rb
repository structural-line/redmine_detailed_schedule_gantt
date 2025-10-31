# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

class CreateGanttLatestUpdate < ActiveRecord::Migration[7.2]
    def change
      create_table :gantt_latest_updates, id: :bigint, primary_key: :id do |t|
        t.references :project, null: true, foreign_key: { to_table: :projects, on_delete: :cascade }, type: :integer
        t.datetime :last_update_date, null: true
      end
      add_index :gantt_latest_updates, :project_id, unique: true, if_not_exists: true
    end
end