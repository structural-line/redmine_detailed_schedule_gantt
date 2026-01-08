/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 *  @description Handsontableのヘッダー行で使用する配列（1~3行目）を生成するクラス 
 *  @param dayKeys 該当期間の日付をYYYY-MM-DD形式に変換して作成した配列
 *  ['2025-10-01', '2025-10-02', '2025-10-03', ... , '2025-12-30', '2025-12-31']
 * 
 *  @param monthSpans 該当期間の内の1か月が何日あるかの情報が入った配列を返す
 *  [
 *    { month: 1, span: 31 }, // 2025-01
 *    { month: 2, span: 28 }, // 2025-02（平年）
 *    { month: 3, span: 31 }  // 2025-03
 *  ]
 */ 
class HeaderGenerator {
  constructor(dayKeys, monthSpans){
    this.dayKeys = dayKeys;
    this.monthSpans = monthSpans
  }

  /**
  * ヘッダー情報を生成
  * @return 
  * nestedHeadersはガントの1～3行目に表示されるラベルのみの情報を持つ2重配列
  * [
  *   [ {label: 'Lock Ver', rowspan: 3}, {label: 'カテゴリ', rowspan: 3}, ... ,{label: '11月', colspan: 30} , {label: '12月', colspan: 31}],
  *   ["-", "-", ... , {label: '1'}, {label: '2'}, {label: '3'}],
  *   ["-", "-", ... , {label: '月'}, {label: '火'}, {label: '水'}],
  * ]
  */
  generateHeaders() {
    //静的カラム
    const staticColumns = [
      { label: 'ID', rowspan: 3 },
      { label: 'Lock Ver', rowspan: 3 },
      { label: 'Project ID', rowspan: 3 },
      { label: 'トラッカー', rowspan: 3 },
      { label: '題名', rowspan: 3 },
      { label: '説明', rowspan: 3 },
      { label: '担当者', rowspan: 3 },
      { label: '優先度', rowspan: 3 },
      { label: '進捗率 %', rowspan: 3 },
      { label: '見積工数', rowspan: 3 },
      { label: '予定済工数', rowspan: 3 },
      { label: 'CHK', rowspan: 3 }
    ]

    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    
    // データがない場合は空のヘッダーを返す
    if (this.dayKeys.length === 0) {
      return { nestedHeaders: [], dayKeys: [] };
    }

    // 月ごとのヘッダー情報
    const monthHeader = staticColumns.concat(
      this.monthSpans.map(ms => ({ label: ms.month + '月', colspan: ms.span }))
    );

    // 日ごとのヘッダー情報
    const dayHeader = staticColumns.map(() => '').concat(
      this.dayKeys.map(d => ({ label: new Date(d).getDate().toString() }))
    );

    // 曜日ごとのヘッダー情報
    const weekHeader = staticColumns.map(() => '').concat(
      this.dayKeys.map(d => {
        const day = new Date(d);
        return { label: weekDays[day.getDay()] };
      })
    );
    return [monthHeader, dayHeader, weekHeader];
  }
}

// グローバルに公開
window.HeaderGenerator = HeaderGenerator; 