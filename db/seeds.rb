# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

PROJECT_COUNT = 20
ISSUE_COUNT   = 1500

# 設定を復元するために一時退避
orig_events = Setting.notified_events
orig_perform = ActionMailer::Base.perform_deliveries

begin
  # 1) 通知イベント自体を無効化
  Setting.notified_events = []

  # 2) メール配送も二重で無効化
  ActionMailer::Base.perform_deliveries = false

  # 3) モデル側の通知スキップフラグもあればOFFにする
  Issue.skip_notification = true  if Issue.respond_to?(:skip_notification=)
  Journal.skip_notification = true if defined?(Journal) && Journal.respond_to?(:skip_notification=)

  # 4) 大量I/O抑制のためログ間引き
  log_each = 200

  # === 共通: ユーザー/ロール/ステータス/優先度/トラッカーを用意 ===
  user = User.active.first or raise 'Activeなユーザーが存在しません'
  role = Role.find_by(name: '管理者') || Role.givable.first || Role.first or raise '付与できるRoleがありません'
  status   = IssueStatus.order(:position).first || IssueStatus.first or raise 'IssueStatusがありません'
  priority = IssuePriority.order(:position).first || IssuePriority.first or raise 'IssuePriorityがありません'
  tracker = Tracker.first || Tracker.create!(name: 'テストトラッカー1')

  # === プロジェクトを作成 ===
  PROJECT_COUNT.times do |pi|
    ActiveRecord::Base.transaction do
      idx = format('%02d', pi + 1)
      project_identifier = "sample_project_#{idx}"
      project_name       = "Seedサンプルプロジェクト #{idx}"

      project = Project.find_or_initialize_by(identifier: project_identifier)
      project.name        = project_name
      project.description = 'seedファイルで作成'
      project.is_public   = false
      project.save!

      member = Member.find_or_initialize_by(project: project, user: user)
      if member.new_record?
        member.role_ids = [role.id]
        member.save!
      elsif (member.roles & [role]).empty?
        member.roles << role
        member.save!
      end

      unless project.trackers.include?(tracker)
        project.trackers << tracker
        project.save!
      end
      puts "✅ 完了: #{project_name}"

      # チケット作成
      ISSUE_COUNT.times do |i|
        subject = "Seedチケット No.#{i + 1}"
        issue = Issue.find_or_initialize_by(project: project, subject: subject)
        issue.tracker   = tracker
        issue.author    = user
        issue.status    = status
        issue.priority  = priority
        issue.description = "seedで作成 #{i + 1} 件目（#{project.name}）"
        issue.start_date  = Date.today
        issue.due_date    = Date.today + (i + 1)

        # （あれば）インスタンス単位の通知フラグも切る
        issue.notify = false if issue.respond_to?(:notify=)

        issue.save!

        puts "  📝 #{project.identifier}: ##{issue.id} #{issue.subject}" if (i + 1) % log_each == 0 || i.zero?
      end
    end
  end

ensure
  # 設定を元に戻す
  Setting.notified_events = orig_events
  ActionMailer::Base.perform_deliveries = orig_perform
  Issue.skip_notification = false  if Issue.respond_to?(:skip_notification=)
  Journal.skip_notification = false if defined?(Journal) && Journal.respond_to?(:skip_notification=)
end

puts '🎉 Seed 完了'
