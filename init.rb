# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# プラグインの定義ファイル
# このファイルの変更時はRedmineを再起動する必要あり

# 自動テスト用のヘルパーとルーティングを読み込む
if Rails.env.test?
  require File.expand_path('test/test_helper', __dir__)
  require File.expand_path('config/routes', __dir__)

  Rails.application.config.to_prepare do
    begin
      require File.expand_path('config/routes', __dir__)
      Rails.application.routes_reloader.execute_if_updated
      puts "[DetailedScheduleGantt] Routes loaded via to_prepare"
    rescue => e
      puts "[DetailedScheduleGantt] Route load failed (to_prepare): #{e.message}"
    end
  end

  Rails.application.config.after_initialize do
    begin
      require File.expand_path('config/routes', __dir__)
      Rails.application.reload_routes!
      puts "[DetailedScheduleGantt] Routes reloaded after initialization for test env"
    rescue => e
      puts "[DetailedScheduleGantt] Route reload failed: #{e.message}"
    end
  end
end

Redmine::Plugin.register :redmine_detailed_schedule_gantt do
  name        '小日程計画が管理できるガントチャート'
  author      'ストラクチュアルライン株式会社'
  description '担当者ごとに小日程計画を作成でき、工数を集計できます'
  version     '1.0.1'
  requires_redmine version_or_higher: '5.0.0'

  # プロジェクトメニュータブの権限を定義
  project_module :detailed_schedule_gantt do
    # 閲覧権限
    permission :view_detailed_schedule_gantt,
      { detailed_schedule_gantt: [:show, :get_data] }, read: true
    # 更新権限
    permission :update_detailed_schedule_gantt,
      { detailed_schedule_gantt: [
        :bulk_update_issue,
        :bulk_update_project, 
        :delete_selected_issues, 
        :change_row_color,
        :create_empty_issues, 
        :copy_issues, 
        :update_project_date,
        :update_version_date
      ] }, require: :member
  end

  # グローバルメニュータブの権限を定義、ログインしていれば許可
  permission :view_detailed_schedule_gantt_global,
             { detailed_schedule_gantt: [
              :show_all_projects,
              :get_data_all_projects,
              :get_latest_update,
              :update_sort_number
            ] },
             global: true, require: :loggedin

  # プロジェクトメニュータブにリンクを作成
  menu(
    :project_menu,                                               # プロジェクト選択後に表示されるメニュータブに表示する
    :detailed_schedule_gantt,                                    # タブのID
    { controller: 'detailed_schedule_gantt', action: 'show' },   # ルーティング
    {
      caption: :label_detailed_schedule_gantt,                   # タブに表示する文言（小日程計画ガントチャート）
      after: :time_entries,                                      # タブを表示する場所（作業時間の後）
      param: :project_id                                         # ルーティング内で project_id を使うとプロジェクト識別子に置き換わる
    }
  )
  
	# グローバルメニュータグにリンクを作成
  menu(
    :application_menu,                                                        # プロジェクト選択前に表示されるメニュータブに表示する
    :detailed_schedule_gantt,                                                 # タブのID
    { controller: 'detailed_schedule_gantt', action: 'show_all_projects' },   # ルーティング
    {
      caption: :label_detailed_schedule_gantt,                                # タブに表示する文言（小日程計画ガントチャート）
      after: :time_entries,                                                   # タブを表示する場所（作業時間の後）
      param: nil,
      if: Proc.new { !Rails.env.test? }                                       # 自動testでは使用しない                                                   
    }
  )

	# 設定ページを定義
  # ガント読み込み時に表示する行数
  # 遅延読み込みや更新時に表示する行数
  settings(
    default: { 'initial_rows' => '100', 'max_rows' => '10000' },
    partial: 'settings/detailed_schedule_gantt_settings'
  )

end

# libを読み込む
require File.expand_path('lib/redmine_detailed_schedule_gantt/hooks/hooks', __dir__)
require File.expand_path('lib/redmine_detailed_schedule_gantt/patches/issue_patch', __dir__)
require File.expand_path('lib/redmine_detailed_schedule_gantt/patches/project_patch', __dir__)
require File.expand_path('lib/redmine_detailed_schedule_gantt/patches/queries_controller_patch', __dir__)
require File.expand_path('lib/redmine_detailed_schedule_gantt/patches/version_patch', __dir__)


# ヘルパーとパッチを読み込む。Rubyのバージョンによって読み込むタイミングが違うので同じファイルを2回読み込んでいる
Rails.application.config.to_prepare do
  if defined?(ApplicationController)
    ApplicationController.helper RedmineDetailedScheduleGantt::IssueExtraHelper
  end

  unless Issue.included_modules.include?(RedmineDetailedScheduleGantt::Patches::IssuePatch)
    Issue.include(RedmineDetailedScheduleGantt::Patches::IssuePatch)
  end

  unless Project.included_modules.include?(RedmineDetailedScheduleGantt::Patches::ProjectPatch)
    Project.include(RedmineDetailedScheduleGantt::Patches::ProjectPatch)
  end

  unless QueriesController.ancestors.include?(RedmineDetailedScheduleGantt::Patches::QueriesControllerPatch)
    QueriesController.prepend RedmineDetailedScheduleGantt::Patches::QueriesControllerPatch
  end

  unless Version.included_modules.include?(RedmineDetailedScheduleGantt::Patches::VersionPatch)
    Version.include(RedmineDetailedScheduleGantt::Patches::VersionPatch)
  end
end

Rails.application.config.after_initialize do
  if defined?(ApplicationController)
    ApplicationController.helper RedmineDetailedScheduleGantt::IssueExtraHelper
  end

  unless Issue.included_modules.include?(RedmineDetailedScheduleGantt::Patches::IssuePatch)
    Issue.include(RedmineDetailedScheduleGantt::Patches::IssuePatch)
  end

  unless Project.included_modules.include?(RedmineDetailedScheduleGantt::Patches::ProjectPatch)
    Project.include(RedmineDetailedScheduleGantt::Patches::ProjectPatch)
  end

  unless QueriesController.ancestors.include?(RedmineDetailedScheduleGantt::Patches::QueriesControllerPatch)
    QueriesController.prepend RedmineDetailedScheduleGantt::Patches::QueriesControllerPatch
  end

  unless Version.included_modules.include?(RedmineDetailedScheduleGantt::Patches::VersionPatch)
    Version.include(RedmineDetailedScheduleGantt::Patches::VersionPatch)
  end
end
