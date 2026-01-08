/**
 * ガントチャートスプレッドシート用定数定義
 * Gantt Spreadsheet Constants
 */

// 定数定義
const CONSTANTS = {
  // 静的カラムの幅設定
  STATIC_COLUMN_WIDTHS: [0, 0, 0, 100, 200, 200, 100, 100, 60, 60, 60, 50],

  // 日付カラムの幅
  DAY_COLUMN_WIDTH: 28,

  // --- カラムインデックス定数定義 ---
  COL_ISSUE_ID: 0,
  COL_LOCK_VERSION: 1,
  COL_PROJECT_ID: 2,
  COL_TRACKER: 3,
  COL_SUBJECT: 4,
  COL_DESCRIPTION: 5,
  COL_ASSIGNED_TO: 6,
  COL_PRIORITY: 7,
  COL_DONE_RATIO: 8,
  COL_ESTIMATED_DAYS: 9,
  COL_SCHDULE_DAYS: 10,
  COL_CHECK_DAYS: 11,

  // 日付カラムの開始インデックス（静的カラムの後）
  COL_FIRST_DAY: 12,

  // 祝日 MM-DD 形式　背景色をグレーにするのと、休日入力不可オプションに使用
  // 祝日に変更があった場合はリストを更新する必要あり
  PUBLIC_HOLIDAY_JA: [
    '01-01', '01-13', 
    '02-11', '02-24', 
    '03-20', 
    '04-29', 
    '05-03', '05-04', '05-05',

    '07-21',
    '08-11',
    '09-15', '09-23',
    '10-13',
    '11-03', '11-24'

  ],

  // オートリロードを行う間隔
  RELOAD_TIME: 5,

  // 行を塗りつぶすカラー
  ROW_COLOR_NORMAL: 0,
  ROW_COLOR_YELLOW: 1,
  ROW_COLOR_RED: 2, 
  ROW_COLOR_GRAY: 99
};

// グローバルに公開
window.CONSTANTS = CONSTANTS; 