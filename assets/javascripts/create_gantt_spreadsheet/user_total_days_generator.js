/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description 1日の合計工数行に使用するオブジェクトが入った配列を作成するクラス
 */
class UserTotalDaysGenerator {
  generate(){
    // 各ユーザーの行データを作成する
    const rows = window.allUsers.map(user => ({
      id: null,
      project_id: null,
      lock_version: null,
      version_id: '-',
      category_id: '-',
      assigned_to_id: user.id,
      subject: '工数管理',
      description: '1日の合計工数',
      done_ratio: '-',
      is_tally_row: true,
      estimated_days: '-',
      schedule_days: '-',
      check_days: '-'
    }));

    // userDailySchedulesテーブルをループして該当ユーザーの行に日付データを追加
    // "2025-10-15": 0.5 のようなオブジェクトが追加されていく
    window.userDailySchedules.forEach(schedule => {
      const row = rows.find(r => r.assigned_to_id === schedule.user_id);
      if (row) {
        row[schedule.schedule_date] = schedule.total_man_days;
      }
    });
    return rows;
  }
}

window.UserTotalDaysGenerator =UserTotalDaysGenerator;