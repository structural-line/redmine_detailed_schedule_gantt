/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description 行の色を変更するクラス
 * @description 複数行対応
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {ReloadManager} reloadManager Handsontableを再描画するユーティリティクラス
 */
class ChangeRowColor {
  constructor(hotMain, reloadManager) {
    this.hotMain = hotMain;
    this.reloadManager = reloadManager;
    this.sendRequest = new window.SendRequest('detailed_schedule_gantt/change_row_color', 'POST');
  }

  fillYellow() {
    this.fill(window.CONSTANTS.ROW_COLOR_YELLOW);
  }

  fillRed() {
    this.fill(window.CONSTANTS.ROW_COLOR_RED);
  }

  fillGray() {
    this.fill(window.CONSTANTS.ROW_COLOR_GRAY);
  }

  async fillNormal() {
    this.fill(window.CONSTANTS.ROW_COLOR_NORMAL);
  }

  /**
   * 塗りつぶしを行う共通処理
   * @param {number} color_id 
   */
  async fill(color_id) {
    const { issueIds, lockVersions} = this.getIds();

    const payload = { 
      issue_ids: issueIds ,
      lock_versions: lockVersions,
      color_id: color_id,
    };
console.log(payload)
    try {
      const data = await this.sendRequest.send(payload);
      if (data.ok) console.log('色が変わったチケットの情報 data.results：', data.results);
      this.reloadManager.reload();
    } catch (err) {
      console.error('change row color yellow アクション失敗', err);
      let message = `行の色を変えることに失敗しました（status: ${err.status ?? 'N/A'}）`;
      if (err.error) {
        message += `\n 概要：${err.error}`;
        message += `\n 詳細：${err.message}`;
      }
      alert(message);
    }
  }

  /**
   * issue_idとlock_versionを取得する
   * @returns issue_idの配列とlock_versionの配列
   */
  getIds() {
    const selected = this.hotMain.getSelectedLast(); // 選択されているセルの範囲を返す[開始行, 開始列, 終了行, 終了列]
    const startRow = Math.min(selected[0], selected[2]); // 上端の行番号を取得（上下のどちらからドラッグしても正しく動く）
    const endRow   = Math.max(selected[0], selected[2]); // 下端の行番号を取得（上下のどちらからドラッグしても正しく動く）
    const issueIds = [];
    const lockVersions = [];
    // 選択された範囲の行の issue_id と lock_version を取得
    for (let row = startRow; row <= endRow; row++) {
      const issueId = this.hotMain.getDataAtRowProp(row, 'id');
      const lockVersion = this.hotMain.getDataAtRowProp(row, 'lock_version');
      issueIds.push(issueId);
      lockVersions.push(lockVersion);
    }
    return {issueIds, lockVersions};
  }
}

window.ChangeRowColor = ChangeRowColor;