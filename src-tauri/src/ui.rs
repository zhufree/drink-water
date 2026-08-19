fn ensure_window(app: &AppHandle) -> Result<tauri::WebviewWindow, tauri::Error> {
    if let Some(window) = app.get_webview_window("main") {
        return Ok(window);
    }

    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Drink Water")
        .inner_size(520.0, 935.0)
        .min_inner_size(520.0, 935.0)
        .max_inner_size(520.0, 935.0)
        .resizable(false)
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

#[derive(Clone, Copy)]
enum NotificationKind {
    DrinkNow,
    SnoozeReady,
    SedentaryStandUp,
    SedentaryAskSitting,
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
        (true, NotificationKind::SedentaryStandUp) => (
            "Time to stand up",
            "You have been seated for a while. Stand up and move for a minute.",
        ),
        (true, NotificationKind::SedentaryAskSitting) => (
            "Are you seated again?",
            "If you sat back down, tap the bottom button so I can time the next break.",
        ),
        (false, NotificationKind::DrinkNow) => (
            "该喝水了",
            "新的喝水提醒已经开始了，记得按时补一杯水。",
        ),
        (false, NotificationKind::SnoozeReady) => (
            "再次提醒你",
            "稍后提醒时间到了，现在可以顺手把这杯水补上。",
        ),
        (false, NotificationKind::SedentaryStandUp) => (
            "该起来活动了",
            "你已经坐了一段时间，站起来活动一分钟吧。",
        ),
        (false, NotificationKind::SedentaryAskSitting) => (
            "是不是又坐下了？",
            "如果已经坐回去了，点一下底部按钮，我会重新计时。",
        ),
    }
}

fn start_scheduler(app: AppHandle) {
    spawn(async move {
        loop {
            if let Some(state) = app.try_state::<AppState>() {
                let mut should_notify = false;
                let mut should_snooze_notify = false;
                let mut sedentary_notification = None;
                let mut notifications_enabled = false;
                let mut locale = default_locale();

                if let Ok(mut guard) = state.data.lock() {
                    let before_snooze = guard.today.snooze_until.clone();
                    let changed = reconcile(&mut guard, Local::now());
                    sedentary_notification = reconcile_sedentary(&mut guard, Local::now());
                    notifications_enabled = guard.settings.notifications_enabled;
                    locale = guard.settings.locale.clone();
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

                if let Some(kind) = sedentary_notification {
                    let copy = notification_copy(&locale, kind);
                    if notifications_enabled {
                        maybe_send_notification(&app, copy.0, copy.1);
                    }
                }

                let _ = state.save();
                if (should_notify || should_snooze_notify || sedentary_notification.is_some())
                    && notifications_enabled
                {
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
            get_sedentary_status,
            toggle_sedentary_state,
            log_drink,
            undo_last_drink,
            log_yesterday_drink,
            get_garden_state,
            get_achievement_state,
            get_achievement_snapshot,
            apply_remote_achievement_receipts,
            get_drink_water_config,
            plant_seed,
            harvest_crop,
            harvest_all_crops,
            exchange_produce,
            redeem_background_reward,
            set_active_background,
            start_expedition,
            claim_expedition,
            build_garden_project,
            start_rest_break,
            cancel_rest_break,
            complete_rest_break,
            leaderboard_request,
            export_data,
            import_data,
            get_sync_meta,
            set_sync_account,
            get_recent_daily_snapshots,
            get_garden_snapshot,
            get_settings_snapshot,
            apply_remote_snapshots,
            apply_remote_settings_snapshot,
            export_cloud_backup_payload,
            import_cloud_backup_payload,
            mark_cloud_backup_uploaded,
            mark_startup_catch_up_prompt_shown,
            mark_onboarding_seen,
            toggle_autostart,
            dismiss_or_snooze_reminder,
            get_history
        ])
        .run(tauri::generate_context!())
        .expect("failed to run drink-water app");
}
