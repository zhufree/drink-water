#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrinkUndoSnapshot {
    #[serde(default)]
    logged_amount_ml: Option<u32>,
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
    last_log_undos: Vec<DrinkUndoSnapshot>,
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
#[serde(rename_all = "camelCase")]
pub struct SedentaryStatus {
    seated: bool,
    seated_since: Option<String>,
    stood_up_at: Option<String>,
    next_reminder_at: Option<String>,
    activity_day_key: String,
    activity_events: Vec<SedentaryActivityEvent>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SedentaryActivityKind {
    Seated,
    Standing,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SedentaryActivityEvent {
    kind: SedentaryActivityKind,
    at: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SedentaryState {
    #[serde(default)]
    seated: bool,
    #[serde(default)]
    seated_since: Option<String>,
    #[serde(default)]
    stood_up_at: Option<String>,
    #[serde(default)]
    last_stand_reminder_at: Option<String>,
    #[serde(default)]
    last_sit_prompt_at: Option<String>,
    #[serde(default)]
    updated_at: Option<String>,
    #[serde(default)]
    activity_day_key: String,
    #[serde(default)]
    activity_events: Vec<SedentaryActivityEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedInventoryItem {
    seed_type: String,
    count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProduceInventoryItem {
    crop_type: String,
    count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlantedCrop {
    day_key: String,
    seed_type: String,
    planted_at: String,
    #[serde(default)]
    harvested_at: Option<String>,
    #[serde(default)]
    boost_applied_seconds: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GardenCollectionItem {
    crop_type: String,
    harvest_count: u32,
    #[serde(default)]
    first_harvested_at: Option<String>,
    #[serde(default)]
    last_harvested_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestState {
    active: bool,
    #[serde(default)]
    started_at: Option<String>,
    #[serde(default)]
    ends_at: Option<String>,
    #[serde(default)]
    cooldown_ends_at: Option<String>,
    #[serde(default)]
    max_duration_seconds: u32,
    #[serde(default)]
    planned_boost_seconds: u32,
}

impl Default for RestState {
    fn default() -> Self {
        Self {
            active: false,
            started_at: None,
            ends_at: None,
            cooldown_ends_at: None,
            max_duration_seconds: 0,
            planned_boost_seconds: 0,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GardenMaterialInventory {
    #[serde(default)]
    wood: u32,
    #[serde(default)]
    stone: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ExpeditionReward {
    Material {
        #[serde(rename = "materialType", alias = "material_type")]
        material_type: String,
        count: u32,
    },
    Seed {
        #[serde(rename = "seedType", alias = "seed_type")]
        seed_type: String,
        count: u32,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveExpedition {
    expedition_id: String,
    day_key: String,
    route_id: String,
    supply_crop_type: String,
    started_at: String,
    returns_at: String,
    rewards: Vec<ExpeditionReward>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WaterBabyState {
    #[serde(default)]
    materials: GardenMaterialInventory,
    #[serde(default)]
    completed_project_ids: Vec<String>,
    #[serde(default)]
    last_expedition_started_day: Option<String>,
    #[serde(default)]
    active_expedition: Option<ActiveExpedition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GardenState {
    initial_grant_claimed: bool,
    #[serde(default)]
    initial_grant_last_awarded_at: Option<String>,
    #[serde(default)]
    produce_migration_claimed: bool,
    seeds: Vec<SeedInventoryItem>,
    #[serde(default)]
    produce: Vec<ProduceInventoryItem>,
    crops: Vec<PlantedCrop>,
    collection: Vec<GardenCollectionItem>,
    #[serde(default = "default_active_background")]
    active_background: String,
    #[serde(default)]
    unlocked_backgrounds: Vec<String>,
    #[serde(default)]
    rest: RestState,
    #[serde(default)]
    water_baby: WaterBabyState,
}

fn default_active_background() -> String {
    DEFAULT_BACKGROUND_ID.to_string()
}

impl Default for GardenState {
    fn default() -> Self {
        Self {
            initial_grant_claimed: true,
            initial_grant_last_awarded_at: Some(Local::now().to_rfc3339()),
            produce_migration_claimed: true,
            seeds: initial_seed_grant_items(),
            produce: Vec::new(),
            crops: Vec::new(),
            collection: Vec::new(),
            active_background: default_active_background(),
            unlocked_backgrounds: Vec::new(),
            rest: RestState::default(),
            water_baby: WaterBabyState::default(),
        }
    }
}

fn default_garden_state() -> GardenState {
    GardenState::default()
}

fn parse_persisted_state_content(content: &str) -> Result<PersistedState, String> {
    serde_json::from_str::<PersistedState>(content.trim_start_matches('\u{feff}'))
        .map_err(|error| format!("failed to parse local state: {error}"))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncMeta {
    #[serde(default)]
    account_id: Option<String>,
    #[serde(default)]
    pairing_device_id: String,
    #[serde(default)]
    onboarding_seen_at: Option<String>,
    #[serde(default)]
    last_startup_catch_up_prompt_day: Option<String>,
    #[serde(default)]
    last_daily_pull_at: Option<String>,
    #[serde(default)]
    last_garden_pull_at: Option<String>,
    #[serde(default)]
    last_backup_at: Option<String>,
    #[serde(default)]
    daily_snapshot_updated_at_by_day: BTreeMap<String, String>,
    #[serde(default)]
    daily_snapshot_updated_by_device_id_by_day: BTreeMap<String, String>,
    #[serde(default)]
    garden_updated_at: Option<String>,
    #[serde(default)]
    garden_updated_by_device_id: Option<String>,
    #[serde(default)]
    settings_updated_at: Option<String>,
    #[serde(default)]
    settings_updated_by_device_id: Option<String>,
}

impl Default for SyncMeta {
    fn default() -> Self {
        Self {
            account_id: None,
            pairing_device_id: String::new(),
            onboarding_seen_at: None,
            last_startup_catch_up_prompt_day: None,
            last_daily_pull_at: None,
            last_garden_pull_at: None,
            last_backup_at: None,
            daily_snapshot_updated_at_by_day: BTreeMap::new(),
            daily_snapshot_updated_by_device_id_by_day: BTreeMap::new(),
            garden_updated_at: None,
            garden_updated_by_device_id: None,
            settings_updated_at: None,
            settings_updated_by_device_id: None,
        }
    }
}

impl SyncMeta {
    fn with_device_id(device_id: &str) -> Self {
        Self {
            pairing_device_id: device_id.to_string(),
            ..Self::default()
        }
    }

    fn normalize(&mut self, device_id: &str) {
        self.account_id = self
            .account_id
            .as_ref()
            .map(|value| value.trim().chars().take(128).collect::<String>())
            .filter(|value| !value.is_empty());
        self.last_startup_catch_up_prompt_day = self
            .last_startup_catch_up_prompt_day
            .as_ref()
            .map(|value| value.trim().chars().take(32).collect::<String>())
            .filter(|value| !value.is_empty());
        self.onboarding_seen_at = self
            .onboarding_seen_at
            .as_ref()
            .map(|value| value.trim().chars().take(64).collect::<String>())
            .filter(|value| !value.is_empty());
        self.pairing_device_id = device_id.trim().chars().take(128).collect();
        self.daily_snapshot_updated_at_by_day
            .retain(|day_key, updated_at| !day_key.trim().is_empty() && !updated_at.trim().is_empty());
        self.daily_snapshot_updated_by_device_id_by_day
            .retain(|day_key, device_id| !day_key.trim().is_empty() && !device_id.trim().is_empty());
        self.garden_updated_by_device_id = self
            .garden_updated_by_device_id
            .as_ref()
            .map(|value| value.trim().chars().take(128).collect::<String>())
            .filter(|value| !value.is_empty());
        self.settings_updated_by_device_id = self
            .settings_updated_by_device_id
            .as_ref()
            .map(|value| value.trim().chars().take(128).collect::<String>())
            .filter(|value| !value.is_empty());
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshot {
    daily_target_ml: u32,
    cup_size_ml: u32,
    cup_step_ml: u32,
    reminder_interval_minutes: u32,
    #[serde(default = "default_sedentary_reminder_minutes")]
    sedentary_reminder_minutes: u32,
    active_start_hour: u8,
    active_end_hour: u8,
    locale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshotRecord {
    snapshot: SettingsSnapshot,
    updated_at: String,
    updated_by_device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySnapshotRecord {
    day_key: String,
    snapshot: HistoryItem,
    updated_at: String,
    updated_by_device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GardenSnapshotRecord {
    snapshot: GardenState,
    updated_at: String,
    updated_by_device_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementEvidence {
    kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    start_day: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    end_day: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    crop_type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    value: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementReceipt {
    achievement_id: String,
    unlocked_at: String,
    evidence: AchievementEvidence,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementState {
    receipts: Vec<AchievementReceipt>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementSnapshotRecord {
    receipts: Vec<AchievementReceipt>,
    updated_by_device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudBackupMeta {
    object_key: String,
    created_at: String,
    device_id: String,
    size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    settings: Settings,
    today: DailyRecord,
    history: Vec<HistoryItem>,
    #[serde(default = "default_garden_state")]
    garden: GardenState,
    #[serde(default)]
    sync_meta: SyncMeta,
    #[serde(default)]
    achievements: Vec<AchievementReceipt>,
    #[serde(default)]
    sedentary: SedentaryState,
}

impl PersistedState {
    fn new(now: DateTime<Local>) -> Self {
        let settings = Settings::default().sanitize();
        let today = DailyRecord::new(now, &settings);

        Self {
            sync_meta: SyncMeta::with_device_id(&settings.device_id),
            settings,
            today,
            history: Vec::new(),
            garden: GardenState::default(),
            achievements: Vec::new(),
            sedentary: SedentaryState::default(),
        }
    }

    fn normalize_history(&mut self) {
        for item in &mut self.history {
            item.consumed_ml = item.actual_intake_ml;
            item.goal_met = item.actual_intake_ml >= item.target_ml;
        }
    }

    fn normalize_garden(&mut self) {
        if !self.garden.initial_grant_claimed {
            for item in initial_seed_grant_items() {
                add_seed(&mut self.garden, &item.seed_type, item.count);
            }
            self.garden.initial_grant_claimed = true;
            self.garden.initial_grant_last_awarded_at = Some(Local::now().to_rfc3339());
        }

        for seed in &mut self.garden.seeds {
            if let Some(normalized) = canonical_seed_type(&seed.seed_type) {
                seed.seed_type = normalized.to_string();
            }
        }

        for crop in &mut self.garden.crops {
            if let Some(normalized) = canonical_seed_type(&crop.seed_type) {
                crop.seed_type = normalized.to_string();
            }
        }

        for produce in &mut self.garden.produce {
            if let Some(normalized) = canonical_crop_type(&produce.crop_type) {
                produce.crop_type = normalized.to_string();
            }
        }

        for item in &mut self.garden.collection {
            if let Some(normalized) = canonical_crop_type(&item.crop_type) {
                item.crop_type = normalized.to_string();
            }
        }

        if !self.garden.produce_migration_claimed {
            for item in self.garden.collection.clone() {
                if item.harvest_count > 0 {
                    add_produce(&mut self.garden, &item.crop_type, item.harvest_count);
                }
            }
            self.garden.produce_migration_claimed = true;
        }

        merge_seed_inventory(&mut self.garden);
        merge_produce_inventory(&mut self.garden);
        let configured_background_ids: Vec<String> = background_reward_config()
            .into_iter()
            .map(|reward| reward.id)
            .collect();
        self.garden
            .unlocked_backgrounds
            .retain(|background| configured_background_ids.contains(background));
        if self.garden.active_background != DEFAULT_BACKGROUND_ID
            && !self
                .garden
                .unlocked_backgrounds
                .iter()
                .any(|background| background == &self.garden.active_background)
        {
            self.garden.active_background = default_active_background();
        }
        self.garden.crops.retain(|crop| crop.harvested_at.is_none());
        normalize_water_baby_state(&mut self.garden);

        if self.garden.rest.active {
            if let Some(ends_at) = &self.garden.rest.ends_at {
                if parse_local_datetime(ends_at)
                    .map(|value| value <= Local::now())
                    .unwrap_or(false)
                {
                    let _ = complete_rest_break_in_state(self, Local::now());
                }
            }
        }
    }

    fn normalize_sync_meta(&mut self) {
        self.sync_meta.normalize(&self.settings.device_id);
    }

    fn normalize_sedentary(&mut self) {
        let now = Local::now();
        if self.sedentary.seated {
            if self
                .sedentary
                .seated_since
                .as_deref()
                .and_then(parse_local_datetime)
                .is_none()
            {
                self.sedentary.seated_since = Some(now.to_rfc3339());
            }
            self.sedentary.stood_up_at = None;
            self.sedentary.last_sit_prompt_at = None;
        } else {
            self.sedentary.seated_since = None;
            self.sedentary.last_stand_reminder_at = None;
            if self
                .sedentary
                .stood_up_at
                .as_deref()
                .and_then(parse_local_datetime)
                .is_none()
            {
                self.sedentary.stood_up_at = None;
            }
            if self
                .sedentary
                .last_sit_prompt_at
                .as_deref()
                .and_then(parse_local_datetime)
                .is_none()
            {
                self.sedentary.last_sit_prompt_at = None;
            }
        }
        reconcile_sedentary_activity_day(&mut self.sedentary, now);
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
            last_log_undos: Vec::new(),
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
            let mut parsed = parse_persisted_state_content(&content)?;
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
            parsed.normalize_sedentary();
            refresh_achievements(&mut parsed, Local::now());
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
