const ACHIEVEMENT_IDS: [&str; 12] = [
    "first_sip",
    "first_goal",
    "first_reminder_answer",
    "drink_streak_7",
    "goal_streak_7",
    "drink_streak_30",
    "first_plant",
    "first_harvest",
    "harvest_10",
    "same_crop_5",
    "crop_varieties_3",
    "first_background",
];

fn is_achievement_id(value: &str) -> bool {
    ACHIEVEMENT_IDS.contains(&value)
}

fn valid_day_key(value: &str) -> bool {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok()
}

fn valid_receipt(receipt: &AchievementReceipt) -> bool {
    if !is_achievement_id(&receipt.achievement_id)
        || DateTime::parse_from_rfc3339(&receipt.unlocked_at).is_err()
    {
        return false;
    }
    let evidence = &receipt.evidence;
    if evidence
        .start_day
        .as_deref()
        .is_some_and(|value| !valid_day_key(value))
        || evidence
            .end_day
            .as_deref()
            .is_some_and(|value| !valid_day_key(value))
    {
        return false;
    }

    match receipt.achievement_id.as_str() {
        "first_sip" | "first_goal" | "first_reminder_answer" => {
            evidence.kind == "daily"
                && evidence.end_day.is_some()
                && evidence.value.unwrap_or(0) >= 1
        }
        "drink_streak_7" | "goal_streak_7" | "drink_streak_30" => {
            let required = if receipt.achievement_id == "drink_streak_30" {
                30
            } else {
                7
            };
            let consecutive = evidence
                .start_day
                .as_deref()
                .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok())
                .zip(
                    evidence
                        .end_day
                        .as_deref()
                        .and_then(|value| NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()),
                )
                .is_some_and(|(start, end)| (end - start).num_days() + 1 == i64::from(required));
            evidence.kind == "streak" && evidence.value.unwrap_or(0) >= required && consecutive
        }
        "first_plant" => {
            matches!(evidence.kind.as_str(), "garden" | "collection")
                && evidence.value.unwrap_or(0) >= 1
        }
        "first_harvest" => evidence.kind == "collection" && evidence.value.unwrap_or(0) >= 1,
        "harvest_10" => evidence.kind == "collection" && evidence.value.unwrap_or(0) >= 10,
        "same_crop_5" => {
            evidence.kind == "collection"
                && evidence
                    .crop_type
                    .as_deref()
                    .is_some_and(|value| !value.trim().is_empty())
                && evidence.value.unwrap_or(0) >= 5
        }
        "crop_varieties_3" => evidence.kind == "collection" && evidence.value.unwrap_or(0) >= 3,
        "first_background" => evidence.kind == "background" && evidence.value.unwrap_or(0) >= 1,
        _ => false,
    }
}

fn receipt(
    achievement_id: &str,
    unlocked_at: String,
    kind: &str,
    start_day: Option<String>,
    end_day: Option<String>,
    crop_type: Option<String>,
    value: u32,
) -> AchievementReceipt {
    AchievementReceipt {
        achievement_id: achievement_id.to_string(),
        unlocked_at,
        evidence: AchievementEvidence {
            kind: kind.to_string(),
            start_day,
            end_day,
            crop_type,
            value: Some(value),
        },
    }
}

fn first_matching_day<F>(days: &BTreeMap<String, HistoryItem>, predicate: F) -> Option<String>
where
    F: Fn(&HistoryItem) -> bool,
{
    days.iter()
        .find_map(|(day_key, item)| predicate(item).then(|| day_key.clone()))
}

fn first_streak<F>(
    days: &BTreeMap<String, HistoryItem>,
    required: u32,
    predicate: F,
) -> Option<(String, String)>
where
    F: Fn(&HistoryItem) -> bool,
{
    let mut run_start = None;
    let mut previous = None;
    let mut run_length = 0_u32;
    for (key, item) in days {
        let Ok(day) = NaiveDate::parse_from_str(key, "%Y-%m-%d") else {
            continue;
        };
        if !predicate(item) {
            run_start = None;
            previous = None;
            run_length = 0;
            continue;
        }
        if previous.is_some_and(|value: NaiveDate| day == value + chrono::Duration::days(1)) {
            run_length += 1;
        } else {
            run_start = Some(key.clone());
            run_length = 1;
        }
        previous = Some(day);
        if run_length >= required {
            return Some((
                run_start.clone().unwrap_or_else(|| key.clone()),
                key.clone(),
            ));
        }
    }
    None
}

fn evaluate_achievement_receipts(
    state: &PersistedState,
    now: DateTime<Local>,
) -> Vec<AchievementReceipt> {
    let unlocked_at = now.to_rfc3339();
    let mut days = BTreeMap::new();
    for item in &state.history {
        if valid_day_key(&item.day_key) {
            days.insert(item.day_key.clone(), item.clone());
        }
    }
    let today = state.today.summary();
    if valid_day_key(&today.day_key) {
        days.insert(today.day_key.clone(), today);
    }

    let mut result = Vec::new();
    if let Some(day) = first_matching_day(&days, |item| item.actual_intake_ml > 0) {
        result.push(receipt(
            "first_sip",
            unlocked_at.clone(),
            "daily",
            None,
            Some(day),
            None,
            1,
        ));
    }
    if let Some(day) = first_matching_day(&days, |item| {
        item.target_ml > 0 && item.actual_intake_ml >= item.target_ml
    }) {
        result.push(receipt(
            "first_goal",
            unlocked_at.clone(),
            "daily",
            None,
            Some(day),
            None,
            1,
        ));
    }
    if let Some(day) = first_matching_day(&days, |item| item.completed_reminder_slots >= 1) {
        result.push(receipt(
            "first_reminder_answer",
            unlocked_at.clone(),
            "daily",
            None,
            Some(day),
            None,
            1,
        ));
    }
    for (id, required, goal) in [
        ("drink_streak_7", 7, false),
        ("goal_streak_7", 7, true),
        ("drink_streak_30", 30, false),
    ] {
        let found = if goal {
            first_streak(&days, required, |item| {
                item.target_ml > 0 && item.actual_intake_ml >= item.target_ml
            })
        } else {
            first_streak(&days, required, |item| item.actual_intake_ml > 0)
        };
        if let Some((start, end)) = found {
            result.push(receipt(
                id,
                unlocked_at.clone(),
                "streak",
                Some(start),
                Some(end),
                None,
                required,
            ));
        }
    }

    let total_harvests: u32 = state
        .garden
        .collection
        .iter()
        .map(|item| item.harvest_count)
        .sum();
    if let Some(crop) = state.garden.crops.first() {
        let event_time = DateTime::parse_from_rfc3339(&crop.planted_at)
            .map(|value| value.to_rfc3339())
            .unwrap_or_else(|_| unlocked_at.clone());
        result.push(receipt(
            "first_plant",
            event_time,
            "garden",
            None,
            None,
            None,
            1,
        ));
    } else if total_harvests > 0 {
        result.push(receipt(
            "first_plant",
            unlocked_at.clone(),
            "collection",
            None,
            None,
            None,
            total_harvests,
        ));
    }
    if total_harvests > 0 {
        let event_time = state
            .garden
            .collection
            .iter()
            .filter_map(|item| item.first_harvested_at.as_deref())
            .filter_map(|value| DateTime::parse_from_rfc3339(value).ok())
            .min()
            .map(|value| value.to_rfc3339())
            .unwrap_or_else(|| unlocked_at.clone());
        result.push(receipt(
            "first_harvest",
            event_time,
            "collection",
            None,
            None,
            None,
            total_harvests,
        ));
    }
    if total_harvests >= 10 {
        result.push(receipt(
            "harvest_10",
            unlocked_at.clone(),
            "collection",
            None,
            None,
            None,
            total_harvests,
        ));
    }
    if let Some(item) = state
        .garden
        .collection
        .iter()
        .find(|item| item.harvest_count >= 5)
    {
        result.push(receipt(
            "same_crop_5",
            unlocked_at.clone(),
            "collection",
            None,
            None,
            Some(item.crop_type.clone()),
            item.harvest_count,
        ));
    }
    let varieties = state
        .garden
        .collection
        .iter()
        .filter(|item| item.harvest_count > 0)
        .map(|item| item.crop_type.trim())
        .filter(|item| !item.is_empty())
        .collect::<std::collections::BTreeSet<_>>()
        .len() as u32;
    if varieties >= 3 {
        result.push(receipt(
            "crop_varieties_3",
            unlocked_at.clone(),
            "collection",
            None,
            None,
            None,
            varieties,
        ));
    }
    if !state.garden.unlocked_backgrounds.is_empty() {
        result.push(receipt(
            "first_background",
            unlocked_at,
            "background",
            None,
            None,
            None,
            state.garden.unlocked_backgrounds.len() as u32,
        ));
    }
    result
}

fn merge_achievement_receipts(
    local: &[AchievementReceipt],
    remote: &[AchievementReceipt],
) -> Vec<AchievementReceipt> {
    let mut merged = BTreeMap::<String, AchievementReceipt>::new();
    for candidate in local.iter().chain(remote) {
        if !valid_receipt(candidate) {
            continue;
        }
        let replace = merged.get(&candidate.achievement_id).is_none_or(|current| {
            DateTime::parse_from_rfc3339(&candidate.unlocked_at).ok()
                < DateTime::parse_from_rfc3339(&current.unlocked_at).ok()
        });
        if replace {
            merged.insert(candidate.achievement_id.clone(), candidate.clone());
        }
    }
    ACHIEVEMENT_IDS
        .iter()
        .filter_map(|id| merged.remove(*id))
        .collect()
}

fn refresh_achievements(state: &mut PersistedState, now: DateTime<Local>) -> bool {
    let evaluated = evaluate_achievement_receipts(state, now);
    let merged = merge_achievement_receipts(&state.achievements, &evaluated);
    if merged == state.achievements {
        false
    } else {
        state.achievements = merged;
        true
    }
}
