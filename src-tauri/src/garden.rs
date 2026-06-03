fn normalize_seed_type(seed_type: &str) -> Result<String, String> {
    canonical_seed_type(seed_type)
        .map(|value| value.to_string())
        .ok_or_else(|| "unknown seed type".to_string())
}

fn crop_type_for_seed(seed_type: &str) -> &'static str {
    match seed_type {
        BELL_PEPPER_SEED_TYPE => BELL_PEPPER_CROP_TYPE,
        CARROT_SEED_TYPE => CARROT_CROP_TYPE,
        NAPA_CABBAGE_SEED_TYPE => NAPA_CABBAGE_CROP_TYPE,
        BROCCOLI_SEED_TYPE => BROCCOLI_CROP_TYPE,
        RADISH_SEED_TYPE => RADISH_CROP_TYPE,
        ONION_SEED_TYPE => ONION_CROP_TYPE,
        EGGPLANT_SEED_TYPE => EGGPLANT_CROP_TYPE,
        PEA_SEED_TYPE => PEA_CROP_TYPE,
        PUMPKIN_SEED_TYPE => PUMPKIN_CROP_TYPE,
        _ => POTATO_CROP_TYPE,
    }
}

fn seed_type_for_crop(crop_type: &str) -> &'static str {
    match crop_type {
        BELL_PEPPER_CROP_TYPE => BELL_PEPPER_SEED_TYPE,
        CARROT_CROP_TYPE => CARROT_SEED_TYPE,
        NAPA_CABBAGE_CROP_TYPE => NAPA_CABBAGE_SEED_TYPE,
        BROCCOLI_CROP_TYPE => BROCCOLI_SEED_TYPE,
        RADISH_CROP_TYPE => RADISH_SEED_TYPE,
        ONION_CROP_TYPE => ONION_SEED_TYPE,
        EGGPLANT_CROP_TYPE => EGGPLANT_SEED_TYPE,
        PEA_CROP_TYPE => PEA_SEED_TYPE,
        PUMPKIN_CROP_TYPE => PUMPKIN_SEED_TYPE,
        _ => POTATO_SEED_TYPE,
    }
}

fn crop_tier(crop_type: &str) -> Option<u8> {
    match crop_type {
        POTATO_CROP_TYPE
        | BELL_PEPPER_CROP_TYPE
        | CARROT_CROP_TYPE
        | NAPA_CABBAGE_CROP_TYPE
        | PEA_CROP_TYPE => Some(1),
        BROCCOLI_CROP_TYPE | RADISH_CROP_TYPE | ONION_CROP_TYPE | PUMPKIN_CROP_TYPE => Some(2),
        EGGPLANT_CROP_TYPE => Some(3),
        _ => None,
    }
}

fn seed_tier(seed_type: &str) -> Option<u8> {
    match seed_type {
        POTATO_SEED_TYPE
        | BELL_PEPPER_SEED_TYPE
        | CARROT_SEED_TYPE
        | NAPA_CABBAGE_SEED_TYPE
        | PEA_SEED_TYPE => Some(1),
        BROCCOLI_SEED_TYPE | RADISH_SEED_TYPE | ONION_SEED_TYPE | PUMPKIN_SEED_TYPE => Some(2),
        EGGPLANT_SEED_TYPE => Some(3),
        _ => None,
    }
}

fn canonical_seed_type(seed_type: &str) -> Option<&'static str> {
    match seed_type.trim() {
        POTATO_SEED_TYPE | LEGACY_BASIC_SEED_TYPE | LEGACY_BASIC_SEED_TYPE_V2 => {
            Some(POTATO_SEED_TYPE)
        }
        BELL_PEPPER_SEED_TYPE | LEGACY_ADVANCED_SEED_TYPE => Some(BELL_PEPPER_SEED_TYPE),
        CARROT_SEED_TYPE | LEGACY_CARROT_SEED_TYPE => Some(CARROT_SEED_TYPE),
        NAPA_CABBAGE_SEED_TYPE => Some(NAPA_CABBAGE_SEED_TYPE),
        BROCCOLI_SEED_TYPE | LEGACY_BROCCOLI_SEED_TYPE => Some(BROCCOLI_SEED_TYPE),
        RADISH_SEED_TYPE | LEGACY_RADISH_SEED_TYPE => Some(RADISH_SEED_TYPE),
        PUMPKIN_SEED_TYPE => Some(PUMPKIN_SEED_TYPE),
        ONION_SEED_TYPE => Some(ONION_SEED_TYPE),
        EGGPLANT_SEED_TYPE => Some(EGGPLANT_SEED_TYPE),
        PEA_SEED_TYPE => Some(PEA_SEED_TYPE),
        _ => None,
    }
}

fn canonical_crop_type(crop_type: &str) -> Option<&'static str> {
    match crop_type.trim() {
        POTATO_CROP_TYPE | LEGACY_BASIC_CROP_TYPE => Some(POTATO_CROP_TYPE),
        BELL_PEPPER_CROP_TYPE | LEGACY_ADVANCED_CROP_TYPE => Some(BELL_PEPPER_CROP_TYPE),
        CARROT_CROP_TYPE | LEGACY_CARROT_CROP_TYPE => Some(CARROT_CROP_TYPE),
        NAPA_CABBAGE_CROP_TYPE => Some(NAPA_CABBAGE_CROP_TYPE),
        BROCCOLI_CROP_TYPE | LEGACY_BROCCOLI_CROP_TYPE => Some(BROCCOLI_CROP_TYPE),
        RADISH_CROP_TYPE | LEGACY_RADISH_CROP_TYPE => Some(RADISH_CROP_TYPE),
        PUMPKIN_CROP_TYPE => Some(PUMPKIN_CROP_TYPE),
        ONION_CROP_TYPE => Some(ONION_CROP_TYPE),
        EGGPLANT_CROP_TYPE => Some(EGGPLANT_CROP_TYPE),
        PEA_CROP_TYPE => Some(PEA_CROP_TYPE),
        _ => None,
    }
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

    let crop_type = crop_type_for_seed(&state.garden.crops[crop_index].seed_type).to_string();
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
    add_seed(&mut state.garden, rewarded_seed_type, rewarded_seeds);
    Ok(())
}

fn exchange_produce_in_state(
    state: &mut PersistedState,
    source_crop_type: &str,
    target_seed_type: &str,
) -> Result<(), String> {
    let source_tier = crop_tier(source_crop_type).ok_or_else(|| "unknown exchange source".to_string())?;
    let target_tier = seed_tier(target_seed_type).ok_or_else(|| "unknown exchange target".to_string())?;
    let target_crop_type = crop_type_for_seed(target_seed_type);

    if source_crop_type == target_crop_type {
        return Err("cannot exchange into the same crop".to_string());
    }

    let cost = if target_tier == source_tier {
        1
    } else if target_tier == source_tier + 1 {
        3
    } else {
        return Err("unknown exchange target".to_string());
    };

    spend_produce(&mut state.garden, source_crop_type, cost)?;
    add_seed(&mut state.garden, target_seed_type, 1);
    Ok(())
}

fn redeem_background_reward_in_state(
    state: &mut PersistedState,
    reward_id: &str,
) -> Result<(), String> {
    if reward_id != CAT_COLLAGE_BACKGROUND_ID {
        return Err("unknown background reward".to_string());
    }

    if state
        .garden
        .unlocked_backgrounds
        .iter()
        .any(|background| background == CAT_COLLAGE_BACKGROUND_ID)
    {
        return Err("background reward already unlocked".to_string());
    }

    if total_produce(&state.garden, POTATO_CROP_TYPE) < 6
        || total_produce(&state.garden, RADISH_CROP_TYPE) < 6
    {
        return Err("not enough produce to exchange".to_string());
    }

    spend_produce(&mut state.garden, POTATO_CROP_TYPE, 6)?;
    spend_produce(&mut state.garden, RADISH_CROP_TYPE, 6)?;
    state
        .garden
        .unlocked_backgrounds
        .push(CAT_COLLAGE_BACKGROUND_ID.to_string());
    state.garden.active_background = CAT_COLLAGE_BACKGROUND_ID.to_string();
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

