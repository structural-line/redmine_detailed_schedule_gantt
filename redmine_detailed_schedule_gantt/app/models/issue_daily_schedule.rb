# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

class IssueDailySchedule < ApplicationRecord
  self.table_name = 'issue_daily_schedules'

  # ---- Associations ----
  belongs_to :issue, inverse_of: :issue_daily_schedules

  # ---- Validations ----
  validates :schedule_date, presence: true,
                            uniqueness: { scope: :issue_id }

  # precision: 5, scale: 2 なので上限は 999.99
  MAX_MAN_DAYS = 999.99
  validates :man_days,
            presence: true,
            numericality: {
              greater_than_or_equal_to: 0,
              less_than_or_equal_to: MAX_MAN_DAYS
            }

  # DBのdefault(0)があるが、nilで渡された場合に備えて丸めも実施
  before_validation :normalize_man_days

  # 1日の合計工数も更新する
  after_save :update_user_daily_schedule
  after_destroy :update_user_daily_schedule


  private

  def normalize_man_days
    # nil → 0、桁あふれ/マイナス防止、少数2桁に丸め
    self.man_days = 0 if man_days.nil?
    self.man_days = man_days.to_d.round(2)
    self.man_days = 0 if man_days.negative?
    self.man_days = MAX_MAN_DAYS if man_days > MAX_MAN_DAYS
  end

  # 1日の合計工数を更新する
  def update_user_daily_schedule
    # issueと担当者と日付のどれかがなければ returnする
    unless issue&.assigned_to_id && schedule_date
      return
    end 

    user_id = issue.assigned_to_id
    date    = schedule_date

    # 更新があった日付の対象ユーザーの工数を合計する
    total = IssueDailySchedule
              .joins(:issue)
              .where(schedule_date: date, issues: { assigned_to_id: user_id })
              .sum(:man_days)

    #  合計工数を更新または作成
    uds = UserDailySchedule.find_or_initialize_by(user_id: user_id, schedule_date: date)
    uds.total_man_days = total
    uds.save!
  end
end
