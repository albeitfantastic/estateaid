import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Debug-mode ingest — resolves Metro host so a physical iPhone can reach the PC. */
export function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  runId = 'pre-fix'
): void {
  const payload = JSON.stringify({
    sessionId: '1393f3',
    runId,
    hypothesisId,
    location,
    message,
    data: { ...data, platformOS: Platform.OS },
    timestamp: Date.now(),
  });
  const hosts = new Set<string>();
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost ??
    null;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    hosts.add(hostUri.split(':')[0]!);
  }
  hosts.add('192.168.178.50');
  hosts.add('127.0.0.1');
  for (const host of hosts) {
    fetch(`http://${host}:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '1393f3',
      },
      body: payload,
    }).catch(() => {});
  }
  console.log(`[agent:1393f3][${hypothesisId}][${Platform.OS}] ${location} ${message}`, data);
}
