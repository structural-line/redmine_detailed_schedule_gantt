# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

class AddColumnToVersions < ActiveRecord::Migration[7.2]
  def change
    # 接頭辞（project_）を着けないとRedmineのstart_dateとコンフリクトしてうまく使えない
    add_column :versions, :version_start_date, :date, null: true
  end
end