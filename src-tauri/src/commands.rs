#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read settings".to_string())?;
    Ok(guard.settings.clone())
}

#[tauri::command]
fn save_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<Settings, String> {
    let settings = settings.sanitize();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to save settings".to_string())?;
        guard.settings = settings.clone();
        guard.sync_meta.pairing_device_id = settings.device_id.clone();
        guard.today.target_ml = settings.daily_target_ml;
        guard.today.cup_size_ml = settings.cup_size_ml;
        guard.today.reminder_interval_minutes = settings.reminder_interval_minutes;
        guard.today.active_start_hour = settings.active_start_hour;
        guard.today.active_end_hour = settings.active_end_hour;
        guard.today.updated_at = Local::now().to_rfc3339();
        let now = Local::now();
        let today_day_key = guard.today.day_key.clone();
        touch_daily_snapshot(&mut guard, &today_day_key, now);
        touch_settings_snapshot(&mut guard, now);
        guard.normalize_sync_meta();
    }

    state.save()?;
    emit_state_updated(&app);
    Ok(settings)
}

#[tauri::command]
fn get_today_status(app: AppHandle, state: State<'_, AppState>) -> Result<TodayStatus, String> {
    update_state_and_snapshot(&app, &state)
}

#[tauri::command]
fn log_drink(
    app: AppHandle,
    state: State<'_, AppState>,
    amount_ml: u32,
) -> Result<TodayStatus, String> {
    let amount_ml = amount_ml.max(1);
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to log water".to_string())?;

        reconcile(&mut guard, now);

        guard.today.last_log_undo = Some(DrinkUndoSnapshot {
            actual_intake_ml: guard.today.actual_intake_ml,
            effective_intake_ml: guard.today.effective_intake_ml,
            debt_ml: guard.today.debt_ml,
            pending_slot_index: guard.today.pending_slot_index,
            pending_since: guard.today.pending_since.clone(),
            snooze_until: guard.today.snooze_until.clone(),
            completed_reminder_slots: guard.today.completed_reminder_slots,
            last_drink_at: guard.today.last_drink_at.clone(),
            notification_token: guard.today.notification_token,
            last_notified_token: guard.today.last_notified_token,
        });
        guard.today.last_logged_amount_ml = Some(amount_ml);
        guard.today.actual_intake_ml = guard.today.actual_intake_ml.saturating_add(amount_ml);
        guard.today.last_drink_at = Some(now.to_rfc3339());
        guard.today.updated_at = now.to_rfc3339();

        if guard.today.pending_slot_index.is_some() {
            guard.today.pending_slot_index = None;
            guard.today.pending_since = None;
            guard.today.snooze_until = None;
            guard.today.completed_reminder_slots =
                guard.today.completed_reminder_slots.saturating_add(1);
        }

        guard.today.effective_intake_ml = guard.today.actual_intake_ml;
        guard.today.debt_ml = 0;
        let day_key = guard.today.day_key.clone();
        touch_daily_snapshot(&mut guard, &day_key, now);
    }

    state.save()?;
    emit_state_updated(&app);
    update_state_and_snapshot(&app, &state)
}

#[tauri::command]
fn undo_last_drink(app: AppHandle, state: State<'_, AppState>) -> Result<TodayStatus, String> {
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to undo water log".to_string())?;

        let Some(snapshot) = guard.today.last_log_undo.clone() else {
            return Err("there is no drink record to undo".to_string());
        };

        guard.today.actual_intake_ml = snapshot.actual_intake_ml;
        guard.today.effective_intake_ml = snapshot.effective_intake_ml;
        guard.today.debt_ml = snapshot.debt_ml;
        guard.today.pending_slot_index = snapshot.pending_slot_index;
        guard.today.pending_since = snapshot.pending_since;
        guard.today.snooze_until = snapshot.snooze_until;
        guard.today.completed_reminder_slots = snapshot.completed_reminder_slots;
        guard.today.last_drink_at = snapshot.last_drink_at;
        guard.today.notification_token = snapshot.notification_token;
        guard.today.last_notified_token = snapshot.last_notified_token;
        guard.today.last_logged_amount_ml = None;
        guard.today.last_log_undo = None;
        guard.today.updated_at = now.to_rfc3339();

        reconcile(&mut guard, now);
        let day_key = guard.today.day_key.clone();
        touch_daily_snapshot(&mut guard, &day_key, now);
    }

    state.save()?;
    emit_state_updated(&app);
    update_state_and_snapshot(&app, &state)
}

#[tauri::command]
fn toggle_autostart(
    app: AppHandle,
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|error| error.to_string())?;
    } else {
        autostart.disable().map_err(|error| error.to_string())?;
    }

    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to update autostart state".to_string())?;
        guard.settings.autostart_enabled = enabled;
        guard.today.updated_at = Local::now().to_rfc3339();
    }

    state.save()?;
    emit_state_updated(&app);
    Ok(enabled)
}

#[tauri::command]
fn dismiss_or_snooze_reminder(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<TodayStatus, String> {
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to handle reminder".to_string())?;
        reconcile(&mut guard, Local::now());

        if guard.today.pending_slot_index.is_some() {
            let snooze_until = Local::now() + chrono::Duration::minutes(SNOOZE_MINUTES);
            guard.today.snooze_until = Some(snooze_until.to_rfc3339());
            guard.today.updated_at = Local::now().to_rfc3339();
        }
    }

    state.save()?;
    emit_state_updated(&app);
    update_state_and_snapshot(&app, &state)
}

#[tauri::command]
fn get_history(
    app: AppHandle,
    state: State<'_, AppState>,
    range: usize,
) -> Result<Vec<HistoryItem>, String> {
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to read history".to_string())?;
        reconcile(&mut guard, Local::now());
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read history".to_string())?;
    let mut items = guard.history.clone();
    items.push(guard.today.summary());
    items.sort_by(|left, right| right.day_key.cmp(&left.day_key));
    items.truncate(range.max(1));
    let _ = app;
    Ok(items)
}

#[tauri::command]
fn get_garden_state(state: State<'_, AppState>) -> Result<GardenState, String> {
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to read garden state".to_string())?;
        reconcile(&mut guard, Local::now());
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden state".to_string())?;
    Ok(guard.garden.clone())
}

#[tauri::command]
fn plant_seed(
    _app: AppHandle,
    state: State<'_, AppState>,
    day_key: String,
    seed_type: String,
) -> Result<GardenState, String> {
    let seed_type = normalize_seed_type(&seed_type)?;
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to plant seed".to_string())?;
        reconcile(&mut guard, now);
        plant_seed_in_state(&mut guard, &day_key, &seed_type, now)?;
        touch_garden_snapshot(&mut guard, now);
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden state".to_string())?;
    Ok(guard.garden.clone())
}

#[tauri::command]
fn harvest_crop(
    _app: AppHandle,
    state: State<'_, AppState>,
    day_key: String,
) -> Result<GardenState, String> {
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to harvest crop".to_string())?;
        reconcile(&mut guard, now);
        harvest_crop_in_state(&mut guard, &day_key, now)?;
        touch_garden_snapshot(&mut guard, now);
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden state".to_string())?;
    Ok(guard.garden.clone())
}

#[tauri::command]
fn exchange_produce(
    state: State<'_, AppState>,
    source_crop_type: String,
    target_seed_type: String,
    quantity: Option<u32>,
) -> Result<GardenState, String> {
    let target_seed_type = normalize_seed_type(&target_seed_type)?;
    let source_crop_type = source_crop_type.trim().to_string();
    let quantity = quantity.unwrap_or(1).max(1);
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to exchange produce".to_string())?;
        reconcile(&mut guard, now);
        exchange_produce_in_state(&mut guard, &source_crop_type, &target_seed_type, quantity)?;
        touch_garden_snapshot(&mut guard, now);
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden state".to_string())?;
    Ok(guard.garden.clone())
}

#[tauri::command]
fn redeem_background_reward(
    state: State<'_, AppState>,
    reward_id: String,
) -> Result<GardenState, String> {
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to redeem background reward".to_string())?;
        reconcile(&mut guard, now);
        redeem_background_reward_in_state(&mut guard, reward_id.trim())?;
        touch_garden_snapshot(&mut guard, now);
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden state".to_string())?;
    Ok(guard.garden.clone())
}

#[tauri::command]
fn start_rest_break(state: State<'_, AppState>) -> Result<GardenState, String> {
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to start rest break".to_string())?;
        reconcile(&mut guard, now);
        start_rest_break_in_state(&mut guard, now)?;
        touch_garden_snapshot(&mut guard, now);
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden state".to_string())?;
    Ok(guard.garden.clone())
}

#[tauri::command]
fn cancel_rest_break(state: State<'_, AppState>) -> Result<GardenState, String> {
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to cancel rest break".to_string())?;
        reconcile(&mut guard, now);
        cancel_rest_break_in_state(&mut guard)?;
        touch_garden_snapshot(&mut guard, now);
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden state".to_string())?;
    Ok(guard.garden.clone())
}

#[tauri::command]
fn complete_rest_break(state: State<'_, AppState>) -> Result<GardenState, String> {
    let now = Local::now();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to complete rest break".to_string())?;
        reconcile(&mut guard, now);
        complete_rest_break_in_state(&mut guard, now)?;
        touch_garden_snapshot(&mut guard, now);
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden state".to_string())?;
    Ok(guard.garden.clone())
}

#[tauri::command]
fn export_data(app: AppHandle, state: State<'_, AppState>) -> Result<bool, String> {
    state.save()?;

    let selected = app
        .dialog()
        .file()
        .set_title("Export Drink Water data")
        .set_file_name("drink-water-data.json")
        .add_filter("JSON", &["json"])
        .blocking_save_file();

    let Some(file_path) = selected else {
        return Ok(false);
    };

    let destination = file_path.into_path().map_err(|error| error.to_string())?;
    let content = fs::read_to_string(&state.store_path).map_err(|error| error.to_string())?;
    fs::write(destination, content).map_err(|error| error.to_string())?;
    Ok(true)
}

#[tauri::command]
fn import_data(app: AppHandle, state: State<'_, AppState>) -> Result<bool, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Import Drink Water data")
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    let Some(file_path) = selected else {
        return Ok(false);
    };

    let source = file_path.into_path().map_err(|error| error.to_string())?;
    let content = fs::read_to_string(source).map_err(|error| error.to_string())?;
    let mut parsed =
        serde_json::from_str::<PersistedState>(&content).map_err(|error| error.to_string())?;
    normalize_imported_state(&mut parsed);

    state.replace_data(parsed)?;
    state.save()?;
    emit_state_updated(&app);
    Ok(true)
}

#[tauri::command]
fn log_yesterday_drink(
    app: AppHandle,
    state: State<'_, AppState>,
    amount_ml: u32,
) -> Result<bool, String> {
    let amount_ml = amount_ml.max(50);
    let now = Local::now();

    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to update yesterday history".to_string())?;
        apply_yesterday_catch_up(&mut guard, now, amount_ml)?;
        let yesterday = day_key(now - chrono::Duration::days(1));
        touch_daily_snapshot(&mut guard, &yesterday, now);
    }

    state.save()?;
    emit_state_updated(&app);
    Ok(true)
}

#[tauri::command]
fn get_sync_meta(state: State<'_, AppState>) -> Result<SyncMeta, String> {
    let mut guard = state
        .data
        .lock()
        .map_err(|_| "failed to read sync metadata".to_string())?;
    reconcile(&mut guard, Local::now());
    guard.normalize_sync_meta();
    Ok(guard.sync_meta.clone())
}

#[tauri::command]
fn set_sync_account(
    app: AppHandle,
    state: State<'_, AppState>,
    account_id: String,
) -> Result<SyncMeta, String> {
    let account_id = normalize_account_id(&account_id)?;
    let meta = {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to update sync account".to_string())?;
        guard.sync_meta.account_id = Some(account_id);
        guard.normalize_sync_meta();
        guard.sync_meta.clone()
    };
    state.save()?;
    emit_state_updated(&app);
    Ok(meta)
}

#[tauri::command]
fn get_recent_daily_snapshots(
    state: State<'_, AppState>,
    range_days: usize,
) -> Result<Vec<DailySnapshotRecord>, String> {
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to read sync daily snapshots".to_string())?;
        reconcile(&mut guard, Local::now());
        guard.normalize_sync_meta();
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read sync daily snapshots".to_string())?;
    Ok(build_recent_daily_snapshots(&guard, range_days.max(1), Local::now()))
}

#[tauri::command]
fn get_garden_snapshot(state: State<'_, AppState>) -> Result<GardenSnapshotRecord, String> {
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to read garden sync snapshot".to_string())?;
        reconcile(&mut guard, Local::now());
        guard.normalize_sync_meta();
        if guard.sync_meta.garden_updated_at.is_none() {
            touch_garden_snapshot(&mut guard, Local::now());
        }
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read garden sync snapshot".to_string())?;
    Ok(GardenSnapshotRecord {
        snapshot: guard.garden.clone(),
        updated_at: guard
            .sync_meta
            .garden_updated_at
            .clone()
            .unwrap_or_else(|| Local::now().to_rfc3339()),
        updated_by_device_id: guard.settings.device_id.clone(),
    })
}

#[tauri::command]
fn get_settings_snapshot(state: State<'_, AppState>) -> Result<SettingsSnapshotRecord, String> {
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to read settings sync snapshot".to_string())?;
        guard.normalize_sync_meta();
        if guard.sync_meta.settings_updated_at.is_none() {
            touch_settings_snapshot(&mut guard, Local::now());
        }
    }

    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read settings sync snapshot".to_string())?;
    Ok(SettingsSnapshotRecord {
        snapshot: build_settings_snapshot(&guard.settings),
        updated_at: guard
            .sync_meta
            .settings_updated_at
            .clone()
            .unwrap_or_else(|| Local::now().to_rfc3339()),
        updated_by_device_id: guard
            .sync_meta
            .settings_updated_by_device_id
            .clone()
            .unwrap_or_else(|| guard.settings.device_id.clone()),
    })
}

#[tauri::command]
fn apply_remote_snapshots(
    app: AppHandle,
    state: State<'_, AppState>,
    account_id: String,
    daily_snapshots: Vec<DailySnapshotRecord>,
    garden_snapshot: Option<GardenSnapshotRecord>,
    pulled_at: String,
) -> Result<bool, String> {
    let account_id = normalize_account_id(&account_id)?;
    let mut changed = false;
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to apply remote snapshots".to_string())?;
        reconcile(&mut guard, Local::now());
        guard.sync_meta.account_id = Some(account_id);
        guard.sync_meta.last_daily_pull_at = Some(pulled_at.clone());
        guard.sync_meta.last_garden_pull_at = Some(pulled_at.clone());

        for remote in daily_snapshots {
            let local_updated_at = if remote.day_key == guard.today.day_key {
                Some(guard.today.updated_at.clone())
            } else {
                guard
                    .sync_meta
                    .daily_snapshot_updated_at_by_day
                    .get(&remote.day_key)
                    .cloned()
                    .or_else(|| Some(fallback_snapshot_updated_at(&remote.day_key)))
            };
            let local_updated_by = if remote.day_key == guard.today.day_key {
                Some(guard.settings.device_id.clone())
            } else {
                guard
                    .sync_meta
                    .daily_snapshot_updated_by_device_id_by_day
                    .get(&remote.day_key)
                    .cloned()
            };

            if should_apply_remote_snapshot(
                local_updated_at.as_deref(),
                local_updated_by.as_deref(),
                &remote.updated_at,
                &remote.updated_by_device_id,
            ) {
                apply_daily_snapshot(&mut guard, &remote);
                guard
                    .sync_meta
                    .daily_snapshot_updated_at_by_day
                    .insert(remote.day_key.clone(), remote.updated_at.clone());
                guard
                    .sync_meta
                    .daily_snapshot_updated_by_device_id_by_day
                    .insert(remote.day_key.clone(), remote.updated_by_device_id.clone());
                changed = true;
            }
        }

        if let Some(remote_garden) = garden_snapshot {
            if should_apply_remote_snapshot(
                guard.sync_meta.garden_updated_at.as_deref(),
                guard.sync_meta.garden_updated_by_device_id.as_deref(),
                &remote_garden.updated_at,
                &remote_garden.updated_by_device_id,
            ) {
                guard.garden = remote_garden.snapshot;
                guard.normalize_garden();
                guard.sync_meta.garden_updated_at = Some(remote_garden.updated_at);
                guard.sync_meta.garden_updated_by_device_id = Some(remote_garden.updated_by_device_id);
                changed = true;
            }
        }

        guard.normalize_sync_meta();
    }

    state.save()?;
    if changed {
        emit_state_updated(&app);
    }
    Ok(changed)
}

#[tauri::command]
fn apply_remote_settings_snapshot(
    app: AppHandle,
    state: State<'_, AppState>,
    settings_snapshot: Option<SettingsSnapshotRecord>,
    _pulled_at: String,
) -> Result<bool, String> {
    let mut changed = false;
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to apply remote settings snapshot".to_string())?;
        if let Some(remote_settings) = settings_snapshot {
            if should_apply_remote_snapshot(
                guard.sync_meta.settings_updated_at.as_deref(),
                guard.sync_meta.settings_updated_by_device_id.as_deref(),
                &remote_settings.updated_at,
                &remote_settings.updated_by_device_id,
            ) {
                apply_settings_snapshot(&mut guard, remote_settings);
                changed = true;
            }
        }
        guard.normalize_sync_meta();
    }

    state.save()?;
    if changed {
        emit_state_updated(&app);
    }
    Ok(changed)
}

#[tauri::command]
fn export_cloud_backup_payload(state: State<'_, AppState>) -> Result<String, String> {
    let data = state
        .data
        .lock()
        .map_err(|_| "failed to read local state".to_string())?
        .clone();
    serde_json::to_string_pretty(&data).map_err(|error| error.to_string())
}

#[tauri::command]
fn import_cloud_backup_payload(
    app: AppHandle,
    state: State<'_, AppState>,
    payload: String,
) -> Result<bool, String> {
    let mut parsed =
        serde_json::from_str::<PersistedState>(&payload).map_err(|error| error.to_string())?;
    normalize_imported_state(&mut parsed);

    state.replace_data(parsed)?;
    state.save()?;
    emit_state_updated(&app);
    Ok(true)
}

#[tauri::command]
fn mark_cloud_backup_uploaded(
    state: State<'_, AppState>,
    uploaded_at: String,
) -> Result<SyncMeta, String> {
    let meta = {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to update backup metadata".to_string())?;
        guard.sync_meta.last_backup_at = Some(uploaded_at);
        guard.normalize_sync_meta();
        guard.sync_meta.clone()
    };
    state.save()?;
    Ok(meta)
}

#[tauri::command]
fn mark_startup_catch_up_prompt_shown(state: State<'_, AppState>) -> Result<SyncMeta, String> {
    let meta = {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to update startup catch-up metadata".to_string())?;
        guard.sync_meta.last_startup_catch_up_prompt_day = Some(day_key(Local::now()));
        guard.normalize_sync_meta();
        guard.sync_meta.clone()
    };
    state.save()?;
    Ok(meta)
}

#[tauri::command]
async fn leaderboard_request(
    method: String,
    path: String,
    query: Option<Vec<(String, String)>>,
    body: Option<Value>,
) -> Result<Value, String> {
    let method = Method::from_bytes(method.trim().to_uppercase().as_bytes())
        .map_err(|error| error.to_string())?;
    let path = if path.starts_with('/') {
        path
    } else {
        format!("/{path}")
    };

    let mut url = reqwest::Url::parse(&format!("{LEADERBOARD_API_BASE}{path}"))
        .map_err(|error| error.to_string())?;
    if let Some(query) = query {
        let mut pairs = url.query_pairs_mut();
        for (key, value) in query {
            pairs.append_pair(&key, &value);
        }
        drop(pairs);
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|error| error.to_string())?;

    let mut request = client.request(method, url);
    if let Some(body) = body {
        request = request.json(&body);
    }

    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    let value = response
        .json::<Value>()
        .await
        .map_err(|error| error.to_string())?;

    if !status.is_success() {
        let message = value
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Request failed");
        return Err(message.to_string());
    }

    Ok(value)
}

fn normalize_imported_state(parsed: &mut PersistedState) {
    parsed.settings = parsed.settings.clone().sanitize();
    parsed.today.target_ml = parsed.settings.daily_target_ml;
    parsed.today.cup_size_ml = parsed.settings.cup_size_ml;
    parsed.today.reminder_interval_minutes = parsed.settings.reminder_interval_minutes;
    parsed.today.active_start_hour = parsed.settings.active_start_hour;
    parsed.today.active_end_hour = parsed.settings.active_end_hour;
    parsed.today.effective_intake_ml = parsed.today.actual_intake_ml;
    parsed.today.debt_ml = 0;
    parsed.normalize_history();
    parsed.normalize_garden();
    parsed.normalize_sync_meta();
    reconcile(parsed, Local::now());
}

fn normalize_account_id(account_id: &str) -> Result<String, String> {
    let normalized: String = account_id.trim().chars().take(128).collect();
    if normalized.is_empty() {
        return Err("accountId is required".to_string());
    }
    Ok(normalized)
}

fn touch_daily_snapshot(state: &mut PersistedState, day_key: &str, now: DateTime<Local>) {
    state
        .sync_meta
        .daily_snapshot_updated_at_by_day
        .insert(day_key.to_string(), now.to_rfc3339());
    state.sync_meta.daily_snapshot_updated_by_device_id_by_day.insert(
        day_key.to_string(),
        state.settings.device_id.clone(),
    );
}

fn touch_garden_snapshot(state: &mut PersistedState, now: DateTime<Local>) {
    state.sync_meta.garden_updated_at = Some(now.to_rfc3339());
    state.sync_meta.garden_updated_by_device_id = Some(state.settings.device_id.clone());
}

fn touch_settings_snapshot(state: &mut PersistedState, now: DateTime<Local>) {
    state.sync_meta.settings_updated_at = Some(now.to_rfc3339());
    state.sync_meta.settings_updated_by_device_id = Some(state.settings.device_id.clone());
}

fn build_settings_snapshot(settings: &Settings) -> SettingsSnapshot {
    SettingsSnapshot {
        daily_target_ml: settings.daily_target_ml,
        cup_size_ml: settings.cup_size_ml,
        cup_step_ml: settings.cup_step_ml,
        reminder_interval_minutes: settings.reminder_interval_minutes,
        active_start_hour: settings.active_start_hour,
        active_end_hour: settings.active_end_hour,
        locale: settings.locale.clone(),
    }
}

fn build_recent_daily_snapshots(
    state: &PersistedState,
    range_days: usize,
    now: DateTime<Local>,
) -> Vec<DailySnapshotRecord> {
    let cutoff = now.date_naive() - chrono::Duration::days((range_days.saturating_sub(1)) as i64);
    let mut snapshots = Vec::new();

    for item in &state.history {
        let Ok(day) = NaiveDate::parse_from_str(&item.day_key, "%Y-%m-%d") else {
            continue;
        };
        if day < cutoff {
            continue;
        }
        let updated_at = state
            .sync_meta
            .daily_snapshot_updated_at_by_day
            .get(&item.day_key)
            .cloned()
            .unwrap_or_else(|| fallback_snapshot_updated_at(&item.day_key));
        let updated_by_device_id = state
            .sync_meta
            .daily_snapshot_updated_by_device_id_by_day
            .get(&item.day_key)
            .cloned()
            .unwrap_or_else(|| state.settings.device_id.clone());
        snapshots.push(DailySnapshotRecord {
            day_key: item.day_key.clone(),
            snapshot: item.clone(),
            updated_at,
            updated_by_device_id,
        });
    }

    let today_day = NaiveDate::parse_from_str(&state.today.day_key, "%Y-%m-%d").ok();
    if today_day.map(|day| day >= cutoff).unwrap_or(true) {
        snapshots.retain(|item| item.day_key != state.today.day_key);
        snapshots.push(DailySnapshotRecord {
            day_key: state.today.day_key.clone(),
            snapshot: state.today.summary(),
            updated_at: state.today.updated_at.clone(),
            updated_by_device_id: state.settings.device_id.clone(),
        });
    }

    snapshots.sort_by(|left, right| right.day_key.cmp(&left.day_key));
    snapshots
}

fn fallback_snapshot_updated_at(day_key: &str) -> String {
    NaiveDate::parse_from_str(day_key, "%Y-%m-%d")
        .ok()
        .and_then(|day| {
            let naive = day.and_hms_opt(0, 0, 0)?;
            Local
                .from_local_datetime(&naive)
                .single()
                .map(|value| value.to_rfc3339())
        })
        .unwrap_or_else(|| Local::now().to_rfc3339())
}

fn should_apply_remote_snapshot(
    local_updated_at: Option<&str>,
    local_updated_by_device_id: Option<&str>,
    remote_updated_at: &str,
    remote_updated_by_device_id: &str,
) -> bool {
    match local_updated_at {
        None => true,
        Some(local_updated_at) if remote_updated_at > local_updated_at => true,
        Some(local_updated_at) if remote_updated_at < local_updated_at => false,
        Some(_) => remote_updated_by_device_id > local_updated_by_device_id.unwrap_or(""),
    }
}

fn apply_daily_snapshot(state: &mut PersistedState, remote: &DailySnapshotRecord) {
    if remote.day_key == state.today.day_key {
        state.today.target_ml = remote.snapshot.target_ml;
        state.today.actual_intake_ml = remote.snapshot.actual_intake_ml;
        state.today.effective_intake_ml = remote.snapshot.actual_intake_ml;
        state.today.debt_ml = 0;
        state.today.total_debt_incurred_ml = remote.snapshot.debt_incurred_ml;
        state.today.completed_reminder_slots = remote.snapshot.completed_reminder_slots;
        state.today.missed_reminder_slots = remote.snapshot.missed_reminder_slots;
        state.today.pending_slot_index = None;
        state.today.pending_since = None;
        state.today.last_slot_spawned = None;
        state.today.last_logged_amount_ml = None;
        state.today.last_log_undo = None;
        state.today.updated_at = remote.updated_at.clone();
        return;
    }

    if let Some(existing) = state
        .history
        .iter_mut()
        .find(|item| item.day_key == remote.day_key)
    {
        *existing = remote.snapshot.clone();
    } else {
        state.history.push(remote.snapshot.clone());
        state.history.sort_by(|left, right| right.day_key.cmp(&left.day_key));
    }
}

fn apply_settings_snapshot(state: &mut PersistedState, remote: SettingsSnapshotRecord) {
    let next_settings = Settings {
        daily_target_ml: remote.snapshot.daily_target_ml,
        cup_size_ml: remote.snapshot.cup_size_ml,
        cup_step_ml: remote.snapshot.cup_step_ml,
        panel_opacity_percent: state.settings.panel_opacity_percent,
        panel_blur_px: state.settings.panel_blur_px,
        device_id: state.settings.device_id.clone(),
        display_name: state.settings.display_name.clone(),
        active_circle_code: state.settings.active_circle_code.clone(),
        active_circle_name: state.settings.active_circle_name.clone(),
        reminder_interval_minutes: remote.snapshot.reminder_interval_minutes,
        active_start_hour: remote.snapshot.active_start_hour,
        active_end_hour: remote.snapshot.active_end_hour,
        notifications_enabled: state.settings.notifications_enabled,
        autostart_enabled: state.settings.autostart_enabled,
        locale: remote.snapshot.locale,
    }
    .sanitize();

    state.settings = next_settings;
    state.today.target_ml = state.settings.daily_target_ml;
    state.today.cup_size_ml = state.settings.cup_size_ml;
    state.today.reminder_interval_minutes = state.settings.reminder_interval_minutes;
    state.today.active_start_hour = state.settings.active_start_hour;
    state.today.active_end_hour = state.settings.active_end_hour;
    state.today.updated_at = remote.updated_at.clone();
    state.sync_meta.settings_updated_at = Some(remote.updated_at);
    state.sync_meta.settings_updated_by_device_id = Some(remote.updated_by_device_id);
    state.normalize_sync_meta();
}
