import assert from "node:assert/strict";
import worker from "./index.ts";

class MemoryStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.sql.includes("SELECT account_id FROM sync_devices WHERE device_id")) {
      const [deviceId] = this.values;
      const accountId = this.db.syncDevices.get(deviceId);
      return accountId ? { account_id: accountId } : null;
    }

    if (this.sql.includes("FROM garden_snapshots")) {
      const [accountId] = this.values;
      return this.db.gardenSnapshots.get(accountId) ?? null;
    }

    if (this.sql.includes("FROM settings_snapshots")) {
      const [accountId] = this.values;
      return this.db.settingsSnapshots.get(accountId) ?? null;
    }

    throw new Error(`Unhandled first SQL: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("FROM daily_snapshots")) {
      const [accountId, cutoffDayKey] = this.values;
      const results = Array.from(this.db.dailySnapshots.values())
        .filter((row) => row.account_id === accountId && row.day_key >= cutoffDayKey)
        .sort((left, right) => right.day_key.localeCompare(left.day_key));
      return { results };
    }

    throw new Error(`Unhandled all SQL: ${this.sql}`);
  }

  async run() {
    if (this.sql.includes("INSERT INTO daily_snapshots")) {
      const [accountId, dayKey, snapshotJson, updatedAt, updatedByDeviceId] = this.values;
      const key = `${accountId}|${dayKey}`;
      const existing = this.db.dailySnapshots.get(key);
      if (shouldReplace(existing, updatedAt, updatedByDeviceId)) {
        this.db.dailySnapshots.set(key, {
          account_id: accountId,
          day_key: dayKey,
          snapshot_json: snapshotJson,
          updated_at: updatedAt,
          updated_by_device_id: updatedByDeviceId
        });
      }
      return { success: true };
    }

    if (this.sql.includes("DELETE FROM daily_snapshots")) {
      const [accountId, cutoffDayKey] = this.values;
      for (const [key, row] of this.db.dailySnapshots.entries()) {
        if (row.account_id === accountId && row.day_key < cutoffDayKey) {
          this.db.dailySnapshots.delete(key);
        }
      }
      return { success: true };
    }

    if (this.sql.includes("INSERT INTO garden_snapshots")) {
      const [accountId, snapshotJson, updatedAt, updatedByDeviceId] = this.values;
      const existing = this.db.gardenSnapshots.get(accountId);
      if (shouldReplace(existing, updatedAt, updatedByDeviceId)) {
        this.db.gardenSnapshots.set(accountId, {
          snapshot_json: snapshotJson,
          updated_at: updatedAt,
          updated_by_device_id: updatedByDeviceId
        });
      }
      return { success: true };
    }

    if (this.sql.includes("INSERT INTO settings_snapshots")) {
      const [accountId, snapshotJson, updatedAt, updatedByDeviceId] = this.values;
      const existing = this.db.settingsSnapshots.get(accountId);
      if (shouldReplace(existing, updatedAt, updatedByDeviceId)) {
        this.db.settingsSnapshots.set(accountId, {
          snapshot_json: snapshotJson,
          updated_at: updatedAt,
          updated_by_device_id: updatedByDeviceId
        });
      }
      return { success: true };
    }

    throw new Error(`Unhandled run SQL: ${this.sql}`);
  }
}

class MemoryD1 {
  constructor() {
    this.syncDevices = new Map([["device-a", "account-a"]]);
    this.dailySnapshots = new Map();
    this.gardenSnapshots = new Map();
    this.settingsSnapshots = new Map();
  }

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }
}

function shouldReplace(existing, updatedAt, updatedByDeviceId) {
  if (!existing) {
    return true;
  }
  if (updatedAt > existing.updated_at) {
    return true;
  }
  if (updatedAt < existing.updated_at) {
    return false;
  }
  return updatedByDeviceId > existing.updated_by_device_id;
}

async function request(env, path, init = {}) {
  const response = await worker.fetch(
    new Request(`https://water-api.test${path}`, init),
    env
  );
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}

const env = {
  DB: new MemoryD1(),
  SYNC_BACKUPS: {}
};

const dayKey = new Date().toISOString().slice(0, 10);
const dailyUpdatedAt = `${dayKey}T08:00:00.000Z`;

await request(env, "/api/sync/snapshots/push", {
  method: "POST",
  body: JSON.stringify({
    accountId: "account-a",
    deviceId: "device-a",
    dailySnapshots: [
      {
        dayKey,
        snapshot: { dayKey, actualIntakeMl: 750 },
        updatedAt: dailyUpdatedAt,
        updatedByDeviceId: "device-a"
      }
    ],
    gardenSnapshot: {
      snapshot: { seeds: [{ seedType: "basic", count: 2 }] },
      updatedAt: "2026-06-08T08:01:00.000Z",
      updatedByDeviceId: "device-a"
    },
    settingsSnapshot: {
      snapshot: { dailyTargetMl: 2200, cupSizeMl: 250, locale: "zh-CN" },
      updatedAt: "2026-06-08T08:02:00.000Z",
      updatedByDeviceId: "device-a"
    }
  })
});

const pulled = await request(
  env,
  "/api/sync/snapshots?accountId=account-a&deviceId=device-a"
);

assert.equal(pulled.dailySnapshots.length, 1);
assert.equal(pulled.dailySnapshots[0].dayKey, dayKey);
assert.deepEqual(pulled.gardenSnapshot.snapshot, {
  seeds: [{ seedType: "basic", count: 2 }]
});
assert.deepEqual(pulled.settingsSnapshot.snapshot, {
  dailyTargetMl: 2200,
  cupSizeMl: 250,
  locale: "zh-CN"
});
