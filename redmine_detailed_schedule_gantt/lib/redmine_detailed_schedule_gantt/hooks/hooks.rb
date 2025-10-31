# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

module RedmineDetailedScheduleGantt
  module Hooks
    class Hooks < Redmine::Hook::ViewListener
      # 全ページの <head> に JS を読み込ませる
      def view_layouts_base_html_head(_context = {})
        javascript_include_tag 'redirect/insert_back_url', plugin: 'redmine_detailed_schedule_gantt'
      end

      # チケット詳細に追加カラムの表示フィールド
      def view_issues_show_details_bottom(context = {})
        render_partial!(
          context:  context,
          partial:  'detailed_schedule_gantt/issue_extra_details',
          locals:   { issue: context[:issue] }
        )
      end

      # チケット編集に追加カラムの編集フォーム
      def view_issues_form_details_bottom(context = {})
        render_partial!(
          context:  context,
          partial:  'detailed_schedule_gantt/issue_extra_fields',
          locals:   { f: context[:form], issue: context[:issue] }
        )
      end

      # プロジェクト編集に追加カラムの編集フォーム
      def view_projects_form(context = {})
        render_partial!(
          context:  context,
          partial:  'detailed_schedule_gantt/project_extra_fields',
          locals:   { f: context[:form], project: context[:project] }
        )
      end

      private

      # 共通レンダリング処理
      def render_partial!(context:, partial:, locals:)
        controller = context[:controller]
        unless controller
          return warn_and_notice!("controller is nil for #{partial}")
        end

        begin
          html = controller.render_to_string(partial: partial, locals: locals)
          html.respond_to?(:html_safe) ? html.html_safe : html # 基本はそのままSafeBufferを返すが、もしStringだった場合はhtml_safeを返す
        rescue StandardError => e
          error_handling(e, where: partial, locals: locals)
        end
      end

      # エラーハンドリング
      def error_handling(e, where: nil, locals: nil)
        Rails.logger.error(
          +"[DSG] hook error: #{e.class}: #{e.message}\n" \
          "[where] #{where}\n" \
          "[locals] #{safe_locals_for_log(locals)}\n" \
          "#{Array(e.backtrace).first(10).join("\n")}"
        )
        failure_notice
      end

      # コントローラ未取得などのエラー処理
      def warn_and_notice!(message)
        Rails.logger.warn("[DSG] hook warn: #{message}")
        failure_notice
      end

      # ログ用に locals を短縮表示
      def safe_locals_for_log(locals)
        return '{}' if locals.nil?
        begin
          locals.transform_values { |v| v.inspect.to_s[0, 200] }.to_s
        rescue
          '<uninspectable locals>'
        end
      end

      # 失敗時に HTML メッセージを表示する
      def failure_notice
        %(<div id="dsg-extra-attributes" style="color:#f40;">
            パーシャルレンダリングエラー development.logを確認してください
          </div>).html_safe
      end
    end
  end
end
