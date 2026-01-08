/*
* Copyright (c) 2025 Structural Line Incorporated
* SPDX-License-Identifier: GPL-2.0-or-later
* https://sl-inc.co.jp
*/

/**
 * @description Handsontableでチケット行のセルの値が編集された後に保存処理を行うクラス
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {SendRequest} sendRequest Railsへリクエストを送信するためのユーティリティクラス
 */
class IssuesSaveHandler {

  constructor(hotMain, reloadManager){
    this.hotMain = hotMain;
    this.reloadManager = reloadManager;
    this.sendRequest = new window.SendRequest('detailed_schedule_gantt/bulk_update_issue', 'POST');
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
     * 例 ( row, { id, lock_version, attributes } ) 
     * { 7, 
     *   {
     *     id: 14,
     *     lock_version: 29,
     *     attributes: { subject: "新しい件名", estimated_days: 0.6, "2025-10-03": 0.2, "2025-10-04": 0.8 },
     *   }
     *  }
     */ 
    const rowMap = new Map();

    // 行単位で変更をまとめる
    for (const [row, column, oldValue, newValue] of changes) {
      // この3つのカラムはサーバーで計算された値を表示するだけでフロントから変更はしない
      if (column === 'lock_version' || column === 'schedule_days' || column === 'check_days') continue;
      if (this.hotMain.getDataAtRowProp(row, 'id') == null) return;
      if (oldValue === newValue) continue;
      if (!this.isValid(column, newValue)) continue;

      // 変更があった行の Map がなければ作成して issue_id と locke_versionをセットする
      if (!rowMap.has(row)) {
        rowMap.set(row, {
          id: this.hotMain.getDataAtRowProp(row, 'id'),
          lock_version: this.hotMain.getDataAtRowProp(row, 'lock_version'),
          attributes: {}
        });
      }

      // 変更があった行のattributesをオブジェクトを作成する
      const bucket = rowMap.get(row);
      // versionの場合はfixed_versionを使用する
      if (column === 'version_id') {
        bucket.attributes['fixed_version_id'] = newValue;
      } else {
        bucket.attributes[column] = newValue;
      }
    }

    if (rowMap.size === 0) return;

    (async () => {
      // rowMapからpayload作成する
      for (const [row, bucket] of rowMap) {
        /**
         * payloadの例
         * {
         *  "id": 14,
         *  "lock_version": 29,
         *  "attributes": {
         *    "subject": "新しい件名",
         *    "estimated_days": 0.6,
         *    "2025-10-03": 0.25,
         *    "2025-10-04": 1.0
         *   }
         *  }
         */
        const payload = { 
          id: bucket.id,
          lock_version: bucket.lock_version,
          attributes: bucket.attributes
        };

        try {
          const data = await this.sendRequest.send(payload);

          // 日付セルの正規表現
          const isDateKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);
          
          // サーバーから取得した日付セル以外のセルをまとめて更新する
          this.hotMain.batch(() => {
            if (!data?.results) return;

            const updates = [];

            for (const [k, r] of Object.entries(data.results)) {
              if (!r?.ok) continue;
              if (isDateKey(k)) continue;

              updates.push([row, k, r.value]);
            }

            if (updates.length) {
              this.hotMain.setDataAtRowProp(updates, 'server calculate value');
            }
          });

          console.log('変更された値 data.results:', data.results);
          
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
      // 1日の合計工数行を再描画
      this.reloadManager.reloadTallyRows();
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
      // カテゴリーのバリデーション
      case 'category_id':
        if (Number.isNaN(n)) {
          alert("カテゴリは削除できません。カテゴリをセットしたくない場合はセレクトボックスから空欄を選択してください")
          return false;
        }
        break;
      
      // 担当者のバリデーション
      case 'assigned_to_id':
      if (Number.isNaN(n)) {
          alert("担当者は削除できません。担当者をセットしたくない場合はセレクトボックスから空欄を選択してください")
          return false;
        }
        break;

      // 題名のバリデーション
      case 'subject':
        if (s == null || s === '') {
          alert("題名には空文字を入力できません");
          return false;
        }
        if(s.length > 255) {
          alert("題名は255文字以内にしてください");
          return false;
        } 
        break;

      // 作業内容のバリデーション
      case 'description':
        if( s.length > 255) {
          alert("説明は255文字以内にしてください");
          return false;
        } 
        break;
      
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
        if (n > 999.99) {
          alert("見積工数に入力できる最大値は999.99です");
          return false;
        }
        if (n < 0) {
          alert("見積工数にマイナスの値は入力できません");
          return false;
        }
    }

    // 日付カラム（YYYY-MM-DD形式）のバリデーション
    if (/^\d{4}-\d{2}-\d{2}$/.test(column)){
      // 例外的に空文字を許可します。理由は複数のセルをコピペした際に空セルを含んでいてもエラーにしたくないため
      if (s ==='' || s == null) return true;

      if (s.endsWith(".")) {
        alert(`日次工数セルの値は"."で終われません。小数は第2位で四捨五入されます`);
        return false;
      }
      if (!Number.isFinite(n)) {
        alert("日次工数セルには半角数字を入力してください");
        return false;
      } 
      if( n > 999.99) {
        alert("日次工数に入力できる最大値は999.99です");
        return false;
      }
      if (n < 0) {
        alert("日次工数セルにはマイナスの値は入力できません");
        return false;
      }
    }
    return true;
  }
}

window.IssuesSaveHandler = IssuesSaveHandler;