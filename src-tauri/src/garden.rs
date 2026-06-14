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
    #[serde(default)]
    seed_aliases: Vec<String>,
    #[serde(default)]
    crop_aliases: Vec<String>,
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
        .header("User-Agent", "DrinkWater/0.6.5")
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

fn canonical_seed_type(seed_type: &str) -> Option<String> {
    let candidate = seed_type.trim();
    seed_exchange_config()
        .seeds
        .into_iter()
        .find(|seed| {
            seed.seed_type == candidate || seed.seed_aliases.iter().any(|alias| alias == candidate)
        })
        .map(|seed| seed.seed_type)
}

fn canonical_crop_type(crop_type: &str) -> Option<String> {
    let candidate = crop_type.trim();
    seed_exchange_config()
        .seeds
        .into_iter()
        .find(|seed| {
            seed.crop_type == candidate || seed.crop_aliases.iter().any(|alias| alias == candidate)
        })
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

