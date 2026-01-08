/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later
 * https://sl-inc.co.jp
 */

/**
 *  @description Handsontableの静的カラムと日付カラムの設定を行うクラス
 *  @param {Array} [dayKeys] YYYY-MM-DD形式の日付データが入ったリスト
 */
class ColumnConfigurator {
  constructor(dayKeys){
    this.dayKeys = dayKeys;
  }

  /**
   * 全カラムの定義とレンダリングの初期設定を作成（静的カラム + 日付カラム）
   * @return 
   * [
   *   { data: 'カラム名' }, { option: '値' }
   *    ... , 
   *   { data: 'カラム名' }, { option: '値' }
   * ] 
   *   カラムの設定情報が定義されたオブジェクトを内包した配列
   */ 
  getAllColumnConfig() {
    return this.createStaticColumns().concat(this.createDateColumns());
  }

  // 静的カラム（日付以外）の定義を作成
  createStaticColumns() {
    return [
      { data: 'id', readOnly: true },
      { data: 'lock_version', readOnly: true },
      { data: 'project_id', readOnly: true },
      { data: 'tracker_id', editor: 'select' },
      { data: 'subject' },
      { data: 'description' },
      { data: 'assigned_to_id', editor: 'select' },
      { data: 'status_id', readOnly: true },
      { data: 'priority_id', editor: 'select' },
      { data: 'done_ratio', editor: 'select', selectOptions: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
      { data: 'estimated_days', type: 'numeric' },
      { data: 'schedule_days', readOnly: true, type: 'numeric' },
      { data: 'check_days', readOnly: true, type: 'numeric' }
    ];
  }

  // 日付カラムの定義を作成（数字のみ入力可能）
  createDateColumns() {
    return this.dayKeys.map(key => ({ 
      data: key, type: 'numeric',
    }));
  }
}

// グローバルに公開
window.ColumnConfigurator = ColumnConfigurator; 