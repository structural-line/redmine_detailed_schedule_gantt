# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# Issueモデルに適用するパッチ
module RedmineDetailedScheduleGantt
  module Patches
		module IssuePatch
			def self.included(base)
				base.class_eval do
					has_many :issue_daily_schedules, class_name: 'IssueDailySchedule', dependent: :destroy, inverse_of: :issue
					
					accepts_nested_attributes_for :issue_daily_schedules, allow_destroy: true

        	safe_attributes 'estimated_days', 'schedule_days', 'check_days', 'color_id',
                        if: ->(issue, user) { issue.new_record? || issue.attributes_editable?(user) } # チケットの編集権限があるかチェック
					
					# 担当者が変更されたときに1日ごとの工数合計を更新する
					# 予定済工数とCHKを再計算する
					# プロジェクトの予定済工数とCHKを再計算する
					after_update :update_schedule_days_if_estimated_changed,
             :update_user_daily_schedules_if_assigned_to_changed,
             :update_project_schedule_days_and_check_days,
             :update_gantt_latest_update,
             unless: :destroyed?
					
					# 予定済工数とCHKを計算して更新する
					def update_schedule_and_check_days
						if destroyed?
							return
						end

						total = issue_daily_schedules.sum(:man_days)
						check_days = total - estimated_days
						update_columns(schedule_days: total, check_days: check_days)
					end

					# プロジェクトの予定済工数とCHKを計算して更新する
					def update_project_schedule_days_and_check_days
						project = self.project
						
						if destroyed?
							return
						end

						unless project.present?
							return
						end

						total_schedule_days = project.issues.sum(:schedule_days)
						check_days = total_schedule_days - project.estimated_days.to_f
						project.update_columns(schedule_days: total_schedule_days, check_days: check_days)
					end

					private

					# 見積工数が変わったときのみCHKを再計算
					def update_schedule_days_if_estimated_changed
						return unless saved_change_to_estimated_days?

						total = issue_daily_schedules.sum(:man_days)
						check_days = total - estimated_days.to_f

						update_column(:check_days, check_days)
					end

					# 担当者が変更されたときに1日ごとの工数合計を更新
					def update_user_daily_schedules_if_assigned_to_changed
						unless saved_change_to_assigned_to_id?
							return 
						end	

						old_user_id, new_user_id = saved_change_to_assigned_to_id

						issue_daily_schedules.find_each do |ids|
							date = ids.schedule_date

							# 旧担当者の日別合計を更新
							if old_user_id.present?
								total_old = IssueDailySchedule
															.joins(:issue)
															.where(schedule_date: date, issues: { assigned_to_id: old_user_id })
															.sum(:man_days)

								uds_old = UserDailySchedule.find_or_initialize_by(user_id: old_user_id, schedule_date: date)
								uds_old.total_man_days = total_old
								uds_old.save!
							end

							# 新担当者の日別合計を更新
							if new_user_id.present?
								total_new = IssueDailySchedule
															.joins(:issue)
															.where(schedule_date: date, issues: { assigned_to_id: new_user_id })
															.sum(:man_days)

								uds_new = UserDailySchedule.find_or_initialize_by(user_id: new_user_id, schedule_date: date)
								uds_new.total_man_days = total_new
								uds_new.save!
							end
						end
					end

					# スプレッドシートの最終更新日時を更新する
					def update_gantt_latest_update
						GanttLatestUpdate.touch_for(project.id) 
						GanttLatestUpdate.touch_for(nil)
					end
				end
      end
		end
	end
end