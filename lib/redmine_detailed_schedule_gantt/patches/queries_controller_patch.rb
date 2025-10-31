# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp


# queries_controllerのパッチファイル
# クエリの保存、削除、更新時に小日程計画ガントチャートへリダイレクトする処理を追加している
module RedmineDetailedScheduleGantt
  module Patches
    module QueriesControllerPatch
      def create
        @query = query_class.new
        @query.user    = User.current
        @query.project = @project
        update_query_from_params

        if @query.save
          flash[:notice] = l(:notice_successful_create)

          # 追加：小日程計画ガントチャートににリダイレクト
          back = params[:back_url].presence || params.dig(:query, :back_url).presence
          if back && safe_relative_url?(back)
            return redirect_to(back)
          end

          redirect_to_items(query_id: @query)
        else
          render action: 'new', layout: !request.xhr?
        end
      end

      def destroy
        @query.destroy

        # 追加：小日程計画ガントチャートににリダイレクト
        if params[:back_url].present? && safe_relative_url?(params[:back_url])
          return redirect_to params[:back_url]
        end

        redirect_to_items(set_filter: 1)
      end

      def update
        update_query_from_params

        if @query.save
          flash[:notice] = l(:notice_successful_update)

          # 追加：小日程計画ガントチャートににリダイレクト
          if params[:back_url].present? && safe_relative_url?(params[:back_url])
            redirect_to params[:back_url]
          else
            redirect_to_items(query_id: @query)
          end
        else
          render action: 'edit'
        end
      end

      private
      def safe_relative_url?(url)
        uri = URI.parse(url) rescue nil
        uri && uri.scheme.nil? && uri.host.nil?
      end
      
    end
  end
end
