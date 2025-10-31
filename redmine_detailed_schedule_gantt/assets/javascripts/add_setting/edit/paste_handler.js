/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later
 * https://sl-inc.co.jp
 */

/**
 * @description 右クリックのメニューから実行されるペースト機能。ブラウザに元からあるペースト機能セキュリティ上使えないため
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {bool} isClipboardAvailable クリップボードの使用許可
 * @param {bool} isEdit 編集モードON or OFF
 */
class PasteHandler {
  constructor(hotMain, isClipboardAvailable) {
    this.hotMain = hotMain;
    this.isClipboardAvailable = isClipboardAvailable;
    this.isEdit = false;
  }

  setIsEdit(isEdit){
    this.isEdit = isEdit;
  }

  // イベントリスナーを設定する
  setupEventListeners() {
    const container = this.hotMain.rootElement; // Handsontableの一番外側の<div>要素
    container.addEventListener('keydown', (e) => this.handleKeyboardPaste(e)); // Ctrl / Cmd+V からのペーストイベント
    container.addEventListener('paste', (e) => this.handlePaste(e)); // 右クリックからのペーストイベント
  }

    // キーボードショートカットでのペースト処理
  handleKeyboardPaste(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault(); // ブラウザ既定の貼り付けを止める
      if (this.isClipboardAvailable == false) {
        alert("クリップボードが使用できません");
        return;
      }

      if (this.isEdit == true) this.processPasteEvent(e); // 自作したペースト処理を実行
    }
  }

  // // 右クリックで表示されるメニューを使ったペースト処理
  handlePaste(e) {
    e.preventDefault(); // 既定の貼り付けは無効化
    if (this.isClipboardAvailable == false) {
      alert("クリップボードが使用できません");
      return;
    } 
    if (this.isEdit == true) {
      this.processPasteEvent(e); // 自作したペースト処理を実行
    }
  }

  // クリップボード読み取り
  async processPasteEvent(e) {
    try {
      const text = await this.getClipboardText(e); // クリップボードから文字列を取得
    if (text === undefined || text === null) return; // null/undefined のみスキップ。''（空文字）は処理する
    this.processPastedData(text);
    } catch (error) {
      alert(error.message);
    }
  }

  // クリップボードからテキストを取得（複数の方法を試行）
  async getClipboardText(event) {
    // 方法1: event.clipboardData（一般的）
    if (event.clipboardData) {
      return event.clipboardData.getData('text/plain');
    }
    
    // 方法2: window.clipboardData（IE/Edgeレガシー）
    if (window.clipboardData) {
      return window.clipboardData.getData('Text');
    }
    
    // 方法3: navigator.clipboard API（モダンブラウザ）
    if (navigator.clipboard?.readText) {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        console.warn('navigator.clipboard.readText の取得に失敗しました:', error);
        throw new Error('クリップボードへのアクセスが拒否されました。手動でデータを入力するか、別の方法でペーストしてください。');
      }
    }
    
    return null;
  }

  // 2次元配列にしてHandsontableへ貼り付ける
  processPastedData(text) {    
    try {
      const raw = this.parsePastedText(String(text)); // 行ごとに分割
      const data = this.rectifyAndSanitize(raw);      // 長方形化＋空セルは '' に正規化
      
      const selected = this.hotMain.getSelected();
      if (!selected?.length) {
        console.warn('ペーストするセルが選択されていません');
        return;
      }

      // 選択範囲の左上セルを起点にする
      const [r1, c1, r2, c2] = selected[0];
      const startRow = Math.min(r1, r2);
      const startCol = Math.min(c1, c2);
      
      this.insertPastedData(data, startRow, startCol); // データをスプレッドシートへ挿入
    } catch (error) {
      console.error('ペーストデータの処理中にエラーが発生しました:', error);
      alert('ペースト処理中にエラーが発生しました: ' + error.message);
    }
  }

  // クリップボードテキストを行・列に分割
  parsePastedText(text) {
    // 改行正規化（CR除去）→ 行分割
    const rows = text.replace(/\r/g, '').split('\n');
    // Handsontable が末尾に余分な空行を付けることがあるので1行だけ落とす
    if (rows.length && rows[rows.length - 1] === '') rows.pop();
    // タブで列分割（空も保持）
    return rows.map(r => r.split('\t'));
  }

  // 配列を長方形化し、null/undefined は '' に、欠損列も '' でパディングする
  rectifyAndSanitize(matrix) {
    const maxCols = matrix.reduce((m, row) => Math.max(m, row.length), 0) || 1;
    return matrix.map(row => {
      const out = new Array(maxCols);
      for (let i = 0; i < maxCols; i++) {
        const v = row[i];
        out[i] = (v == null ? '' : String(v));
      }
      return out;
    });
  }

  // ペーストされたデータをテーブルに挿入
  insertPastedData(data, startRow, startCol) {
    // 中身が空の場合は '' 文字でセルを作る
    if (!Array.isArray(data) || data.length === 0) {
      data = [['']];
    }

    const rowCount = this.hotMain.countRows();
    const colCount = this.hotMain.countCols();

    // 右下終端（希望サイズ）
    const wantedEndRow = startRow + data.length - 1;
    const wantedEndCol = startCol + Math.max(...data.map(r => r.length)) - 1;

    if (startRow >= rowCount || startCol >= colCount) {
      console.warn('ペースト開始位置がテーブル範囲外です');
      alert('ペースト開始位置がテーブル範囲外です。');
      return;
    }

    // 実際に貼れる終端（テーブル内にクランプ）
    const endRow = Math.min(wantedEndRow, rowCount - 1);
    const endCol = Math.min(wantedEndCol, colCount - 1);

    // クランプ後のサイズに合わせて data をトリム
    const rowsToPaste = endRow - startRow + 1;
    const colsToPaste = endCol - startCol + 1;
    const trimmed = data.slice(0, rowsToPaste).map(row => row.slice(0, colsToPaste));

    this.hotMain.populateFromArray(
      startRow,
      startCol,
      trimmed,
      endRow,
      endCol,
      'Paste',
      'overwrite' // 空でも上書きする
    );
  }
}

window.PasteHandler = PasteHandler;