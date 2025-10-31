/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description Railsにリクエストを送信するクラス
 * @param {string} url
 * @param {string} method POSTやDELETE等
 */
class SendRequest {
  constructor(url, methodType) {
    this.url = url;
    this.methodType = methodType
  }
  // RailsにPostリクエストを送る
  async send(payload){
    let res;
    try {
      res = await fetch(this.url, {
        method: this.methodType,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify(payload)
      });
    } catch(networkErr){
      // fetch自体が失敗（ネットワーク・CORSなど）場合のエラーハンドリング
      const err = new Error('Network error');
      err.cause = networkErr;
      err.status = 0;
      throw err;
    }

    if (res.status === 204) return null; // 204はページを書き換える必要なしを意味する

    // レスポンスがJSON形式でなくても安全に受け取る処理
    let data = {};
    const text = await res.text(); // 先にひとまず text で受ける
    if (text) {
      try { data = JSON.parse(text); } catch (_) { /* 特に例外をスローしない */ }
    }

    // エラーを作成してスローする
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      err.id = data.id ?? null;
      err.message = data.message ?? null;
      err.error = data.error ?? null;
      err.errors = data.errors ?? null;
      err.ignored_by_permission = data?.ignored_by_permission ?? null;
      throw err;
    }
    return data;

  }

  /**
   * meta[name="csrf-token"] から CSRF トークンを取得する
   * @returns {string|undefined} - 取得できたトークン文字列（なければ undefined）
   */
  getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content');
  }
}

window.SendRequest = SendRequest;