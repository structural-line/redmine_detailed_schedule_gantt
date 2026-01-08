/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * ガントスプレッドシート初期化のファイル
 * 一番最初に実行される
 * document 準備完了時の初期化処理を管理
 */

// document準備完了時に初期化を行う
$(document).ready(async function() {
  //Redmineからチケットの情報そのものが取得できなければreturn
  if (window.issueArray == null) {
    console.warn("window.issueArrayが見つかりませんでした。");
    return; 
  }

  //クリップボードが使えるかチェックする
  const clipboardChecker = new window.ClipboardChecker();
  const result = await clipboardChecker.check();
  if (result) {
    console.log("クリップボードが使えます")
  } else {
    console.warn("クリップボードが使えません");
  };
  const isPasteAvailable = result;

  // ----- Handontableをセットアップするための日付データとクラスを準備をする -----
  // 日付情報を作成する
  const dayKeysGenerator = new window.DayKeysGenerator();
  const dayKeys = dayKeysGenerator.generateDayKeys();
  const monthSpans = dayKeysGenerator.generateMonthSpans();

  // 日付情報を元にカラムの設定を行うクラスとヘッダー行を作成するクラスを作成する
  const columnConfigurator = new window.ColumnConfigurator(dayKeys);
  const columnWidthsManager = new window.ColumnWidthsManager(dayKeys);
  const headerGenerator = new window.HeaderGenerator(dayKeys, monthSpans);

  // RailsのモデルからHandsontableに表示するデータだけを取得するユーティリティクラス
  const dataTransformer = new window.DataTransformer();
  
  // プロジェクト管理行を作成するクラス
  const projectControlRowsGenerator = new window.ProjectControlRowsGenerator(dayKeys);

  // マイルストーン行を作成するクラス
  const milestoneRowsGenerator = new window.MilestoneRowsGenerator(dayKeys);

  // 1日の合計工数行を作成するクラス
  const userTotalDaysGenerator = new window.UserTotalDaysGenerator();
  // ----- Handontableをセットアップするための日付データとクラスを準備の終わり -----

  // Handsontableの初期化処理を行い表データを作成する
  const createHandsontable = new window.CreateHandsontable(
    columnConfigurator,
    columnWidthsManager,
    dataTransformer,
    headerGenerator,
    milestoneRowsGenerator,
    projectControlRowsGenerator,
    userTotalDaysGenerator
  );
  const { hotMain, hotFooter } = await createHandsontable.initialize(); 
  if(hotMain == null || hotFooter == null) return;

  // ----- Handsontableのインスタンスに機能を追加 -----
  // リロードマネージャーをセットアップ
  const reloadManager = new window.ReloadManager(hotMain, hotFooter, projectControlRowsGenerator, milestoneRowsGenerator);
  reloadManager.reload(); // 遅延読み込みを行う
  // スプレッドシートに更新があれば自動で更新する
  reloadManager.autoReload(window.CONSTANTS.RELOAD_TIME);

  // ペーストイベントをセットアップ
  const pasteHandler = new window.PasteHandler(hotMain, isPasteAvailable);
  pasteHandler.setupEventListeners();

  // アンドゥイベントをセットアップ
  const undoHandler = new window.UndoHandler(hotMain);
  undoHandler.setupEventListener();

  // 担当者の1日の合計工数行の表示、非表示を切り替える機能をセットアップ
  const visuableManager = new window.VisuableManager();
  visuableManager.initialize();

  //並び替え機能をセットアップ
  const sortNumberUpdater = new window.SortNumberUpdater(hotMain);
  sortNumberUpdater.initialize();

  // 編集モードをセットアップ
  const editModeManager = new window.EditModeManager(hotMain, pasteHandler, reloadManager, sortNumberUpdater);
  editModeManager.initialize();
  // グローバルに公開（リンククリック時のbeforeunload制御で使用）
  window.editModeManager = editModeManager;

  // 更新機能をセットアップ
  const issuesSaveHandler = new window.IssuesSaveHandler(hotMain, reloadManager);
  issuesSaveHandler.initialize();
  const projectsSaveHandler = new window.ProjectsSaveHandler(hotMain, reloadManager);
  projectsSaveHandler.initialize();

  // ドラッグハンドラーをセットアップ
  const dragHandler = new window.DragHandler(hotMain, dayKeys, editModeManager, reloadManager);
  dragHandler.initialize();

  // 個別のセルプロパティをセットアップ
  const cellProperties = new window.CellProperties(hotMain, hotFooter, editModeManager);
  cellProperties.initialize();
  
  // 最後に再レンダリング
  hotMain.render();
});