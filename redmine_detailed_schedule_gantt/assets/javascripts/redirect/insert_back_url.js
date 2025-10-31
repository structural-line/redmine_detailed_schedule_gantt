/*
* Copyright (c) 2025 Structural Line Incorporated
* SPDX-License-Identifier: GPL-2.0-or-later
* https://sl-inc.co.jp
*/

// URLクエリにback_urlパラメータが設定してある場合はフォームにback_urlを hiddenとして埋め込む
// カスタムクエリの作成や編集時にいくつかのページを跨いでも最終的には小日程計画ガントチャートにリダイレクトするための処理
// ガントスプレッドシートには直接は関係しない
(function () {
  function inject() {
    try {
      // 現在の URL から back_url クエリパラメータを取得
      var params = new URLSearchParams(window.location.search);
      var backUrl = params.get('back_url');
      if (!backUrl) return;

      // 対象のクエリフォームを取得
      var form = document.querySelector('form#query-form')
      if (!form) return;

      // すでにあるなら重複挿入しない
      if (form.querySelector('input[name="back_url"], input[name="query[back_url]"]')) return;

      // params[:back_url] で拾える形の hidden を埋め込む
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'back_url';
      input.value = backUrl;
      form.appendChild(input);
    } catch (_) {}
  }

  // 初回のイベント登録
  document.addEventListener('DOMContentLoaded', inject);
  // Turbo を使っている場合の遷移でも拾うように補助
  document.addEventListener('turbo:load', inject);
})();
