# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

class MakeManDaysNullableAndRemoveDefault < ActiveRecord::Migration[7.2]
  def up
    # デフォルトを外す（0 -> nil）
    change_column_default :issue_daily_schedules, :man_days, from: 0, to: nil
    # NULL を許可
    change_column_null :issue_daily_schedules, :man_days, true
  end

  def down
    # 逆方向：NULLがあるとNOT NULL付与で失敗するため埋める
    execute <<~SQL.squish
      UPDATE issue_daily_schedules
      SET man_days = 0
      WHERE man_days IS NULL
    SQL

    # NOT NULLに戻す
    change_column_null :issue_daily_schedules, :man_days, false
    # デフォルト0に戻す
    change_column_default :issue_daily_schedules, :man_days, from: nil, to: 0
  end
end
