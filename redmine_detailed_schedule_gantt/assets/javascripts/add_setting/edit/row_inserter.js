/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 


/**
 * @description 行を挿入して新規チケットを作成するクラス
 * @description 選択行の上または、下へ新規行を挿入
 * @description 複数行対応
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {SendRequest} sendRequest Railsへリクエストを送信するためのユーティリティクラス
 */
class RowInserter {
  constructor(hotMain, reloadManager, sortNumberUpdater) {
    this.hotMain = hotMain;
    this.sendRequest = new window.SendRequest('detailed_schedule_gantt/create_empty_issues', 'POST');
    this.reloadManager = reloadManager;
    this.sortNumberUpdater = sortNumberUpdater;
  }
 
 /** 選択範囲の「上」に、選択行数ぶん追加 */
 async addRowsAbove() {
   await this.insertRows('above');
  }
  
  /** 選択範囲の「下」に、選択行数ぶん追加 */
  async addRowsBelow() {
    await this.insertRows('below');
  }

   /**
   * 共通挿入処理
   * @param {"above"|"below"} position
   */
  async insertRows(position) {
    const selectInfo = this.getSelectionInfo();
    if (!selectInfo) return;

    const { startRow, endRow, count } = selectInfo;
    const payload = { count };
    // 上に挿入ならstartRowを基準に、違う場合はendRowを基準に使う
    const baseRow = position === 'above' ? startRow : endRow;

    try {
      const data = await this.sendRequest.send(payload);
      const issueIds = data.results || [];

      // Handsontableに行を追加
      const insertAction = position === 'above' ? 'insert_row_above' : 'insert_row_below';
      this.hotMain.alter(insertAction, baseRow, count);

      // 追加開始位置の計算
      const insertStartRow = position === 'above' ? startRow : endRow + 1;

      // 各行の一番左セルに ID をセット
      issueIds.forEach((id, i) => {
        this.hotMain.setDataAtCell(insertStartRow + i, 0, id, 'server calculate value');
      });

      // 並び順を更新
      this.sortNumberUpdater.saveSortOrder();

      // 再描画
      this.reloadManager.reload();
    } catch (err) {
      console.error('create_empty_issues アクション失敗', err);
      let message = `チケットの作成に失敗しました（status: ${err.status ?? 'N/A'}）`;
      if (err.error) {
        message += `\n概要：${err.error}`;
        message += `\n詳細：${err.message}`;
      }
      alert(message);
    }
  }

  /**
  * 選択範囲の行数を返す
  * @returns {{startRow:number, endRow:number, count:number}|null}
  */
  getSelectionInfo() {
   const sel = this.hotMain.getSelectedLast(); // 選択されているセルの範囲を返す[開始行, 開始列, 終了行, 終了列]
   if (!sel) return null;
  
   const startRow = Math.min(sel[0], sel[2]);
   const endRow   = Math.max(sel[0], sel[2]);
   const count    = endRow - startRow + 1;
  
   return {startRow, endRow, count};
  }
}

window.RowInserter = RowInserter;
