/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description Handsontableの初期設定を行いhotインスタンスを作成するクラス
 * @param {ColumnConfigurator} [columnConfigurator] 静的カラムと日付カラムを定義して返すクラス
 * @param {ColumnWidthsManager} [columnWidthsManager] 各カラムの幅を管理するクラス
 * @param {DataTransformer} [dataTransformer] issueテーブルのデータをHandsontableで使えるデータに変換するクラス
 * @param {HeaderGenerator} [headerGenerator] ヘッダー行で使用する配列を生成するクラス
 * @param {UserTotalDaysGenerator} [userTotalDaysGenerator] 1日の合計工数行で使用する配列を生成するクラス
 */  
class CreateHandsontable {
  // 依存するクラスを注入
  constructor(columnConfigurator,columnWidthsManager,dataTransformer, headerGenerator, milestoneRowsGenerator, projectControlRowsGenerator, userTotalDaysGenerator){
    this.columnConfigurator = columnConfigurator
    this.columnWidthsManager = columnWidthsManager;
    this.dataTransformer = dataTransformer;
    this.headerGenerator = headerGenerator;
    this.milestoneRowsGenerator = milestoneRowsGenerator;
    this.projectControlRowsGenerator = projectControlRowsGenerator;
    this.userTotalDaysGenerator = userTotalDaysGenerator
  }

  // 初期化処理
  async initialize() {
    // handsontableを入れるコンテナを作成
    const mainContainer = document.getElementById('gantt-handsontable-main');
    const footerContainer = document.getElementById('gantt-handsontable-footer');

    // チケットがなければプレースホルダー（チケットが無い旨）を表示
    if (window.issueArray?.length === 0) {
      this.showNoDataPlaceholder(mainContainer);
      const hotMain = null;
      const hotFooter = null
      return { hotMain, hotFooter} ;
    }

    window.onbeforeunload = null; // 変更未保存の警告を無効にする

    // ヘッダー情報（1～３行目）を取得
    const nestedHeaders = this.headerGenerator.generateHeaders(); 

    // 各カラムの幅を取得
    const colmnWidth = this.columnWidthsManager.getColumnWidths();

    // 全てのカラムの設定情報を取得
    const allColumnConfig = this.columnConfigurator.getAllColumnConfig();

    // issueテーブルのデータからhandsontableで使用するオブジェクトだけが入った配列を取得
    const issueData = window.issueArray.map(issue => this.dataTransformer.transformIssueToRow(issue));

    // 全てのユーザーの1日の合計工数行を生成
    const userTotalDaysRow = this.userTotalDaysGenerator.generate();

    // Handsontableの高さを指定
    const mainHeight = 500;
    const footerHeight = 200;

    // プロジェクト管理行を作成
    const projectControlRows = this.projectControlRowsGenerator.generate();

    // マイルストーン行を作成
    const milestoneRows = this.milestoneRowsGenerator.generate();

    const data = projectControlRows.concat(milestoneRows).concat(issueData);
  
    // Handsontableのインスタンスを作成
    const hotMain =  this.createHandsontable(mainContainer, nestedHeaders, allColumnConfig, colmnWidth, mainHeight, data );
    const hotFooter =  this.createHandsontable(footerContainer, nestedHeaders, allColumnConfig, colmnWidth, footerHeight, userTotalDaysRow);

    // 2つのHandsontableの横スクロールバーの動きを同期
    this.sideScrollSynchro(hotMain, hotFooter);

    return { hotMain, hotFooter} ;
  }

  // データがない場合のプレースホルダーを表示
  showNoDataPlaceholder(container) {
    const placeholder = document.createElement('div');
    placeholder.className = 'gantt-spreadsheet-placeholder';
    placeholder.style.textAlign = 'center';
    placeholder.style.padding = '40px 0';
    placeholder.style.color = '#888';
    placeholder.style.fontSize = '1.2em';
    placeholder.textContent = '表示するデータがありません。';
    container.appendChild(placeholder);
  }

  // Handsontableのインスタンスを作成
  createHandsontable(container, nestedHeaders,allColumnConfig, colmnWidth, height, data){
    // handsontableのインスタンスを作成
    const hot = new Handsontable(container, {
      data: data, // 行データ
      columns: allColumnConfig, // カラムの設定
      nestedHeaders: nestedHeaders, // 複数行のヘッダーを使用
      rowHeaders: true, // 一番左の列に行番号を表示
      width: '100%',
      height: height,
      readOnly: true,
      fixedColumnsLeft: window.CONSTANTS.COL_FIRST_DAY, // 静的カラムは左側に固定表示する。右スクロールしても固定される
      colWidths: colmnWidth,                  
      rowHeights: 22,
      licenseKey: 'non-commercial-and-evaluation',
      contextMenu: false, // 画面ロード時は右クリックメニューを無効にする
      manualRowMove: true, // 行をドラッグアンドドロップで移動可能
      manualRowResize: false, // 行の高さは変更不可
      manualColumnMove: false, // 列はドラッグアンドドロップで移動不可
      manualColumnResize: true, // 列幅をドラッグアンドドロップで変更可能
      filters: false, // フィルタ機能はオフRedmineのフィルタを使う
      undo: false, // HandsontableのUndo機能は無効にする
      dropdownMenu: false, // ドロップダウンメニューは非表示
      hiddenColumns: {
        columns: [
          window.CONSTANTS.COL_ISSUE_ID,
          window.CONSTANTS.COL_LOCK_VERSION,
          window.CONSTANTS.COL_PROJECT_ID,
        ],
        indicators: false
      },
      beforeChange: (changes, source) => {
        this.nullReplaceEmpty(changes, source); // nullは空文字に変換する
      },
      // プロジェクト管理行とマイルストーン行はセルを結合する
      mergeCells: this.projectControlRowsGenerator
        .getMergeCells(data)
        .concat(this.milestoneRowsGenerator.getMergeCells(data)),
    });
    return hot;
  }
  /**
   * @description deleteキーやBack Spaceキーなどでnullが入力されたときは空文字に変換する
   * @param {Array} changes 変更されたセルの情報が入った二重配列。一度に複数セルの変更情報が入ることもある
   * 例 [行、カラム、変更前の値、変更後の値]
   * [
   *   [12, 'subject',         'A',   'B'],
   *   [12, 'estimated_days',  0.4,   0.6],
   *   [12, '2025-10-03',      0.25,  0.5]
   * ]
   * 
   * @param {string} source どういう操作が実行されたか。全ての操作を対象にするので今回は特に使用しない
   */
  nullReplaceEmpty(changes, source) {
    if (!changes) return;

    changes.forEach(change => {
      const [row, prop, oldValue, newValue] = change;

      // Deleteキー等でnullになったとき
      if (newValue === null) {
        change[3] = ''; // newValueを空文字に書き換える
      }
    });
  }

  // 2つのHandsontableの横スクロールバーの動きを同期
  sideScrollSynchro(hotMain, hotFooter) {
    // 横スクロールバーを取得
    const mainScroll = hotMain.view._wt.wtTable.holder;
    const footerScroll = hotFooter.view._wt.wtTable.holder;

    // メインのHandsontableをスクロールしたらフッターも追従
    mainScroll.addEventListener('scroll', () => {
      footerScroll.scrollLeft = mainScroll.scrollLeft;
    });

    // フッターのHandsontableをスクロールしたらメインも追従
    footerScroll.addEventListener('scroll', () => {
      mainScroll.scrollLeft = footerScroll.scrollLeft;
    });
  }
}

window.CreateHandsontable = CreateHandsontable;