  /**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later
 * https://sl-inc.co.jp
 * 
 */

/**
 *  @description Handsontableの各カラムの幅を管理するクラス
 *  @param {Array} [dayKeys] YYYY-MM-DD形式の日付データが入ったリスト
 * TODO：現在constantsから静的な値を利用しているがDBから値を持ってこられるようにする
 */

class ColumnWidthsManager {

  constructor(dayKeys){
    this.dayKeys = dayKeys
  }  
  /**
   *  
   * @return 全カラムの幅の値が入ったリストを返す
   * [0, 0, 100, ..., 24, 24]
   */ 
  getColumnWidths() {
    const dayWidths = Array(this.dayKeys.length).fill(window.CONSTANTS.DAY_COLUMN_WIDTH);
    return window.CONSTANTS.STATIC_COLUMN_WIDTHS.concat(dayWidths);
  }

}
  window.ColumnWidthsManager = ColumnWidthsManager