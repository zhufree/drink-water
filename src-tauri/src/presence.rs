const PRESENCE_IDLE_AWAY_SECS: i64 = 5 * 60;
const PRESENCE_MAX_BACKDATE_SECS: i64 = 12 * 60 * 60;

struct PresenceObservation {
    locked_or_asleep: bool,
    idle_seconds: u64,
    media_playing: bool,
}

struct PresenceMemory {
    was_locked_or_asleep: Option<bool>,
    interactive_since: Option<DateTime<Local>>,
}

struct PresenceDecision {
    away: bool,
    changed_at: DateTime<Local>,
}

fn evaluate_presence(
    memory: &mut PresenceMemory,
    observation: PresenceObservation,
    now: DateTime<Local>,
) -> PresenceDecision {
    let idle_secs = (observation.idle_seconds as i64).clamp(0, PRESENCE_MAX_BACKDATE_SECS);
    let last_input_at = now - chrono::Duration::seconds(idle_secs);

    if observation.locked_or_asleep {
        memory.was_locked_or_asleep = Some(true);
        return PresenceDecision {
            away: true,
            changed_at: last_input_at,
        };
    }

    let became_interactive = matches!(memory.was_locked_or_asleep, Some(true));
    if memory.interactive_since.is_none() || became_interactive {
        memory.interactive_since = Some(if became_interactive { now } else { last_input_at });
    }
    memory.was_locked_or_asleep = Some(false);

    if observation.media_playing {
        return PresenceDecision {
            away: false,
            changed_at: now,
        };
    }

    let interactive_since = memory.interactive_since.unwrap_or(now);
    let idle_from = if last_input_at > interactive_since {
        last_input_at
    } else {
        interactive_since
    };
    let effective_idle = (now - idle_from).num_seconds().max(0);
    if effective_idle >= PRESENCE_IDLE_AWAY_SECS {
        return PresenceDecision {
            away: true,
            changed_at: idle_from,
        };
    }

    PresenceDecision {
        away: false,
        changed_at: now,
    }
}

fn display_sleep_counts_as_media(process: &str, assertion_type: &str, level: i32) -> bool {
    if level == 0 || process.is_empty() {
        return false;
    }
    if !matches!(
        assertion_type,
        "PreventUserIdleDisplaySleep" | "NoDisplaySleepAssertion" | "PreventDisplaySleep"
    ) {
        return false;
    }
    let name = process.rsplit('/').next().unwrap_or(process);
    !matches!(
        name,
        "WindowServer"
            | "powerd"
            | "loginwindow"
            | "coreaudiod"
            | "UURemote"
            | "UURemoteServer"
            | "UserEventAgent"
            | "bluetoothd"
            | "sharingd"
            | "caffeinate"
            | "Amphetamine"
            | "KeepingYouAwake"
            | "ControlCenter"
    )
}

fn mark_manual_presence_hold(sedentary: &mut SedentaryState) {
    sedentary.auto_away = false;
    sedentary.presence_hold = true;
    sedentary.presence_seen_away = None;
}

fn set_auto_posture(state: &mut PersistedState, seated: bool, at: DateTime<Local>, now: DateTime<Local>) {
    reconcile_sedentary_activity_day(&mut state.sedentary, now);
    if state.sedentary.seated == seated {
        return;
    }

    let mut stamp = if day_key(at) == day_key(now) && at <= now {
        at
    } else {
        now
    };
    if let Some(latest) = state.sedentary.activity_events.last() {
        if let Some(latest_at) = parse_local_datetime(&latest.at) {
            if stamp <= latest_at {
                stamp = now;
            }
        }
    }

    let stamp_text = stamp.to_rfc3339();
    if seated {
        state.sedentary.seated = true;
        state.sedentary.seated_since = Some(stamp_text.clone());
        state.sedentary.stood_up_at = None;
    } else {
        state.sedentary.seated = false;
        state.sedentary.seated_since = None;
        state.sedentary.stood_up_at = Some(stamp_text.clone());
    }
    state.sedentary.last_stand_reminder_at = None;
    state.sedentary.last_sit_prompt_at = None;
    state.sedentary.activity_events.push(SedentaryActivityEvent {
        kind: if seated {
            SedentaryActivityKind::Seated
        } else {
            SedentaryActivityKind::Standing
        },
        at: stamp_text,
    });
    state.sedentary.updated_at = Some(now.to_rfc3339());
}

fn apply_presence_decision(state: &mut PersistedState, now: DateTime<Local>, decision: PresenceDecision) {
    if state.sedentary.presence_hold {
        let release = match state.sedentary.presence_seen_away {
            None => {
                state.sedentary.presence_seen_away = Some(decision.away);
                false
            }
            Some(seen) if seen == decision.away => false,
            Some(_) => {
                state.sedentary.presence_hold = false;
                state.sedentary.presence_seen_away = Some(decision.away);
                true
            }
        };
        if !release {
            if decision.away {
                state.sedentary.auto_away = true;
            }
            return;
        }
    }

    state.sedentary.presence_seen_away = Some(decision.away);
    if decision.away {
        state.sedentary.auto_away = true;
        set_auto_posture(state, false, decision.changed_at, now);
    } else if state.sedentary.auto_away {
        state.sedentary.auto_away = false;
        set_auto_posture(state, true, decision.changed_at, now);
    }
}

fn reconcile_sedentary_with_presence(
    state: &mut PersistedState,
    now: DateTime<Local>,
    presence: Option<PresenceDecision>,
) -> Option<NotificationKind> {
    if let Some(decision) = presence {
        apply_presence_decision(state, now, decision);
    }
    reconcile_sedentary(state, now)
}

static PRESENCE_MEMORY: Mutex<PresenceMemory> = Mutex::new(PresenceMemory {
    was_locked_or_asleep: None,
    interactive_since: None,
});

fn current_presence_decision(now: DateTime<Local>) -> Option<PresenceDecision> {
    let observation = sample_presence_observation()?;
    let mut memory = PRESENCE_MEMORY.lock().ok()?;
    Some(evaluate_presence(&mut memory, observation, now))
}

#[cfg(target_os = "macos")]
fn sample_presence_observation() -> Option<PresenceObservation> {
    Some(PresenceObservation {
        locked_or_asleep: macos_screen_locked() || macos_display_asleep(),
        idle_seconds: macos_input_idle_seconds(),
        media_playing: macos_media_playing(),
    })
}

#[cfg(not(target_os = "macos"))]
fn sample_presence_observation() -> Option<PresenceObservation> {
    None
}

#[cfg(target_os = "macos")]
fn macos_input_idle_seconds() -> u64 {
    let seconds = unsafe { cg::CGEventSourceSecondsSinceLastEventType(0, u32::MAX) };
    if !seconds.is_finite() || seconds <= 0.0 {
        0
    } else {
        seconds as u64
    }
}

#[cfg(target_os = "macos")]
fn macos_screen_locked() -> bool {
    unsafe {
        let session = cg::CGSessionCopyCurrentDictionary();
        if session.is_null() {
            return false;
        }
        let key = cf::string(b"CGSSessionScreenIsLocked\0");
        let value = cf::CFDictionaryGetValue(session, key);
        let locked = !value.is_null() && cf::CFBooleanGetValue(value);
        cf::CFRelease(key);
        cf::CFRelease(session);
        locked
    }
}

#[cfg(target_os = "macos")]
fn macos_display_asleep() -> bool {
    unsafe { cg::CGDisplayIsAsleep(cg::CGMainDisplayID()) != 0 }
}

#[cfg(target_os = "macos")]
fn macos_media_playing() -> bool {
    macos_output_audio_running() || macos_video_display_assertion()
}

#[cfg(target_os = "macos")]
fn macos_output_audio_running() -> bool {
    unsafe {
        let mut device: u32 = 0;
        let mut size = std::mem::size_of::<u32>() as u32;
        let mut address = audio::AudioObjectPropertyAddress {
            selector: audio::fourcc(b"dOut"),
            scope: audio::fourcc(b"glob"),
            element: 0,
        };
        let status = audio::AudioObjectGetPropertyData(
            1,
            &address,
            0,
            std::ptr::null(),
            &mut size,
            &mut device as *mut u32 as *mut std::ffi::c_void,
        );
        if status != 0 || device == 0 {
            return false;
        }
        let mut running: u32 = 0;
        size = std::mem::size_of::<u32>() as u32;
        address.selector = audio::fourcc(b"gone");
        let status = audio::AudioObjectGetPropertyData(
            device,
            &address,
            0,
            std::ptr::null(),
            &mut size,
            &mut running as *mut u32 as *mut std::ffi::c_void,
        );
        status == 0 && running != 0
    }
}

#[cfg(target_os = "macos")]
fn macos_video_display_assertion() -> bool {
    unsafe {
        let mut assertions: cf::CFTypeRef = std::ptr::null();
        if iokit::IOPMCopyAssertionsByProcess(&mut assertions) != 0 || assertions.is_null() {
            return false;
        }
        let count = cf::CFDictionaryGetCount(assertions);
        if count <= 0 || count > 512 {
            cf::CFRelease(assertions);
            return false;
        }
        let count = count as usize;
        let mut keys = vec![std::ptr::null(); count];
        let mut values = vec![std::ptr::null(); count];
        cf::CFDictionaryGetKeysAndValues(assertions, keys.as_mut_ptr(), values.as_mut_ptr());
        let mut found = false;
        for (key, value) in keys.into_iter().zip(values) {
            if found || key.is_null() || value.is_null() {
                continue;
            }
            let Some(pid) = cf::number_i32(key) else {
                continue;
            };
            if cf::CFGetTypeID(value) != cf::CFArrayGetTypeID() {
                continue;
            }
            let process = process_name(pid);
            let assertions_len = cf::CFArrayGetCount(value);
            for index in 0..assertions_len {
                let item = cf::CFArrayGetValueAtIndex(value, index);
                if item.is_null() || cf::CFGetTypeID(item) != cf::CFDictionaryGetTypeID() {
                    continue;
                }
                let assertion_type = cf::dict_string(item, b"AssertType\0");
                let level = cf::dict_number(item, b"AssertLevel\0").unwrap_or(255);
                if display_sleep_counts_as_media(&process, &assertion_type, level) {
                    found = true;
                    break;
                }
            }
        }
        cf::CFRelease(assertions);
        found
    }
}

#[cfg(target_os = "macos")]
fn process_name(pid: i32) -> String {
    unsafe {
        let mut buffer = vec![0i8; 4096];
        let length = proc::proc_pidpath(pid, buffer.as_mut_ptr(), buffer.len() as u32);
        if length <= 0 {
            return String::new();
        }
        let bytes = buffer
            .iter()
            .take(length as usize)
            .map(|byte| *byte as u8)
            .collect::<Vec<_>>();
        String::from_utf8(bytes).unwrap_or_default()
    }
}

#[cfg(target_os = "macos")]
mod cg {
    use std::ffi::c_void;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        pub fn CGEventSourceSecondsSinceLastEventType(state_id: u32, event_type: u32) -> f64;
        pub fn CGSessionCopyCurrentDictionary() -> *const c_void;
        pub fn CGMainDisplayID() -> u32;
        pub fn CGDisplayIsAsleep(display: u32) -> u8;
    }
}

#[cfg(target_os = "macos")]
mod cf {
    use std::ffi::c_void;

    pub type CFTypeRef = *const c_void;
    pub type CFIndex = isize;

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        pub fn CFRelease(value: CFTypeRef);
        pub fn CFDictionaryGetValue(dict: CFTypeRef, key: CFTypeRef) -> CFTypeRef;
        pub fn CFDictionaryGetCount(dict: CFTypeRef) -> CFIndex;
        pub fn CFDictionaryGetKeysAndValues(
            dict: CFTypeRef,
            keys: *mut CFTypeRef,
            values: *mut CFTypeRef,
        );
        pub fn CFGetTypeID(value: CFTypeRef) -> usize;
        pub fn CFArrayGetTypeID() -> usize;
        pub fn CFDictionaryGetTypeID() -> usize;
        pub fn CFStringGetTypeID() -> usize;
        pub fn CFNumberGetTypeID() -> usize;
        pub fn CFArrayGetCount(array: CFTypeRef) -> CFIndex;
        pub fn CFArrayGetValueAtIndex(array: CFTypeRef, index: CFIndex) -> CFTypeRef;
        pub fn CFStringCreateWithCString(
            allocator: *const c_void,
            c_str: *const u8,
            encoding: u32,
        ) -> CFTypeRef;
        pub fn CFStringGetCString(
            value: CFTypeRef,
            buffer: *mut u8,
            size: CFIndex,
            encoding: u32,
        ) -> bool;
        pub fn CFNumberGetValue(number: CFTypeRef, type_id: i32, value: *mut c_void) -> bool;
        pub fn CFBooleanGetValue(value: CFTypeRef) -> bool;
    }

    const UTF8: u32 = 0x0800_0100;

    pub fn string(c_str: &[u8]) -> CFTypeRef {
        unsafe { CFStringCreateWithCString(std::ptr::null(), c_str.as_ptr(), UTF8) }
    }

    pub fn number_i32(value: CFTypeRef) -> Option<i32> {
        if value.is_null() {
            return None;
        }
        unsafe {
            if CFGetTypeID(value) != CFNumberGetTypeID() {
                return None;
            }
            let mut number = 0i64;
            if CFNumberGetValue(value, 4, &mut number as *mut i64 as *mut c_void) {
                return i32::try_from(number).ok();
            }
            let mut number = 0i32;
            if CFNumberGetValue(value, 9, &mut number as *mut i32 as *mut c_void) {
                return Some(number);
            }
        }
        None
    }

    pub fn dict_string(dict: CFTypeRef, key: &[u8]) -> String {
        unsafe {
            let key = string(key);
            let value = CFDictionaryGetValue(dict, key);
            CFRelease(key);
            if value.is_null() || CFGetTypeID(value) != CFStringGetTypeID() {
                return String::new();
            }
            let mut buffer = vec![0u8; 256];
            if !CFStringGetCString(value, buffer.as_mut_ptr(), buffer.len() as CFIndex, UTF8) {
                return String::new();
            }
            let end = buffer.iter().position(|byte| *byte == 0).unwrap_or(buffer.len());
            String::from_utf8_lossy(&buffer[..end]).into_owned()
        }
    }

    pub fn dict_number(dict: CFTypeRef, key: &[u8]) -> Option<i32> {
        unsafe {
            let key = string(key);
            let value = CFDictionaryGetValue(dict, key);
            CFRelease(key);
            number_i32(value)
        }
    }
}

#[cfg(target_os = "macos")]
mod audio {
    use std::ffi::c_void;

    #[repr(C)]
    pub struct AudioObjectPropertyAddress {
        pub selector: u32,
        pub scope: u32,
        pub element: u32,
    }

    pub fn fourcc(bytes: &[u8; 4]) -> u32 {
        u32::from_be_bytes(*bytes)
    }

    #[link(name = "CoreAudio", kind = "framework")]
    extern "C" {
        pub fn AudioObjectGetPropertyData(
            object_id: u32,
            address: *const AudioObjectPropertyAddress,
            qualifier_size: u32,
            qualifier: *const c_void,
            data_size: *mut u32,
            data: *mut c_void,
        ) -> i32;
    }
}

#[cfg(target_os = "macos")]
mod iokit {
    use super::cf::CFTypeRef;

    #[link(name = "IOKit", kind = "framework")]
    extern "C" {
        pub fn IOPMCopyAssertionsByProcess(assertions: *mut CFTypeRef) -> i32;
    }
}

#[cfg(target_os = "macos")]
mod proc {
    #[link(name = "proc")]
    extern "C" {
        pub fn proc_pidpath(pid: i32, buffer: *mut i8, buffersize: u32) -> i32;
    }
}
