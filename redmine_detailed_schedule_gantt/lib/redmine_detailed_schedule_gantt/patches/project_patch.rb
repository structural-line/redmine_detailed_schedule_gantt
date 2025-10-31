# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# Projectモデルに適用するパッチ
module RedmineDetailedScheduleGantt
  module Patches
    module ProjectPatch
      def self.included(base)
        base.class_eval do
          safe_attributes(
            'project_start_date', #projectをつけないとRedmineのstart_dateが使われてしまう
            'end_date',
            'estimated_days',
            'schedule_days',
            'check_days',
            # プロジェクトの編集権限があるかチェック
            if: ->(project, user) {
                user.allowed_to?(:edit_project, project)
              }
          )
          
          after_update :update_check_days, :update_gantt_latest_update
          
          private
          
          # check_daysを再計算する
          def update_check_days
            check_days = schedule_days - estimated_days

            update_column(:check_days, check_days)
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