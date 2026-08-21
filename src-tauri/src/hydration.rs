fn complete_rest_break_in_state(
    state: &mut PersistedState,
    now: DateTime<Local>,
) -> Result<(), String> {
    if !state.garden.rest.active {
        return Err("there is no active rest break".to_string());
    }

    let ends_at = state
        .garden
        .rest
        .ends_at
        .as_deref()
        .and_then(parse_local_datetime)
        .ok_or_else(|| "rest break timing is invalid".to_string())?;

    if now < ends_at {
        return Err("rest break is not finished yet".to_string());
    }

    let boost_seconds = state.garden.rest.planned_boost_seconds;
    for crop in &mut state.garden.crops {
        crop.boost_applied_seconds = crop.boost_applied_seconds.saturating_add(boost_seconds);
    }

    state.garden.rest.active = false;
    state.garden.rest.started_at = None;
    state.garden.rest.ends_at = None;
    state.garden.rest.max_duration_seconds = 0;
    state.garden.rest.planned_boost_seconds = 0;
    Ok(())
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
        can_undo_last_drink: today.last_log_undo.is_some() || !today.last_log_undos.is_empty(),
        last_logged_amount_ml: today.last_logged_amount_ml,
    }
}

fn to_sedentary_status(settings: &Settings, sedentary: &SedentaryState) -> SedentaryStatus {
    SedentaryStatus {
        seated: sedentary.seated,
        seated_since: sedentary.seated_since.clone(),
        stood_up_at: sedentary.stood_up_at.clone(),
        next_reminder_at: next_sedentary_reminder_time(settings, sedentary),
        activity_day_key: sedentary.activity_day_key.clone(),
        activity_events: sedentary.activity_events.clone(),
    }
}

fn next_sedentary_reminder_time(
    settings: &Settings,
    sedentary: &SedentaryState,
) -> Option<String> {
    if sedentary.seated {
        let reminder_anchor = sedentary
            .last_stand_reminder_at
            .as_deref()
            .and_then(parse_local_datetime)
            .map(|value| (value, SIT_PROMPT_INTERVAL_MINUTES))
            .or_else(|| {
                sedentary
                    .seated_since
                    .as_deref()
                    .and_then(parse_local_datetime)
                    .map(|value| (value, i64::from(settings.sedentary_reminder_minutes)))
            })?;

        return Some(
            (reminder_anchor.0 + chrono::Duration::minutes(reminder_anchor.1)).to_rfc3339(),
        );
    }

    let prompt_anchor = sedentary
        .last_sit_prompt_at
        .as_deref()
        .and_then(parse_local_datetime)
        .or_else(|| {
            sedentary
                .stood_up_at
                .as_deref()
                .and_then(parse_local_datetime)
        })?;

    Some((prompt_anchor + chrono::Duration::minutes(SIT_PROMPT_INTERVAL_MINUTES)).to_rfc3339())
}

fn reconcile_sedentary_activity_day(
    sedentary: &mut SedentaryState,
    now: DateTime<Local>,
) -> bool {
    let current_day = day_key(now);
    if sedentary.activity_day_key == current_day {
        return false;
    }

    let previous_day = std::mem::replace(&mut sedentary.activity_day_key, current_day);
    sedentary.activity_events.clear();

    if previous_day.is_empty() {
        if sedentary.seated {
            if let Some(seated_since) = sedentary
                .seated_since
                .as_deref()
                .and_then(parse_local_datetime)
                .filter(|value| day_key(*value) == sedentary.activity_day_key)
            {
                sedentary.activity_events.push(SedentaryActivityEvent {
                    kind: SedentaryActivityKind::Seated,
                    at: seated_since.to_rfc3339(),
                });
            }
        }
        return true;
    }

    let now_text = now.to_rfc3339();
    let kind = if sedentary.seated {
        sedentary.seated_since = Some(now_text.clone());
        sedentary.stood_up_at = None;
        sedentary.last_stand_reminder_at = None;
        sedentary.last_sit_prompt_at = None;
        SedentaryActivityKind::Seated
    } else {
        sedentary.seated_since = None;
        sedentary.stood_up_at = Some(now_text.clone());
        sedentary.last_stand_reminder_at = None;
        sedentary.last_sit_prompt_at = None;
        SedentaryActivityKind::Standing
    };
    sedentary.activity_events.push(SedentaryActivityEvent {
        kind,
        at: now_text.clone(),
    });
    sedentary.updated_at = Some(now_text);
    true
}

fn toggle_sedentary_state_in_state(state: &mut PersistedState, now: DateTime<Local>) {
    reconcile_sedentary_activity_day(&mut state.sedentary, now);
    let now_text = now.to_rfc3339();
    if state.sedentary.seated {
        state.sedentary.seated = false;
        state.sedentary.seated_since = None;
        state.sedentary.stood_up_at = Some(now_text.clone());
        state.sedentary.last_stand_reminder_at = None;
        state.sedentary.last_sit_prompt_at = None;
    } else {
        state.sedentary.seated = true;
        state.sedentary.seated_since = Some(now_text.clone());
        state.sedentary.stood_up_at = None;
        state.sedentary.last_stand_reminder_at = None;
        state.sedentary.last_sit_prompt_at = None;
    }
    state.sedentary.activity_events.push(SedentaryActivityEvent {
        kind: if state.sedentary.seated {
            SedentaryActivityKind::Seated
        } else {
            SedentaryActivityKind::Standing
        },
        at: now_text.clone(),
    });
    state.sedentary.updated_at = Some(now_text);
}

fn reconcile_sedentary(
    state: &mut PersistedState,
    now: DateTime<Local>,
) -> Option<NotificationKind> {
    reconcile_sedentary_activity_day(&mut state.sedentary, now);

    if state.sedentary.seated {
        let seated_since = state
            .sedentary
            .seated_since
            .as_deref()
            .and_then(parse_local_datetime)?;
        let (reminder_anchor, reminder_interval) = state
            .sedentary
            .last_stand_reminder_at
            .as_deref()
            .and_then(parse_local_datetime)
            .map(|value| (value, SIT_PROMPT_INTERVAL_MINUTES))
            .unwrap_or((
                seated_since,
                i64::from(state.settings.sedentary_reminder_minutes),
            ));
        let due_at = reminder_anchor + chrono::Duration::minutes(reminder_interval);
        if now >= due_at {
            let now_text = now.to_rfc3339();
            state.sedentary.last_stand_reminder_at = Some(now_text.clone());
            state.sedentary.updated_at = Some(now_text);
            return Some(NotificationKind::SedentaryStandUp);
        }
        return None;
    }

    let anchor = state
        .sedentary
        .last_sit_prompt_at
        .as_deref()
        .and_then(parse_local_datetime)
        .or_else(|| {
            state
                .sedentary
                .stood_up_at
                .as_deref()
                .and_then(parse_local_datetime)
        })?;

    if now >= anchor + chrono::Duration::minutes(SIT_PROMPT_INTERVAL_MINUTES) {
        let now_text = now.to_rfc3339();
        state.sedentary.last_sit_prompt_at = Some(now_text.clone());
        state.sedentary.updated_at = Some(now_text);
        return Some(NotificationKind::SedentaryAskSitting);
    }

    None
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
    today.last_log_undos.clear();
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

