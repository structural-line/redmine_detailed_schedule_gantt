/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description チケット形式のデータをHandsontable形式のデータに変換するクラス
 * 
 * @param Array issuesテーブルのオブジェクトが入った配列
 *  [
 *    {id: 1, subject: 'テストチケット1', project: 'テストプロジェクト', project_id: 1, tracker: 'トラッカー1', …}
 *  ]
 * 
 * @return スプレッドシートに表示するオブジェクトが入った配列 {カラム名: セルに表示する値} 
 *  [
 *    {id: 60014, category_id: 5, assigned_to_id: 7, subject: '最初のチケット3', 2025-10-01: "0.3", …}
 *  ]
 */
class DataTransformer {
  // チケットデータをスプレッドシート行データに変換
  transformIssueToRow(issue) {
    return {
      id: issue.id,
      project_id: issue.project_id,
      version_id: issue.version_id,
      category_id: issue.category_id,
      assigned_to_id: issue.assigned_to_id,
      tracker_id: issue.tracker_id,
      subject: issue.subject,
      lock_version: issue.lock_version,
      description: issue.description,
      status_id: issue.status_id,
      priority_id: issue.priority_id,
      done_ratio: issue.done_ratio,
      estimated_days: issue.estimated_days,
      schedule_days: issue.schedule_days,
      check_days: issue.check_days,
      ...issue.daily_schedules, // 日時工数を展開している,
      color_id: issue.color_id
    };
  }
}

// グローバルに公開
window.DataTransformer = DataTransformer;