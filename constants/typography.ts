/** Central type scale — use via ThemedText or StyleSheet.compose */
export const Typography = {
  hero: { fontSize: 32, lineHeight: 38, fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  title: { fontSize: 28, lineHeight: 34, fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  subtitle: { fontSize: 20, lineHeight: 26, fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontFamily: 'Manrope_400Regular', fontWeight: '400' as const },
  bodySemiBold: { fontSize: 16, lineHeight: 24, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
  label: { fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_500Medium', fontWeight: '500' as const },
  labelBold: { fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: 'Manrope_400Regular', fontWeight: '400' as const },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  statValue: { fontSize: 22, lineHeight: 28, fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  statLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  tab: { fontSize: 10, lineHeight: 12, fontFamily: 'Manrope_500Medium', fontWeight: '500' as const, letterSpacing: 0.15 },
} as const;
