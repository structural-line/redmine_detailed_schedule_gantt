/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * 担当者の一日の工数行の表示と非表示を管理するクラス
 */
class VisuableManager {
  constructor() {
    this.isToggle = true;
  }
  // Handsontableを取得
  get element() {
    return document.getElementById("gantt-handsontable-footer");
  }

  /** 
   * --- 初期化処理 ---
   * イベントハンドラーの追加
   * UIの更新
   */ 
  initialize(){
    this.attachButtonHandler();
    this.updateUI();
  }

  // イベントハンドラーを追加
  attachButtonHandler() {
    const btn = document.getElementById('toggle-manager-button');
    // ガード：ボタンが存在しているかつ、handlerにまだイベントが割り当てられていない時
    if (btn && !btn._handlerAttached) {
      btn.addEventListener('click', () => {
        this.toggle();
        this.updateUI();
      });
      btn._handlerAttached = true;
    }
  }

  // 表示、非表示を切り替える
  toggle() {
    const el = this.element;
    if (!el) return;
    el.style.display = (el.style.display === 'none') ? '' : 'none';
    this.isToggle = !this.isToggle;
  }

  // ボタンの見た目を切り替える
  updateUI() {
    const status = document.getElementById('manager-button-status');
    const btn = document.getElementById('toggle-manager-button');
    
    if (status) {
      status.textContent = this.isToggle ? '担当者合計工数表示ON' : '担当者合計工数表示OFF';
    }
    
    if (btn) {
      btn.style.backgroundColor = this.isToggle ? '#00FFFE' : 'lightgrey';
    }
  }
}

window.VisuableManager = VisuableManager;