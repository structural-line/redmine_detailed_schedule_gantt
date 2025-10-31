# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# ソートナンバーをユーザー毎に管理するテーブル
class CreateIssueSortOrders < ActiveRecord::Migration[7.2]
  def change
    create_table :issue_sort_orders, id: :bigint, primary_key: :id do |t|
      t.references :user, null: false, foreign_key: { to_table: :users, on_delete: :cascade}, type: :integer
      t.references :issue, null: false, foreign_key: { to_table: :issues, on_delete: :cascade}, type: :integer
      t.integer :sort_number, default: 0, null: false
    end

    add_index :issue_sort_orders, [:user_id, :issue_id], unique: true
    add_index :issue_sort_orders, :sort_number
  end
end