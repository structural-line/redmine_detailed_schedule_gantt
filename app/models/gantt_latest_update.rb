# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# スプレッドシートの最終更新日時を管理するテーブル
class GanttLatestUpdate < ApplicationRecord
  self.table_name = 'gantt_latest_updates'

  # ---- Associations ----
  belongs_to :project, optional: true, inverse_of: nil

  # ---- Validations ----
  validates :project_id, uniqueness: true, allow_nil: true
  validates :last_update_date, presence: true
  validates :last_update_user_id, presence: true

  # ---- Scopes ----
  scope :for_project, ->(project_id) {
    if project_id.nil?
      where(project_id: nil)
    else
      where(project_id: project_id)
    end
  }

  # ---- API（軽量ユーティリティ）----
  # プロジェクトの最終更新時刻を現在時刻で更新（レコードがなければ作成）
  def self.touch_for(project_id, user_id:, at: Time.current)
    record = find_or_initialize_by(project_id: project_id)
    record.last_update_date = at
    record.last_update_user_id = user_id
    record.save!
  end

  # 取得ヘルパ : 最終更新日時とそのユーザーIDを返す
  def self.last_for(project_id)
    last_update_date, last_update_user_id = for_project(project_id).pick(:last_update_date, :last_update_user_id)
  { last_update_date: last_update_date, last_update_user_id: last_update_user_id }
  end
end