CREATE TABLE IF NOT EXISTS app_releases (
  app_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  channel TEXT NOT NULL,
  latest_version TEXT NOT NULL,
  release_url TEXT NOT NULL,
  notes TEXT,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (app_id, platform, channel)
);

INSERT INTO app_releases (
  app_id,
  platform,
  channel,
  latest_version,
  release_url,
  notes,
  published_at,
  updated_at
) VALUES (
  'drink-water',
  'desktop-windows',
  'stable',
  '0.4.1',
  'https://github.com/zhufree/drink-water/releases',
  NULL,
  '2026-05-24T00:00:00.000Z',
  '2026-05-24T00:00:00.000Z'
)
ON CONFLICT(app_id, platform, channel) DO UPDATE SET
  latest_version = excluded.latest_version,
  release_url = excluded.release_url,
  notes = excluded.notes,
  published_at = excluded.published_at,
  updated_at = excluded.updated_at;
