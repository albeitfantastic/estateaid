import { Redirect, useLocalSearchParams } from 'expo-router';

function paramString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return '';
}

/**
 * The Stays tab was absorbed into Calendar (Month / Stays / Requests). This index
 * only remaps leftover `?tab=` / `?view=guest` deep links so that guestMode hack
 * never has to come back.
 */
export default function StaysIndexRedirect() {
  const params = useLocalSearchParams<{
    tab?: string | string[];
    view?: string | string[];
    code?: string | string[];
  }>();
  const tab = paramString(params.tab).toLowerCase();
  const code = paramString(params.code).trim();

  if (tab === 'redeem') {
    const q = code ? `?code=${encodeURIComponent(code)}` : '';
    return <Redirect href={`/(app)/estates/join${q}` as never} />;
  }
  if (tab === 'invite') {
    return <Redirect href="/(app)/guests" />;
  }
  if (tab === 'requests') {
    return <Redirect href="/(app)/calendar?segment=requests" />;
  }
  return <Redirect href="/(app)/calendar?segment=stays" />;
}
