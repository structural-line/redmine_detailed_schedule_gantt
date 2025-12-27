/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 


/**
 * @description Handsontableの再読み込みを管理するクラス
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {Handsontable} hotFooter　Handsontableの1日の合計工数行部分
 * @param {DataTransformer} dataTransformer Handsontableの行データに必要な項目のみを取り出すクラス
 */
class ReloadManager {
  constructor(hotMain, hotFooter, projectControlRowsGenerator, milestoneRowsGenerator) {
    this.dataTransformer = new window.DataTransformer();
    this.hotMain = hotMain;
    this.hotFooter = hotFooter;
    this.projectControlRowsGenerator = projectControlRowsGenerator;
    this.milestoneRowsGenerator = milestoneRowsGenerator
    this.loadingIndicator = document.getElementById('loading-indicator');
  }

  showLoading() {
    if (this.loadingIndicator) this.loadingIndicator.style.display = 'flex';
  }

  hideLoading() {
    if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
  }

  // 1日の合計工数行をサーバーから取得して更新する
  async reloadTallyRows() {
    this.showLoading();
    let data = { issues: [], user_daily_schedules: [], projects: [] };
    let res = null; // Railsから取得した行データを入れる配列

    try {
      // プロジェクトがセットされてなければ全てのプロジェクトのissueを取得する
      if (window.isAllProjects) {
        res = await fetch('get_data_all_projects')
      } else {
        res = await fetch('detailed_schedule_gantt/get_data');
      }

      if (res.ok) {
        data = await res.json();
      } else {
        console.error('fetch error:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('最新データの取得中にエラーが発生しました:', e);
    }

    // ----- 1日の合計工数行を作成-----
    // 全てのユーザーのひな型となる行データを作成
    const tallyRows = (window.allUsers || []).map(user => ({
      id: null,
      lock_version: null,
      category_id: '-',
      version_id: '-',
      assigned_to_id: user.id,
      subject: '工数管理',
      description: '1日の合計工数',
      done_ratio: '-',
      is_tally_row: true,
      estimated_days: '-',
      schedule_days: '-',
      check_days: '-'
    }));

    // ユーザー毎に1日の合計工数をtallyRowsにマージする
    data.user_daily_schedules.forEach(uds => {
      const row = tallyRows.find(r => r.assigned_to_id === uds.user_id);
      if (!row) return;
        row[uds.schedule_date] = uds.total_man_days;
    });

    // 1日の合計工数行を更新する 
    this.hotFooter.updateSettings({
      data: tallyRows
    })
    this.hotFooter.render();
    this.hideLoading();
  }

  // 最新のissueと1日の合計工数を取得してHandsontableのセルの値を更新する
  async reload() {
    this.showLoading();
    let data = { issues: [], user_daily_schedules: [], projects: [] };
    let res = null; // Railsから取得した行データを入れる配列
    try {
      // プロジェクトがセットされてなければ全てのプロジェクトのissueを取得する
      if (window.isAllProjects) {
        res = await fetch('get_data_all_projects')
      } else {
        res = await fetch('detailed_schedule_gantt/get_data');
      }
      if (res.ok) {
        data = await res.json();
      } else {
        console.error('fetch error:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('最新データの取得中にエラーが発生しました:', e);
    }

    // ----- 1日の合計工数行を作成-----
    // 全てのユーザーのひな型となる行データを作成
    const tallyRows = (window.allUsers || []).map(user => ({
      id: null,
      lock_version: null,
      category_id: '-',
      version_id: '-',
      assigned_to_id: user.id,
      subject: '工数管理',
      description: '1日の合計工数',
      done_ratio: '-',
      is_tally_row: true,
      estimated_days: '-',
      schedule_days: '-',
      check_days: '-'
    }));

    // ユーザー毎に1日の合計工数をtallyRowsにマージする
    data.user_daily_schedules.forEach(uds => {
      const row = tallyRows.find(r => r.assigned_to_id === uds.user_id);
      if (!row) return;
        row[uds.schedule_date] = uds.total_man_days;
    });

    window.issueArray = data.issues;
    const issueRows = window.issueArray.map(issue => this.dataTransformer.transformIssueToRow(issue));

    // ----- プロジェクト管理行を作成 -----
    const projectControlRows = [];
    data.projects.forEach(project => {
      const row = {
        id: null,
        project_id: project.id,
        identifier: project.identifier,
        name: project.name,
        subject: project.name,
        description: 'プロジェクト管理',
        estimated_days: project.estimated_days,
        schedule_days: project.schedule_days,
        check_days: project.check_days,
        start_date: project.project_start_date,
        end_date: project.end_date,
        is_project_control_row: true,
      }
      row[project.start_date] = '1';
      row[project.end_date] = '1';
      projectControlRows.push(row);
    });

    // ----- マイルストーン行を作成 -----
    const milestoneRows = [];
    data.versions.forEach(version => {
      const row = {
        id: null,
        project_id: version.project_id,
        version_id: version.id,
        subject: version.name,
        description: 'マイルストーン',
        estimated_days: '-',
        schedule_days: '-',
        check_days: '-',
        start_date: version.version_start_date,
        end_date: version.effective_date,
        is_milestone_row: true,
      }
      row[version.start_date] = '1';
      row[version.end_date] = '1';
      milestoneRows.push(row);
    });

    const rowsData = projectControlRows.concat(milestoneRows).concat(issueRows);
    const mergeCells = this.projectControlRowsGenerator
        .getMergeCells(rowsData)
        .concat(this.milestoneRowsGenerator.getMergeCells(rowsData));

    // チケット行を更新する 
    this.hotMain.updateSettings({
      data: rowsData,
      mergeCells: mergeCells,
    })
    this.hotMain.render();

    // 1日の合計工数行を更新する 
    this.hotFooter.updateSettings({
      data: tallyRows
    })
    this.hotFooter.render();
    this.hideLoading();
  }

  // time秒おきに更新日時を確認して更新されていればスプレッドシートを更新する
  async autoReload(time) {
    let current = await this.getLatestUpdateTimeStamp(); // 最終更新日を取得する

    const checkUpdate = async () => {
      const timeStamp = await this.getLatestUpdateTimeStamp();
      if (current !== timeStamp) {
        console.log("更新を検知したので再レンダリングします")
        this.reload();
        current = timeStamp;
      }
      // 処理が終わってから次のタイマーをセット
      setTimeout(checkUpdate, time * 1000);
    };

    // 最初の呼び出し
    setTimeout(checkUpdate, time * 1000);
  }

  /**
   * @description プロジェクトの最終更新日時を取得する
   * @returns タイムスタンプ
   */
  async getLatestUpdateTimeStamp() {
    try {
      let res;
      // 全プロジェクトをチェックしたいか個別のプロジェクトをチェックしたいかで使うAPIを分岐する
      if (window.isAllProjects) {
        res = await fetch('get_latest_update');
      } else {
        res = await fetch('detailed_schedule_gantt/get_latest_update');
      }
      if (res.ok) {
        const data = await res.json();
        return data.results;
      } else {
        console.error('fetch error:', res.status);
      }
    } catch (e) {
      console.error('最後に更新した日時情報の取得中にエラーが発生しました:', e);
    }
  }
}

window.ReloadManager = ReloadManager