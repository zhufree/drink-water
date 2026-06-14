const STORE_FILE_NAME: &str = "drink-water-state.json";
const STATE_EVENT: &str = "state-updated";
const SNOOZE_MINUTES: i64 = 10;
const LEADERBOARD_API_BASE: &str = "https://water-api.zhufree.fun";
const POTATO_SEED_TYPE: &str = "potatoSeed";
const BELL_PEPPER_SEED_TYPE: &str = "bellPepperSeed";
const CARROT_SEED_TYPE: &str = "carrotSeed";
const NAPA_CABBAGE_SEED_TYPE: &str = "napaCabbageSeed";
const BROCCOLI_SEED_TYPE: &str = "broccoliSeed";
const RADISH_SEED_TYPE: &str = "radishSeed";
const RED_RADISH_SEED_TYPE: &str = "redRadishSeed";
const PUMPKIN_SEED_TYPE: &str = "pumpkinSeed";
const ONION_SEED_TYPE: &str = "onionSeed";
const EGGPLANT_SEED_TYPE: &str = "eggplantSeed";
const WATERMELON_SEED_TYPE: &str = "watermelonSeed";
const POTATO_CROP_TYPE: &str = "potato";
const BELL_PEPPER_CROP_TYPE: &str = "bellPepper";
const CARROT_CROP_TYPE: &str = "carrot";
const NAPA_CABBAGE_CROP_TYPE: &str = "napaCabbage";
const BROCCOLI_CROP_TYPE: &str = "broccoli";
const RADISH_CROP_TYPE: &str = "radish";
const RED_RADISH_CROP_TYPE: &str = "redRadish";
const PUMPKIN_CROP_TYPE: &str = "pumpkin";
const ONION_CROP_TYPE: &str = "onion";
const EGGPLANT_CROP_TYPE: &str = "eggplant";
const WATERMELON_CROP_TYPE: &str = "watermelon";

#[cfg(test)]
const BASIC_SEED_TYPE: &str = POTATO_SEED_TYPE;

const LEGACY_BASIC_SEED_TYPE: &str = "bokChoy";
const LEGACY_BASIC_SEED_TYPE_V2: &str = "bokChoySeed";
const LEGACY_ADVANCED_SEED_TYPE: &str = "cabbageSeed";
const LEGACY_CARROT_SEED_TYPE: &str = "peaSeed";
const LEGACY_BROCCOLI_SEED_TYPE: &str = "tomatoSeed";
const LEGACY_RADISH_SEED_TYPE: &str = "cornSeed";
const LEGACY_BASIC_CROP_TYPE: &str = "bokChoy";
const LEGACY_ADVANCED_CROP_TYPE: &str = "cabbage";
const LEGACY_CARROT_CROP_TYPE: &str = "pea";
const LEGACY_BROCCOLI_CROP_TYPE: &str = "tomato";
const LEGACY_RADISH_CROP_TYPE: &str = "corn";
const INITIAL_TIER_SEED_GRANT: u8 = 1;
const INITIAL_SEED_GRANT_COUNT: u32 = 1;
const DAY_SECONDS: i64 = 24 * 60 * 60;
const REST_COOLDOWN_MINUTES: i64 = 20;
const REST_SHORT_BREAK_SECONDS: u32 = 60;
const REST_MEDIUM_BREAK_SECONDS: u32 = 120;
const REST_LONG_BREAK_SECONDS: u32 = 180;
const REST_SHORT_BOOST_SECONDS: u32 = 60 * 60;
const REST_MEDIUM_BOOST_SECONDS: u32 = 2 * 60 * 60;
const REST_LONG_BOOST_SECONDS: u32 = 3 * 60 * 60;
const DEFAULT_BACKGROUND_ID: &str = "default";
#[cfg(test)]
const CAT_COLLAGE_BACKGROUND_ID: &str = "catCollage";

fn default_locale() -> String {
    "zh-CN".to_string()
}

fn default_cup_step_ml() -> u32 {
    50
}

fn default_panel_opacity_percent() -> u8 {
    68
}

fn default_panel_blur_px() -> u8 {
    8
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
    #[serde(default = "default_panel_opacity_percent")]
    panel_opacity_percent: u8,
    #[serde(default = "default_panel_blur_px")]
    panel_blur_px: u8,
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
            panel_opacity_percent: default_panel_opacity_percent(),
            panel_blur_px: default_panel_blur_px(),
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
        self.panel_opacity_percent = self.panel_opacity_percent.clamp(10, 92);
        self.panel_blur_px = self.panel_blur_px.clamp(0, 24);
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
