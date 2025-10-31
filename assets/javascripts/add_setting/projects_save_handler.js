/*
* Copyright (c) 2025 Structural Line Incorporated
* SPDX-License-Identifier: GPL-2.0-or-later
* https://sl-inc.co.jp
*/

/**
 * @description Handsontableでプロジェクト管理行のセルの値が編集された後に保存処理を行うクラス
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {SendRequest} sendRequest Railsへリクエストを送信するためのユーティリティクラス
 */
class ProjectsSaveHandler {
  constructor(hotMain, reloadManager){
    this.hotMain = hotMain;
    this.reloadManager = reloadManager;
    this.sendRequest = new window.SendRequest('detailed_schedule_gantt/bulk_update_project', 'POST');
  }

  // 初期化処理、セルに変更が加わった後に実行されるcallback関数を設定している
  initialize(){
    this.hotMain.addHook('afterChange', (changes, source) => this.handleAfterChange(changes, source));
  }

  /**
   * @description lock_versionがチケットごとに設定されているため変更を行単位で集約してから保存処理を行い画面を再読み込みする
   * @param {Array} changes 変更されたセルの情報が入った二重配列。一度に複数セルの変更情報が入ることもある
   * 例 [行、カラム、変更前の値、変更後の値]
   * [
   *   [12, 'subject',         'A',   'B'],
   *   [12, 'estimated_days',  0.4,   0.6],
   *   [12, '2025-10-03',      0.25,  0.5]
   * ]
   * 
   * @param {string} source どういう操作が実行されたか
   */
  handleAfterChange(changes, source) {
    // 初回ロード時と行をコピーしたときとセルをマージしたときとサーバーから計算された結果を反映したときは更新処理を行わない
    if (!changes || source === 'loadData' || source === 'copy' || source === 'MergeCells' || source === 'server calculate value') return; 
    /**
     * 行ごと変更をまとめるための Map を定義
     * 例 ( row, { id, estimated_days } ) 
     * { 7, 
     *   {
     *     id: 8,
     *    estimated_days: 0.6,
     *   }
     *  }
     * 
     * fieldsの値はissuesテーブルまたは、issuesと1対1の関係のテーブル
     * datesの値はissue_daily_scheduleテーブル。issuesとは1対nの関係になっている
     */ 
    const rowMap = new Map();

    // 行単位で変更をまとめる
    for (const [row, column, oldValue, newValue] of changes) {
      // この3つのカラムはサーバーで計算された値を表示するだけでフロントから変更はしない
      if (column === 'lock_version' || column === 'schedule_days' || column === 'check_days') continue;
      if (oldValue === newValue) continue;
      if (!this.isValid(column, newValue)) continue;

      // IDがあったらチケット行なの更新しない
      if(this.hotMain.getDataAtRowProp(row, 'id') != null) return;

      // 変更があった行の Map がなければ作成する
      if (!rowMap.has(row)) {
        rowMap.set(row, {
          project_id: this.hotMain.getDataAtRowProp(row, 'project_id'),
          estimated_days: this.hotMain.getDataAtRowProp(row, 'estimated_days'),
        });
      }
    }

    if (rowMap.size === 0) return;

    (async () => {
      // rowMapからpayload作成する
      for (const [row, bucket] of rowMap) {
        /**
         * payloadの例
         * {
         *  "id": 47
         *  "estimated_days": 14,
         *   }
         *  }
         */
        const payload = { 
          id: bucket.project_id,
          estimated_days: bucket.estimated_days,
        };
        
        try {
          const data = await this.sendRequest.send(payload);

          // 変更をまとめて描画
          this.hotMain.batch(() => {
            // サーバーから受け取った変更内容を反映
            if (data?.results) {
              for (const [k, r] of Object.entries(data.results)) {
                if (r && r.ok) this.hotMain.setDataAtRowProp(row, k, r.value, 'server calculate value');
              }
            }
          });

          console.log('変更された値 data.results:', data.results);
          // 画面を再描画。
          // TODO : プロジェクト管理行のみ西行がする
          this.reloadManager.reload();

        // HTTPステータスがエラーステータスだった場合は postJSON 内で throw してここに来る
        } catch (err) {
          console.error('bulk_update_issue アクション 失敗:', err);
          let message = `更新に失敗しました (status: ${err.status ?? 'N/A'})`;

          if (err.errors && typeof err.errors === 'object') {
            // { field: [msg, ...], ... } を1行テキストへ変換する
            const lines = [];
            for (const [field, msgs] of Object.entries(err.errors)) {
              const list = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
              lines.push(`${field}: ${list}`);
            }
            message += `\n\n詳細:\n${lines.join('\n')}`;
          } 
          if (err.id) message += `\n チケットID:${err.id}`;
          if (err.error) message += `\n 概要：${err.error}`;
          if (err.message) message += `\n 詳細：${err.message}`;
          if (err.ignored_by_permission?.length) message += `\n\n権限外により無視された項目: ${err.ignored_by_permission.join(', ')}`;

          alert(message);
        }  
      }
    })();
  }

  /**
   * @param column カラム名 
   * @param newValue 変更された値 
   * @returns true or false
   */
  isValid(column, newValue){
    const s = String(newValue).trim(); // 文字列に変換
    const n = Number(s); // 数字に変換

    switch (column) {
      // 見積工数のバリデーション
      case 'estimated_days':
        if (s.endsWith(".")) {
          alert(`見積工数の値は"."で終われません。小数は第2位で四捨五入されます`);
          return false;
        }
        if (s === "") {
          alert("見積工数には空文字を設定できません");
          return false;
        }
        if (!Number.isFinite(n)) {
          alert("見積工数には半角数字を入力してください");
          return false;
        } 
        if (n > 99999.99) {
          alert("見積工数に入力できる最大値は99999.99です");
          return false;
        }
        if (n < 0) {
          alert("見積工数にマイナスの値は入力できません");
          return false;
        }
        return true;
        
      default:
        return false;
    }
  }
}

window.ProjectsSaveHandler = ProjectsSaveHandler;