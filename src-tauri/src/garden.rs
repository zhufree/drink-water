const DEFAULT_DRINK_WATER_CONFIG_URL: &str = "https://water-api.zhufree.fun/api/config/drink-water";

static DRINK_WATER_CONFIG: OnceLock<RwLock<DrinkWaterConfig>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DrinkWaterConfig {
    seed_exchange: SeedExchangeConfig,
    background_rewards: Vec<BackgroundRewardConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedExchangeConfig {
    seeds: Vec<SeedExchangeSeedConfig>,
    exchange_rules: Vec<SeedExchangeRuleConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedExchangeSeedConfig {
    seed_type: String,
    crop_type: String,
    tier: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedExchangeRuleConfig {
    tier_gap: i16,
    source_cost: u32,
    target_seed_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackgroundRewardConfig {
    id: String,
    #[serde(default)]
    title: HashMap<String, String>,
    #[serde(default)]
    description: HashMap<String, String>,
    #[serde(default)]
    preview_asset: String,
    redeemable: bool,
    #[serde(default)]
    requirements: Vec<BackgroundRewardRequirementConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackgroundRewardRequirementConfig {
    crop_type: String,
    count: u32,
}

fn local_drink_water_config() -> DrinkWaterConfig {
    DrinkWaterConfig {
        seed_exchange: serde_json::from_str(include_str!("../../src/config/seedExchange.json").trim_start_matches('\u{feff}'))
            .expect("seed exchange config must be valid JSON"),
        background_rewards: serde_json::from_str(include_str!("../../src/config/backgroundRewards.json").trim_start_matches('\u{feff}'))
            .expect("background reward config must be valid JSON"),
    }
}

fn runtime_drink_water_config() -> DrinkWaterConfig {
    DRINK_WATER_CONFIG
        .get_or_init(|| RwLock::new(local_drink_water_config()))
        .read()
        .map(|guard| guard.clone())
        .unwrap_or_else(|_| local_drink_water_config())
}

fn set_runtime_drink_water_config(config: DrinkWaterConfig) -> Result<(), String> {
    let lock = DRINK_WATER_CONFIG.get_or_init(|| RwLock::new(local_drink_water_config()));
    let mut guard = lock
        .write()
        .map_err(|_| "failed to update runtime config".to_string())?;
    *guard = config;
    Ok(())
}

fn drink_water_config_url() -> String {
    option_env!("DRINK_WATER_CONFIG_URL")
        .unwrap_or(DEFAULT_DRINK_WATER_CONFIG_URL)
        .to_string()
}

async fn fetch_remote_drink_water_config() -> Result<DrinkWaterConfig, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|error| error.to_string())?
        .get(drink_water_config_url())
        .header("User-Agent", "DrinkWater/0.8.0")
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json::<DrinkWaterConfig>()
        .await
        .map_err(|error| error.to_string())
}

async fn refresh_drink_water_config() -> DrinkWaterConfig {
    if let Ok(config) = fetch_remote_drink_water_config().await {
        let _ = set_runtime_drink_water_config(config);
    }
    runtime_drink_water_config()
}

fn refresh_drink_water_config_in_background() {
    spawn(async {
        let _ = refresh_drink_water_config().await;
    });
}

fn seed_exchange_config() -> SeedExchangeConfig {
    let _known_stable_ids = [
        BELL_PEPPER_SEED_TYPE,
        CARROT_SEED_TYPE,
        NAPA_CABBAGE_SEED_TYPE,
        BROCCOLI_SEED_TYPE,
        RADISH_SEED_TYPE,
        RED_RADISH_SEED_TYPE,
        PUMPKIN_SEED_TYPE,
        ONION_SEED_TYPE,
        EGGPLANT_SEED_TYPE,
        WATERMELON_SEED_TYPE,
        BELL_PEPPER_CROP_TYPE,
        CARROT_CROP_TYPE,
        NAPA_CABBAGE_CROP_TYPE,
        BROCCOLI_CROP_TYPE,
        RADISH_CROP_TYPE,
        RED_RADISH_CROP_TYPE,
        PUMPKIN_CROP_TYPE,
        ONION_CROP_TYPE,
        EGGPLANT_CROP_TYPE,
        WATERMELON_CROP_TYPE,
        LEGACY_BASIC_SEED_TYPE,
        LEGACY_BASIC_SEED_TYPE_V2,
        LEGACY_ADVANCED_SEED_TYPE,
        LEGACY_CARROT_SEED_TYPE,
        LEGACY_BROCCOLI_SEED_TYPE,
        LEGACY_RADISH_SEED_TYPE,
        LEGACY_BASIC_CROP_TYPE,
        LEGACY_ADVANCED_CROP_TYPE,
        LEGACY_CARROT_CROP_TYPE,
        LEGACY_BROCCOLI_CROP_TYPE,
        LEGACY_RADISH_CROP_TYPE,
    ];

    runtime_drink_water_config().seed_exchange
}

fn background_reward_config() -> Vec<BackgroundRewardConfig> {
    runtime_drink_water_config().background_rewards
}

fn initial_seed_grant_items() -> Vec<SeedInventoryItem> {
    seed_exchange_config()
        .seeds
        .into_iter()
        .filter(|seed| seed.tier == INITIAL_TIER_SEED_GRANT)
        .map(|seed| SeedInventoryItem {
            seed_type: seed.seed_type,
            count: INITIAL_SEED_GRANT_COUNT,
        })
        .collect()
}

fn normalize_seed_type(seed_type: &str) -> Result<String, String> {
    canonical_seed_type(seed_type)
        .ok_or_else(|| "unknown seed type".to_string())
}

fn crop_type_for_seed(seed_type: &str) -> String {
    seed_exchange_config()
        .seeds
        .into_iter()
        .find(|seed| seed.seed_type == seed_type)
        .map(|seed| seed.crop_type)
        .unwrap_or_else(|| POTATO_CROP_TYPE.to_string())
}

fn seed_type_for_crop(crop_type: &str) -> String {
    seed_exchange_config()
        .seeds
        .into_iter()
        .find(|seed| seed.crop_type == crop_type)
        .map(|seed| seed.seed_type)
        .unwrap_or_else(|| POTATO_SEED_TYPE.to_string())
}

fn crop_tier(crop_type: &str) -> Option<u8> {
    seed_exchange_config()
        .seeds
        .into_iter()
        .find(|seed| seed.crop_type == crop_type)
        .map(|seed| seed.tier)
}

fn seed_tier(seed_type: &str) -> Option<u8> {
    seed_exchange_config()
        .seeds
        .into_iter()
        .find(|seed| seed.seed_type == seed_type)
        .map(|seed| seed.tier)
}

fn legacy_seed_type(seed_type: &str) -> Option<&'static str> {
    match seed_type {
        LEGACY_BASIC_SEED_TYPE | LEGACY_BASIC_SEED_TYPE_V2 => Some(POTATO_SEED_TYPE),
        LEGACY_ADVANCED_SEED_TYPE => Some(BELL_PEPPER_SEED_TYPE),
        LEGACY_CARROT_SEED_TYPE => Some(CARROT_SEED_TYPE),
        LEGACY_BROCCOLI_SEED_TYPE => Some(BROCCOLI_SEED_TYPE),
        LEGACY_RADISH_SEED_TYPE => Some(RADISH_SEED_TYPE),
        _ => None,
    }
}

fn legacy_crop_type(crop_type: &str) -> Option<&'static str> {
    match crop_type {
        LEGACY_BASIC_CROP_TYPE => Some(POTATO_CROP_TYPE),
        LEGACY_ADVANCED_CROP_TYPE => Some(BELL_PEPPER_CROP_TYPE),
        LEGACY_CARROT_CROP_TYPE => Some(CARROT_CROP_TYPE),
        LEGACY_BROCCOLI_CROP_TYPE => Some(BROCCOLI_CROP_TYPE),
        LEGACY_RADISH_CROP_TYPE => Some(RADISH_CROP_TYPE),
        _ => None,
    }
}

fn canonical_seed_type(seed_type: &str) -> Option<String> {
    let candidate = seed_type.trim();
    if let Some(legacy) = legacy_seed_type(candidate) {
        return Some(legacy.to_string());
    }

    seed_exchange_config()
        .seeds
        .into_iter()
        .find(|seed| seed.seed_type == candidate)
        .map(|seed| seed.seed_type)
}

fn canonical_crop_type(crop_type: &str) -> Option<String> {
    let candidate = crop_type.trim();
    if let Some(legacy) = legacy_crop_type(candidate) {
        return Some(legacy.to_string());
    }

    seed_exchange_config()
        .seeds
        .into_iter()
        .find(|seed| seed.crop_type == candidate)
        .map(|seed| seed.crop_type)
}

fn exchange_rule_for_tier_gap(tier_gap: i16) -> Option<SeedExchangeRuleConfig> {
    seed_exchange_config()
        .exchange_rules
        .into_iter()
        .find(|rule| rule.tier_gap == tier_gap)
}

fn rest_break_policy(now: DateTime<Local>, last_cooldown_end: Option<DateTime<Local>>) -> (u32, u32) {
    let minutes_since_cooldown = last_cooldown_end
        .map(|value| now.signed_duration_since(value).num_minutes().max(0))
        .unwrap_or(120);

    if minutes_since_cooldown >= 120 {
        (REST_LONG_BREAK_SECONDS, REST_LONG_BOOST_SECONDS)
    } else if minutes_since_cooldown >= 60 {
        (REST_MEDIUM_BREAK_SECONDS, REST_MEDIUM_BOOST_SECONDS)
    } else {
        (REST_SHORT_BREAK_SECONDS, REST_SHORT_BOOST_SECONDS)
    }
}

fn add_seed(garden: &mut GardenState, seed_type: &str, count: u32) {
    if let Some(item) = garden
        .seeds
        .iter_mut()
        .find(|item| item.seed_type == seed_type)
    {
        item.count = item.count.saturating_add(count);
        return;
    }

    garden.seeds.push(SeedInventoryItem {
        seed_type: seed_type.to_string(),
        count,
    });
}

fn merge_seed_inventory(garden: &mut GardenState) {
    let mut merged: Vec<SeedInventoryItem> = Vec::new();
    for item in garden.seeds.drain(..) {
        if let Some(existing) = merged
            .iter_mut()
            .find(|existing| existing.seed_type == item.seed_type)
        {
            existing.count = existing.count.saturating_add(item.count);
        } else {
            merged.push(item);
        }
    }

    garden.seeds = merged;
}

fn add_produce(garden: &mut GardenState, crop_type: &str, count: u32) {
    if let Some(item) = garden
        .produce
        .iter_mut()
        .find(|item| item.crop_type == crop_type)
    {
        item.count = item.count.saturating_add(count);
        return;
    }

    garden.produce.push(ProduceInventoryItem {
        crop_type: crop_type.to_string(),
        count,
    });
}

fn merge_produce_inventory(garden: &mut GardenState) {
    let mut merged: Vec<ProduceInventoryItem> = Vec::new();
    for item in garden.produce.drain(..) {
        if let Some(existing) = merged
            .iter_mut()
            .find(|existing| existing.crop_type == item.crop_type)
        {
            existing.count = existing.count.saturating_add(item.count);
        } else {
            merged.push(item);
        }
    }

    garden.produce = merged;
}

fn spend_seed(garden: &mut GardenState, seed_type: &str) -> Result<(), String> {
    let Some(item) = garden
        .seeds
        .iter_mut()
        .find(|item| item.seed_type == seed_type)
    else {
        return Err("no seeds available".to_string());
    };

    if item.count == 0 {
        return Err("no seeds available".to_string());
    }

    item.count -= 1;
    Ok(())
}

fn spend_produce(garden: &mut GardenState, crop_type: &str, count: u32) -> Result<(), String> {
    let total_available = total_produce(garden, crop_type);

    if total_available < count {
        return Err("not enough produce to exchange".to_string());
    }

    let mut remaining = count;
    for item in garden
        .produce
        .iter_mut()
        .filter(|item| item.crop_type == crop_type)
    {
        if remaining == 0 {
            break;
        }

        let spent = item.count.min(remaining);
        item.count -= spent;
        remaining -= spent;
    }

    garden.produce.retain(|item| item.count > 0);
    Ok(())
}

fn total_produce(garden: &GardenState, crop_type: &str) -> u32 {
    garden
        .produce
        .iter()
        .filter(|item| item.crop_type == crop_type)
        .fold(0_u32, |total, item| total.saturating_add(item.count))
}

#[derive(Clone, Copy)]
struct GardenProjectDefinition {
    id: &'static str,
    route_id: &'static str,
    wood_cost: u32,
    stone_cost: u32,
}

fn garden_project_definition(project_id: &str) -> Option<GardenProjectDefinition> {
    match project_id {
        FOREST_BRIDGE_PROJECT_ID => Some(GardenProjectDefinition {
            id: FOREST_BRIDGE_PROJECT_ID,
            route_id: FOREST_EXPEDITION_ROUTE_ID,
            wood_cost: 8,
            stone_cost: 4,
        }),
        MOUNTAIN_STEPS_PROJECT_ID => Some(GardenProjectDefinition {
            id: MOUNTAIN_STEPS_PROJECT_ID,
            route_id: MOUNTAIN_EXPEDITION_ROUTE_ID,
            wood_cost: 4,
            stone_cost: 10,
        }),
        RIVERSIDE_PIER_PROJECT_ID => Some(GardenProjectDefinition {
            id: RIVERSIDE_PIER_PROJECT_ID,
            route_id: RIVERSIDE_EXPEDITION_ROUTE_ID,
            wood_cost: 10,
            stone_cost: 8,
        }),
        _ => None,
    }
}

fn is_expedition_route_unlocked(garden: &GardenState, route_id: &str) -> bool {
    if route_id == DEFAULT_EXPEDITION_ROUTE_ID {
        return true;
    }

    garden
        .water_baby
        .completed_project_ids
        .iter()
        .filter_map(|project_id| garden_project_definition(project_id))
        .any(|project| project.route_id == route_id)
}

fn build_garden_project_in_state(
    garden: &mut GardenState,
    project_id: &str,
) -> Result<(), String> {
    let project = garden_project_definition(project_id.trim())
        .ok_or_else(|| "unknown garden project".to_string())?;
    if garden
        .water_baby
        .completed_project_ids
        .iter()
        .any(|completed| completed == project.id)
    {
        return Err("garden project already completed".to_string());
    }
    if garden.water_baby.materials.wood < project.wood_cost
        || garden.water_baby.materials.stone < project.stone_cost
    {
        return Err("not enough building materials".to_string());
    }

    garden.water_baby.materials.wood -= project.wood_cost;
    garden.water_baby.materials.stone -= project.stone_cost;
    garden
        .water_baby
        .completed_project_ids
        .push(project.id.to_string());
    Ok(())
}

fn normalize_water_baby_state(garden: &mut GardenState) {
    garden.water_baby.materials.wood = garden
        .water_baby
        .materials
        .wood
        .min(MAX_GARDEN_MATERIAL_COUNT);
    garden.water_baby.materials.stone = garden
        .water_baby
        .materials
        .stone
        .min(MAX_GARDEN_MATERIAL_COUNT);
    garden
        .water_baby
        .completed_project_ids
        .retain(|project_id| garden_project_definition(project_id).is_some());
    garden.water_baby.completed_project_ids.sort();
    garden.water_baby.completed_project_ids.dedup();

    if garden
        .water_baby
        .last_expedition_started_day
        .as_deref()
        .is_some_and(|day_key| NaiveDate::parse_from_str(day_key, "%Y-%m-%d").is_err())
    {
        garden.water_baby.last_expedition_started_day = None;
    }

    let active_is_valid = garden
        .water_baby
        .active_expedition
        .as_ref()
        .is_none_or(|expedition| {
            matches!(
                expedition.route_id.as_str(),
                DEFAULT_EXPEDITION_ROUTE_ID
                    | FOREST_EXPEDITION_ROUTE_ID
                    | MOUNTAIN_EXPEDITION_ROUTE_ID
                    | RIVERSIDE_EXPEDITION_ROUTE_ID
            ) && canonical_crop_type(&expedition.supply_crop_type).is_some()
                && parse_local_datetime(&expedition.started_at).is_some()
                && parse_local_datetime(&expedition.returns_at).is_some()
                && (1..=2).contains(&expedition.rewards.len())
                && expedition
                    .rewards
                    .iter()
                    .all(|reward| validate_expedition_reward(reward).is_ok())
        });
    if !active_is_valid {
        garden.water_baby.active_expedition = None;
    }
}

fn expedition_entropy(
    now: DateTime<Local>,
    route_id: &str,
    crop_type: &str,
    reward_index: usize,
) -> u64 {
    let time = now
        .timestamp_nanos_opt()
        .unwrap_or_else(|| now.timestamp_micros())
        .unsigned_abs();
    route_id
        .bytes()
        .chain(crop_type.bytes())
        .fold(time.saturating_add(reward_index as u64), |value, byte| {
            value.wrapping_mul(31).wrapping_add(u64::from(byte))
        })
}

fn expedition_seed_reward(entropy: u64, crop_tier: u8) -> ExpeditionReward {
    let max_tier = crop_tier.saturating_add(1).min(3);
    let candidates: Vec<SeedExchangeSeedConfig> = seed_exchange_config()
        .seeds
        .into_iter()
        .filter(|seed| seed.tier <= max_tier)
        .collect();
    if candidates.is_empty() {
        return ExpeditionReward::Material {
            material_type: WOOD_MATERIAL_TYPE.to_string(),
            count: 1,
        };
    }
    let selected = &candidates[(entropy as usize) % candidates.len()];
    ExpeditionReward::Seed {
        seed_type: selected.seed_type.clone(),
        count: 1,
    }
}

fn expedition_reward(
    now: DateTime<Local>,
    route_id: &str,
    crop_type: &str,
    reward_index: usize,
) -> ExpeditionReward {
    let entropy = expedition_entropy(now, route_id, crop_type, reward_index);
    let crop_tier = crop_tier(crop_type).unwrap_or(1);
    let material_count = 1 + (entropy % 2) as u32;

    match route_id {
        FOREST_EXPEDITION_ROUTE_ID => ExpeditionReward::Material {
            material_type: WOOD_MATERIAL_TYPE.to_string(),
            count: material_count,
        },
        MOUNTAIN_EXPEDITION_ROUTE_ID => ExpeditionReward::Material {
            material_type: STONE_MATERIAL_TYPE.to_string(),
            count: material_count,
        },
        RIVERSIDE_EXPEDITION_ROUTE_ID => expedition_seed_reward(entropy, crop_tier),
        _ => {
            let seed_threshold = match crop_tier {
                3 => 45,
                2 => 25,
                _ => 10,
            };
            let roll = entropy % 100;
            if roll < seed_threshold {
                expedition_seed_reward(entropy, crop_tier)
            } else if roll.is_multiple_of(3) {
                ExpeditionReward::Material {
                    material_type: STONE_MATERIAL_TYPE.to_string(),
                    count: material_count,
                }
            } else {
                ExpeditionReward::Material {
                    material_type: WOOD_MATERIAL_TYPE.to_string(),
                    count: material_count,
                }
            }
        }
    }
}

fn expedition_rewards(
    now: DateTime<Local>,
    route_id: &str,
    crop_type: &str,
    count: usize,
) -> Vec<ExpeditionReward> {
    (0..count)
        .map(|index| expedition_reward(now, route_id, crop_type, index))
        .collect()
}

fn start_expedition_in_state(
    state: &mut PersistedState,
    route_id: &str,
    crop_type: &str,
    now: DateTime<Local>,
) -> Result<(), String> {
    let route_id = route_id.trim();
    let crop_type = canonical_crop_type(crop_type)
        .ok_or_else(|| "unknown expedition supply".to_string())?;
    let day_key = state.today.day_key.clone();

    if state.garden.water_baby.active_expedition.is_some() {
        return Err("an expedition is already active".to_string());
    }
    if state.garden.water_baby.last_expedition_started_day.as_deref() == Some(&day_key) {
        return Err("an expedition already started today".to_string());
    }
    if !is_expedition_route_unlocked(&state.garden, route_id) {
        return Err("expedition route is locked".to_string());
    }
    if u64::from(state.today.actual_intake_ml) * 2 < u64::from(state.today.target_ml) {
        return Err("drink at least half of the daily goal first".to_string());
    }
    if total_produce(&state.garden, &crop_type) == 0 {
        return Err("not enough produce for expedition".to_string());
    }

    let full_goal = state.today.actual_intake_ml >= state.today.target_ml;
    let reward_count = if full_goal { 2 } else { 1 };
    let duration_hours = if full_goal { 8 } else { 4 };
    let expedition_id = format!("{}-{}", day_key, now.timestamp_millis());
    let rewards = expedition_rewards(now, route_id, &crop_type, reward_count);

    spend_produce(&mut state.garden, &crop_type, 1)?;
    state.garden.water_baby.last_expedition_started_day = Some(day_key.clone());
    state.garden.water_baby.active_expedition = Some(ActiveExpedition {
        expedition_id,
        day_key,
        route_id: route_id.to_string(),
        supply_crop_type: crop_type,
        started_at: now.to_rfc3339(),
        returns_at: (now + chrono::Duration::hours(duration_hours)).to_rfc3339(),
        rewards,
    });
    Ok(())
}

fn validate_expedition_reward(reward: &ExpeditionReward) -> Result<(), String> {
    match reward {
        ExpeditionReward::Material {
            material_type,
            count,
        } => {
            if !matches!(material_type.as_str(), WOOD_MATERIAL_TYPE | STONE_MATERIAL_TYPE)
                || !(1..=10).contains(count)
            {
                return Err("invalid expedition material reward".to_string());
            }
        }
        ExpeditionReward::Seed { seed_type, count } => {
            if canonical_seed_type(seed_type).is_none() || !(1..=10).contains(count) {
                return Err("invalid expedition seed reward".to_string());
            }
        }
    }
    Ok(())
}

fn claim_expedition_in_state(
    state: &mut PersistedState,
    expedition_id: &str,
    now: DateTime<Local>,
) -> Result<Vec<ExpeditionReward>, String> {
    let expedition = state
        .garden
        .water_baby
        .active_expedition
        .clone()
        .ok_or_else(|| "there is no expedition to claim".to_string())?;
    if expedition.expedition_id != expedition_id.trim() {
        return Err("expedition does not match".to_string());
    }
    let returns_at = parse_local_datetime(&expedition.returns_at)
        .ok_or_else(|| "invalid expedition return time".to_string())?;
    if now < returns_at {
        return Err("the water baby has not returned yet".to_string());
    }
    for reward in &expedition.rewards {
        validate_expedition_reward(reward)?;
    }

    for reward in &expedition.rewards {
        match reward {
            ExpeditionReward::Material {
                material_type,
                count,
            } if material_type == WOOD_MATERIAL_TYPE => {
                state.garden.water_baby.materials.wood = state
                    .garden
                    .water_baby
                    .materials
                    .wood
                    .saturating_add(*count)
                    .min(MAX_GARDEN_MATERIAL_COUNT);
            }
            ExpeditionReward::Material { count, .. } => {
                state.garden.water_baby.materials.stone = state
                    .garden
                    .water_baby
                    .materials
                    .stone
                    .saturating_add(*count)
                    .min(MAX_GARDEN_MATERIAL_COUNT);
            }
            ExpeditionReward::Seed { seed_type, count } => {
                let seed_type = canonical_seed_type(seed_type)
                    .ok_or_else(|| "invalid expedition seed reward".to_string())?;
                add_seed(&mut state.garden, &seed_type, *count);
            }
        }
    }
    state.garden.water_baby.active_expedition = None;
    Ok(expedition.rewards)
}

fn random_seed_reward(now: DateTime<Local>, crop_type: &str, collection_len: usize) -> u32 {
    let entropy = now
        .timestamp_nanos_opt()
        .unwrap_or_else(|| now.timestamp_micros())
        .unsigned_abs();
    let crop_bias = crop_type
        .bytes()
        .fold(0_u64, |acc, value| acc.saturating_add(u64::from(value)));
    ((entropy + crop_bias + collection_len as u64) % 2 + 1) as u32
}

fn history_item_for_day(state: &PersistedState, day_key: &str) -> Option<HistoryItem> {
    if state.today.day_key == day_key {
        return Some(state.today.summary());
    }

    state
        .history
        .iter()
        .find(|item| item.day_key == day_key)
        .cloned()
}

fn required_growth_days(item: &HistoryItem) -> u32 {
    if item.actual_intake_ml == 0 {
        return 0;
    }

    if item.target_ml == 0 {
        return 1;
    }

    let completion_percent = (u64::from(item.actual_intake_ml) * 100) / u64::from(item.target_ml);
    if completion_percent >= 100 {
        1
    } else if completion_percent >= 70 {
        2
    } else if completion_percent >= 40 {
        3
    } else {
        4
    }
}

fn crop_growth_percent(crop: &PlantedCrop, item: &HistoryItem, now: DateTime<Local>) -> u32 {
    let required_days = required_growth_days(item);
    if required_days == 0 {
        return 0;
    }

    let Some(planted_at) = parse_local_datetime(&crop.planted_at) else {
        return 0;
    };

    let elapsed_seconds = now
        .signed_duration_since(planted_at)
        .num_seconds()
        .max(0);
    let boosted_elapsed_seconds =
        elapsed_seconds.saturating_add(i64::from(crop.boost_applied_seconds));
    let required_seconds = i64::from(required_days) * DAY_SECONDS;
    ((boosted_elapsed_seconds * 100) / required_seconds).clamp(0, 100) as u32
}

fn plant_seed_in_state(
    state: &mut PersistedState,
    day_key: &str,
    seed_type: &str,
    now: DateTime<Local>,
) -> Result<(), String> {
    let Some(item) = history_item_for_day(state, day_key) else {
        return Err("this day has no water record".to_string());
    };

    if item.actual_intake_ml == 0 {
        return Err("this day has no water record".to_string());
    }

    if state
        .garden
        .crops
        .iter()
        .any(|crop| crop.day_key == day_key)
    {
        return Err("this day is already planted".to_string());
    }

    spend_seed(&mut state.garden, seed_type)?;
    state.garden.crops.push(PlantedCrop {
        day_key: day_key.to_string(),
        seed_type: seed_type.to_string(),
        planted_at: now.to_rfc3339(),
        harvested_at: None,
        boost_applied_seconds: 0,
    });

    Ok(())
}

fn harvest_crop_in_state(
    state: &mut PersistedState,
    day_key: &str,
    now: DateTime<Local>,
) -> Result<(), String> {
    let crop_index = state
        .garden
        .crops
        .iter()
        .position(|crop| crop.day_key == day_key)
        .ok_or_else(|| "this day has no planted crop".to_string())?;

    let item = history_item_for_day(state, day_key)
        .ok_or_else(|| "this day has no water record".to_string())?;
    if crop_growth_percent(&state.garden.crops[crop_index], &item, now) < 100 {
        return Err("this crop is not mature yet".to_string());
    }

    let crop_type = crop_type_for_seed(&state.garden.crops[crop_index].seed_type);
    let harvested_at = now.to_rfc3339();
    state.garden.crops.remove(crop_index);
    add_produce(&mut state.garden, &crop_type, 1);
    let rewarded_seeds = random_seed_reward(now, &crop_type, state.garden.collection.len());

    if let Some(item) = state
        .garden
        .collection
        .iter_mut()
        .find(|item| item.crop_type == crop_type)
    {
        item.harvest_count = item.harvest_count.saturating_add(1);
        if item.first_harvested_at.is_none() {
            item.first_harvested_at = Some(harvested_at.clone());
        }
        item.last_harvested_at = Some(harvested_at);
    } else {
        state.garden.collection.push(GardenCollectionItem {
            crop_type: crop_type.clone(),
            harvest_count: 1,
            first_harvested_at: Some(harvested_at.clone()),
            last_harvested_at: Some(harvested_at),
        });
    }

    let rewarded_seed_type = seed_type_for_crop(&crop_type);
    add_seed(&mut state.garden, &rewarded_seed_type, rewarded_seeds);
    Ok(())
}

fn exchange_produce_in_state(
    state: &mut PersistedState,
    source_crop_type: &str,
    target_seed_type: &str,
    quantity: u32,
) -> Result<(), String> {
    let source_tier = crop_tier(source_crop_type).ok_or_else(|| "unknown exchange source".to_string())?;
    let target_tier = seed_tier(target_seed_type).ok_or_else(|| "unknown exchange target".to_string())?;
    let target_crop_type = crop_type_for_seed(target_seed_type);
    let quantity = quantity.max(1);

    if source_crop_type == target_crop_type.as_str() {
        return Err("cannot exchange into the same crop".to_string());
    }

    let tier_gap = i16::from(target_tier) - i16::from(source_tier);
    let rule = exchange_rule_for_tier_gap(tier_gap)
        .ok_or_else(|| "unknown exchange target".to_string())?;
    let total_cost = rule
        .source_cost
        .checked_mul(quantity)
        .ok_or_else(|| "exchange quantity is too large".to_string())?;
    let total_seed_count = rule
        .target_seed_count
        .checked_mul(quantity)
        .ok_or_else(|| "exchange quantity is too large".to_string())?;

    spend_produce(&mut state.garden, source_crop_type, total_cost)?;
    add_seed(&mut state.garden, target_seed_type, total_seed_count);
    Ok(())
}

fn redeem_background_reward_in_state(
    state: &mut PersistedState,
    reward_id: &str,
) -> Result<(), String> {
    let reward_id = reward_id.trim();
    let reward = background_reward_config()
        .into_iter()
        .find(|reward| reward.id == reward_id)
        .ok_or_else(|| "unknown background reward".to_string())?;

    if !reward.redeemable {
        return Err("background reward is not redeemable".to_string());
    }

    if state
        .garden
        .unlocked_backgrounds
        .iter()
        .any(|background| background == &reward.id)
    {
        return Err("background reward already unlocked".to_string());
    }

    for requirement in &reward.requirements {
        if total_produce(&state.garden, &requirement.crop_type) < requirement.count {
            return Err("not enough produce to exchange".to_string());
        }
    }

    for requirement in &reward.requirements {
        spend_produce(
            &mut state.garden,
            &requirement.crop_type,
            requirement.count,
        )?;
    }

    state.garden.unlocked_backgrounds.push(reward.id.clone());
    state.garden.active_background = reward.id;
    Ok(())
}

fn set_active_background_in_state(
    state: &mut PersistedState,
    background_id: &str,
) -> Result<(), String> {
    let background_id = background_id.trim();
    if background_id == DEFAULT_BACKGROUND_ID {
        state.garden.active_background = DEFAULT_BACKGROUND_ID.to_string();
        return Ok(());
    }

    let exists = background_reward_config()
        .into_iter()
        .any(|reward| reward.id == background_id);
    if !exists {
        return Err("unknown background reward".to_string());
    }

    if !state
        .garden
        .unlocked_backgrounds
        .iter()
        .any(|background| background == background_id)
    {
        return Err("background reward is not unlocked".to_string());
    }

    state.garden.active_background = background_id.to_string();
    Ok(())
}

fn start_rest_break_in_state(state: &mut PersistedState, now: DateTime<Local>) -> Result<(), String> {
    if state.garden.rest.active {
        return Err("a rest break is already active".to_string());
    }

    if let Some(cooldown_ends_at) = &state.garden.rest.cooldown_ends_at {
        if parse_local_datetime(cooldown_ends_at)
            .map(|value| value > now)
            .unwrap_or(false)
        {
            return Err("rest break is still on cooldown".to_string());
        }
    }

    let cooldown_end = state
        .garden
        .rest
        .cooldown_ends_at
        .as_deref()
        .and_then(parse_local_datetime);
    let (max_duration_seconds, planned_boost_seconds) = rest_break_policy(now, cooldown_end);
    let ends_at = now + chrono::Duration::seconds(i64::from(max_duration_seconds));

    state.garden.rest = RestState {
        active: true,
        started_at: Some(now.to_rfc3339()),
        ends_at: Some(ends_at.to_rfc3339()),
        cooldown_ends_at: Some(
            (now + chrono::Duration::minutes(REST_COOLDOWN_MINUTES)).to_rfc3339(),
        ),
        max_duration_seconds,
        planned_boost_seconds,
    };

    Ok(())
}

fn cancel_rest_break_in_state(state: &mut PersistedState) -> Result<(), String> {
    if !state.garden.rest.active {
        return Err("there is no active rest break".to_string());
    }

    state.garden.rest.active = false;
    state.garden.rest.started_at = None;
    state.garden.rest.ends_at = None;
    state.garden.rest.max_duration_seconds = 0;
    state.garden.rest.planned_boost_seconds = 0;
    Ok(())
}
