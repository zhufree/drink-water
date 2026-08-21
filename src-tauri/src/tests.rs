#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{LocalResult, TimeZone};

    fn local_dt(year: i32, month: u32, day: u32, hour: u32, minute: u32) -> DateTime<Local> {
        match Local.with_ymd_and_hms(year, month, day, hour, minute, 0) {
            LocalResult::Single(value) => value,
            _ => panic!("invalid local datetime"),
        }
    }

    fn history_item(day_key: &str, actual_intake_ml: u32, target_ml: u32) -> HistoryItem {
        HistoryItem {
            day_key: day_key.to_string(),
            target_ml,
            actual_intake_ml,
            consumed_ml: actual_intake_ml,
            debt_incurred_ml: 0,
            goal_met: actual_intake_ml >= target_ml,
            completed_reminder_slots: 0,
            missed_reminder_slots: 0,
        }
    }

    fn seed_count(garden: &GardenState, seed_type: &str) -> u32 {
        garden
            .seeds
            .iter()
            .find(|item| item.seed_type == seed_type)
            .map(|item| item.count)
            .unwrap_or(0)
    }

    fn tier_one_seed_types() -> Vec<String> {
        seed_exchange_config()
            .seeds
            .into_iter()
            .filter(|seed| seed.tier == INITIAL_TIER_SEED_GRANT)
            .map(|seed| seed.seed_type)
            .collect()
    }

    #[test]
    fn missed_slots_accumulate_history_debt_by_cup_size() {
        let settings = Settings::default();
        let mut state = PersistedState {
            today: DailyRecord::new(local_dt(2026, 5, 19, 8, 0), &settings),
            settings,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        let changed = reconcile(&mut state, local_dt(2026, 5, 19, 11, 0));
        assert!(changed);
        assert_eq!(state.today.total_debt_incurred_ml, 500);
        assert_eq!(state.today.missed_reminder_slots, 2);
        assert_eq!(state.today.pending_slot_index, Some(2));
    }

    #[test]
    fn reminder_interval_is_derived_from_target_cup_and_window() {
        let settings = Settings {
            daily_target_ml: 2000,
            cup_size_ml: 250,
            cup_step_ml: 50,
            panel_opacity_percent: default_panel_opacity_percent(),
            panel_blur_px: default_panel_blur_px(),
            device_id: default_empty_string(),
            display_name: default_empty_string(),
            active_circle_code: default_empty_string(),
            active_circle_name: default_empty_string(),
            reminder_interval_minutes: 5,
            active_start_hour: 9,
            active_end_hour: 22,
            notifications_enabled: true,
            autostart_enabled: false,
            locale: default_locale(),
            sedentary_reminder_minutes: default_sedentary_reminder_minutes(),
        }
        .sanitize();

        assert_eq!(settings.reminder_interval_minutes, 97);
    }

    #[test]
    fn sedentary_toggle_records_sitting_and_standing_times() {
        let settings = Settings::default();
        let now = local_dt(2026, 8, 19, 9, 0);
        let mut state = PersistedState {
            today: DailyRecord::new(now, &settings),
            settings,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        toggle_sedentary_state_in_state(&mut state, now);
        let seated_status = to_sedentary_status(&state.settings, &state.sedentary);
        let seated_since = now.to_rfc3339();
        let seated_reminder_at = (now + chrono::Duration::minutes(20)).to_rfc3339();

        assert!(seated_status.seated);
        assert_eq!(seated_status.seated_since.as_deref(), Some(seated_since.as_str()));
        assert_eq!(
            seated_status.next_reminder_at.as_deref(),
            Some(seated_reminder_at.as_str())
        );

        let stood_at = now + chrono::Duration::minutes(3);
        toggle_sedentary_state_in_state(&mut state, stood_at);
        let standing_status = to_sedentary_status(&state.settings, &state.sedentary);
        let stood_at_text = stood_at.to_rfc3339();
        let sit_prompt_at = (stood_at + chrono::Duration::minutes(5)).to_rfc3339();

        assert!(!standing_status.seated);
        assert_eq!(
            standing_status.stood_up_at.as_deref(),
            Some(stood_at_text.as_str())
        );
        assert_eq!(
            standing_status.next_reminder_at.as_deref(),
            Some(sit_prompt_at.as_str())
        );
    }

    #[test]
    fn sedentary_reconcile_reminds_to_stand_then_prompts_after_standing() {
        let mut settings = Settings::default();
        settings.sedentary_reminder_minutes = 20;
        let now = local_dt(2026, 8, 19, 9, 0);
        let mut state = PersistedState {
            today: DailyRecord::new(now, &settings),
            settings,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState {
                seated: true,
                seated_since: Some(now.to_rfc3339()),
                stood_up_at: None,
                last_stand_reminder_at: None,
                last_sit_prompt_at: None,
                updated_at: None,
                activity_day_key: day_key(now),
                activity_events: vec![SedentaryActivityEvent {
                    kind: SedentaryActivityKind::Seated,
                    at: now.to_rfc3339(),
                }],
            },
        };

        assert!(reconcile_sedentary(&mut state, now + chrono::Duration::minutes(19)).is_none());
        assert!(matches!(
            reconcile_sedentary(&mut state, now + chrono::Duration::minutes(20)),
            Some(NotificationKind::SedentaryStandUp)
        ));
        let first_repeat_at = (now + chrono::Duration::minutes(25)).to_rfc3339();
        assert_eq!(
            to_sedentary_status(&state.settings, &state.sedentary)
                .next_reminder_at
                .as_deref(),
            Some(first_repeat_at.as_str())
        );
        assert!(reconcile_sedentary(&mut state, now + chrono::Duration::minutes(21)).is_none());
        assert!(matches!(
            reconcile_sedentary(&mut state, now + chrono::Duration::minutes(25)),
            Some(NotificationKind::SedentaryStandUp)
        ));
        let second_repeat_at = (now + chrono::Duration::minutes(30)).to_rfc3339();
        assert_eq!(
            to_sedentary_status(&state.settings, &state.sedentary)
                .next_reminder_at
                .as_deref(),
            Some(second_repeat_at.as_str())
        );
        assert!(reconcile_sedentary(&mut state, now + chrono::Duration::minutes(26)).is_none());

        toggle_sedentary_state_in_state(&mut state, now + chrono::Duration::minutes(26));
        assert!(reconcile_sedentary(&mut state, now + chrono::Duration::minutes(29)).is_none());
        assert!(matches!(
            reconcile_sedentary(&mut state, now + chrono::Duration::minutes(31)),
            Some(NotificationKind::SedentaryAskSitting)
        ));
        assert!(reconcile_sedentary(&mut state, now + chrono::Duration::minutes(35)).is_none());
        assert!(matches!(
            reconcile_sedentary(&mut state, now + chrono::Duration::minutes(36)),
            Some(NotificationKind::SedentaryAskSitting)
        ));
    }

    #[test]
    fn sedentary_activity_keeps_only_the_current_day() {
        let settings = Settings::default();
        let first_day = local_dt(2026, 8, 19, 23, 55);
        let next_day = local_dt(2026, 8, 20, 0, 1);
        let mut state = PersistedState {
            today: DailyRecord::new(first_day, &settings),
            settings,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        toggle_sedentary_state_in_state(&mut state, first_day);
        assert_eq!(state.sedentary.activity_events.len(), 1);

        reconcile_sedentary(&mut state, next_day);
        assert_eq!(state.sedentary.activity_day_key, day_key(next_day));
        assert_eq!(state.sedentary.activity_events.len(), 1);
        assert_eq!(
            state.sedentary.activity_events[0].kind,
            SedentaryActivityKind::Seated
        );
        let next_day_text = next_day.to_rfc3339();
        assert_eq!(state.sedentary.seated_since.as_deref(), Some(next_day_text.as_str()));
    }

    #[test]
    fn onboarding_starts_unseen_and_is_backward_compatible() {
        assert_eq!(SyncMeta::default().onboarding_seen_at, None);

        let value = serde_json::json!({
            "settings": Settings::default(),
            "today": DailyRecord::new(local_dt(2026, 6, 8, 9, 0), &Settings::default()),
            "history": [],
            "garden": GardenState::default(),
            "syncMeta": {}
        });

        let parsed = serde_json::from_value::<PersistedState>(value).unwrap();
        assert_eq!(parsed.sync_meta.onboarding_seen_at, None);
    }

    #[test]
    fn remote_settings_snapshot_updates_account_settings_only() {
        let local_settings = Settings {
            daily_target_ml: 2000,
            cup_size_ml: 250,
            cup_step_ml: 50,
            panel_opacity_percent: 82,
            panel_blur_px: 8,
            device_id: "desktop-device".to_string(),
            display_name: "Desktop".to_string(),
            active_circle_code: "ABC123".to_string(),
            active_circle_name: "Desktop Circle".to_string(),
            reminder_interval_minutes: 97,
            active_start_hour: 9,
            active_end_hour: 22,
            notifications_enabled: true,
            autostart_enabled: true,
            locale: "zh-CN".to_string(),
            sedentary_reminder_minutes: default_sedentary_reminder_minutes(),
        }
        .sanitize();
        let mut state = PersistedState {
            today: DailyRecord::new(local_dt(2026, 5, 20, 9, 0), &local_settings),
            settings: local_settings,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };
        let remote = SettingsSnapshotRecord {
            snapshot: SettingsSnapshot {
                daily_target_ml: 2600,
                cup_size_ml: 400,
                cup_step_ml: 100,
                reminder_interval_minutes: 120,
                sedentary_reminder_minutes: 25,
                active_start_hour: 8,
                active_end_hour: 21,
                locale: "en-US".to_string(),
            },
            updated_at: "2026-05-20T10:00:00+08:00".to_string(),
            updated_by_device_id: "mini-program-openid".to_string(),
        };

        apply_settings_snapshot(&mut state, remote);

        assert_eq!(state.settings.daily_target_ml, 2600);
        assert_eq!(state.settings.cup_size_ml, 400);
        assert_eq!(state.settings.cup_step_ml, 100);
        assert_eq!(state.settings.active_start_hour, 8);
        assert_eq!(state.settings.active_end_hour, 21);
        assert_eq!(state.settings.locale, "en-US");
        assert_eq!(state.settings.sedentary_reminder_minutes, 25);
        assert_eq!(state.today.target_ml, 2600);
        assert_eq!(state.today.cup_size_ml, 400);
        assert_eq!(state.today.active_start_hour, 8);
        assert_eq!(state.today.active_end_hour, 21);
        assert_eq!(state.settings.device_id, "desktop-device");
        assert_eq!(state.settings.display_name, "Desktop");
        assert_eq!(state.settings.active_circle_code, "ABC123");
        assert_eq!(state.settings.notifications_enabled, true);
        assert_eq!(state.settings.autostart_enabled, true);
        assert_eq!(state.settings.panel_opacity_percent, 82);
        assert_eq!(state.settings.panel_blur_px, 8);
        assert_eq!(
            state.sync_meta.settings_updated_at.as_deref(),
            Some("2026-05-20T10:00:00+08:00")
        );
        assert_eq!(
            state.sync_meta.settings_updated_by_device_id.as_deref(),
            Some("mini-program-openid")
        );
    }

    #[test]
    fn remote_today_snapshot_should_use_snapshot_meta_not_local_today_updated_at() {
        let settings = Settings {
            device_id: "desktop-device".to_string(),
            ..Settings::default()
        };
        let mut state = PersistedState {
            today: DailyRecord::new(local_dt(2026, 5, 20, 9, 0), &settings),
            settings,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        state.today.updated_at = "2026-05-20T10:30:00+08:00".to_string();
        state
            .sync_meta
            .daily_snapshot_updated_at_by_day
            .insert("2026-05-20".to_string(), "2026-05-20T09:00:00+08:00".to_string());
        state
            .sync_meta
            .daily_snapshot_updated_by_device_id_by_day
            .insert("2026-05-20".to_string(), "desktop-device".to_string());

        let remote = DailySnapshotRecord {
            day_key: "2026-05-20".to_string(),
            snapshot: HistoryItem {
                day_key: "2026-05-20".to_string(),
                target_ml: 2000,
                actual_intake_ml: 500,
                consumed_ml: 500,
                debt_incurred_ml: 0,
                goal_met: false,
                completed_reminder_slots: 0,
                missed_reminder_slots: 0,
            },
            updated_at: "2026-05-20T10:00:00+08:00".to_string(),
            updated_by_device_id: "mini-program-openid".to_string(),
        };

        let should_apply = should_apply_remote_snapshot(
            state
                .sync_meta
                .daily_snapshot_updated_at_by_day
                .get(&remote.day_key)
                .map(String::as_str),
            state
                .sync_meta
                .daily_snapshot_updated_by_device_id_by_day
                .get(&remote.day_key)
                .map(String::as_str),
            &remote.updated_at,
            &remote.updated_by_device_id,
        );

        assert!(should_apply);

        apply_daily_snapshot(&mut state, &remote);

        assert_eq!(state.today.actual_intake_ml, 500);
        assert_eq!(state.today.updated_at, "2026-05-20T10:00:00+08:00");
    }

    #[test]
    fn rollover_archives_previous_day_and_resets_debt() {
        let settings = Settings::default();
        let mut state = PersistedState {
            today: DailyRecord::new(local_dt(2026, 5, 19, 9, 0), &settings),
            settings: settings.clone(),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        state.today.pending_slot_index = Some(3);
        state.today.pending_since = Some(local_dt(2026, 5, 19, 12, 0).to_rfc3339());
        reconcile(&mut state, local_dt(2026, 5, 20, 8, 0));

        assert_eq!(state.history.len(), 1);
        assert_eq!(state.history[0].day_key, "2026-05-19");
        assert_eq!(state.today.day_key, "2026-05-20");
        assert_eq!(state.today.actual_intake_ml, 0);
        assert_eq!(state.today.total_debt_incurred_ml, 0);
    }

    #[test]
    fn expected_intake_tracks_elapsed_time() {
        let settings = Settings {
            daily_target_ml: 2000,
            cup_size_ml: 250,
            cup_step_ml: 50,
            panel_opacity_percent: default_panel_opacity_percent(),
            panel_blur_px: default_panel_blur_px(),
            device_id: default_empty_string(),
            display_name: default_empty_string(),
            active_circle_code: default_empty_string(),
            active_circle_name: default_empty_string(),
            reminder_interval_minutes: 97,
            active_start_hour: 9,
            active_end_hour: 22,
            notifications_enabled: true,
            autostart_enabled: false,
            locale: default_locale(),
            sedentary_reminder_minutes: default_sedentary_reminder_minutes(),
        };

        assert_eq!(expected_intake_ml(&settings, local_dt(2026, 5, 19, 8, 30)), 0);
        assert_eq!(expected_intake_ml(&settings, local_dt(2026, 5, 19, 9, 30)), 77);
        assert_eq!(expected_intake_ml(&settings, local_dt(2026, 5, 19, 20, 0)), 1693);
        assert_eq!(expected_intake_ml(&settings, local_dt(2026, 5, 19, 22, 0)), 2000);
    }

    #[test]
    fn undo_snapshot_restores_previous_intake() {
        let settings = Settings::default();
        let mut today = DailyRecord::new(local_dt(2026, 5, 19, 9, 0), &settings);
        today.actual_intake_ml = 500;
        today.effective_intake_ml = 500;
        today.pending_slot_index = Some(1);

        let snapshot = DrinkUndoSnapshot {
            logged_amount_ml: Some(250),
            actual_intake_ml: 500,
            effective_intake_ml: 500,
            debt_ml: 0,
            pending_slot_index: Some(1),
            pending_since: None,
            snooze_until: None,
            completed_reminder_slots: 0,
            last_drink_at: None,
            notification_token: 1,
            last_notified_token: Some(1),
        };

        today.last_log_undo = Some(snapshot.clone());
        today.last_logged_amount_ml = Some(250);
        today.actual_intake_ml = 750;
        today.effective_intake_ml = 750;
        today.pending_slot_index = None;
        today.completed_reminder_slots = 1;

        let mut state = PersistedState {
            settings,
            today,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        let saved = state.today.last_log_undo.clone().unwrap();
        state.today.actual_intake_ml = saved.actual_intake_ml;
        state.today.effective_intake_ml = saved.effective_intake_ml;
        state.today.pending_slot_index = saved.pending_slot_index;
        state.today.completed_reminder_slots = saved.completed_reminder_slots;

        assert_eq!(state.today.actual_intake_ml, 500);
        assert_eq!(state.today.pending_slot_index, Some(1));
        assert_eq!(state.today.completed_reminder_slots, 0);
    }

    #[test]
    fn undo_stack_keeps_three_latest_logs() {
        let settings = Settings::default();
        let mut today = DailyRecord::new(local_dt(2026, 5, 19, 9, 0), &settings);

        for amount in [100, 200, 300, 400] {
            today.last_log_undos.push(DrinkUndoSnapshot {
                logged_amount_ml: Some(amount),
                actual_intake_ml: today.actual_intake_ml,
                effective_intake_ml: today.effective_intake_ml,
                debt_ml: today.debt_ml,
                pending_slot_index: today.pending_slot_index,
                pending_since: today.pending_since.clone(),
                snooze_until: today.snooze_until.clone(),
                completed_reminder_slots: today.completed_reminder_slots,
                last_drink_at: today.last_drink_at.clone(),
                notification_token: today.notification_token,
                last_notified_token: today.last_notified_token,
            });
            if today.last_log_undos.len() > 3 {
                let overflow = today.last_log_undos.len() - 3;
                today.last_log_undos.drain(0..overflow);
            }
            today.actual_intake_ml += amount;
            today.effective_intake_ml = today.actual_intake_ml;
        }

        assert_eq!(today.last_log_undos.len(), 3);
        assert_eq!(today.last_log_undos[0].logged_amount_ml, Some(200));
        assert_eq!(today.last_log_undos[2].logged_amount_ml, Some(400));
    }

    #[test]
    fn yesterday_catch_up_updates_previous_history_entry() {
        let settings = Settings::default();
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(local_dt(2026, 5, 20, 9, 0), &settings),
            history: vec![HistoryItem {
                day_key: "2026-05-19".to_string(),
                target_ml: 2000,
                actual_intake_ml: 1500,
                consumed_ml: 1500,
                debt_incurred_ml: 500,
                goal_met: false,
                completed_reminder_slots: 6,
                missed_reminder_slots: 2,
            }],
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        apply_yesterday_catch_up(&mut state, local_dt(2026, 5, 20, 9, 30), 250).unwrap();

        assert_eq!(state.history[0].actual_intake_ml, 1750);
        assert_eq!(state.history[0].consumed_ml, 1750);
        assert!(!state.history[0].goal_met);

        apply_yesterday_catch_up(&mut state, local_dt(2026, 5, 20, 10, 0), 250).unwrap();

        assert_eq!(state.history[0].actual_intake_ml, 2000);
        assert!(state.history[0].goal_met);
    }

    #[test]
    fn missing_garden_state_receives_initial_seed_grant_once() {
        let settings = Settings::default();
        let state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(local_dt(2026, 5, 20, 9, 0), &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };
        let mut value = serde_json::to_value(state).unwrap();
        value.as_object_mut().unwrap().remove("garden");

        let parsed = serde_json::from_value::<PersistedState>(value).unwrap();
        assert!(parsed.garden.initial_grant_claimed);
        assert!(parsed.garden.initial_grant_last_awarded_at.is_some());
        assert_eq!(parsed.garden.seeds.len(), tier_one_seed_types().len());
        for seed_type in tier_one_seed_types() {
            assert_eq!(seed_count(&parsed.garden, &seed_type), INITIAL_SEED_GRANT_COUNT);
        }

        let mut existing = parsed.clone();
        existing.normalize_garden();
        for seed_type in tier_one_seed_types() {
            assert_eq!(
                seed_count(&existing.garden, &seed_type),
                seed_count(&parsed.garden, &seed_type)
            );
        }
    }

    #[test]
    fn legacy_garden_state_receives_an_empty_water_baby_state() {
        let settings = Settings::default();
        let mut value = serde_json::json!({
            "settings": settings,
            "today": DailyRecord::new(local_dt(2026, 8, 14, 9, 0), &Settings::default()),
            "history": [],
            "garden": GardenState::default(),
            "syncMeta": {}
        });
        value["garden"].as_object_mut().unwrap().remove("waterBaby");

        let parsed = serde_json::from_value::<PersistedState>(value).unwrap();

        assert_eq!(parsed.garden.water_baby.materials.wood, 0);
        assert_eq!(parsed.garden.water_baby.materials.stone, 0);
        assert!(parsed.garden.water_baby.completed_project_ids.is_empty());
        assert!(parsed.garden.water_baby.active_expedition.is_none());
    }

    #[test]
    fn garden_normalization_caps_materials_and_keeps_only_known_projects() {
        let settings = Settings::default();
        let now = local_dt(2026, 8, 14, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };
        state.garden.water_baby.materials.wood = MAX_GARDEN_MATERIAL_COUNT + 100;
        state.garden.water_baby.materials.stone = MAX_GARDEN_MATERIAL_COUNT + 100;
        state.garden.water_baby.completed_project_ids = vec![
            FOREST_BRIDGE_PROJECT_ID.to_string(),
            "unknownProject".to_string(),
            FOREST_BRIDGE_PROJECT_ID.to_string(),
        ];

        state.normalize_garden();

        assert_eq!(state.garden.water_baby.materials.wood, MAX_GARDEN_MATERIAL_COUNT);
        assert_eq!(state.garden.water_baby.materials.stone, MAX_GARDEN_MATERIAL_COUNT);
        assert_eq!(
            state.garden.water_baby.completed_project_ids,
            vec![FOREST_BRIDGE_PROJECT_ID.to_string()]
        );
    }

    #[test]
    fn expedition_requires_first_drink_and_spends_one_crop() {
        let settings = Settings::default();
        let now = local_dt(2026, 8, 14, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };
        add_produce(&mut state.garden, POTATO_CROP_TYPE, 2);
        state.today.actual_intake_ml = 0;

        assert!(start_expedition_in_state(
            &mut state,
            DEFAULT_EXPEDITION_ROUTE_ID,
            POTATO_CROP_TYPE,
            now,
        )
        .is_err());

        state.today.actual_intake_ml = 1;
        start_expedition_in_state(
            &mut state,
            DEFAULT_EXPEDITION_ROUTE_ID,
            POTATO_CROP_TYPE,
            now,
        )
        .unwrap();

        assert_eq!(total_produce(&state.garden, POTATO_CROP_TYPE), 1);
        let expedition = state.garden.water_baby.active_expedition.as_ref().unwrap();
        assert_eq!(expedition.day_key, "2026-08-14");
        assert_eq!(expedition.route_id, DEFAULT_EXPEDITION_ROUTE_ID);
        assert_eq!(expedition.rewards.len(), 1);
        assert_eq!(
            parse_local_datetime(&expedition.returns_at).unwrap(),
            now + chrono::Duration::hours(4)
        );
    }

    #[test]
    fn full_goal_expedition_has_two_rewards_and_only_starts_once_per_day() {
        let settings = Settings::default();
        let now = local_dt(2026, 8, 14, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };
        state.today.actual_intake_ml = state.today.target_ml;
        add_produce(&mut state.garden, POTATO_CROP_TYPE, 2);

        start_expedition_in_state(
            &mut state,
            DEFAULT_EXPEDITION_ROUTE_ID,
            POTATO_CROP_TYPE,
            now,
        )
        .unwrap();

        let expedition = state.garden.water_baby.active_expedition.take().unwrap();
        assert_eq!(expedition.rewards.len(), 2);
        assert_eq!(
            parse_local_datetime(&expedition.returns_at).unwrap(),
            now + chrono::Duration::hours(8)
        );
        assert!(start_expedition_in_state(
            &mut state,
            DEFAULT_EXPEDITION_ROUTE_ID,
            POTATO_CROP_TYPE,
            now + chrono::Duration::hours(9),
        )
        .is_err());
        assert_eq!(total_produce(&state.garden, POTATO_CROP_TYPE), 1);
    }

    #[test]
    fn expedition_reward_can_only_be_claimed_after_return_and_never_twice() {
        let settings = Settings::default();
        let now = local_dt(2026, 8, 14, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };
        state.garden.water_baby.active_expedition = Some(ActiveExpedition {
            expedition_id: "expedition-1".to_string(),
            day_key: "2026-08-14".to_string(),
            route_id: DEFAULT_EXPEDITION_ROUTE_ID.to_string(),
            supply_crop_type: POTATO_CROP_TYPE.to_string(),
            started_at: now.to_rfc3339(),
            returns_at: (now + chrono::Duration::hours(4)).to_rfc3339(),
            rewards: vec![
                ExpeditionReward::Material {
                    material_type: WOOD_MATERIAL_TYPE.to_string(),
                    count: 2,
                },
                ExpeditionReward::Material {
                    material_type: STONE_MATERIAL_TYPE.to_string(),
                    count: 3,
                },
                ExpeditionReward::Seed {
                    seed_type: POTATO_SEED_TYPE.to_string(),
                    count: 1,
                },
            ],
        });
        let initial_seed_count = seed_count(&state.garden, POTATO_SEED_TYPE);

        assert!(claim_expedition_in_state(
            &mut state,
            "expedition-1",
            now + chrono::Duration::hours(3),
        )
        .is_err());
        claim_expedition_in_state(
            &mut state,
            "expedition-1",
            now + chrono::Duration::hours(4),
        )
        .unwrap();

        assert_eq!(state.garden.water_baby.materials.wood, 2);
        assert_eq!(state.garden.water_baby.materials.stone, 3);
        assert_eq!(seed_count(&state.garden, POTATO_SEED_TYPE), initial_seed_count + 1);
        assert!(state.garden.water_baby.active_expedition.is_none());
        assert!(claim_expedition_in_state(
            &mut state,
            "expedition-1",
            now + chrono::Duration::hours(5),
        )
        .is_err());
        assert_eq!(state.garden.water_baby.materials.wood, 2);
        assert_eq!(state.garden.water_baby.materials.stone, 3);
        assert_eq!(seed_count(&state.garden, POTATO_SEED_TYPE), initial_seed_count + 1);
    }

    #[test]
    fn expedition_reward_json_uses_frontend_field_names_and_reads_legacy_names() {
        let reward = ExpeditionReward::Material {
            material_type: WOOD_MATERIAL_TYPE.to_string(),
            count: 2,
        };

        assert_eq!(
            serde_json::to_value(&reward).unwrap(),
            serde_json::json!({
                "kind": "material",
                "materialType": WOOD_MATERIAL_TYPE,
                "count": 2
            })
        );

        let parsed: ExpeditionReward = serde_json::from_value(serde_json::json!({
            "kind": "seed",
            "seed_type": POTATO_SEED_TYPE,
            "count": 1
        }))
        .unwrap();

        assert!(matches!(
            parsed,
            ExpeditionReward::Seed {
                seed_type,
                count: 1
            } if seed_type == POTATO_SEED_TYPE
        ));
    }

    #[test]
    fn building_a_project_atomically_spends_materials_and_unlocks_its_route() {
        let mut garden = GardenState::default();
        garden.water_baby.materials.wood = 8;
        garden.water_baby.materials.stone = 3;

        assert!(build_garden_project_in_state(&mut garden, FOREST_BRIDGE_PROJECT_ID).is_err());
        assert_eq!(garden.water_baby.materials.wood, 8);
        assert_eq!(garden.water_baby.materials.stone, 3);

        garden.water_baby.materials.stone = 4;
        build_garden_project_in_state(&mut garden, FOREST_BRIDGE_PROJECT_ID).unwrap();

        assert_eq!(garden.water_baby.materials.wood, 0);
        assert_eq!(garden.water_baby.materials.stone, 0);
        assert!(garden
            .water_baby
            .completed_project_ids
            .iter()
            .any(|project_id| project_id == FOREST_BRIDGE_PROJECT_ID));
        assert!(is_expedition_route_unlocked(&garden, FOREST_EXPEDITION_ROUTE_ID));
        assert!(build_garden_project_in_state(&mut garden, FOREST_BRIDGE_PROJECT_ID).is_err());
    }

    #[test]
    fn persisted_state_parser_accepts_utf8_bom() {
        let settings = Settings::default();
        let state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(local_dt(2026, 6, 13, 9, 0), &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };
        let content = format!("\u{feff}{}", serde_json::to_string(&state).unwrap());

        let parsed = parse_persisted_state_content(&content).unwrap();

        assert_eq!(parsed.today.day_key, "2026-06-13");
    }

    #[test]
    fn legacy_collection_is_migrated_into_produce_once() {
        let settings = Settings::default();
        let mut value = serde_json::json!({
            "settings": settings,
            "today": DailyRecord::new(local_dt(2026, 5, 20, 9, 0), &Settings::default()),
            "history": [],
            "garden": {
                "initialGrantClaimed": true,
                "seeds": [
                    { "seedType": BASIC_SEED_TYPE, "count": INITIAL_SEED_GRANT_COUNT }
                ],
                "produce": [],
                "crops": [],
                "collection": [
                    {
                        "cropType": POTATO_CROP_TYPE,
                        "harvestCount": 8,
                        "firstHarvestedAt": null,
                        "lastHarvestedAt": null
                    }
                ],
                "rest": RestState::default()
            }
        });

        let mut parsed = serde_json::from_value::<PersistedState>(value.take()).unwrap();
        parsed.normalize_garden();
        assert!(parsed.garden.produce_migration_claimed);
        assert_eq!(parsed.garden.produce.len(), 1);
        assert_eq!(parsed.garden.produce[0].crop_type, POTATO_CROP_TYPE);
        assert_eq!(parsed.garden.produce[0].count, 8);
    }

    #[test]
    fn legacy_garden_ids_are_normalized_without_config_aliases() {
        let settings = Settings::default();
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(local_dt(2026, 5, 20, 9, 0), &settings),
            history: Vec::new(),
            garden: GardenState {
                initial_grant_claimed: true,
                initial_grant_last_awarded_at: None,
                produce_migration_claimed: true,
                seeds: vec![SeedInventoryItem {
                    seed_type: LEGACY_BASIC_SEED_TYPE_V2.to_string(),
                    count: 2,
                }],
                produce: vec![ProduceInventoryItem {
                    crop_type: LEGACY_ADVANCED_CROP_TYPE.to_string(),
                    count: 3,
                }],
                crops: vec![PlantedCrop {
                    day_key: "2026-05-19".to_string(),
                    seed_type: LEGACY_CARROT_SEED_TYPE.to_string(),
                    planted_at: local_dt(2026, 5, 20, 9, 0).to_rfc3339(),
                    harvested_at: None,
                    boost_applied_seconds: 0,
                }],
                collection: vec![GardenCollectionItem {
                    crop_type: LEGACY_BROCCOLI_CROP_TYPE.to_string(),
                    harvest_count: 4,
                    first_harvested_at: None,
                    last_harvested_at: None,
                }],
                active_background: DEFAULT_BACKGROUND_ID.to_string(),
                unlocked_backgrounds: Vec::new(),
                rest: RestState::default(),
                water_baby: WaterBabyState::default(),
            },
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        state.normalize_garden();

        assert_eq!(state.garden.seeds[0].seed_type, POTATO_SEED_TYPE);
        assert_eq!(state.garden.produce[0].crop_type, BELL_PEPPER_CROP_TYPE);
        assert_eq!(state.garden.crops[0].seed_type, CARROT_SEED_TYPE);
        assert_eq!(state.garden.collection[0].crop_type, BROCCOLI_CROP_TYPE);
    }

    #[test]
    fn planting_requires_water_record_and_spends_seed() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: vec![history_item("2026-05-19", 250, 2000)],
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        plant_seed_in_state(
            &mut state,
            "2026-05-19",
            BASIC_SEED_TYPE,
            local_dt(2026, 5, 20, 9, 0),
        )
        .unwrap();

        assert_eq!(state.garden.crops.len(), 1);
        assert_eq!(seed_count(&state.garden, BASIC_SEED_TYPE), INITIAL_SEED_GRANT_COUNT - 1);
        assert!(plant_seed_in_state(
            &mut state,
            "2026-05-19",
            BASIC_SEED_TYPE,
            local_dt(2026, 5, 20, 9, 0),
        )
        .is_err());
        assert!(plant_seed_in_state(
            &mut state,
            "2026-05-18",
            BASIC_SEED_TYPE,
            local_dt(2026, 5, 20, 9, 0),
        )
        .is_err());
    }

    #[test]
    fn growth_days_follow_completion_bands() {
        assert_eq!(required_growth_days(&history_item("2026-05-19", 2000, 2000)), 1);
        assert_eq!(required_growth_days(&history_item("2026-05-19", 1400, 2000)), 2);
        assert_eq!(required_growth_days(&history_item("2026-05-19", 800, 2000)), 3);
        assert_eq!(required_growth_days(&history_item("2026-05-19", 1, 2000)), 4);
        assert_eq!(required_growth_days(&history_item("2026-05-19", 0, 2000)), 0);
    }

    #[test]
    fn harvest_requires_maturity_and_updates_collection() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: vec![history_item("2026-05-19", 2000, 2000)],
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        plant_seed_in_state(&mut state, "2026-05-19", BASIC_SEED_TYPE, now).unwrap();
        assert!(harvest_crop_in_state(&mut state, "2026-05-19", now).is_err());

        state.garden.crops[0].planted_at = (now - chrono::Duration::days(1)).to_rfc3339();
        harvest_crop_in_state(&mut state, "2026-05-19", now).unwrap();

        assert_eq!(state.garden.collection.len(), 1);
        assert_eq!(state.garden.collection[0].crop_type, POTATO_CROP_TYPE);
        assert_eq!(state.garden.collection[0].harvest_count, 1);
        let basic_seed_count = seed_count(&state.garden, BASIC_SEED_TYPE);
        assert!((INITIAL_SEED_GRANT_COUNT..=INITIAL_SEED_GRANT_COUNT + 1).contains(&basic_seed_count));
        assert_eq!(state.garden.produce.len(), 1);
        assert_eq!(state.garden.produce[0].crop_type, POTATO_CROP_TYPE);
        assert_eq!(state.garden.produce[0].count, 1);
        assert!(state.garden.crops.is_empty());
        plant_seed_in_state(&mut state, "2026-05-19", BASIC_SEED_TYPE, now).unwrap();
        assert_eq!(state.garden.crops.len(), 1);
    }

    #[test]
    fn harvest_seed_reward_is_always_between_one_and_two() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);

        for minute in 0..6 {
            let mut state = PersistedState {
                settings: settings.clone(),
                today: DailyRecord::new(now, &settings),
                history: vec![history_item("2026-05-19", 2000, 2000)],
                garden: GardenState::default(),
                sync_meta: SyncMeta::default(),
                achievements: Vec::new(),
                sedentary: SedentaryState::default(),
            };

            plant_seed_in_state(
                &mut state,
                "2026-05-19",
                BASIC_SEED_TYPE,
                now - chrono::Duration::days(1),
            )
            .unwrap();

            let harvest_time = now + chrono::Duration::minutes(minute);
            harvest_crop_in_state(&mut state, "2026-05-19", harvest_time).unwrap();

            let basic_seed_count = seed_count(&state.garden, BASIC_SEED_TYPE);
            let rewarded = basic_seed_count.saturating_sub(INITIAL_SEED_GRANT_COUNT - 1);
            assert!((1..=2).contains(&rewarded));
        }
    }

    #[test]
    fn exchange_requires_one_basic_produce_for_cabbage_seed() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        assert!(exchange_produce_in_state(&mut state, POTATO_CROP_TYPE, BELL_PEPPER_SEED_TYPE, 1).is_err());

        add_produce(&mut state.garden, POTATO_CROP_TYPE, 1);
        exchange_produce_in_state(&mut state, POTATO_CROP_TYPE, BELL_PEPPER_SEED_TYPE, 1).unwrap();

        let basic_produce_count = state
            .garden
            .produce
            .iter()
            .find(|item| item.crop_type == POTATO_CROP_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);
        let advanced_seed_count = state
            .garden
            .seeds
            .iter()
            .find(|item| item.seed_type == BELL_PEPPER_SEED_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);

        assert_eq!(basic_produce_count, 0);
        assert_eq!(advanced_seed_count, INITIAL_SEED_GRANT_COUNT + 1);
    }

    #[test]
    fn exchange_allows_multiple_targets_from_selected_source_crop() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        add_produce(&mut state.garden, POTATO_CROP_TYPE, 4);
        exchange_produce_in_state(&mut state, POTATO_CROP_TYPE, BELL_PEPPER_SEED_TYPE, 1).unwrap();
        exchange_produce_in_state(&mut state, POTATO_CROP_TYPE, WATERMELON_SEED_TYPE, 1).unwrap();

        let watermelon_seed_count = state
            .garden
            .seeds
            .iter()
            .find(|item| item.seed_type == WATERMELON_SEED_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);
        let cabbage_seed_count = state
            .garden
            .seeds
            .iter()
            .find(|item| item.seed_type == BELL_PEPPER_SEED_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);

        assert_eq!(watermelon_seed_count, 1);
        assert_eq!(cabbage_seed_count, INITIAL_SEED_GRANT_COUNT + 1);
    }

    #[test]
    fn exchange_cost_depends_on_tier_gap() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        add_produce(&mut state.garden, BELL_PEPPER_CROP_TYPE, 2);
        assert!(
            exchange_produce_in_state(&mut state, BELL_PEPPER_CROP_TYPE, WATERMELON_SEED_TYPE, 1)
                .is_err()
        );

        add_produce(&mut state.garden, BELL_PEPPER_CROP_TYPE, 1);
        assert!(
            exchange_produce_in_state(&mut state, BELL_PEPPER_CROP_TYPE, WATERMELON_SEED_TYPE, 1)
                .is_ok()
        );

        add_produce(&mut state.garden, BELL_PEPPER_CROP_TYPE, 1);
        assert!(exchange_produce_in_state(&mut state, BELL_PEPPER_CROP_TYPE, BROCCOLI_SEED_TYPE, 1).is_err());

        add_produce(&mut state.garden, BELL_PEPPER_CROP_TYPE, 2);
        assert!(exchange_produce_in_state(&mut state, BELL_PEPPER_CROP_TYPE, BROCCOLI_SEED_TYPE, 1).is_ok());
    }

    #[test]
    fn exchange_can_convert_multiple_seeds_in_one_operation() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        add_produce(&mut state.garden, BELL_PEPPER_CROP_TYPE, 6);
        exchange_produce_in_state(&mut state, BELL_PEPPER_CROP_TYPE, BROCCOLI_SEED_TYPE, 2)
            .unwrap();

        let bell_pepper_count = state
            .garden
            .produce
            .iter()
            .find(|item| item.crop_type == BELL_PEPPER_CROP_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);
        let broccoli_seed_count = state
            .garden
            .seeds
            .iter()
            .find(|item| item.seed_type == BROCCOLI_SEED_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);

        assert_eq!(bell_pepper_count, 0);
        assert_eq!(broccoli_seed_count, 2);
    }

    #[test]
    fn background_reward_uses_configured_requirements() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        add_produce(&mut state.garden, POTATO_CROP_TYPE, 6);
        add_produce(&mut state.garden, CARROT_CROP_TYPE, 5);
        assert!(redeem_background_reward_in_state(&mut state, CAT_COLLAGE_BACKGROUND_ID).is_err());

        add_produce(&mut state.garden, CARROT_CROP_TYPE, 1);
        redeem_background_reward_in_state(&mut state, CAT_COLLAGE_BACKGROUND_ID).unwrap();

        assert_eq!(state.garden.active_background, CAT_COLLAGE_BACKGROUND_ID);
        assert!(state
            .garden
            .unlocked_backgrounds
            .iter()
            .any(|background| background == CAT_COLLAGE_BACKGROUND_ID));
        assert_eq!(
            state.garden
                .produce
                .iter()
                .find(|item| item.crop_type == POTATO_CROP_TYPE)
                .map(|item| item.count)
                .unwrap_or(0),
            0
        );
        assert_eq!(
            state.garden
                .produce
                .iter()
                .find(|item| item.crop_type == CARROT_CROP_TYPE)
                .map(|item| item.count)
                .unwrap_or(0),
            0
        );
        assert!(redeem_background_reward_in_state(&mut state, CAT_COLLAGE_BACKGROUND_ID).is_err());
    }

    #[test]
    fn locked_background_falls_back_to_default_during_normalization() {
        let settings = Settings::default();
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(local_dt(2026, 5, 20, 9, 0), &settings),
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        state.garden.active_background = CAT_COLLAGE_BACKGROUND_ID.to_string();
        state.normalize_garden();
        assert_eq!(state.garden.active_background, DEFAULT_BACKGROUND_ID);
    }

    #[test]
    fn rest_break_policy_scales_by_recent_frequency() {
        let now = local_dt(2026, 5, 20, 12, 0);

        let short = rest_break_policy(now, Some(now - chrono::Duration::minutes(20)));
        let medium = rest_break_policy(now, Some(now - chrono::Duration::minutes(80)));
        let long = rest_break_policy(now, Some(now - chrono::Duration::minutes(160)));

        assert_eq!(short, (REST_SHORT_BREAK_SECONDS, REST_SHORT_BOOST_SECONDS));
        assert_eq!(medium, (REST_MEDIUM_BREAK_SECONDS, REST_MEDIUM_BOOST_SECONDS));
        assert_eq!(long, (REST_LONG_BREAK_SECONDS, REST_LONG_BOOST_SECONDS));
    }

    #[test]
    fn completed_rest_break_applies_boost_to_all_growing_crops() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 12, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: vec![
                history_item("2026-05-19", 2000, 2000),
                history_item("2026-05-18", 1400, 2000),
            ],
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };
        add_seed(&mut state.garden, BASIC_SEED_TYPE, 1);

        plant_seed_in_state(
            &mut state,
            "2026-05-19",
            BASIC_SEED_TYPE,
            now - chrono::Duration::hours(12),
        )
        .unwrap();
        plant_seed_in_state(
            &mut state,
            "2026-05-18",
            BASIC_SEED_TYPE,
            now - chrono::Duration::hours(12),
        )
        .unwrap();

        let completion_time = now + chrono::Duration::seconds(i64::from(REST_LONG_BREAK_SECONDS));
        let before_growth = crop_growth_percent(&state.garden.crops[0], &state.history[0], completion_time);

        start_rest_break_in_state(&mut state, now).unwrap();
        assert_eq!(state.garden.rest.max_duration_seconds, REST_LONG_BREAK_SECONDS);
        assert_eq!(state.garden.rest.planned_boost_seconds, REST_LONG_BOOST_SECONDS);

        assert!(complete_rest_break_in_state(&mut state, now).is_err());

        complete_rest_break_in_state(&mut state, completion_time).unwrap();

        assert!(!state.garden.rest.active);
        assert!(state
            .garden
            .crops
            .iter()
            .all(|crop| crop.boost_applied_seconds == REST_LONG_BOOST_SECONDS));
        let after_growth = crop_growth_percent(&state.garden.crops[0], &state.history[0], completion_time);
        assert_eq!(before_growth, 50);
        assert_eq!(
            after_growth,
            before_growth + ((REST_LONG_BOOST_SECONDS * 100) / DAY_SECONDS as u32)
        );
    }

    #[test]
    fn achievement_evaluation_unlocks_all_twelve_catalog_ids_from_complete_evidence() {
        let now = local_dt(2026, 6, 30, 12, 0);
        let settings = Settings::default();
        let mut today = DailyRecord::new(now, &settings);
        today.actual_intake_ml = today.target_ml;
        today.completed_reminder_slots = 1;
        let mut history = Vec::new();
        for offset in 1..30 {
            let day = now.date_naive() - chrono::Duration::days(offset);
            let mut item = history_item(&day.format("%Y-%m-%d").to_string(), 2000, 2000);
            item.completed_reminder_slots = 1;
            history.push(item);
        }
        let garden = GardenState {
            crops: vec![PlantedCrop {
                day_key: "2026-06-30".to_string(),
                seed_type: BASIC_SEED_TYPE.to_string(),
                planted_at: now.to_rfc3339(),
                harvested_at: None,
                boost_applied_seconds: 0,
            }],
            collection: vec![
                GardenCollectionItem {
                    crop_type: "cat".to_string(),
                    harvest_count: 5,
                    first_harvested_at: Some((now - chrono::Duration::days(10)).to_rfc3339()),
                    last_harvested_at: Some(now.to_rfc3339()),
                },
                GardenCollectionItem {
                    crop_type: "dog".to_string(),
                    harvest_count: 3,
                    first_harvested_at: None,
                    last_harvested_at: None,
                },
                GardenCollectionItem {
                    crop_type: "duck".to_string(),
                    harvest_count: 2,
                    first_harvested_at: None,
                    last_harvested_at: None,
                },
            ],
            unlocked_backgrounds: vec![CAT_COLLAGE_BACKGROUND_ID.to_string()],
            ..GardenState::default()
        };
        let state = PersistedState {
            settings,
            today,
            history,
            garden,
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        let receipts = evaluate_achievement_receipts(&state, now);
        let ids: Vec<&str> = receipts
            .iter()
            .map(|receipt| receipt.achievement_id.as_str())
            .collect();
        assert_eq!(ids.len(), ACHIEVEMENT_IDS.len());
        assert!(ACHIEVEMENT_IDS.iter().all(|id| ids.contains(id)));
    }

    #[test]
    fn thirty_day_drink_streak_requires_every_consecutive_day_key() {
        let now = local_dt(2026, 6, 30, 12, 0);
        let settings = Settings::default();
        let mut today = DailyRecord::new(now, &settings);
        today.actual_intake_ml = 250;
        let mut history = Vec::new();
        for offset in 1..30 {
            if offset == 14 {
                continue;
            }
            let day = now.date_naive() - chrono::Duration::days(offset);
            history.push(history_item(&day.format("%Y-%m-%d").to_string(), 250, 2000));
        }
        let state = PersistedState {
            settings,
            today,
            history,
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        };

        assert!(!evaluate_achievement_receipts(&state, now)
            .iter()
            .any(|receipt| receipt.achievement_id == "drink_streak_30"));
    }

    #[test]
    fn achievement_receipts_are_permanent_and_remote_merge_keeps_earlier_valid_receipt() {
        let local = achievement_test_receipt("first_sip", "2026-06-20T12:00:00+08:00");
        let remote_earlier = achievement_test_receipt("first_sip", "2026-06-19T12:00:00+08:00");
        let remote_unknown = achievement_test_receipt("not_published", "2026-06-01T12:00:00+08:00");

        let merged = merge_achievement_receipts(&[local], &[remote_earlier.clone(), remote_unknown]);
        assert_eq!(merged, vec![remote_earlier]);
    }

    #[test]
    fn legacy_state_defaults_receipts_and_backfills_without_relocking() {
        let now = local_dt(2026, 6, 30, 12, 0);
        let mut state = PersistedState::new(now);
        state.today.actual_intake_ml = 250;
        let mut json = serde_json::to_value(&state).unwrap();
        json.as_object_mut().unwrap().remove("achievements");
        let mut parsed: PersistedState = serde_json::from_value(json).unwrap();
        assert!(parsed.achievements.is_empty());

        assert!(refresh_achievements(&mut parsed, now));
        assert!(parsed
            .achievements
            .iter()
            .any(|receipt| receipt.achievement_id == "first_sip"));

        parsed.today.actual_intake_ml = 0;
        assert!(!refresh_achievements(&mut parsed, now + chrono::Duration::minutes(1)));
        assert!(parsed
            .achievements
            .iter()
            .any(|receipt| receipt.achievement_id == "first_sip"));
    }

    fn achievement_test_receipt(id: &str, unlocked_at: &str) -> AchievementReceipt {
        AchievementReceipt {
            achievement_id: id.to_string(),
            unlocked_at: unlocked_at.to_string(),
            evidence: AchievementEvidence {
                kind: "daily".to_string(),
                start_day: None,
                end_day: Some("2026-06-19".to_string()),
                crop_type: None,
                value: Some(1),
            },
        }
    }

    #[test]
    fn achievement_receipt_serialization_omits_absent_optional_evidence() {
        let receipt = achievement_test_receipt("first_sip", "2026-06-20T12:00:00+08:00");
        let serialized = serde_json::to_value(receipt).unwrap();
        let evidence = serialized["evidence"].as_object().unwrap();

        assert!(!evidence.contains_key("startDay"));
        assert!(!evidence.contains_key("cropType"));
        assert_eq!(evidence["endDay"], "2026-06-19");
        assert_eq!(evidence["value"], 1);
    }
}


