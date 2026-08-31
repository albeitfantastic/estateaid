import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useScreenTheme } from '@/components/ui/screen-layout';
import { LEGAL_ROUTES } from '@/lib/legal-routes';

interface LegalLinksProps {
  /** Override the default in-app navigation (e.g. to dismiss a sheet first). */
  onPrivacy?: () => void;
  onTerms?: () => void;
  onImpressum?: () => void;
}

export function LegalLinks({ onPrivacy, onTerms, onImpressum }: LegalLinksProps) {
  const { colors } = useScreenTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const links: { label: string; onPress: () => void }[] = [
    {
      label: t('common.privacyPolicy'),
      onPress: onPrivacy ?? (() => router.push(LEGAL_ROUTES.privacy as never)),
    },
    {
      label: t('common.termsOfService'),
      onPress: onTerms ?? (() => router.push(LEGAL_ROUTES.terms as never)),
    },
    {
      label: t('common.impressum'),
      onPress: onImpressum ?? (() => router.push(LEGAL_ROUTES.impressum as never)),
    },
  ];

  return (
    <View style={styles.row}>
      {links.map((link, i) => (
        <View key={link.label} style={styles.item}>
          {i > 0 && <Text style={[styles.separator, { color: colors.textSecondary }]}>·</Text>}
          <TouchableOpacity onPress={link.onPress} activeOpacity={0.7} accessibilityRole="link">
            <Text style={[styles.link, { color: colors.textSecondary }]}>{link.label}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    opacity: 0.75,
  },
  separator: {
    fontSize: 12,
    opacity: 0.5,
  },
});
