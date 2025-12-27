# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

class AddColumnToGanttLatestUpdates < ActiveRecord::Migration[7.2]
  def change
    add_column :gantt_latest_updates, :last_update_user_id, :integer, null: true
  end
end