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

    #[test]
    fn missed_slots_accumulate_history_debt_by_cup_size() {
        let settings = Settings::default();
        let mut state = PersistedState {
            today: DailyRecord::new(local_dt(2026, 5, 19, 8, 0), &settings),
            settings,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
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
        }
        .sanitize();

        assert_eq!(settings.reminder_interval_minutes, 97);
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
        }
        .sanitize();
        let mut state = PersistedState {
            today: DailyRecord::new(local_dt(2026, 5, 20, 9, 0), &local_settings),
            settings: local_settings,
            history: Vec::new(),
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
        };
        let remote = SettingsSnapshotRecord {
            snapshot: SettingsSnapshot {
                daily_target_ml: 2600,
                cup_size_ml: 400,
                cup_step_ml: 100,
                reminder_interval_minutes: 120,
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
        };
        let mut value = serde_json::to_value(state).unwrap();
        value.as_object_mut().unwrap().remove("garden");

        let parsed = serde_json::from_value::<PersistedState>(value).unwrap();
        assert!(parsed.garden.initial_grant_claimed);
        assert_eq!(parsed.garden.seeds[0].seed_type, BASIC_SEED_TYPE);
        assert_eq!(parsed.garden.seeds[0].count, INITIAL_BASIC_SEEDS);

        let mut existing = parsed.clone();
        existing.normalize_garden();
        assert_eq!(existing.garden.seeds[0].count, INITIAL_BASIC_SEEDS);
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
                    { "seedType": BASIC_SEED_TYPE, "count": INITIAL_BASIC_SEEDS }
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
    fn planting_requires_water_record_and_spends_seed() {
        let settings = Settings::default();
        let now = local_dt(2026, 5, 20, 9, 0);
        let mut state = PersistedState {
            settings: settings.clone(),
            today: DailyRecord::new(now, &settings),
            history: vec![history_item("2026-05-19", 250, 2000)],
            garden: GardenState::default(),
            sync_meta: SyncMeta::default(),
        };

        plant_seed_in_state(
            &mut state,
            "2026-05-19",
            BASIC_SEED_TYPE,
            local_dt(2026, 5, 20, 9, 0),
        )
        .unwrap();

        assert_eq!(state.garden.crops.len(), 1);
        assert_eq!(state.garden.seeds[0].count, INITIAL_BASIC_SEEDS - 1);
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
        };

        plant_seed_in_state(&mut state, "2026-05-19", BASIC_SEED_TYPE, now).unwrap();
        assert!(harvest_crop_in_state(&mut state, "2026-05-19", now).is_err());

        state.garden.crops[0].planted_at = (now - chrono::Duration::days(1)).to_rfc3339();
        harvest_crop_in_state(&mut state, "2026-05-19", now).unwrap();

        assert_eq!(state.garden.collection.len(), 1);
        assert_eq!(state.garden.collection[0].crop_type, POTATO_CROP_TYPE);
        assert_eq!(state.garden.collection[0].harvest_count, 1);
        let basic_seed_count = state
            .garden
            .seeds
            .iter()
            .find(|item| item.seed_type == BASIC_SEED_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);
        assert!((INITIAL_BASIC_SEEDS..=INITIAL_BASIC_SEEDS + 2).contains(&basic_seed_count));
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

            let basic_seed_count = state
                .garden
                .seeds
                .iter()
                .find(|item| item.seed_type == BASIC_SEED_TYPE)
                .map(|item| item.count)
                .unwrap_or(0);
            let rewarded = basic_seed_count.saturating_sub(INITIAL_BASIC_SEEDS - 1);
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
        assert_eq!(advanced_seed_count, 1);
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
        };

        add_produce(&mut state.garden, POTATO_CROP_TYPE, 4);
        exchange_produce_in_state(&mut state, POTATO_CROP_TYPE, BELL_PEPPER_SEED_TYPE, 1).unwrap();
        exchange_produce_in_state(&mut state, POTATO_CROP_TYPE, PEA_SEED_TYPE, 1).unwrap();

        let pea_seed_count = state
            .garden
            .seeds
            .iter()
            .find(|item| item.seed_type == PEA_SEED_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);
        let cabbage_seed_count = state
            .garden
            .seeds
            .iter()
            .find(|item| item.seed_type == BELL_PEPPER_SEED_TYPE)
            .map(|item| item.count)
            .unwrap_or(0);

        assert_eq!(pea_seed_count, 1);
        assert_eq!(cabbage_seed_count, 1);
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
        };

        add_produce(&mut state.garden, BELL_PEPPER_CROP_TYPE, 2);
        assert!(exchange_produce_in_state(&mut state, BELL_PEPPER_CROP_TYPE, PEA_SEED_TYPE, 1).is_err());

        add_produce(&mut state.garden, BELL_PEPPER_CROP_TYPE, 1);
        assert!(exchange_produce_in_state(&mut state, BELL_PEPPER_CROP_TYPE, PEA_SEED_TYPE, 1).is_ok());

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
        };

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
}


