# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# 小日程計画ガントチャートのコントローラー
class DetailedScheduleGanttController < ApplicationController
  menu_item :detailed_schedule_gantt # 「小日程計画ガントチャート」タブを選択状態にする
  before_action :find_optional_project, :except => [:show_all_projects, :get_data_all_projects, :get_latest_update] # リクエストに project_id が含まれていれば取得して @project にセット
  before_action :authorize, :except => [:show_all_projects, :get_data_all_projects, :get_latest_update] # 権限があるかチェック

  rescue_from Query::StatementInvalid, :with => :query_statement_invalid # SQLでエラーが起きた時はログに残す

  helper :issues # チケット関連のヘルパー。数が非常に多いためここでは詳細を記載しない
  helper :projects # プロジェクト関連のヘルパー。これも数が多いため記載しない。
  helper :queries # 検索条件に関するヘルパー。これも数が多いため記載しない。
  helper :custom_fields # カスタムフィールド関連のヘルパー
  helper :watchers # ウォッチャー関連のヘルパー
  include QueriesHelper # これも検索条件に関するヘルパー。コントローラー内で使えるようにしている

  # URLに記載されたプロジェクトのガントデータを作成
  def show
    setup_gantt_common
    @gantt.project = @Project
    @is_all_projects = false
    render_show_view("show")
  end

  # 全てのプロジェクトのガントデータを作成
  def show_all_projects
    setup_gantt_common
    @gantt.instance_variable_set(:@projects, Project.active.order(:id).to_a)
    @is_all_projects = true
    render_show_view("show_all_projects")
  end
  
  # セルの変更を行単位で受け取り更新するアクション
  # 行単位にした理由は、楽観ロックを管理するバージョンをチケットごとに管理しているため
  def bulk_update_issue
    issue = Issue.find_by(id: params[:id])
    unless issue
      return render json: { ok: false, error: 'Not found', message: "チケットID#{params[:id]}が見つかりませんでした。ページを再読み込みして確認してください" }, status: 404
    end

    unless issue.editable?(User.current)
      return render json: { ok: false, error: 'Forbidden', message: '更新権限がありません' }, status: 403
    end

    unless params[:lock_version]
      return render json: { ok: false, error: 'client error', message: 'lock_versionが送られてきませんでした' }, status: 400
    end

    # palyloadの attibuites オブジェクトを ruby のハッシュに変換する
    attrs = params.require(:attributes).to_unsafe_h.stringify_keys

    # 日次工数の変更は data_attrs に入れてその他の変更は normal_attrs に入れる
    date_attrs   = {}
    normal_attrs = {}

    # 日時工数とそれ以外で保存するテーブルが違うため分ける
    attrs.each do |k, v|
      if /\A\d{4}-\d{2}-\d{2}\z/.match?(k)
        date_attrs[k] = v
      else
        normal_attrs[k] = v
      end
    end
    
    # ユーザーが更新できるフィールドかチェック
    allowed = issue.safe_attribute_names(User.current).map(&:to_s) # ユーザーが編集できるフィールドを取得
    ignored_by_permission = normal_attrs.keys - allowed # ユーザーが変更できないカラムのリストを作成
    normal_attrs.slice!(*allowed) # ユーザーが編集できるカラムだけを残す

    results = {} # 更新ログを入れる
    errors  = {} # エラーログを入れる

    begin
      Issue.transaction do
        # 楽観ロック値を代入
        lock_version = params[:lock_version].presence&.to_i
        issue.lock_version = lock_version 

        # issues テーブルの一括更新
        if normal_attrs.present?
          issue.safe_attributes = normal_attrs
          if issue.changed?
            issue.save!
            # 見積工数を変更していたらCHKもモデル内で計算されているのでresultsに含める
            if normal_attrs.key?("estimated_days")
              results["check_days"] = { ok: true, value: issue.check_days }
            end
            # フロントに渡すログを作成
            normal_attrs.each_key do |k|
              results[k] = { ok: true, value: (issue.respond_to?(k) ? issue.public_send(k) : nil) }
            end
          else
            # フロントに渡すログを作成
            normal_attrs.each do |k, v|
              results[k] = { ok: true, value: (issue.respond_to?(k) ? issue.public_send(k) : v), note: 'no change' }
            end
          end
        else
          # 更新が issue_daily_schedule テーブルのみの場合でもlock_versionをインクリメントさせるため
          issue.touch 
        end

        # issue_daily_scheduleテーブルの一括更新
        if date_attrs.present?
          date_attrs.each do |date_str, value|
            #この日付のレコードがあれば取得、なければ作成する
            daily = issue.issue_daily_schedules.find_or_initialize_by(schedule_date: date_str)
            daily.man_days = value
            daily.save!
            # フロントに渡すログを作成
            results[date_str] = { ok: true, value: daily.man_days }
            # 予定済工数とCHKを再計算してresultsに追加
            issue.update_schedule_and_check_days
            # プロジェクト管理行の予定済工数とCHKを更新
            issue.update_project_schedule_days_and_check_days
            results["check_days"] = { ok: true, value: issue.check_days }
            results["schedule_days"] = { ok: true, value: issue.schedule_days }
          end
        end
        # オート楽観ロックチェック用にプロジェクトの最終更新日時を更新する
        GanttLatestUpdate.touch_for(@project.id) 
        GanttLatestUpdate.touch_for(nil)
      end

      # 権限で無視されたキーは errors に載せる
      ignored_by_permission.each { |k| errors[k] = ['assignment ignored by permissions'] } if ignored_by_permission.any?

      if errors.present?
        render json: { ok: false, id: issue.id, results: results, errors: errors, ignored_by_permission: ignored_by_permission },
              status: :unprocessable_entity
      else
        render json: { ok: true, id: issue.id, results: results, ignored_by_permission: ignored_by_permission }
      end

    rescue ActiveRecord::StaleObjectError
      render json: {
        ok: false,
        id: issue.id,
        error: 'stale_object',
        message: 'ただいま編集したデータについて他のユーザーが先に更新していたため、あなたの変更を保存できませんでした。ページを再読み込みして、再度編集してください。',
        ignored_by_permission: ignored_by_permission
      }, status: :conflict

    rescue ActiveRecord::RecordInvalid
      # issue / daily どちらの validation でもここに来る
      render json: { ok: false, id: issue.id, errors: (issue.errors.to_hash(true)), results: results }, status: :unprocessable_entity
    end
  end

  # プロジェクト管理行の変更を行単位で受け取り更新するアクション
  def bulk_update_project
    project = Project.find_by(id: params[:id])
    unless project
      return render json: { ok: false, error: 'Not found', message: "プロジェクト ID#{params[:id]}が見つかりませんでした。ページを再読み込みして確認してください" }, status: 404
    end

    unless User.current.allowed_to?(:edit_project, project)
      return render json: { ok: false, error: 'Forbidden', message: '更新権限がありません' }, status: 403
    end

    results = {} # 更新ログを入れる
    
    begin
      project.estimated_days = params[:estimated_days]
      # project.check_days = project.schedule_days - project.estimated_days

      if project.changed?
        project.save!
        results["estimated_days"] = project.estimated_days
        results["check_days"] = project.check_days
      end
      
      Rails.logger.info "ログ出力#{results}"
      
      render json: { ok: true, id: project.id, results: results }
    rescue ActiveRecord::RecordInvalid
      render json: { ok: false, id: project.id, errors: (project.errors.to_hash(true)), results: results }, status: :unprocessable_entity
    end
  end
  
  # 選択した行を削除するアクション
  def delete_selected_issues
    issues = params[:issues]
    results =[]

    Issue.transaction do
      # issue IDが見つかった場合は削除
      issues.each do |i|
        issue = Issue.find_by(id: i[:id])
        unless issue
          return render json: { ok: false, error: 'Not found', message: "チケットID#{i[:id]}が見つかりませんでした。ページを再読み込みして確認してください" }, status: 404
        end

        unless issue.deletable?(User.current)
          return render json: { ok: false, error: 'Forbidden', message: '削除権限がありません' }, status: 403
        end
        results.push(issue.id)
        issue.destroy!
      end
    end

    render json: { ok: true, results: results }, status: :ok
  end
  
  # 必須項目のみを埋めた空のissueを作成する
  def create_empty_issues
    count = params[:count].to_i
    if count < 0
      return render json: { ok: false, error: 'BadRequest', message: '選択した行数がマイナスになっています'}, status: 422
    end

    unless User.current.allowed_to?(:add_issues, @project)
      return render json: { ok: false, error: 'Forbidden', message: 'チケットの作成権限がありません'}, status: 403
    end

    # プロジェクト内で作成可能な最初のトラッカーを選ぶ
    tracker = @project.trackers.first
    unless tracker
      return render json: { ok: false, error: 'BadRequest', message: '使用可能なトラッカーがありません' }, status: 422
    end

    results = []
    errors = []

    Issue.transaction do
      count.times do
        issue = Issue.new(
          project: @project,
          tracker: tracker,
          author: User.current,
          subject: '無題',
          status: tracker.default_status,
          priority: IssuePriority.find_by(is_default: true),    
        )
        if issue.save
          results << issue.id
        else
          errors.concat(issue.errors.full_messages)
          raise ActiveRecord::Rollback
        end
      end
    end  
    if errors.empty?
      render json: { ok: true, results: results }, status: :created
    else
      render json: { ok: false , errors: errors.uniq }, status: 422
    end
  end

  def copy_issues
    ids = params[:issue_ids]

    if ids.empty?
      return render json: { ok: false, error: 'BadRequest', message: 'チケットIDが送られてきませんでした' }, status: :bad_request 
    end

    issue_ids = []
    errors = []
    
    Issue.transaction do
      ids.each do |id|
        src = Issue.find_by(id: id)
        unless src
          errors << { id: id, messages: ['コピー元のチケットが見つかりませんでした'] }
          next
        end

        unless User.current.allowed_to?(:add_issues, src.project)
          errors << { id: id, messages: ['チケットを追加する権限がありませんでした'] }
          next
        end

        issue = Issue.new
        # チケットに添付されたファイルまではコピーしない。子チケットまではコピーしない 
        issue.copy_from(src, attachments: false, subtasks: false)

        # 予定済工数の値はコピーしないので0にする、CHKの値は見積工数 - 予定済工数の値なのでそのまま見積工数の値を使う
        issue.schedule_days = 0
        issue.check_days = issue.estimated_days || 0

        issue.author = User.current

        if issue.save
        issue_ids << issue.id
        else
          errors << { id: id, messages: issue.errors.full_messages }
        end
      end
    # 1件でも失敗があればまとめてロールバック
    raise ActiveRecord::Rollback if errors.any?
    end
    if errors.any?
      render json: { ok: false, errors: errors }, status: :unprocessable_entity
    else
      render json: { ok: true, results: issue_ids }, status: :created
    end
  end

  # issueの一覧と1日の合計工数を取得するAPI
  def get_data
    result = fetch_gantt_data(@project)

    if result[:ok]
      render json: result
    else
      render json: result, status: 422
    end
  end

  # issueの一覧と1日の合計工数を取得するAPI。全プロジェクト対応
  def get_data_all_projects
    result = fetch_gantt_data(nil) # プロジェクト指定せず全て取得する

    if result[:ok]
      render json: result
    else
      render json: result, status: 422
    end
  end

  # プロジェクトの開始日と期日を更新する
  def update_project_date
    project = Project.find_by_id(params[:id]) # ペイロードから変更対象のプロジェクトを取得

    unless project
      return render json: { ok: false, error: '変更対象のプロジェクトが見つかりません' }, status: :not_found
    end

    # @projectを使ってURLに入っているプロジェクト識別子を使って更新権限があるかチェック。projectだと子プロジェクトを操作した際にエラーになる可能性があるため
    unless User.current.allowed_to?(:edit_project, @project)
      return render json: { ok: false, error: '権限がありません' }, status: :forbidden
    end

    project.assign_attributes(project_start_date: params[:start_date], end_date: params[:end_date])

    if project.save
      render json: { ok: true }
    else
      render json: { ok: false, error: "更新時にエラーが発生しました"  }, status: :unprocessable_entity
    end
  end

  # マイルストーンの開始日と期日を更新する
  def update_version_date
    version = Version.find_by_id(params[:id]) # ペイロードから変更対象のバージョンを取得

    unless version
      return render json: { ok: false, error: '変更対象のバージョンが見つかりません' }, status: :not_found
    end

    unless User.current.allowed_to?(:manage_versions, @project)
      return render json: { ok: false, error: 'マイルストーンの変更権限がありません' }, status: :forbidden
    end

    version.assign_attributes(version_start_date: params[:start_date], effective_date: params[:end_date])

    if version.save
      render json: { ok: true }
    else
      render json: { ok: false, error: "更新時にエラーが発生しました"  }, status: :unprocessable_entity
    end
  end

  # プロジェクトの最終更新日時を取得する
  def get_latest_update
    project_identifier = params[:project_id].presence

    project_id =
      begin
        if project_identifier.present?
          Project.find_by(identifier: project_identifier)&.id
        else
          nil
        end
      rescue ActiveRecord::RecordNotFound
        nil
      end

    time_stamp = GanttLatestUpdate.last_for(project_id)
    render json: { ok: true, results: time_stamp }
  end

  # チケットのソートナンバーを更新する
  def update_sort_number
    order_data = params[:order]
    
    if order_data.blank?
      render json: { ok: false, error: 'No data' }, status: 400 
    end

    user_id = User.current.id

    # issue_id が nil のものを除外
    valid_orders = order_data.filter { |r| r[:issue_id].present? }

    # issue が実在するものだけ残す
    valid_issue_ids = Issue.where(id: valid_orders.map { |r| r[:issue_id] }).pluck(:id)
    valid_orders.select! { |r| valid_issue_ids.include?(r[:issue_id].to_i) }

    # upsert_all 用の配列を構築
    rows = valid_orders.map do |r|
      {
        user_id: user_id,
        issue_id: r[:issue_id].to_i,
        sort_number: r[:sort_number].to_i
      }
    end

    # ActiveRecord 標準APIで一括UPSERT
    IssueSortOrder.upsert_all(rows, unique_by: [:user_id, :issue_id])

    render json: { ok: true }

  rescue => e
    Rails.logger.error "update_sort_number failed: #{e.class} #{e.message}"
    render json: { ok: false, error: e.message }, status: 500
  end

  # 行の色を変更するAPI
  def change_row_color
    issue_ids     = Array(params[:issue_ids]).map(&:to_i)
    lock_versions = Array(params[:lock_versions]).map(&:to_i)
    color_id      = params[:color_id].to_i

    if issue_ids.size != lock_versions.size
      return render json: { ok: false, error: 'bad_request',
                            message: 'issue_id と lock_version の件数が一致しません' }, status: 400
    end

    # 取得結果を id=>Issue のハッシュにして順序に依存しない参照にする
    issues_by_id = Issue.where(id: issue_ids).index_by(&:id)

    # 見つからないIDがあれば早期リターン
    missing = issue_ids - issues_by_id.keys
    if missing.any?
      return render json: { ok: false, error: 'Not found',
                            message: "存在しないチケットがあります: #{missing.join(', ')}" }, status: 404
    end

    results = []
    rollback_reason = nil

    ActiveRecord::Base.transaction do
      issue_ids.each_with_index do |iid, idx|
        issue = issues_by_id[iid]

        unless issue.editable?(User.current)
          rollback_reason = { error: 'Forbidden', message: '更新権限がありません', status: 403 }
          raise ActiveRecord::Rollback
        end

        # 変更しない行はスキップ
        next if issue.color_id.to_i == color_id

        issue.lock_version = lock_versions[idx]
        issue.safe_attributes = { color_id: color_id }

        if issue.save
          results << { id: issue.id, color_id: issue.color_id, lock_version: issue.lock_version }
        else
          rollback_reason = { error: 'ValidationFailed',
                              message: issue.errors.full_messages.join(', '), status: 422 }
          raise ActiveRecord::Rollback
        end
      end
    rescue ActiveRecord::StaleObjectError
      rollback_reason = { error: 'stale_object',
                          message: 'ただいま編集したデータについて他のユーザーが先に更新していたため、あなたの変更を保存できませんでした。ページを再読み込みして、再度編集してください。', status: 409 }
      raise ActiveRecord::Rollback
    rescue => e
      rollback_reason = { error: 'transaction_failed', message: e.message, status: 500 }
      raise ActiveRecord::Rollback
    end

    if rollback_reason
      render json: rollback_reason.merge(ok: false), status: rollback_reason[:status]
      return
    end

    GanttLatestUpdate.touch_for(@project.id)
    GanttLatestUpdate.touch_for(nil)
    render json: { ok: true, results: results }
  end

  private

  # 初期表示するためのガントを作成する共通処理
  def setup_gantt_common
    @initial_rows = Setting.plugin_redmine_detailed_schedule_gantt["initial_rows"].to_i # プラグインの設定から初期表示する行数を取得
    @max_rows = Setting.plugin_redmine_detailed_schedule_gantt["max_rows"].to_i # プラグインの設定から最大表示行数を取得
    @gantt = Redmine::Helpers::Gantt.new(params.merge(max_rows: @initial_rows)) # ガントチャートの初期化処理

    retrieve_query # 保存済みまたは、URLパラメータの検索条件を @queryにセット
    @query.group_by = nil # 検索条件のグループ化は不要なので無効化
    # ガントに検索条件をセット
    if @query.valid? 
      @gantt.query = @query 
    end

    # 全ユーザーの一覧を取得
    users_scope = User.active
    @all_users = users_scope
                      .select(:id, :firstname, :lastname)
                      .order(:lastname, :firstname)
                      .map { |u| { id: u.id, firstname: u.firstname, lastname: u.lastname } }

    @user_daily_schedules = UserDailySchedule.all

    user_id = User.current.id
    # Ganttが生成したissue配列を取得
    issue_ids = @gantt.issues.map(&:id)

    # DBからJOINしてsort_number順で再取得
    @issues = Issue
      .joins("LEFT JOIN issue_sort_orders ON issue_sort_orders.issue_id = issues.id AND issue_sort_orders.user_id = #{user_id}")
      .where(id: issue_ids)
      .select('issues.*, issue_sort_orders.sort_number AS user_sort_number')
      .order(Arel.sql('COALESCE(issue_sort_orders.sort_number, issues.id) ASC'))

    if @project
      @versions = Version.where(project_id: @project.id)
    else
      @versions = Version.all
    end
  end

  # 共通のレンダリング処理
  def render_show_view(template_name)
    respond_to do |format|
      format.html { render action: template_name, layout: !request.xhr? }
    end
  end

  # 初期表示以外でガントデータを取得するための共通処理
  def fetch_gantt_data(project)
    user_daily_schedules = UserDailySchedule.all # すべてのユーザーの1日の合計工数を取得

    # Gantt オブジェクトを構築
    max_rows = Setting.plugin_redmine_detailed_schedule_gantt["max_rows"].to_i
    gantt = Redmine::Helpers::Gantt.new(params.merge(max_rows: max_rows))

    retrieve_query
    @query.group_by = nil

    # ガントに検索条件をセット
    if @query.valid? 
      gantt.query = @query 
    end

    # プロジェクトが指定してあればセットして、なければ全てのプロジェクトをセットする
    if project.present?
      gantt.project = project
      projects = gantt.projects # ガント内で取得した issues に紐づくサブプロジェクトも入っている
    else 
      projects = Project.active.order(:id).to_a
      gantt.instance_variable_set(:@projects, projects)
    end

    user_id = User.current.id
    # Ganttが生成したissue配列を取得
    issue_ids = gantt.issues.map(&:id)

    # DBからJOINしてsort_number順で再取得
    issues = Issue
      .joins("LEFT JOIN issue_sort_orders ON issue_sort_orders.issue_id = issues.id AND issue_sort_orders.user_id = #{user_id}")
      .where(id: issue_ids)
      .select('issues.*, issue_sort_orders.sort_number AS user_sort_number')
      .order(Arel.sql('COALESCE(issue_sort_orders.sort_number, issues.id) ASC'))

    # issue_id に紐づく daily_schedules をまとめて取得
    daily_by_issue = IssueDailySchedule
                      .where(issue_id: issues.map(&:id))
                      .group_by(&:issue_id)

    # 各 Issue に daily_schedules / categories / users / versions を追加
    issues_with_extra = issues.map do |issue|
      daily_records = daily_by_issue[issue.id] || []
      daily_hash = daily_records.each_with_object({}) do |rec, h|
        h[rec.schedule_date.to_s] = rec.man_days.to_s
      end

      available_categories =
        if issue.project
          issue.project.issue_categories.map { |c| { id: c.id, name: c.name } }
        else
          []
        end

      assignable_users = issue.assignable_users

      shared_version = 
        if issue.project
          issue.project.shared_versions.map { |v| { id: v.id, name: v.name }}
        else
          []
        end

      version_id = issue.fixed_version_id

      issue.as_json.merge(
        daily_schedules: daily_hash,
        available_categories: available_categories,
        assignable_users: assignable_users,
        shared_version: shared_version,
        version_id: version_id
      )
    end
    
    if project
      # このプロジェクトに紐づく全てのバージョンを取得
      versions = Version.where(project_id: project.id)
    else
      # プロジェクトの指定が無ければ全てのバージョンを取得
      versions = Version.all
    end

    if issues_with_extra.present?
      { ok: true, issues: issues_with_extra, user_daily_schedules: user_daily_schedules, projects: projects, versions: versions }
    else
      { ok: false, error: "データの取得に失敗しました" }
    end
  end
end