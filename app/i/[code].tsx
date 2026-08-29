import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep link: estateaid://i/<CODE> → Stays redeem with code prefilled. */
export default function InviteDeepLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const q = new URLSearchParams({ tab: 'redeem' });
  if (c) q.set('code', c);
  return <Redirect href={`/(app)/stays?${q.toString()}` as never} />;
}
