import Constants from 'expo-constants';

const PATH = '/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Debug-Session-Id': '1393f3',
} as const;

/** Debug-mode ingest: localhost (sim/web) + Metro host (device) + console. */
export function debugLog1393f3(entry: {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  runId?: string;
}): void {
  const payload = {
    sessionId: '1393f3',
    runId: entry.runId ?? 'pre-fix',
    hypothesisId: entry.hypothesisId,
    location: entry.location,
    message: entry.message,
    data: entry.data,
    timestamp: Date.now(),
  };
  const body = JSON.stringify(payload);
  fetch(`http://127.0.0.1:7410${PATH}`, { method: 'POST', headers: HEADERS, body }).catch(() => {});
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== '127.0.0.1' && host !== 'localhost') {
    fetch(`http://${host}:7410${PATH}`, { method: 'POST', headers: HEADERS, body }).catch(() => {});
  }
  console.warn('[dbg-1393f3]', body);
}
