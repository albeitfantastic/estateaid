import Constants from 'expo-constants';

const PATH = '/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d';
const SESSION = '1393f3';

function ingestUrls(): string[] {
  const hosts = new Set<string>(['127.0.0.1']);
  const candidates = [
    Constants.expoGoConfig?.debuggerHost,
    Constants.expoConfig?.hostUri,
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
  ];
  for (const c of candidates) {
    const host = c?.split(':')[0]?.trim();
    if (host) hosts.add(host);
  }
  return [...hosts].map((h) => `http://${h}:7410${PATH}`);
}

/** Debug-mode ingest: localhost + Expo debugger host so a physical device can reach the PC. */
export function agentDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  runId = 'post-fix'
): void {
  const payload = {
    sessionId: SESSION,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  console.log(`[dbg1393f3] ${hypothesisId} ${location} ${message}`, data);
  const body = JSON.stringify(payload);
  for (const url of ingestUrls()) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION },
      body,
    }).catch(() => {});
  }
  // #endregion
}
