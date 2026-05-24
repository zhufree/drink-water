use std::{
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Duration,
};

use chrono::{DateTime, Local, NaiveDate, NaiveDateTime, NaiveTime, TimeZone, Timelike};
use serde::{Deserialize, Serialize};
use tauri::{
    async_runtime::spawn,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartExt};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;

const STORE_FILE_NAME: &str = "drink-water-state.json";
const STATE_EVENT: &str = "state-updated";
const SNOOZE_MINUTES: i64 = 10;

fn default_locale() -> String {
    "zh-CN".to_string()
}

fn default_cup_step_ml() -> u32 {
    50
}

fn default_empty_string() -> String {
    String::new()
}

fn normalize_locale(locale: &str) -> String {
    match locale {
        "en-US" => "en-US".to_string(),
        _ => "zh-CN".to_string(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    daily_target_ml: u32,
    cup_size_ml: u32,
    #[serde(default = "default_cup_step_ml")]
    cup_step_ml: u32,
    #[serde(default = "default_empty_string")]
    device_id: String,
    #[serde(default = "default_empty_string")]
    display_name: String,
    #[serde(default = "default_empty_string")]
    active_circle_code: String,
    #[serde(default = "default_empty_string")]
    active_circle_name: String,
    reminder_interval_minutes: u32,
    active_start_hour: u8,
    active_end_hour: u8,
    notifications_enabled: bool,
    autostart_enabled: bool,
    #[serde(default = "default_locale")]
    locale: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            daily_target_ml: 2000,
            cup_size_ml: 250,
            cup_step_ml: default_cup_step_ml(),
            device_id: default_empty_string(),
            display_name: default_empty_string(),
            active_circle_code: default_empty_string(),
            active_circle_name: default_empty_string(),
            reminder_interval_minutes: 60,
            active_start_hour: 9,
            active_end_hour: 22,
            notifications_enabled: true,
            autostart_enabled: false,
            locale: default_locale(),
        }
    }
}

impl Settings {
    fn sanitize(mut self) -> Self {
        self.daily_target_ml = self.daily_target_ml.max(500);
        self.cup_size_ml = self.cup_size_ml.max(50);
        self.cup_step_ml = self.cup_step_ml.max(10);
        self.device_id = self.device_id.trim().chars().take(128).collect();
        self.display_name = self.display_name.trim().chars().take(32).collect();
        self.active_circle_code = self
            .active_circle_code
            .trim()
            .to_uppercase()
            .chars()
            .take(6)
            .collect();
        self.active_circle_name = self.active_circle_name.trim().chars().take(48).collect();
        self.active_start_hour = self.active_start_hour.min(23);
        self.active_end_hour = self.active_end_hour.clamp(self.active_start_hour + 1, 23);
        self.locale = normalize_locale(&self.locale);
        self.reminder_interval_minutes = derived_reminder_interval_minutes(
            self.daily_target_ml,
            self.cup_size_ml,
            self.active_start_hour,
            self.active_end_hour,
        );
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrinkUndoSnapshot {
    actual_intake_ml: u32,
    effective_intake_ml: u32,
    debt_ml: u32,
    pending_slot_index: Option<u32>,
    pending_since: Option<String>,
    snooze_until: Option<String>,
    completed_reminder_slots: u32,
    last_drink_at: Option<String>,
    notification_token: u32,
    last_notified_token: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyRecord {
    day_key: String,
    target_ml: u32,
    cup_size_ml: u32,
    reminder_interval_minutes: u32,
    active_start_hour: u8,
    active_end_hour: u8,
    actual_intake_ml: u32,
    effective_intake_ml: u32,
    debt_ml: u32,
    total_debt_incurred_ml: u32,
    completed_reminder_slots: u32,
    missed_reminder_slots: u32,
    pending_slot_index: Option<u32>,
    pending_since: Option<String>,
    last_slot_spawned: Option<u32>,
    last_drink_at: Option<String>,
    #[serde(default)]
    last_logged_amount_ml: Option<u32>,
    #[serde(default)]
    last_log_undo: Option<DrinkUndoSnapshot>,
    #[serde(default)]
    notification_token: u32,
    #[serde(default)]
    last_notified_token: Option<u32>,
    snooze_until: Option<String>,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItem {
    day_key: String,
    target_ml: u32,
    actual_intake_ml: u32,
    consumed_ml: u32,
    debt_incurred_ml: u32,
    goal_met: bool,
    completed_reminder_slots: u32,
    missed_reminder_slots: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayStatus {
    target_ml: u32,
    expected_ml: u32,
    consumed_ml: u32,
    actual_intake_ml: u32,
    debt_ml: u32,
    remaining_ml: u32,
    next_reminder_at: Option<String>,
    autostart_enabled: bool,
    pending_reminder: bool,
    pending_since: Option<String>,
    completed_reminder_slots: u32,
    missed_reminder_slots: u32,
    can_undo_last_drink: bool,
    last_logged_amount_ml: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PersistedState {
    settings: Settings,
    today: DailyRecord,
    history: Vec<HistoryItem>,
}

impl PersistedState {
    fn new(now: DateTime<Local>) -> Self {
        let settings = Settings::default().sanitize();
        let today = DailyRecord::new(now, &settings);

        Self {
            settings,
            today,
            history: Vec::new(),
        }
    }

    fn normalize_history(&mut self) {
        for item in &mut self.history {
            item.consumed_ml = item.actual_intake_ml;
            item.goal_met = item.actual_intake_ml >= item.target_ml;
        }
    }
}

impl DailyRecord {
    fn new(now: DateTime<Local>, settings: &Settings) -> Self {
        Self {
            day_key: day_key(now),
            target_ml: settings.daily_target_ml,
            cup_size_ml: settings.cup_size_ml,
            reminder_interval_minutes: settings.reminder_interval_minutes,
            active_start_hour: settings.active_start_hour,
            active_end_hour: settings.active_end_hour,
            actual_intake_ml: 0,
            effective_intake_ml: 0,
            debt_ml: 0,
            total_debt_incurred_ml: 0,
            completed_reminder_slots: 0,
            missed_reminder_slots: 0,
            pending_slot_index: None,
            pending_since: None,
            last_slot_spawned: None,
            last_drink_at: None,
            last_logged_amount_ml: None,
            last_log_undo: None,
            notification_token: 0,
            last_notified_token: None,
            snooze_until: None,
            updated_at: now.to_rfc3339(),
        }
    }

    fn summary(&self) -> HistoryItem {
        HistoryItem {
            day_key: self.day_key.clone(),
            target_ml: self.target_ml,
            actual_intake_ml: self.actual_intake_ml,
            consumed_ml: self.actual_intake_ml,
            debt_incurred_ml: self.total_debt_incurred_ml,
            goal_met: self.actual_intake_ml >= self.target_ml,
            completed_reminder_slots: self.completed_reminder_slots,
            missed_reminder_slots: self.missed_reminder_slots,
        }
    }
}

struct AppState {
    store_path: PathBuf,
    data: Arc<Mutex<PersistedState>>,
}

impl AppState {
    fn load(app: &AppHandle) -> Result<Self, String> {
        let app_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;

        let store_path = app_dir.join(STORE_FILE_NAME);
        let data = if store_path.exists() {
            let content = fs::read_to_string(&store_path).map_err(|error| error.to_string())?;
            let mut parsed = serde_json::from_str::<PersistedState>(&content)
                .unwrap_or_else(|_| PersistedState::new(Local::now()));
            parsed.settings = parsed.settings.clone().sanitize();
            parsed.today.target_ml = parsed.settings.daily_target_ml;
            parsed.today.cup_size_ml = parsed.settings.cup_size_ml;
            parsed.today.reminder_interval_minutes = parsed.settings.reminder_interval_minutes;
            parsed.today.active_start_hour = parsed.settings.active_start_hour;
            parsed.today.active_end_hour = parsed.settings.active_end_hour;
            parsed.today.effective_intake_ml = parsed.today.actual_intake_ml;
            parsed.today.debt_ml = 0;
            parsed.normalize_history();
            parsed
        } else {
            PersistedState::new(Local::now())
        };

        Ok(Self {
            store_path,
            data: Arc::new(Mutex::new(data)),
        })
    }

    fn save(&self) -> Result<(), String> {
        let data = self
            .data
            .lock()
            .map_err(|_| "failed to lock local state".to_string())?
            .clone();
        let content = serde_json::to_string_pretty(&data).map_err(|error| error.to_string())?;
        fs::write(&self.store_path, content).map_err(|error| error.to_string())
    }

    fn replace_data(&self, next: PersistedState) -> Result<(), String> {
        let mut guard = self
            .data
            .lock()
            .map_err(|_| "failed to lock local state".to_string())?;
        *guard = next;
        Ok(())
    }
}

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

fn update_state_and_snapshot(app: &AppHandle, state: &AppState) -> Result<TodayStatus, String> {
    {
        let mut guard = state
            .data
            .lock()
            .map_err(|_| "failed to update today state".to_string())?;
        reconcile(&mut guard, Local::now());
    }
    state.save()?;

    let guard = state
        .data
        .lock()
        .map_err(|_| "failed to read today state".to_string())?;
    let status = to_today_status(&guard.settings, &guard.today);
    let _ = app;
    Ok(status)
}

fn to_today_status(settings: &Settings, today: &DailyRecord) -> TodayStatus {
    let expected_ml = expected_intake_ml(settings, Local::now());

    TodayStatus {
        target_ml: today.target_ml,
        expected_ml,
        consumed_ml: today.actual_intake_ml.min(expected_ml),
        actual_intake_ml: today.actual_intake_ml,
        debt_ml: expected_ml.saturating_sub(today.actual_intake_ml),
        remaining_ml: today.target_ml.saturating_sub(today.actual_intake_ml),
        next_reminder_at: next_reminder_time(settings, Local::now()),
        autostart_enabled: settings.autostart_enabled,
        pending_reminder: today.pending_slot_index.is_some(),
        pending_since: today.pending_since.clone(),
        completed_reminder_slots: today.completed_reminder_slots,
        missed_reminder_slots: today.missed_reminder_slots,
        can_undo_last_drink: today.last_log_undo.is_some(),
        last_logged_amount_ml: today.last_logged_amount_ml,
    }
}

fn reconcile(state: &mut PersistedState, now: DateTime<Local>) -> bool {
    let mut changed = false;
    let current_day = day_key(now);
    if state.today.day_key != current_day {
        finalize_today(&mut state.history, &mut state.today);
        state.today = DailyRecord::new(now, &state.settings);
        changed = true;
    }

    if let Some(max_slot_index) = latest_slot_index(&state.settings, now) {
        let start = state.today.last_slot_spawned.map(|value| value + 1).unwrap_or(0);
        if start <= max_slot_index {
            for slot_index in start..=max_slot_index {
                if state.today.pending_slot_index.is_some() {
                    mark_pending_as_missed(&mut state.today);
                }

                state.today.pending_slot_index = Some(slot_index);
                state.today.pending_since =
                    slot_time_for_day(&state.today.day_key, &state.settings, slot_index)
                        .map(|value| value.to_rfc3339());
                state.today.last_slot_spawned = Some(slot_index);
                state.today.notification_token = state.today.notification_token.saturating_add(1);
                state.today.snooze_until = None;
                state.today.updated_at = now.to_rfc3339();
                changed = true;
            }
        }
    }

    if let Some(snooze_until) = &state.today.snooze_until {
        if parse_local_datetime(snooze_until)
            .map(|value| value <= now)
            .unwrap_or(false)
        {
            state.today.snooze_until = None;
            state.today.notification_token = state.today.notification_token.saturating_add(1);
            changed = true;
        }
    }

    state.today.effective_intake_ml = state.today.actual_intake_ml;
    changed
}

fn finalize_today(history: &mut Vec<HistoryItem>, today: &mut DailyRecord) {
    if today.pending_slot_index.is_some() {
        mark_pending_as_missed(today);
    }

    history.retain(|item| item.day_key != today.day_key);
    history.push(today.summary());
    history.sort_by(|left, right| right.day_key.cmp(&left.day_key));
    history.truncate(90);
}

fn apply_yesterday_catch_up(
    state: &mut PersistedState,
    now: DateTime<Local>,
    amount_ml: u32,
) -> Result<(), String> {
    reconcile(state, now);

    let yesterday = now
        .date_naive()
        .pred_opt()
        .ok_or_else(|| "failed to resolve yesterday".to_string())?
        .format("%Y-%m-%d")
        .to_string();

    let Some(item) = state.history.iter_mut().find(|entry| entry.day_key == yesterday) else {
        return Err("there is no yesterday record to update".to_string());
    };

    item.actual_intake_ml = item.actual_intake_ml.saturating_add(amount_ml);
    item.consumed_ml = item.actual_intake_ml;
    item.goal_met = item.actual_intake_ml >= item.target_ml;
    Ok(())
}

fn mark_pending_as_missed(today: &mut DailyRecord) {
    today.pending_slot_index = None;
    today.pending_since = None;
    today.snooze_until = None;
    today.missed_reminder_slots = today.missed_reminder_slots.saturating_add(1);
    today.total_debt_incurred_ml = today
        .total_debt_incurred_ml
        .saturating_add(today.cup_size_ml);
    today.last_log_undo = None;
    today.last_logged_amount_ml = None;
    today.last_notified_token = None;
}

fn latest_slot_index(settings: &Settings, now: DateTime<Local>) -> Option<u32> {
    let minute_of_day = now.hour() * 60 + now.minute();
    let start_minutes = u32::from(settings.active_start_hour) * 60;
    let end_minutes = u32::from(settings.active_end_hour) * 60;

    if minute_of_day < start_minutes || minute_of_day >= end_minutes {
        return None;
    }

    Some((minute_of_day - start_minutes) / settings.reminder_interval_minutes)
}

fn derived_reminder_interval_minutes(
    daily_target_ml: u32,
    cup_size_ml: u32,
    active_start_hour: u8,
    active_end_hour: u8,
) -> u32 {
    let start_minutes = u32::from(active_start_hour) * 60;
    let end_minutes = u32::from(active_end_hour) * 60;
    let active_minutes = end_minutes.saturating_sub(start_minutes).max(60);
    let drinks_per_day = daily_target_ml.div_ceil(cup_size_ml.max(1)).max(1);
    (active_minutes / drinks_per_day).max(15)
}

fn expected_intake_ml(settings: &Settings, now: DateTime<Local>) -> u32 {
    let second_of_day = now.hour() * 3600 + now.minute() * 60 + now.second();
    let start_seconds = u32::from(settings.active_start_hour) * 3600;
    let end_seconds = u32::from(settings.active_end_hour) * 3600;

    if second_of_day <= start_seconds {
        return 0;
    }

    if second_of_day >= end_seconds {
        return settings.daily_target_ml;
    }

    let active_seconds = end_seconds.saturating_sub(start_seconds).max(1);
    let elapsed_seconds = second_of_day.saturating_sub(start_seconds);
    let target = u64::from(settings.daily_target_ml);
    let expected = (target * u64::from(elapsed_seconds)).div_ceil(u64::from(active_seconds));
    expected.min(target) as u32
}

fn slot_time_for_day(
    day_key: &str,
    settings: &Settings,
    slot_index: u32,
) -> Option<DateTime<Local>> {
    let date = NaiveDate::parse_from_str(day_key, "%Y-%m-%d").ok()?;
    let total_minutes =
        u32::from(settings.active_start_hour) * 60 + slot_index * settings.reminder_interval_minutes;
    let hour = total_minutes / 60;
    let minute = total_minutes % 60;
    let time = NaiveTime::from_hms_opt(hour, minute, 0)?;
    let naive = NaiveDateTime::new(date, time);
    Local.from_local_datetime(&naive).single()
}

fn next_reminder_time(settings: &Settings, now: DateTime<Local>) -> Option<String> {
    let start_minutes = u32::from(settings.active_start_hour) * 60;
    let end_minutes = u32::from(settings.active_end_hour) * 60;
    let minute_of_day = now.hour() * 60 + now.minute();
    let date = now.date_naive();

    let next_minutes = if minute_of_day < start_minutes {
        Some(start_minutes)
    } else if minute_of_day >= end_minutes {
        None
    } else {
        let elapsed = minute_of_day - start_minutes;
        let next_index = elapsed / settings.reminder_interval_minutes + 1;
        let candidate = start_minutes + next_index * settings.reminder_interval_minutes;
        (candidate < end_minutes).then_some(candidate)
    };

    if let Some(minutes) = next_minutes {
        let hour = minutes / 60;
        let minute = minutes % 60;
        let time = NaiveTime::from_hms_opt(hour, minute, 0)?;
        let naive = NaiveDateTime::new(date, time);
        return Local
            .from_local_datetime(&naive)
            .single()
            .map(|value| value.to_rfc3339());
    }

    let next_day = date.succ_opt()?;
    let time = NaiveTime::from_hms_opt(u32::from(settings.active_start_hour), 0, 0)?;
    let naive = NaiveDateTime::new(next_day, time);
    Local
        .from_local_datetime(&naive)
        .single()
        .map(|value| value.to_rfc3339())
}

fn day_key(now: DateTime<Local>) -> String {
    now.format("%Y-%m-%d").to_string()
}

fn parse_local_datetime(value: &str) -> Option<DateTime<Local>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|value| value.with_timezone(&Local))
}

fn ensure_window(app: &AppHandle) -> Result<tauri::WebviewWindow, tauri::Error> {
    if let Some(window) = app.get_webview_window("main") {
        return Ok(window);
    }

    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Drink Water")
        .inner_size(460.0, 760.0)
        .min_inner_size(380.0, 640.0)
        .decorations(false)
        .visible(true)
        .build()
}

fn toggle_main_window(app: &AppHandle) {
    if let Ok(window) = ensure_window(app) {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn show_main_window(app: &AppHandle) {
    if let Ok(window) = ensure_window(app) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn emit_state_updated(app: &AppHandle) {
    let _ = app.emit(STATE_EVENT, ());
}

fn maybe_send_notification(app: &AppHandle, title: &str, body: &str) {
    let _ = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

fn tray_menu_copy(locale: &str) -> (&'static str, &'static str) {
    if normalize_locale(locale) == "en-US" {
        ("Open Drink Water", "Quit")
    } else {
        ("打开 Drink Water", "退出程序")
    }
}

enum NotificationKind {
    DrinkNow,
    SnoozeReady,
}

fn notification_copy(locale: &str, kind: NotificationKind) -> (&'static str, &'static str) {
    let english = normalize_locale(locale) == "en-US";

    match (english, kind) {
        (true, NotificationKind::DrinkNow) => (
            "Time to drink water",
            "A new reminder window has started. Try to drink a cup now.",
        ),
        (true, NotificationKind::SnoozeReady) => (
            "Reminder again",
            "Your snooze has ended. This is a good time to catch up on that cup.",
        ),
        (false, NotificationKind::DrinkNow) => (
            "该喝水了",
            "新的喝水提醒已经开始了，记得按时补一杯水。",
        ),
        (false, NotificationKind::SnoozeReady) => (
            "再次提醒你",
            "稍后提醒时间到了，现在可以顺手把这杯水补上。",
        ),
    }
}

fn start_scheduler(app: AppHandle) {
    spawn(async move {
        loop {
            if let Some(state) = app.try_state::<AppState>() {
                let mut should_notify = false;
                let mut should_snooze_notify = false;
                let mut notifications_enabled = false;

                if let Ok(mut guard) = state.data.lock() {
                    let before_snooze = guard.today.snooze_until.clone();
                    let changed = reconcile(&mut guard, Local::now());
                    notifications_enabled = guard.settings.notifications_enabled;
                    should_snooze_notify = guard.today.pending_slot_index.is_some()
                        && before_snooze.is_some()
                        && guard.today.snooze_until.is_none()
                        && changed;
                    should_notify = guard.today.pending_slot_index.is_some()
                        && guard.today.last_notified_token != Some(guard.today.notification_token);
                    if should_notify {
                        guard.today.last_notified_token = Some(guard.today.notification_token);
                    }
                    if should_notify || should_snooze_notify {
                        let kind = if should_snooze_notify {
                            NotificationKind::SnoozeReady
                        } else {
                            NotificationKind::DrinkNow
                        };
                        let copy = notification_copy(&guard.settings.locale, kind);
                        if notifications_enabled {
                            maybe_send_notification(&app, copy.0, copy.1);
                        }
                    }
                }

                let _ = state.save();
                if should_notify && notifications_enabled {
                    emit_state_updated(&app);
                } else if should_snooze_notify && notifications_enabled {
                    emit_state_updated(&app);
                }
            }

            tokio::time::sleep(Duration::from_secs(30)).await;
        }
    });
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .setup(|app| {
            let state = AppState::load(&app.handle())?;
            let autostart_enabled = state
                .data
                .lock()
                .map(|guard| guard.settings.autostart_enabled)
                .unwrap_or(false);
            if autostart_enabled {
                let _ = app.handle().autolaunch().enable();
            }
            app.manage(state);
            show_main_window(&app.handle());

            let app_handle = app.handle().clone();
            let locale = app
                .state::<AppState>()
                .data
                .lock()
                .map(|guard| guard.settings.locale.clone())
                .unwrap_or_else(|_| default_locale());
            let (open_label, quit_label) = tray_menu_copy(&locale);
            let open_item = MenuItem::with_id(app, "open", open_label, true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", quit_label, true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_item, &quit_item])?;
            TrayIconBuilder::new()
                .icon(tauri::include_image!("icons/icon.png"))
                .tooltip("Drink Water")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(move |_, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(&app_handle);
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            start_scheduler(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            get_today_status,
            log_drink,
            undo_last_drink,
            log_yesterday_drink,
            export_data,
            import_data,
            toggle_autostart,
            dismiss_or_snooze_reminder,
            get_history
        ])
        .run(tauri::generate_context!())
        .expect("failed to run drink-water app");
}

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

    #[test]
    fn missed_slots_accumulate_history_debt_by_cup_size() {
        let settings = Settings::default();
        let mut state = PersistedState {
            today: DailyRecord::new(local_dt(2026, 5, 19, 8, 0), &settings),
            settings,
            history: Vec::new(),
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
    fn rollover_archives_previous_day_and_resets_debt() {
        let settings = Settings::default();
        let mut state = PersistedState {
            today: DailyRecord::new(local_dt(2026, 5, 19, 9, 0), &settings),
            settings: settings.clone(),
            history: Vec::new(),
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
        };

        apply_yesterday_catch_up(&mut state, local_dt(2026, 5, 20, 9, 30), 250).unwrap();

        assert_eq!(state.history[0].actual_intake_ml, 1750);
        assert_eq!(state.history[0].consumed_ml, 1750);
        assert!(!state.history[0].goal_met);

        apply_yesterday_catch_up(&mut state, local_dt(2026, 5, 20, 10, 0), 250).unwrap();

        assert_eq!(state.history[0].actual_intake_ml, 2000);
        assert!(state.history[0].goal_met);
    }
}
