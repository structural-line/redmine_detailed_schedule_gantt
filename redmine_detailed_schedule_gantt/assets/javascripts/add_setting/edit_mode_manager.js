/*
* Copyright (c) 2025 Structural Line Incorporated
* SPDX-License-Identifier: GPL-2.0-or-later
* https://sl-inc.co.jp
*/

/**
 * @description Handsontable の編集モードの切替と、コンテキストメニューから行の挿入/コピー/削除を扱うクラス。
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {bool} isEditMode trueなら編集可能 falseなら編集不可
 * @param {PasteHandler} pasteHandler ペースト機能を扱うクラス
 * @param {RowCopier} rowCopier チケットのコピーと行の追加を行うクラス
 * @param {RowInserter} rowInserter 行の追加を行うクラス
 * @param {rowDeleter} rowDeleter 行の削除を行うクラス
 */
class EditModeManager {
  // コンストラクタ：Handsontableインスタンスと編集モード状態を初期化
  constructor(hotMain, pasteHandler, reloadManager, sortNumberUpdater) {
    this.hotMain = hotMain;
    this.isEditMode = false;
    this.pasteHandler = pasteHandler;
    this.rowCopier = new window.RowCopier(this.hotMain, reloadManager, sortNumberUpdater);
    this.rowInserter = new window.RowInserter(this.hotMain, reloadManager, sortNumberUpdater);
    this.rowDeleter = new window.RowDeleter(this.hotMain);
    this.changeRowColor = new window.ChangeRowColor(this.hotMain, reloadManager);
  }

  /**
   * 編集モードをOFFの状態で初期化
   * - クリックイベントを追加
   * - ボタンの見た目を更新
   * - handsontabelの設定を更新 
   */ 
  initialize(){
    this.attachButtonHandler();
    this.updateUI();
    this.updateHotSettings();
  }

  /**
   * 編集モードの状態を返す
   * @returns 編集モードONならtrue、OFFならfalse
   */
  getIsEditMode(){
    return this.isEditMode;
  }

  /**
   * 編集モード切替ボタン（#toggle-edit-mode）にクリックハンドラをバインドする
   * ON OFFを切り替える
   */
  attachButtonHandler() {
    const btn = document.getElementById('toggle-edit-mode');
    // ガード：ボタンが存在しているかつ、editModeHandlerにまだイベントが割り当てられていない時
    if (btn && !btn._editModeHandlerAttached) {
      btn.addEventListener('click', () => {
        this.toggleEditMode();
      });
      btn._editModeHandlerAttached = true;
    }
  }

  /**
   *  編集モードのONとOFFを切り替えて、UIとHandsontableを更新する
   */
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this.updateUI();
    this.updateHotSettings();
    this.pasteHandler.setIsEdit(this.isEditMode);
  }
  
  /**
   * 編集モードの切り替えに合わせて文言と背景色を更新
   */
  updateUI() {
    const status = document.getElementById('edit-mode-status');
    const btn = document.getElementById('toggle-edit-mode');
    
    if (status) {
      status.textContent = this.isEditMode ? '編集モードON' : '編集モードOFF';
    }
    
    if (btn) {
      btn.style.backgroundColor = this.isEditMode ? '#00FFFE' : 'lightgrey';
    }
  }
  
  /**
   * Handsontable の設定（読み取り専用/コピー&ペースト/コンテキストメニューの表示）を更新
   */
  updateHotSettings() {
    this.hotMain.updateSettings({
      readOnly: !this.isEditMode,
      copyPaste: this.isEditMode,
      // 編集モードが ON ならコンテキストメニューの設定オブジェクト、OFF ならfalseを設定
      contextMenu: this.isEditMode ? this.createContextMenu() : false
    });
  }

  /**
   * 右クリックで表示するコンテキストメニュー定義して返す
   * @returns {{items: Record<string, any>}} Handsontable の contextMenu 設定オブジェクト
   */
  createContextMenu() {
    return {
      items: {
        'row_above': { 
          name: '上に行（空のチケット）を挿入',
          callback: () => this.rowInserter.addRowsAbove()
        },
        'row_below': {
          name: '下に行（空のチケット）を挿入',
          callback: () => this.rowInserter.addRowsBelow()
        },
        'remove_row': { 
          name: '行（チケット）を削除',
          callback: () => this.rowDeleter.deleteSelectedRows()
        },
        'copy_ticket': {
          name: 'チケットをコピーして下に挿入',
          callback: () => this.rowCopier.copyRowsBelow()
        },
        'separator1': '---------',
        'copy': { name: 'セルをコピー' },
        'cut': { name: 'セルをカット' },
        'paste': { 
          name: 'セルをペースト',
          callback: () => this.triggerPaste()
        }, 
        'separator2': '---------',
        'yellow_color': {
          name: '行の色を黄色に変更',
          callback: () => this.changeRowColor.fillYellow()
        },
        'red_color': {
          name: '行の色を赤に変更',
          callback: () => this.changeRowColor.fillRed()
        },
        'gray_color': {
          name: '行の色を灰色に変更',
          callback: () => this.changeRowColor.fillGray()
        },
        'normal_color': { 
          name: '行の色を通常に戻す',
          callback: () => this.changeRowColor.fillNormal()
        }
      }
    };
  }
  
  /**
   * Handsontable のルート要素へ paste イベントを発火する
   * @returns {void}
   */
  triggerPaste() {
    const container = this.hotMain.rootElement;
    const pasteEvent = new Event('paste', { bubbles: true });
    container.dispatchEvent(pasteEvent);
  }
}

// グローバルに公開
window.EditModeManager = EditModeManager;
