# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

module RedmineDetailedScheduleGantt
  module IssueExtraHelper
    # "1.5 日" のように表示（空は "-"）
    # ただし 0 のときは "0 日"
    def gantt_format_days(value)
      return '-' if value.blank?

      v = begin
        Float(value)
      rescue
        nil
      end
      return '-' if v.nil?

      if v.zero?
        "0 #{l(:label_day)}"
      else
        "#{format('%.2f', v)} #{l(:label_day)}"
      end
    end
  end
end

