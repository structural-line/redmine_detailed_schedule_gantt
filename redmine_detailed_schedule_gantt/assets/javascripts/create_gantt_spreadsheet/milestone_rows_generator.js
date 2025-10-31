/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description マイルストーン行を生成するクラス
 * @param {Array} [dayKeys] YYYY-MM-DD形式の日付データが入ったリスト
 */
class MilestoneRowsGenerator {
  constructor(dayKeys) {
    this.dayKeys = dayKeys;
  }
  /**
   * マイルストーン行のデータを作成する
   * @returns {Array} projectControlRows
   */
  generate() {
    const milestoneRows = [];
    window.versions.forEach(version => {
      const row = {
        id: null,
        version_id: version.id,
        project_id: version.project_id,
        subject: version.name,
        description: 'マイルストーン',
        estimated_days: '-',
        schedule_days: '-',
        check_days: '-',
        start_date: version.version_start_date,
        end_date: version.effective_date,
        is_milestone_row: true,
      }
      row[version.version_start_date] = '1';
      row[version.effective_date] = '1';
      milestoneRows.push(row);
    });
    return milestoneRows
  }

    /**
   * @description セルの結合設定を返す
   * @return {Array} mergeCells
   */
  getMergeCells(data = []) {
    const mergeCells = [];

    data.forEach((row, rowIndex) => {
      // マイルストーン行かチェック
      if (!(row.is_milestone_row && row.start_date && row.end_date)) return;

      // 計算しやすいようにDate型に変換
      const startDate = new Date(row.start_date);
      const endDate = new Date(row.end_date);

      const colOffset = window.CONSTANTS.COL_FIRST_DAY;

      // 左端と右端の場所を特定
      const startColIndex = this.dayKeys.findIndex(d => new Date(d) >= startDate);
      const endColIndex = this.dayKeys.reduce(
        (last, d, i) => (new Date(d) <= endDate ? i : last),
        -1
      );
      
      row[this.dayKeys[startColIndex]] = '1';

      // セルの結合情報を作成
      if (startColIndex <= endColIndex) {
        mergeCells.push({
          row: rowIndex,
          col: colOffset + startColIndex,
          rowspan: 1,
          colspan: endColIndex - startColIndex + 1,
        });
      }
    });

    return mergeCells;
  }
}

window.MilestoneRowsGenerator = MilestoneRowsGenerator;