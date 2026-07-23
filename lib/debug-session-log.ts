/** Debug-session ingest helper (session 1393f3). Remove after verification. */
const ENDPOINTS = [
  'http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d',
  'http://192.168.178.50:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d',
];

export function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  runId = 'pre-fix'
) {
  const payload = {
    sessionId: '1393f3',
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  console.log(`[dbg1393f3] ${hypothesisId} ${location} ${message}`, JSON.stringify(data));
  const body = JSON.stringify(payload);
  for (const url of ENDPOINTS) {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '1393f3',
      },
      body,
    }).catch(() => {});
  }
  // #endregion
}
