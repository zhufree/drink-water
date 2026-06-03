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
        guard.today.target_ml = settings.daily_target_ml;
        guard.today.cup_size_ml = settings.cup_size_ml;
        guard.today.reminder_interval_minutes = settings.reminder_interval_minutes;
        guard.today.active_start_hour = settings.active_start_hour;
        guard.today.active_end_hour = settings.active_end_hour;
        guard.today.updated_at = Local::now().to_rfc3339();
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
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to log water".to_string())?;

        reconcile(&mut guard, Local::now());

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
        guard.today.last_drink_at = Some(Local::now().to_rfc3339());
        guard.today.updated_at = Local::now().to_rfc3339();

        if guard.today.pending_slot_index.is_some() {
            guard.today.pending_slot_index = None;
            guard.today.pending_since = None;
            guard.today.snooze_until = None;
            guard.today.completed_reminder_slots =
                guard.today.completed_reminder_slots.saturating_add(1);
        }

        guard.today.effective_intake_ml = guard.today.actual_intake_ml;
        guard.today.debt_ml = 0;
    }

    state.save()?;
    emit_state_updated(&app);
    update_state_and_snapshot(&app, &state)
}

#[tauri::command]
fn undo_last_drink(app: AppHandle, state: State<'_, AppState>) -> Result<TodayStatus, String> {
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
        guard.today.updated_at = Local::now().to_rfc3339();

        reconcile(&mut guard, Local::now());
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
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to plant seed".to_string())?;
        reconcile(&mut guard, Local::now());
        plant_seed_in_state(&mut guard, &day_key, &seed_type, Local::now())?;
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
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to harvest crop".to_string())?;
        reconcile(&mut guard, Local::now());
        harvest_crop_in_state(&mut guard, &day_key, Local::now())?;
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
) -> Result<GardenState, String> {
    let target_seed_type = normalize_seed_type(&target_seed_type)?;
    let source_crop_type = source_crop_type.trim().to_string();
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to exchange produce".to_string())?;
        reconcile(&mut guard, Local::now());
        exchange_produce_in_state(&mut guard, &source_crop_type, &target_seed_type)?;
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
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to redeem background reward".to_string())?;
        reconcile(&mut guard, Local::now());
        redeem_background_reward_in_state(&mut guard, reward_id.trim())?;
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
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to start rest break".to_string())?;
        reconcile(&mut guard, Local::now());
        start_rest_break_in_state(&mut guard, Local::now())?;
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
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to cancel rest break".to_string())?;
        reconcile(&mut guard, Local::now());
        cancel_rest_break_in_state(&mut guard)?;
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
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to complete rest break".to_string())?;
        reconcile(&mut guard, Local::now());
        complete_rest_break_in_state(&mut guard, Local::now())?;
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
    parsed.settings = parsed.settings.sanitize();
    parsed.today.target_ml = parsed.settings.daily_target_ml;
    parsed.today.cup_size_ml = parsed.settings.cup_size_ml;
    parsed.today.reminder_interval_minutes = parsed.settings.reminder_interval_minutes;
    parsed.today.active_start_hour = parsed.settings.active_start_hour;
    parsed.today.active_end_hour = parsed.settings.active_end_hour;
    parsed.today.effective_intake_ml = parsed.today.actual_intake_ml;
    parsed.today.debt_ml = 0;
    parsed.normalize_history();
    parsed.normalize_garden();
    reconcile(&mut parsed, Local::now());

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

    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to update yesterday history".to_string())?;
        apply_yesterday_catch_up(&mut guard, Local::now(), amount_ml)?;
    }

    state.save()?;
    emit_state_updated(&app);
    Ok(true)
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

