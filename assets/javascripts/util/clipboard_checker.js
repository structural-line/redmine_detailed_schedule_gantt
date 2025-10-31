/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later
 * https://sl-inc.co.jp
 */

/**
 * クリップボードの操作と使用権限を管理するクラス
 */
class ClipboardChecker {
  // クリップボードが使用できるかチェックして真偽値を返す
  async check(){
    try {
      const supportOk = await this.checkSupport();
      if (!supportOk) return false;

      const permissionOk = await this.requestPermission();
      if (!permissionOk) return false;

      return true;
    } catch (err) {
      console.warn('クリップボードの初期化に失敗しました:', err);
      return false;
    }
  }

  // クリップボード機能がサポートされているか確認して真偽値を返す
  async checkSupport() {
    // クリップボードAPIのサポート状況を確認
    const support = {
      clipboardAPI: !!navigator.clipboard, // true または false を返す
      clipboardData: !!window.clipboardData // true または false を返す
    };
    
    console.log('クリップボードサポート:', support); // サポート状況をコンソールに表示
    
    // サポートされていない場合はワーニングを表示
    if (!support.clipboardAPI && !support.clipboardData) {
      console.warn('クリップボードサポートが検出されませんでした。ペースト機能が動作しない可能性があります。');
      return false;
    }
    
    return true;
  }

  // クリップボード権限を事前にリクエストして確認して真偽値を返す
  async requestPermission() {
    if (navigator.clipboard && navigator.permissions) {
      try {
        await navigator.clipboard.readText();
        console.log('クリップボードの権限が正常に許可されました');
        return true
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          console.error('クリップボードの権限が拒否されました');
          alert("クリップボードの使用権原取得に失敗しました\nコピー＆ペースト機能が使用できません\n画面を再読み込みすると改善することがあります");
          return false;
        } else {
          console.error('クリップボード権限リクエストに失敗しました:', error);
          alert("クリップボードの使用権原取得に失敗しました\nコピー＆ペースト機能が使用できません\n画面を再読み込みすると改善することがあります");
          return false;
        }
      }
    }
  }

}

// グローバルに公開
window.ClipboardChecker = ClipboardChecker; 