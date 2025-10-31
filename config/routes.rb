# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# ルーティング情報を記載するファイル
# このファイルの変更時はRedmineを再起動する必要あり

RedmineApp::Application.routes.draw do
  # 選択されたプロジェクトのガントチャート閲覧画面
  get 'projects/:project_id/detailed_schedule_gantt', 
    to: 'detailed_schedule_gantt#show'
  
  # 全てのプロジェクト表示したガントチャートの閲覧画面
  get 'detailed_schedule_gantt/show_all_projects',
    to: 'detailed_schedule_gantt#show_all_projects'

  # Handsontableの行単位でチケットを更新するAPI
  post 'projects/:project_id/detailed_schedule_gantt/bulk_update_issue',
    to: 'detailed_schedule_gantt#bulk_update_issue'

  # Handsontableの行単位でプロジェクトを更新するAPI
  post 'projects/:project_id/detailed_schedule_gantt/bulk_update_project',
    to: 'detailed_schedule_gantt#bulk_update_project'

  # Handsontableで選択した行（チケット）を削除するAPI 
  delete 'projects/:project_id/detailed_schedule_gantt/delete_selected_issues',
    to: 'detailed_schedule_gantt#delete_selected_issues'
   
  # Handsontableで選択した行（チケット）をコピーするAPI
  post 'projects/:project_id/detailed_schedule_gantt/copy_issues',
    to: 'detailed_schedule_gantt#copy_issues'

  # Handsontableで空のチケットを作成するAPI
  post 'projects/:project_id/detailed_schedule_gantt/create_empty_issues',
    to: 'detailed_schedule_gantt#create_empty_issues'

  # Handsontableを最新のデータに更新するためのAPI
  get 'projects/:project_id/detailed_schedule_gantt/get_data',
    to: 'detailed_schedule_gantt#get_data'

  # Handsontableを最新のデータに更新するためのAPI（全プロジェクト対応）
  get 'detailed_schedule_gantt/get_data_all_projects',
    to: 'detailed_schedule_gantt#get_data_all_projects'
  
  # Handsontableの最終更新日時を取得するAPI
  get 'projects/:project_id/detailed_schedule_gantt/get_latest_update',
    to: 'detailed_schedule_gantt#get_latest_update'
  
  # Handsontableの最終更新日時を取得するAPI。プロジェクトを指定しない時に使う
  get 'detailed_schedule_gantt/get_latest_update',
    to: 'detailed_schedule_gantt#get_latest_update'

  # プロジェクト管理行の開始日と期日を更新するAPI
  post 'projects/:project_id/detailed_schedule_gantt/update_project_date',
    to: 'detailed_schedule_gantt#update_project_date'

  # マイルストーン行の開始日と期日を更新するAPI
  post 'projects/:project_id/detailed_schedule_gantt/update_version_date',
    to: 'detailed_schedule_gantt#update_version_date'

  # ソートナンバーを更新するAPI
  post 'projects/:project_id/detailed_schedule_gantt/update_sort_number',
    to: 'detailed_schedule_gantt#update_sort_number'

  # 行の色を更新するAPI
  post 'projects/:project_id/detailed_schedule_gantt/change_row_color',
    to: 'detailed_schedule_gantt#change_row_color'
end