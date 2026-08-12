import assert from "node:assert/strict";
import { getSyncRetryDelayMs, SYNC_REQUEST_MAX_ATTEMPTS } from "./syncRetry.ts";

assert.equal(SYNC_REQUEST_MAX_ATTEMPTS, 3);
assert.equal(getSyncRetryDelayMs(0), 500);
assert.equal(getSyncRetryDelayMs(1), 1000);
assert.equal(getSyncRetryDelayMs(2), 0);

