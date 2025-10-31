/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description プロジェクト管理行を生成するクラス
 * @param {Array} [dayKeys] YYYY-MM-DD形式の日付データが入ったリスト
 */
class ProjectControlRowsGenerator {
  constructor(dayKeys) {
    this.dayKeys = dayKeys;
  }

  /**
   * プロジェクト管理行のデータを作成する
   * @returns {Array} projectControlRows
   */
  generate() {
    const projectControlRows = [];
    window.projects.forEach(project => {
      const row = {
        id: null,
        project_id: project.id,
        identifier: project.identifier,
        name: project.name,
        subject: project.name,
        description: 'プロジェクト管理',
        estimated_days: project.estimated_days,
        schedule_days: project.schedule_days,
        check_days: project.check_days,
        start_date: project.project_start_date,
        end_date: project.end_date,
        is_project_control_row: true,
      }
      row[project.start_date] = '1';
      row[project.end_date] = '1';
      projectControlRows.push(row);
    });
    return projectControlRows;
  }

  /**
   * @description セルの結合設定を返す
   * @return {Array} mergeCells
   */
  getMergeCells(data = []) {
    const mergeCells = [];

    data.forEach((row, rowIndex) => {
      // プロジェクト管理行かチェック
      if (!(row.is_project_control_row && row.start_date && row.end_date)) return;

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

window.ProjectControlRowsGenerator = ProjectControlRowsGenerator;