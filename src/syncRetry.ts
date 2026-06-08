export const SYNC_REQUEST_MAX_ATTEMPTS = 3;

export function getSyncRetryDelayMs(attemptIndex: number) {
  if (attemptIndex >= SYNC_REQUEST_MAX_ATTEMPTS - 1) {
    return 0;
  }
  return 500 * 2 ** attemptIndex;
}

