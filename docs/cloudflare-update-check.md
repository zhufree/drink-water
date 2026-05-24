# Cloudflare Update Check

The desktop app checks for updates once on startup and shows the result only in the settings footer.

The latest release metadata is stored in the `app_releases` table in Cloudflare D1.

## Current lookup

- `app_id`: `drink-water`
- `platform`: `desktop-windows`
- `channel`: `stable`

## Update the latest version

Run:

```powershell
npx wrangler d1 execute drink-water-leaderboard --remote --command "UPDATE app_releases SET latest_version='0.4.1', release_url='https://github.com/zhufree/drink-water/releases', notes='Bug fixes and polish.', published_at='2026-05-24T12:00:00.000Z', updated_at='2026-05-24T12:00:00.000Z' WHERE app_id='drink-water' AND platform='desktop-windows' AND channel='stable';" --config cloudflare/wrangler.jsonc
```

After that, the next app startup will fetch the new version and show the update hint in the settings page.
