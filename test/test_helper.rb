# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

require File.expand_path('../config/routes', __dir__)

module RedmineDetailedScheduleGantt
  module TestHelper
    # Ensure plugin migrations are run for tests (only once)
    unless defined?(@plugin_migrations_executed)
      @plugin_migrations_executed = true

      Rails.application.config.after_initialize do
        if Rails.env.test?
          begin
            # Run plugin migrations for test environment
            require 'rake'
            Rails.application.load_tasks
            Rake::Task['redmine:plugins:migrate'].invoke
            puts "Plugin migrations executed for test environment"
          rescue => e
            # Silently handle "already exists" errors as migrations may already be applied
            unless e.message.include?('already exists') || e.message.include?('duplicate')
              puts "Warning: Could not run plugin migrations: #{e.message}"
            end
          end
        end
      end
    end
  end
end

