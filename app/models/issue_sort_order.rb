# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

# app/models/issue_sort_order.rb
class IssueSortOrder < ApplicationRecord
  belongs_to :user
  belongs_to :issue

  validates :user_id, :issue_id, :sort_number, presence: true
end
