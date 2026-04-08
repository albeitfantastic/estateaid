import { Alert } from 'react-native';

type TFn = (key: string) => string;

/** In-app prompt when a Standard user taps a Trial/Pro-only control. */
export function showMaisonProUpgradePrompt(t: TFn): void {
  Alert.alert(t('access.maisonProTitle'), t('access.upgradeToUnpause'), [{ text: t('common.ok') }]);
}
