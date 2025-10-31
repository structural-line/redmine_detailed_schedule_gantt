# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp
#
# ユーザーごとの日次合計工数を保持するモデル。
# 各 (user_id, schedule_date) は一意であり、各ユーザー毎に1日の工数合計を表す。
#
class UserDailySchedule < ApplicationRecord
  # ---- Associations ----
  belongs_to :user

  # ---- Validations ----
  before_validation :round_total_to_2dp
  validates :user_id, presence: true
  validates :schedule_date, presence: true, uniqueness: { scope: :user_id }
  validates :total_man_days,
            presence: true,
            numericality: {
              greater_than_or_equal_to: 0,
              less_than_or_equal_to: 999.99
            }

  private

  def round_total_to_2dp
    # nil → 0
    self.total_man_days = 0 if total_man_days.nil?

    # BigDecimal に変換して小数第2位に丸め
    self.total_man_days = total_man_days.to_d.round(2)

    # 負の値 → 0
    self.total_man_days = 0 if total_man_days.negative?

    # 上限値超過 → 999.99
    self.total_man_days = 999.99 if total_man_days > 999.99
  end
end
