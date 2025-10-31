# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# Versionモデルに適用するパッチ
module RedmineDetailedScheduleGantt
  module Patches
    module VersionPatch
      def self.included(base)
        base.class_eval do
          safe_attributes(
            'version_start_date', #接頭辞（version）をつけないとRedmineのstart_dateと競合してしまう
            # バージョンの編集権限があるかチェック
            if: ->(version, user) {
              project = version.project
              project && user.allowed_to?(:manage_versions, project)
            }
          )

          after_update :update_gantt_latest_update

          private

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