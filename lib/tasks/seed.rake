# Copyright (c) 2025 Structural Line Incorporated
# SPDX-License-Identifier: GPL-2.0-or-later
# https://sl-inc.co.jp

namespace :redmine do
  namespace :plugins do
    namespace :redmine_detailed_schedule_gantt do
      desc 'Load seed data for redmine_detailed_schedule_gantt'
      task seed: :environment do
        path = File.expand_path('../../../db/seeds.rb', __FILE__)
        unless File.exist?(path)
          abort "Seed file not found: #{path}"
        end
        puts "Loading: #{path}"
        load path
      end
    end
  end
end
