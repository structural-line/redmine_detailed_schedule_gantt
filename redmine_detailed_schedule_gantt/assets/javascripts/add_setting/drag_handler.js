/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * ドラッグアンドドロップイベントを管理するクラス
 * @param {Handsontable} hotMain
 * @param {Array} dayKeys
 * @param {editModeManager} editModeManager
 * @param {reloadManager} reloadManager
 */
class DragHandler {
  constructor(hotMain, dayKeys, editModeManager, reloadManager) {
    this.hotMain = hotMain;
    this.dayKeys = dayKeys;
    this.editModeManager = editModeManager;
    this.reloadManager = reloadManager;
  }

  // 初期化処理
  initialize() {
    this.hotMain.updateSettings({
      afterRenderer: (td, row, col, prop, value) => {
        // レンダリング後にセルのマージを行う
        this.renderMergeCell(this.hotMain, td, row, col, prop, value);
      },
    });
  }

  // マージされた行のレンダリング処理
  renderMergeCell(instance, td, row, col, prop, value) {
    const rowData = instance.getSourceDataAtRow(row);
    // プロジェクト管理行または、マイルストーン行かつ、値が1の場合
    if ((rowData?.is_project_control_row || rowData?.is_milestone_row) && value === '1') {
      // プロジェクト管理行なら「全体」を表示する
      if (rowData?.is_project_control_row) {
        td.innerText = '全体';
        td.style.backgroundColor = '#e6f3ff';
        td.style.color = '#0066cc';
      }
      // マイルストーン行ならマイルストーンの名前を表示する
      if (rowData.is_milestone_row) {
        td.innerText = rowData['subject'];
        td.style.backgroundColor = '#fcefd8ff';
        td.style.color = '#e6a800';
      }
      
      td.style.textAlign = 'center';
      td.style.fontWeight = 'bold';
      td.style.position = 'relative';
      td.style.opacity = '0.9';
      td.style.filter = 'grayscale(20%)';

      // ドラッグハンドルを追加
      this.addDragHandles(td, row, col, instance.getSourceDataAtRow(row));
    }
  }

   /**
   * 左右と中央にドラッグハンドルを追加
   */
  addDragHandles(td, row, col, rowData) {
    // 左ドラッグハンドル
    const leftHandle = document.createElement('div');
    leftHandle.className = 'drag-handle-left';
    leftHandle.title = this.editModeManager.getIsEditMode() ? '期間をリサイズするにはドラッグしてください' : '日付を変更するには編集モードを有効にしてください';
    leftHandle.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 4px;
      height: 100%;
      background-color: ${this.editModeManager.getIsEditMode() ? '#0066cc' : '#999999'};
      cursor: ${this.editModeManager.getIsEditMode() ? 'ew-resize' : 'not-allowed'};
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    
    // 右ドラッグハンドル
    const rightHandle = document.createElement('div');
    rightHandle.className = 'drag-handle-right';
    rightHandle.title = this.editModeManager.getIsEditMode() ? '期間をリサイズするにはドラッグしてください' : '日付を変更するには編集モードを有効にしてください';
    rightHandle.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      width: 4px;
      height: 100%;
      background-color: ${this.editModeManager.getIsEditMode() ? '#0066cc' : '#999999'};
      cursor: ${this.editModeManager.getIsEditMode() ? 'ew-resize' : 'not-allowed'};
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    
    // 中央ドラッグハンドル（移動用）
    const centerHandle = document.createElement('div');
    centerHandle.className = 'drag-handle-center';
    centerHandle.title = this.editModeManager.getIsEditMode() ? '期間全体を移動するにはドラッグしてください' : '日付を変更するには編集モードを有効にしてください';
    centerHandle.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: ${this.editModeManager.getIsEditMode() ? 'linear-gradient(45deg, rgba(0, 102, 204, 0.05) 25%, transparent 25%, transparent 50%, rgba(0, 102, 204, 0.05) 50%, rgba(0, 102, 204, 0.05) 75%, transparent 75%, transparent)' : 'linear-gradient(45deg, rgba(153, 153, 153, 0.05) 25%, transparent 25%, transparent 50%, rgba(153, 153, 153, 0.05) 50%, rgba(153, 153, 153, 0.05) 75%, transparent 75%, transparent)'};
      background-size: 12px 12px;
      cursor: ${this.editModeManager.getIsEditMode() ? 'move' : 'not-allowed'};
      z-index: 999;
      opacity: 0;
      transition: opacity 0.2s ease;
      border: ${this.editModeManager.getIsEditMode() ? '2px dashed #0066cc' : '2px dashed #999999'};
      box-sizing: border-box;
    `;
    
    // ドラッグイベントリスナーを追加
    this.addDragListeners(leftHandle, row, col, rowData, 'left');
    this.addDragListeners(rightHandle, row, col, rowData, 'right');
    this.addDragListeners(centerHandle, row, col, rowData, 'center');
    
    // セルにホバーイベントリスナーを追加
    td.addEventListener('mouseenter', () => {
      // 編集モードでのみハンドルを表示
      if (this.editModeManager.getIsEditMode()) {
        leftHandle.style.opacity = '1';
        rightHandle.style.opacity = '1';
        centerHandle.style.opacity = '1';
        
        // セル全体にドラッグ可能なスタイルを適用
        td.style.cursor = 'move';
        td.style.boxShadow = 'inset 0 0 0 2px rgba(0, 102, 204, 0.4)';
        td.style.transition = 'box-shadow 0.2s ease, transform 0.1s ease';
        td.style.transform = 'scale(1.01)';
      }
    });
    
    // セルにホバー終了時のイベントリスナーを追加
    td.addEventListener('mouseleave', () => {
      leftHandle.style.opacity = '0';
      rightHandle.style.opacity = '0';
      centerHandle.style.opacity = '0';
      
      // セルのスタイルを元に戻す
      td.style.cursor = '';
      td.style.boxShadow = '';
      td.style.transform = '';
    });
    
    td.appendChild(leftHandle);
    td.appendChild(rightHandle);
    td.appendChild(centerHandle);
  }

  /**
   * ハンドルにドラッグイベントを登録
   */
  addDragListeners(handle, row, col, rowData, side) {
    let isDragging = false;
    let startX = 0;
    let startCol = 0;
    
    // クリック時のイベントリスナーを追加
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 編集モードでのみドラッグを許可
      if (!this.editModeManager.getIsEditMode()) return;
      
      isDragging = true;
      startX = e.clientX; // ドラッグ開始時のマウスX座標
      startCol = col; // ドラッグ開始時の列位置
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    
    // ドラッグしたときのイベント
    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX; // マウスの移動量を取得
      const colWidth = window.CONSTANTS.DAY_COLUMN_WIDTH; // 日付カラムの幅
      const colDelta = Math.round(deltaX / colWidth); // 何日分動いたかを計算
      
      // 新しいカラム位置を計算
      let newCol = startCol;
      if (side === 'left') {
        newCol = Math.max(window.CONSTANTS.COL_FIRST_DAY, startCol + colDelta - 1);
      } else if (side === 'right') {
        newCol = Math.min(this.hotMain.countCols() - 1, startCol + colDelta - 1);
      } else if (side === 'center') {
        // 中央ドラッグハンドルの場合は、カラム位置を変更
        newCol = Math.min(this.hotMain.countCols() - 1, startCol + colDelta - 1);
      }

      // マージされるセルのプレビューボーダーを表示
      this.showMergePreview(rowData.project_id, rowData.version_id, newCol, side);
    };

    // ドラッグ終了時のイベント
    const onMouseUp = (e) => {
      if (isDragging) {
      
        const deltaX = e.clientX - startX;
        const colWidth = window.CONSTANTS.DAY_COLUMN_WIDTH; // 日付カラムの幅
        const colDelta = Math.round(deltaX / colWidth);
        
        // 新しいカラム位置を計算
        let newCol = startCol;
        if (side === 'left') {
          newCol = Math.max(window.CONSTANTS.COL_FIRST_DAY, startCol + colDelta);
        } else if (side === 'right') {
          newCol = Math.min(this.hotMain.countCols() - 1, startCol + colDelta);
        } else if (side === 'center') {
          // 中央ドラッグハンドルの場合は、カラム位置を変更
          newCol = Math.min(this.hotMain.countCols() - 1, startCol + colDelta);
        }
        
        // マウスアップ時のみマージセルを更新
        this.updateMergeCell(rowData.project_id, rowData.version_id, newCol, side);
      }
      
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  // ドロップ時に行う更新処理
  updateMergeCell(projectId, versionId, newCol, side) {
    const currentMergeCells = this.hotMain.getPlugin('mergeCells').mergedCellsCollection.mergedCells;
    // まずマイルストーン行かチェック
    let mergeCell = currentMergeCells.find(cell => 
      cell.row === this.getMilestoneRowIndex(versionId)
    );
    // マイルストーン行でなければプロジェクト管理行かチェック
    if (mergeCell == null) {
      mergeCell = currentMergeCells.find(cell => 
        cell.row === this.getProjectControlRowIndex(projectId)
      );
    }

    if (mergeCell) {
      let newStartCol = mergeCell.col;
      let newEndCol = mergeCell.col + mergeCell.colspan - 1;
      
      if (side === 'left') {
        newStartCol = newCol;
      } else if (side === 'right') {
        newEndCol = newCol + mergeCell.colspan - 1;
      } else if (side === 'center') {
        // 中央ドラッグハンドルの場合は、カラム位置を変更
        newStartCol = newCol;
        newEndCol = newCol + mergeCell.colspan - 1;
      }
      
      // 有効な範囲を確保
      if (newStartCol < newEndCol && newStartCol >= window.CONSTANTS.COL_FIRST_DAY) {
        
        // 新しい日付でデータを更新
        this.updateDates(projectId, versionId, newStartCol, newEndCol);
        
      }
    }
  }

  // バージョンIDから行を特定
  getMilestoneRowIndex(version_id) {
    const data = this.hotMain.getSourceData();
    return data.findIndex(row => row.is_milestone_row && row.version_id === version_id);
  }

  // プロジェクトIDから行を特定
  getProjectControlRowIndex(projectId) {
    const data = this.hotMain.getSourceData();
    return data.findIndex(row => row.is_project_control_row && row.project_id === projectId);
  }

  updateDates(projectId, versionId, startCol, endCol) {
    const startDayIndex = startCol - window.CONSTANTS.COL_FIRST_DAY;
    const endDayIndex = endCol - window.CONSTANTS.COL_FIRST_DAY;
    
    if (startDayIndex >= 0 && endDayIndex >= 0 && startDayIndex < this.dayKeys.length && endDayIndex < this.dayKeys.length) {
      const newStartDate = this.dayKeys[startDayIndex];
      const newEndDate = this.dayKeys[endDayIndex];
      
      // 日付の検証
      if (new Date(newStartDate) > new Date(newEndDate)) {
        console.error('無効な日付範囲: 開始日は終了日より後に設定できません');
        alert('無効な日付範囲: 開始日は終了日より後に設定できません');
        return;
      }
      
      // バックエンドで日付を更新
      this.updateDatesInBackend(projectId, versionId, newStartDate, newEndDate);

      // Handsontableを再描画
      this.reloadManager.reload();
      this.clearMergePreview();
    } else {
      console.error('日付計算のための無効なカラム範囲');
      alert('日付計算のための無効なカラム範囲');
    }
  }

  // バックエンドで日付を更新
  updateDatesInBackend(projectId, versionId, startDate, endDate) {
    // バージョンIDがあればマイルストーンを更新、なければプロジェクト管理を更新
    if (versionId == null) {
      this.postRequest(projectId, 'detailed_schedule_gantt/update_project_date', startDate, endDate)
    } else {
      this.postRequest(versionId, 'detailed_schedule_gantt/update_version_date', startDate, endDate)
    }
  }

  // RailsにPOSTリクエストを送る
  async postRequest(id, url, startDate, endDate) {
    try {
      const response = await fetch(url , {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({
          id: id,
          start_date: startDate,
          end_date: endDate
        })
      });

      if (response.ok) {
        await this.reloadManager.reload();
      } else {
        const errorResponse = await response.json();
        const errorMessage = errorResponse.error;
        throw new Error(`HTTP error! \n status: ${response.status} \n message: ${errorMessage}`);
      }
    } catch (error) {
      alert(`日付の更新に失敗しました: ${error.message}`);
    }
  }

  getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute('content');
  }

  // ドラッグ中のプレビュー表示
  showMergePreview(projectId, version_id, newCol, side) {
    try {
      const mergePlugin = this.hotMain.getPlugin('mergeCells');
      const mergedCells = mergePlugin?.mergedCellsCollection?.mergedCells ?? [];
      let mergeRow = this.getMilestoneRowIndex(version_id);
      // mergeLow がマイルストーンから取得できていない（-1）ならければプロジェクトコントロール行を取得してマージセルズとする
      if (mergeRow === -1) mergeRow = this.getProjectControlRowIndex(projectId);
      const mergeCell = mergedCells.find(cell => cell.row === mergeRow);

      if (!mergeCell) {
        console.warn(`マージセルが見つかりません`);
        return;
      }

      // 開始・終了カラムの算出
      let startCol = mergeCell.col;
      let endCol = mergeCell.col + mergeCell.colspan - 1;

      switch (side) {
        case 'left':
          startCol = newCol;
          break;
        case 'right':
          endCol = newCol + mergeCell.colspan - 1;
          break;
        case 'center':
          startCol = newCol;
          endCol = newCol + mergeCell.colspan - 1;
          break;
      }

      // 範囲が有効でなければスキップ
      const isValid =
        startCol < endCol && startCol >= window.CONSTANTS.COL_FIRST_DAY -1;

      if (!isValid) {
        console.warn(`無効なプレビュー範囲: start=${startCol}, end=${endCol}`);
        return;
      }

      // プレビュー用の矩形を描画
      this.createMergePreviewRectangle(mergeRow, startCol, endCol);
    } catch (error) {
      console.error('マージプレビューの表示中にエラーが発生しました:', error);
    }
  }

  createMergePreviewRectangle(rowIndex, startCol, endCol) {
    // 既存のプレビュー矩形を削除
    const existingPreview = document.getElementById('merge-preview-rectangle');
    if (existingPreview) existingPreview.remove();
    
    // テーブルコンテナを取得
    const tableContainer = this.hotMain.rootElement;
    if (!tableContainer) return;
    
    // プレビュー矩形要素を作成
    const previewRect = document.createElement('div');
    previewRect.id = 'merge-preview-rectangle';
    previewRect.style.cssText = `
      position: absolute;
      border: 2px dashed #007bff;
      background-color: rgba(0, 123, 255, 0.1);
      pointer-events: none;
      z-index: 1000;
    `;

    // カラムインデックスとテーブルレイアウトに基づいて位置とサイズを計算
    try {
      // テーブルのスクロール位置を取得
      const scrollLeft = document.getElementsByClassName("wtHolder")[0].scrollLeft || 0;
      const scrollTop = document.getElementsByClassName("wtHolder")[0].scrollTop || 0;
      
      // startColまでのカラム幅を合計して左位置を計算
      let leftPosition = 0;
      for (let i = 0; i < startCol; i++) {
        const colWidth = this.hotMain.getColWidth(i) || window.CONSTANTS.DAY_COLUMN_WIDTH; ; // 設定されていない場合は24pxにデフォルト
        leftPosition += colWidth;
      }
      
      // 範囲内のカラムの合計幅を計算
      let totalWidth = 0;
      for (let i = startCol; i <= endCol; i++) {
        const colWidth = this.hotMain.getColWidth(i) || window.CONSTANTS.DAY_COLUMN_WIDTH; ; // 設定されていない場合は24pxにデフォルト
        totalWidth += colWidth;
      }
      
      // 行の高さを取得
      const rowHeight = this.hotMain.getRowHeight(rowIndex) || 24; // 設定されていない場合は24pxにデフォルト
      
      // rowIndexまでの行の高さを合計して上位置を計算
      let topPosition = 0;
      for (let i = 0; i < rowIndex; i++) {
        const height = this.hotMain.getRowHeight(i) || 24; // 設定されていない場合は24pxにデフォルト
        topPosition += height;
      }
      
      // ヘッダーの高さオフセットを取得
      const headerHeight = this.getHeaderHeight();
      topPosition += headerHeight;
      
      // 行ヘッダーの幅を考慮する必要があるかチェック
      const rowHeaderWidth = this.getRowHeaderWidth();
      if (startCol === 0) {
        // 最初のカラムから開始する場合、行ヘッダーの幅を考慮
        leftPosition += rowHeaderWidth;
      }
      
      // スクロール位置に合わせて調整
      const adjustedLeft = leftPosition - scrollLeft;
      const adjustedTop = topPosition - scrollTop;
      
      // プレビュー矩形の位置とサイズを設定
      previewRect.style.left = adjustedLeft + 'px';
      previewRect.style.top = adjustedTop + 'px';
      previewRect.style.width = totalWidth + 'px';
      previewRect.style.height = rowHeight + 'px';
      
      // テーブルコンテナに追加
      tableContainer.appendChild(previewRect);

    } catch (error) {
      console.error('マージプレビュー矩形の作成中にエラーが発生しました:', error);
    }
  }

  getRowHeaderWidth() {
    try {
      // 行ヘッダーコンテナを取得
      const rowHeaderContainer = this.hotMain.rootElement.querySelector('.ht_clone_left');
      if (rowHeaderContainer) {
        const rowHeaderWidth = rowHeaderContainer.offsetWidth;
        return rowHeaderWidth;
      }
      
      // フォールバック: Handsontable設定から取得を試行
      const rowHeaderWidth = this.hotMain.getSettings().rowHeaderWidth || 0;
      return rowHeaderWidth;
    } catch (error) {
      console.error('行ヘッダーの幅の取得中にエラーが発生しました:', error);
      return 0;
    }
  }

  getHeaderHeight() {
    try {
      // ヘッダーコンテナを取得
      const headerContainer = this.hotMain.rootElement.querySelector('.ht_clone_top');
      if (headerContainer) {
        // すべてのヘッダー行を取得
        const headerRows = headerContainer.querySelectorAll('thead tr');
        let totalHeaderHeight = 0;
        
        headerRows.forEach(row => {
          totalHeaderHeight += row.offsetHeight;
        });
        
        return totalHeaderHeight;
      }
      
      // フォールバック: Handsontable設定から取得を試行
      const headerHeight = this.hotMain.getSettings().headerRowHeight || 0;
      const nestedHeaders = this.hotMain.getSettings().nestedHeaders || [];
      const totalHeight = headerHeight * Math.max(1, nestedHeaders.length);
      
      return totalHeight;
    } catch (error) {
      console.error('ヘッダーの高さの計算中にエラーが発生しました:', error);
      // デフォルトのフォールバック
      return 60; // 典型的なヘッダーの高さ
    }
  }

  clearMergePreview() {
    const existingPreview = document.getElementById('merge-preview-rectangle');
    if (existingPreview) {
      existingPreview.remove();
    }
  }
}

window.DragHandler = DragHandler;