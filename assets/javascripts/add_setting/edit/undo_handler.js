/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description 自作したUndo機能。HandsontableにあるUndoスタックはlodaDataメソッドを使うとリセットされるため自作する
 * @TODO 現在はUndoがまだない 将来的にはhotMainしか使わないかも
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 */
class UndoHandler {
  constructor(hotMain) {
    this.hotMain = hotMain;
  }

  setupEventListener() {
    document.addEventListener('keydown', (e) => this.handleUndo(e)); // Ctrz / Cmd+z からのUndoイベント
  }

  handleUndo(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault(); // ブラウザ既定のUndoイベントを止める
      console.log("ブラウザの規定Undo機能を止めました。カスタムUndo機能は未実装です");
    }
  }
}

window.UndoHandler = UndoHandler;