/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description 行削除（チケット削除）を担当するクラス
 * @description 選択範囲から削除対象を収集して一括削除。複数行にも対応
 * @description ロールバック不可
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {SendRequest} sendRequest Railsへリクエストを送信するためのユーティリティクラス
 */
class RowDeleter {
  constructor(hotMain) {
    this.hotMain = hotMain;
    this.sendRequest = new window.SendRequest('detailed_schedule_gantt/delete_selected_issues', 'DELETE');
  }

  async deleteSelectedRows() {
    const select = this.hotMain.getSelectedLast(); // // 選択されているセルの範囲を返す[開始行, 開始列, 終了行, 終了列]
    if (!select) return;

    const startRow = Math.min(select[0], select[2]);
    const endRow   = Math.max(select[0], select[2]);
    const count    = endRow - startRow + 1;

    if (!window.confirm(`本当に選択したチケット削除しますか？この操作はロールバックできません。`)) return;

    /**
     * 削除対象の行データ
     * [
     *  { id: 39014, category_id: 1, assigned_to_id: null, ... }
     * ]
     */ 
    const rows = [];

    // 削除対象の行を取得
    for (let i = startRow; i <= endRow; i++) {
      rows.push(this.hotMain.getSourceDataAtRow(i));
    }

    const payload = {
      issues: rows
    }

    try {
      const data = await this.sendRequest.send(payload);
      console.log('削除されたチケットID data.results：', data.results);
      this.hotMain.alter('remove_row', startRow, count);
    }catch (err) {
      console.error('delete_selected_issues アクション 失敗:', err);
      let message = `削除に失敗しました (status: ${err.status ?? 'N/A'})`;
      if (err.error) {
        message += `\n 概要：${err.error}`;
        message += `\n 詳細：${err.message}`;
      }
      alert(message);
    }
  }
}

window.RowDeleter = RowDeleter;
