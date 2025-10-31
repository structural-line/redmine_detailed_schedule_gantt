/*
* Copyright (c) 2025 Structural Line Incorporated
* SPDX-License-Identifier: GPL-2.0-or-later
* https://sl-inc.co.jp
*/

class SortNumberUpdater {
  constructor(hotMain) {
    this.hotMain = hotMain;
  }

  initialize() {
    this.hotMain.addHook('afterRowMove', () => this.saveSortOrder());
  }

  // 並び替え順序を保存する
  saveSortOrder() {
    // 全プロジェクト表示時では並び替えを保存しない
    if(window.isAllProjects === true) {
      console.warn("全プロジェクト表示時は並び替えを保存できなくなっています");
      return; 
    } 
    const visualCount = this.hotMain.countRows();

    const orderData = [];

    for (let visualIndex = 0; visualIndex < visualCount; visualIndex++) {
      const physicalIndex = this.hotMain.toPhysicalRow(visualIndex);
      const row = this.hotMain.getSourceDataAtRow(physicalIndex);
      if (!row || !row.id) continue;

      orderData.push({
        issue_id: row.id,
        sort_number: visualIndex + 1
      });
    }

    fetch('detailed_schedule_gantt/update_sort_number', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
    },
    body: JSON.stringify({ order: orderData })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        console.log("並び替え完了")
      } else {
        console.log("並び替え失敗")
      }
    })
  }
}

window.SortNumberUpdater = SortNumberUpdater;