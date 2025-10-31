/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later
 * https://sl-inc.co.jp
 */

/**
 * @description チケットのコピーを作成するクラス
 * @description 複数行対応
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {ReloadManager} reloadManager Handsontableを再描画するユーティリティクラス
 * @param {SortNumberUpdater} sortNumberUpdater チケットの並び順を更新するクラス
 */
class RowCopier {
  constructor(hotMain, reloadManager, sortNumberUpdater) {
    this.hotMain = hotMain;
    this.reloadManager = reloadManager;
    this.sortNumberUpdater = sortNumberUpdater;
    this.sendRequest = new window.SendRequest('detailed_schedule_gantt/copy_issues', 'POST');
  }

  /**
   * 選択した行をコピーして1つ下の行に追加する機能
   * 複数行を一度にコピー可能
   */
  async copyRowsBelow() {
    //コピーする範囲を取得
    const sel = this.hotMain.getSelectedLast(); // 選択されているセルの範囲を返す[開始行, 開始列, 終了行, 終了列]
    if (!sel) return;

    const startRow = Math.min(sel[0], sel[2]); // 上端の行番号を取得（上下のどちらからドラッグしても正しく動く）
    const endRow   = Math.max(sel[0], sel[2]); // 下端の行番号を取得（上下のどちらからドラッグしても正しく動く）
    const rowsToCopy = endRow - startRow + 1; // 何行コピーするか計算

    const issueIds = []; // issue IDを入れた配列

    // 選択した行を1行ずつループ
    for (let i = 0; i < rowsToCopy; i++) {
      const srcRow = startRow + i; // コピー元の行番号
      // コピー元の行の issue ID を取得
      issueIds.push(this.hotMain.getDataAtCell(srcRow, 0));
    }

    const payload = { issue_ids: issueIds }

    let data = {};

    try {
      data = await this.sendRequest.send(payload);
      if (data.ok) console.log('コピーされたチケットのID data.results：', data.results);
      // // コピーして作成したチケットのissue ID を取得
      const newIssueIds = data.results;
      this.hotMain.alter('insert_row_below', endRow, newIssueIds.length);
      const insertStartRow = endRow + 1;
      newIssueIds.forEach((id, i) => {
        this.hotMain.setDataAtCell(insertStartRow + i, 0, id, 'server calculate value');
      });
      this.sortNumberUpdater.saveSortOrder();
      this.reloadManager.reload();
    } catch (err) {
      console.error('copy_issues アクション失敗', err);
      let message = `チケットのコピーに失敗しました（status: ${err.status ?? 'N/A'}）`;
      if (err.error) {
        message += `\n 概要：${err.error}`;
        message += `\n 詳細：${err.message}`;
      }
      alert(message);
    }
  }
}

window.RowCopier = RowCopier;