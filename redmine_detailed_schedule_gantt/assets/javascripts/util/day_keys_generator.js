/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * 日付情報の配列を作成するクラス
 */
class DayKeysGenerator {
  // ガントスプレッドシート上で設定した年、月、表示期間の情報を取得
  constructor() {
    this.year = parseInt(document.getElementById('year')?.value);
    this.month = parseInt(document.getElementById('month')?.value);
    this.months = parseInt(document.getElementById('months')?.value);
  }

  /**
   * @description 該当期間の日付をYYYY-MM-DD形式に変換して作成した配列を返す
   * @returns 
   * ['2025-10-01', '2025-10-02', '2025-10-03', ... , '2025-12-30', '2025-12-31']
   */
  generateDayKeys() {
    if (this.year == null || this.month == null) {
      console.warn("年と月の情報が取得できませんでした");
      return [];
    }

    const dateFrom = new Date(this.year, this.month - 1, 1);
    const dateTo = new Date(this.year, this.month - 1 + this.months, 0);
    const dayKeys = [];

    let current = new Date(dateFrom);
    while (current <= dateTo) {
      dayKeys.push(this.formatDateKey(current));
      current.setDate(current.getDate() + 1);
    }

    return dayKeys;
  }

  /**
   * @description 該当期間の内の1か月が何日あるかの情報が入った配列を返す
   * @returns 
   * [
   *   { month: 1, span: 31 }, // 2025-01
   *   { month: 2, span: 28 }, // 2025-02（平年）
   *   { month: 3, span: 31 }  // 2025-03
   * ]
   */
  generateMonthSpans() {
    if (this.year == null || this.month == null) {
      console.warn("年と月の情報が取得できませんでした");
      return [];
    }

    const dateFrom = new Date(this.year, this.month - 1, 1);
    const dateTo = new Date(this.year, this.month - 1 + this.months, 0);
    const dayKeys = [];
    const monthSpans = [];

    let current = new Date(dateFrom);
    let lastMonth = current.getMonth();
    let monthStart = 0;

    while (current <= dateTo) {
      if (current.getMonth() !== lastMonth) {
        monthSpans.push({ month: lastMonth + 1, span: dayKeys.length - monthStart });
        lastMonth = current.getMonth();
        monthStart = dayKeys.length;
      }
      dayKeys.push(this.formatDateKey(current));
      current.setDate(current.getDate() + 1);
    }

    monthSpans.push({ month: lastMonth + 1, span: dayKeys.length - monthStart });

    return monthSpans;
  }

  // 日付をYYYY-MM-DD形式に整形
  formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

window.DayKeysGenerator = DayKeysGenerator;
