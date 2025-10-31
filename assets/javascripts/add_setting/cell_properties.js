/**
 * Copyright (c) 2025 Structural Line Incorporated
 * SPDX-License-Identifier: GPL-2.0-or-later 
 * https://sl-inc.co.jp
 */ 

/**
 * @description セルごとにrenderを設定するクラス
 * @TODO 重複箇所が多いのでリファクタリングする
 * @param {Handsontable} hotMain Handsontableのチケット行部分
 * @param {Handsontable} hotFooter Handsontableの1日の合計工数部分
 * @param {EditorModeManager} editorModeManager
 */
class CellProperties {
  constructor(hotMain, hotFooter, editorModeManager) {
    this.hotMain = hotMain;
    this.hotFooter = hotFooter;
    this.editorModeManager = editorModeManager;
    this.todayChecker = new window.TodayChecker();
    this.holidayChecker = new window.HolidayChecker();
  }

  // 初期化処理
  initialize() {
    this.hotMain.updateSettings({
      cells: (row, col) => this.createMainCellProperties(row, col),
    });
    this.hotFooter.updateSettings({
      cells: (row, col) => this.createFooterCellProperties(row, col),
    });
  }

  /**
   * チケット行のプロパティを作成
   * @param {number} row 
   * @param {number} col 
   * @returns {object} cellProperties rendererやselectOptionsが入っている
   */
  createMainCellProperties(row, col) {
    const cellProperties ={};
    // 1行分のデータ
    // 例）{ id: 123, subject: "機能A", done_ratio: 20, "2025-10-01": 1.0, ... }
    const rowData = this.hotMain.getSourceDataAtRow(row);
    // カラム名
    // 例）'subject' / 'done_ratio' / 'version_id' / '2025-10-01'（日付カラムなど）
    const prop = this.hotMain.colToProp(col);

    // --- 行のタイプを取得---
    const isProjectRow = rowData?.is_project_control_row;
    const isMilestoneRow = rowData?.is_milestone_row;

    // ==============================
    // マイルストーンカラム
    // ==============================
    const milestoneCol = this.hotMain.propToCol('version_id');
    if (col == milestoneCol) {
      // プロジェクト管理行またはマイルストーン行なら読み取り専用
      if (rowData?.is_project_control_row || rowData?.is_milestone_row) cellProperties.readOnly = true;

      const opts = { '' : '-' };
      cellProperties.selectOptions = opts;
      const issue = window.issueArray?.find(i => i.id === rowData?.id);
      const project = window.projects?.find(i => i.id === rowData?.project_id);
      const projectId = project?.id;
      const versions = window.versions;
      
      // プロジェクトIDが一致するマイルストーンが見つかった場合はそのマイルストーンを選択しに追加する
      versions.forEach(v => {
        if ((v.project_id === projectId || v.sharing !== 'none') && v.status === 'open') {
          opts[v.id] = v.name;
        }
      });

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties) => {
        td = this.setOmission(td); // 文字が行からはみ出す場合は省略表示する
        td = this.setBackGoundColor(td, rowData);
        if (isProjectRow || isMilestoneRow) {
          this.setNonDisplay(td, rowData);
        } else {
          // マイルストーンがチケットに紐づいていた場合は表示する
          const version = issue?.shared_version?.find(v => v.id === parseInt(value, 10));
          td.innerText = version ? version.name : '-';
          td.style.textAlign = version ? '' : 'center';
        }
      };
    }

    // ==============================
    // カテゴリーカラム
    // ==============================
    const categoryCol = this.hotMain.propToCol('category_id');
    if (col === categoryCol) {
      // プロジェクト管理行またはマイルストーン行なら読み取り専用
      if (rowData?.is_project_control_row || rowData?.is_milestone_row) cellProperties.readOnly = true;

      const opts = { '' : '-' };
      const issue = window.issueArray?.find(i => i.id === rowData?.id);
      cellProperties.selectOptions = opts;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td = this.setOmission(td); // 文字が行からはみ出す場合は省略表示する
        td = this.setBackGoundColor(td, rowData);
        if (isProjectRow || isMilestoneRow) {
          this.setNonDisplay(td, rowData);
        } else {
          const category = issue?.available_categories?.find(c => c.id === parseInt(value, 10));
          td.innerText = category ? category.name : '-';
          td.style.textAlign = category ? '' : 'center';
          // 該当issueの available_categories から選択肢を作成
          issue?.available_categories?.forEach(c => {
            opts[c.id] = `${c.name}`;
          });
        }
      };
    }

    // ==============================
    // 担当者カラム
    // ==============================
    const assignCol = this.hotMain.propToCol('assigned_to_id');
    if (col === assignCol) {
      // プロジェクト管理行またはマイルストーン行なら読み取り専用
      if (rowData?.is_project_control_row || rowData?.is_milestone_row) cellProperties.readOnly = true; 

      const opts = { '' : '-' };
      const issue = window.issueArray?.find(i => i.id === rowData?.id);
      cellProperties.selectOptions = opts;

      // 全ての担当者を取得
      const assignableUsers = window.allUsers;
      
      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        // セルの現在値(value)に一致する担当者を検索して取得
        const matchedUser = assignableUsers.find(user => String(user.id) === String(value));
        td = this.setOmission(td); // 文字が行からはみ出す場合は省略表示する
        td = this.setBackGoundColor(td, rowData);
        if (isProjectRow || isMilestoneRow) {
          this.setNonDisplay(td, rowData);
        } else {
          // 担当者が見つかっていれば「苗字 + 名前」を表示
          td.innerText = matchedUser ? `${matchedUser.lastname} ${matchedUser.firstname}` : '-';
          td.style.textAlign = matchedUser ? '' : 'center';
          // 該当issueのassignable_usersから選択肢を作成
          issue?.assignable_users?.forEach(u => {
            opts[u.id] = `${u.firstname} ${u.lastname}`;
          });
        }
      }

    }

    // ==============================
    // 機能名カラム
    // ==============================
    const subjectCol = this.hotMain.propToCol('subject');
    if (col === subjectCol) {
      // プロジェクト管理行またはマイルストーン行なら読み取り専用
      if (rowData?.is_project_control_row || rowData?.is_milestone_row) cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td.innerText = value;
        td = this.setOmission(td); // 文字が行からはみ出す場合は省略表示する
        td = this.setBackGoundColor(td, rowData);
        if (isProjectRow) {
          td.innerHTML = `<a href="/projects/${rowData.identifier}/settings" target="_blank">${value}</a>`;
          td.style.backgroundColor = '#e6f3ff';
          td.style.fontWeight = 'bold';
        } else if (isMilestoneRow) {
          td.innerHTML = `<a href="/versions/${rowData.version_id}" target="_blank">${value}</a>`;
          td.style.backgroundColor = '#fff6e6';
          td.style.fontWeight = 'bold';
        } else if (rowData?.id) {
          td.innerHTML = `<a href="/issues/${rowData.id}" target="_blank">${value}</a>`;
        }
      };
    }

    // ==============================
    // 作業内容カラム
    // ==============================
    const descriptionCol = this.hotMain.propToCol('description');
    if (col === descriptionCol) {
      // プロジェクト管理行またはマイルストーン行なら読み取り専用
      if (rowData?.is_project_control_row || rowData?.is_milestone_row) cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td.innerText = value;
        td = this.setOmission(td); // 文字が行からはみ出す場合は省略表示する
        td = this.setBackGoundColor(td, rowData);
        if (isProjectRow) {
          td.style.backgroundColor = '#e6f3ff';
          td.style.fontWeight = 'bold';
        } else if (isMilestoneRow) {
          td.style.backgroundColor = '#fff6e6';
          td.style.fontWeight = 'bold';
        }
      }
    }

    // ==============================
    // 進捗率カラム
    // ==============================
    const doneRatioCol = this.hotMain.propToCol('done_ratio');
    if (col === doneRatioCol) {
      // プロジェクト管理行またはマイルストーン行なら読み取り専用
      if (rowData?.is_project_control_row || rowData?.is_milestone_row) cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td.innerText = value || '-';
        td = this.setBackGoundColor(td, rowData);
        td.style.textAlign = 'center';
        if (isProjectRow || isMilestoneRow) {
          this.setNonDisplay(td, rowData);
        }
      }
    }

    // ==============================
    // 見積工数カラム
    // ==============================
    const estimatedDaysCol = this.hotMain.propToCol('estimated_days');
    if (col === estimatedDaysCol) {
      // マイルストーン行なら読み取り専用
      if (rowData?.is_milestone_row) cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td = this.setBackGoundColor(td, rowData);
        td.style.textAlign = 'center';
        if (isProjectRow || isMilestoneRow) {
          this.setNonDisplay(td, rowData);
        }
        td.innerText = value;
      }
    }

    // ==============================
    // 予定済工数カラム
    // ==============================
    const scheduleDays = this.hotMain.propToCol('schedule_days');
    if (col == scheduleDays) {
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td = this.setBackGoundColor(td, rowData);
        td.style.textAlign = 'center';
        if (isProjectRow || isMilestoneRow) {
          this.setNonDisplay(td, rowData);
        }
        td.innerText = value;
      }
    }

    // ==============================
    // CHKカラム
    // ==============================
    const checkDaysCol = this.hotMain.propToCol('check_days');
    if (col === checkDaysCol) {
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td.innerText = value;
        td.style.textAlign = 'center';
        if (value > 0) {
          td.style.backgroundColor = '#ffea08';
        } else if (value < 0) {
          td.style.backgroundColor = '#fcf180';
        } else if (value == 0) {
          td.style.backgroundColor = '#3bff7c';
        } else {
          td.style.backgroundColor = ''; 
        }
        // マイルストーン行の場合
        if (rowData?.is_milestone_row) {
          td.style.backgroundColor = '#fff6e6';  // 薄い黄色
        }
      }
    } 
    
    // ==============================
    // 日付カラム
    // ==============================
    const dayKeyPattern = /^\d{4}-\d{2}-\d{2}$/; //YYYY-MM-DDの日付形式
    const isToday = this.todayChecker.isToday(prop);
    const isHoliday = this.holidayChecker.isNonWorkingDay(prop);
    if (dayKeyPattern.test(prop)) {
      // プロジェクト管理行またはマイルストーン行なら読み取り専用
      if (rowData?.is_project_control_row || rowData?.is_milestone_row) {
        cellProperties.readOnly = true;
      }
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        // 値が1以上なら赤
        if (value >= 1.0) {
          td.style.backgroundColor = '#ff9a9aff';
          // 本日列は水色
        } else if (isToday) {
          td.style.backgroundColor = '#d4f2ffff'; 
          // 日付が入力してある列は青色  
        } else if (value > 0) {
          td.style.backgroundColor = '#04fdff';
          // 休日セルの場合はグレー背景
        } else if (isHoliday) {
          td.style.backgroundColor = '#f0f0f0';
        }

        td = this.setBackGoundColor(td, rowData); //最後に背景色を上書きしている

        if (value == undefined) {
          td.innerText = '';
        }else {
          td.innerText = value;
        }
      }
    }
    return cellProperties;
  }

  /**
   * @description フッター行のプロパティを作成
   * @param {number} row 
   * @param {number} col 
   * @returns {object} cellProperties rendererやselectOptionsが入っている
   */
  createFooterCellProperties (row, col) {
    const cellProperties ={};
    // 1行分のデータ
    // 例）{ id: 123, subject: "機能A", done_ratio: 20, "2025-10-01": 1.0, ... }
    const rowData = this.hotFooter.getSourceDataAtRow(row);
    // カラム名
    // 例）'subject' / 'done_ratio' / 'version_id' / '2025-10-01'（日付カラムなど）
    const prop = this.hotFooter.colToProp(col);
 

    // ==============================
    // マイルストーンカラム
    // ==============================
    const milestoneCol = this.hotFooter.propToCol('version_id');
    if (col == milestoneCol) {
      cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        this.setNonDisplay(td, rowData);
      }
    }

    // ==============================
    // カテゴリーカラム
    // ==============================
    const categoryCol = this.hotFooter.propToCol('category_id');
    if (col === categoryCol) {
      cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        this.setNonDisplay(td, rowData);
      };
    }

    // ==============================
    // 担当者カラム
    // ==============================
    const assignCol = this.hotFooter.propToCol('assigned_to_id');
    if (col === assignCol) {
      cellProperties.readOnly = true;
      const issue = window.issueArray?.find(i => i.id === rowData?.id);
      // 全ての担当者を取得
      const assignableUsers = window.allUsers;
      
      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        // セルの現在値(value)に一致する担当者を検索して取得
        const matchedUser = assignableUsers.find(user => String(user.id) === String(value));
        // 担当者が見つかっていれば「苗字 + 名前」を表示
        td.innerText = matchedUser ? `${matchedUser.lastname} ${matchedUser.firstname}` : '-';
        td.style.textAlign = matchedUser ? '' : 'center';
        // 該当issueのassignable_usersから選択肢を作成
        issue?.assignable_users?.forEach(u => {
          opts[u.id] = `${u.firstname} ${u.lastname}`;
        });
        td = this.setOmission(td);
      };
    }

    // ==============================
    // 機能名カラム
    // ==============================
    const subjectCol = this.hotFooter.propToCol('subject');
    if (col === subjectCol) {
      cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td.innerText = '工数管理';
        this.setOmission(td);
      }
    }
      
    // ==============================
    // 作業内容カラム
    // ==============================
    const descriptionCol = this.hotFooter.propToCol('description');
    if (col === descriptionCol) {
      cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        td.innerText = '1日の合計工数';
        this.setOmission(td);
      }
    }

    // ==============================
    // 進捗率カラム
    // ==============================
    const doneRatioCol = this.hotFooter.propToCol('done_ratio');
    if (col === doneRatioCol) {
      cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        this.setNonDisplay(td, rowData);
      };
    }

    // ==============================
    // 見積工数カラム
    // ==============================
    const estimatedDaysCol = this.hotMain.propToCol('estimated_days');
    if (col === estimatedDaysCol) {
      cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        this.setNonDisplay(td, rowData);
      };
    }

    // ==============================
    // 予定済工数カラム
    // ==============================
    const scheduleDays = this.hotMain.propToCol('schedule_days');
    if (col == scheduleDays) {
      cellProperties.readOnly = true;

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        this.setNonDisplay(td, rowData);
      };
    }

    // ==============================
    // CHKカラム
    // ==============================
    const checkDaysCol = this.hotMain.propToCol('check_days');
    if (col === checkDaysCol) {
      cellProperties.readOnly = true;
      
      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        this.setNonDisplay(td, rowData);
      };
    } 

    // ==============================
    // 日付カラム
    // ==============================
    const dayKeyPattern = /^\d{4}-\d{2}-\d{2}$/; //YYYY-MM-DDの日付形式
    const isToday = this.todayChecker.isToday(prop);
    const isHoliday = this.holidayChecker.isNonWorkingDay(prop);
    if (dayKeyPattern.test(prop)) {
      // プロジェクト管理行またはマイルストーン行なら読み取り専用
      if (rowData?.is_project_control_row || rowData?.is_milestone_row) {
        cellProperties.readOnly = true;
      }

      // レンダーを設定する
      cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties)  => {
        if (value >= 1.0) {
          td.style.backgroundColor = '#ff9a9aff';
        // 本日列は水色
        } else if (isToday) {
          td.style.backgroundColor = '#d4f2ffff'; 
        // 日付が入力してある列は青色  
        } else if (value > 0) {
          td.style.backgroundColor = '#04fdff';
        // 休日セルの場合はグレー背景
        } else if (isHoliday) {
          td.style.backgroundColor = '#f0f0f0';
        // それ以外は通常背景
        } else {
          td.style.backgroundColor = '';
        }
        if (value == undefined) {
          td.innerText = '';
        }else {
          td.innerText = value;
        }
      }
    }
    return cellProperties;
  }

  // 「-」を表示するスタイルをセットする
  setNonDisplay(td, rowData) {
    // --- 行のタイプを取得---
    const isProjectRow = rowData?.is_project_control_row;
    const isMilestoneRow = rowData?.is_milestone_row;
    const isTallyRow = rowData?.is_tally_row;

    if (isProjectRow || isMilestoneRow || isTallyRow) {
      td.innerText = '-';
      td.style.textAlign = 'center';
    }

    if (isProjectRow) {
      td.style.backgroundColor = '#e6f3ff';
    } else if (isMilestoneRow) {
      td.style.backgroundColor = '#fff6e6';
    } else if (isTallyRow) {
      td.style.backgroundColor = '#f0f0f0';
    }

    return td;
  }

  // 省略表示のスタイルをセットする
  setOmission(td) {
    // ホバー時に表示する用のtitel属性を付与
    td.title = td.innerText;
    
    // 省略表示用のCSSを適用
    td.style.whiteSpace = 'nowrap';
    td.style.overflow = 'hidden';
    td.style.textOverflow = 'ellipsis';

    // 内側要素が独自に white-space/overflow を持っていると ellipsis が効かない場合があるので親(td)の指定を継承させる
    const inner = td.firstElementChild;
    if (inner) {
      inner.title = td.innerText;
      inner.style.whiteSpace = 'inherit';
      inner.style.overflow = 'inherit';
      inner.style.textOverflow = 'inherit';
    }
    return td;
  }

  // 色のスタイルをセットする
  setBackGoundColor(td, rowData) {
    // if (rowData?.color_id === window.CONSTANTS.ROW_COLOR_NORMAL || rowData?.color_id == null) {
    //   td.style.backgroundColor = '';
    if (rowData?.color_id === window.CONSTANTS.ROW_COLOR_YELLOW) {
      td.style.backgroundColor = '#fcf180';
    } else if (rowData?.color_id === window.CONSTANTS.ROW_COLOR_RED) {
      td.style.backgroundColor = '#ff9a9aff';
    } else if (rowData?.color_id === window.CONSTANTS.ROW_COLOR_GRAY) {
      td.style.backgroundColor = '#f0f0f0';
    }
    return td;
  }
}

window.CellProperties = CellProperties;