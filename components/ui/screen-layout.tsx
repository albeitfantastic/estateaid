import { useCallback, useContext, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useScrollToTop } from '@react-navigation/native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  Colors,
  Elevation,
  Layout,
  Radius,
  type ColorSchemeName,
  type ThemeColors,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useScreenTheme() {
  const colorScheme = useColorScheme();
  const scheme: ColorSchemeName = colorScheme ?? 'light';
  const colors = Colors[scheme];
  return {
    colors,
    scheme,
    cardShadow: Elevation.card[scheme],
    borderHairline: StyleSheet.hairlineWidth,
    layout: Layout,
    radius: Radius,
  };
}

type ScreenShellProps = {
  title?: string | ReactNode;
  /** Display type (36pt) — photo heroes only, not list screens. */
  largeTitle?: boolean;
  onBack?: () => void;
  showBack?: boolean;
  headerRight?: ReactNode;
  /** Replaces the back/title/right row (safe-area padding still applied). */
  customHeader?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ScreenShell({
  title,
  largeTitle = false,
  onBack,
  showBack = true,
  headerRight,
  customHeader,
  children,
  style,
}: ScreenShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useScreenTheme();
  const { t } = useTranslation();

  function handleBack() {
    if (onBack) onBack();
    else router.back();
  }

  return (
    <ThemedView style={[styles.container, style]}>
      {customHeader ? (
        <View style={{ paddingTop: insets.top + 12 }}>{customHeader}</View>
      ) : (
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.back')}
            >
              <IconSymbol name="arrow.left" size={22} color={colors.tint} />
            </TouchableOpacity>
          ) : null}
          {typeof title === 'string' ? (
            <ThemedText
              type={largeTitle ? 'display' : 'title'}
              style={largeTitle ? styles.largeTitle : styles.title}
              numberOfLines={largeTitle ? 2 : 1}
            >
              {title}
            </ThemedText>
          ) : title ? (
            <View style={styles.titleNode}>{title}</View>
          ) : (
            <View style={styles.titleNode} />
          )}
          {headerRight ?? <View style={styles.headerRightPlaceholder} />}
        </View>
      )}
      {children}
    </ThemedView>
  );
}

type ScreenScrollProps = ScrollViewProps & {
  /** Extra space above the tab bar / home indicator. Default 32. */
  bottomInset?: number;
  gap?: number;
  /** When this tab/screen is focused, jump to the top of the scroll view. */
  scrollToTopOnFocus?: boolean;
};

export function ScreenScroll({
  children,
  contentContainerStyle,
  bottomInset,
  gap = 20,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  scrollToTopOnFocus = false,
  ...rest
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const extra = bottomInset ?? 32;
  const chrome =
    typeof tabBarHeight === 'number' && tabBarHeight > 0 ? tabBarHeight : insets.bottom;
  const padBottom = chrome + extra;
  const scrollRef = useRef<ScrollView>(null);

  useScrollToTop(scrollRef);

  useFocusEffect(
    useCallback(() => {
      if (!scrollToTopOnFocus) return;
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [scrollToTopOnFocus])
  );

  return (
    <ScrollView
      {...rest}
      ref={scrollRef}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      contentContainerStyle={[styles.scroll, { gap }, contentContainerStyle, { paddingBottom: padBottom }]}
    >
      {children}
    </ScrollView>
  );
}

export function ScreenFootnote({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useScreenTheme();
  return (
    <ThemedText style={[styles.footnote, { color: colors.textSecondary }, style]}>{children}</ThemedText>
  );
}

type SectionHeaderProps = {
  /** Preferred when the section has an action link (home “See all”). */
  title?: string;
  /** Same as `title` — used by existing `SectionLabel` call sites. */
  children?: string;
  style?: StyleProp<TextStyle>;
  marginTop?: number;
  actionLabel?: string;
  onAction?: () => void;
};

/** Uppercase section label. Optional trailing action (“See all”) sits on the same row. */
export function SectionHeader({
  title,
  children,
  style,
  marginTop,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  const { colors } = useScreenTheme();
  const label = (title ?? children ?? '').toUpperCase();
  const labelStyle = [
    styles.sectionLabel,
    { color: colors.textSecondary, marginTop: actionLabel && onAction ? 0 : (marginTop ?? 0) },
    style,
  ];

  if (actionLabel && onAction) {
    return (
      <View style={[styles.sectionHeaderRow, { marginTop: marginTop ?? 0 }]}>
        <ThemedText style={[labelStyle, { marginBottom: 0, flex: 1 }]}>{label}</ThemedText>
        <TouchableOpacity onPress={onAction} activeOpacity={0.65} hitSlop={10} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <ThemedText style={[styles.sectionAction, { color: colors.tint }]}>{actionLabel}</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return <ThemedText style={labelStyle}>{label}</ThemedText>;
}

export const SectionLabel = SectionHeader;

type GroupedListProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function GroupedList({ children, style }: GroupedListProps) {
  const { colors, borderHairline } = useScreenTheme();
  return (
    <View
      style={[
        styles.groupCard,
        { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: borderHairline },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type GroupedRowProps = {
  icon?: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
};

export function GroupedRow({
  icon,
  iconColor,
  iconBackgroundColor,
  title,
  subtitle,
  trailing,
  onPress,
  isLast = false,
  disabled,
  children,
  accessibilityLabel,
  accessibilityRole,
}: GroupedRowProps) {
  const { colors, borderHairline } = useScreenTheme();
  const content = (
    <>
      {icon ? (
        <View
          style={[
            styles.rowIcon,
            { backgroundColor: iconBackgroundColor ?? colors.tint + '12' },
          ]}
        >
          <IconSymbol name={icon as never} size={18} color={iconColor ?? colors.tint} />
        </View>
      ) : null}
      <View style={styles.rowBody}>
        {typeof title === 'string' ? (
          <ThemedText type="defaultSemiBold" style={styles.rowTitle}>
            {title}
          </ThemedText>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <ThemedText style={[styles.rowSub, { color: colors.textSecondary }]}>{subtitle}</ThemedText>
          ) : (
            subtitle
          )
        ) : null}
        {children}
      </View>
      {trailing}
      {onPress && !trailing ? (
        <IconSymbol name="chevron.right" size={14} color={colors.textSecondary} />
      ) : null}
    </>
  );

  const rowStyle = [
    styles.row,
    !isLast && { borderBottomColor: colors.border, borderBottomWidth: borderHairline },
  ];

  if (onPress) {
    const label =
      accessibilityLabel ?? (typeof title === 'string' ? title : undefined);
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={onPress}
        activeOpacity={0.65}
        disabled={disabled}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={label}
        accessibilityState={disabled ? { disabled: true } : undefined}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

type OutlineButtonProps = {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OutlineButton({ label, onPress, icon, disabled, style }: OutlineButtonProps) {
  const { colors } = useScreenTheme();
  return (
    <TouchableOpacity
      style={[styles.outlineBtn, { borderColor: colors.tint }, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled: true } : undefined}
    >
      {icon ? <IconSymbol name={icon as never} size={18} color={colors.tint} /> : null}
      <ThemedText style={[styles.outlineBtnText, { color: colors.tint }]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

type FilledButtonProps = {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** `accent` is the living terracotta — Home hero, hub primary, paywall. In-app commits stay `brand` (forest). */
  tone?: 'brand' | 'accent';
  /** Home hero only — 52pt. Default stays 44pt. */
  size?: 'default' | 'hero';
};

/** Primary CTA — same ~44pt target as OutlineButton (`Layout.touchMin`). */
export function FilledButton({
  label,
  onPress,
  icon,
  disabled,
  loading,
  style,
  tone = 'brand',
  size = 'default',
}: FilledButtonProps) {
  const { colors } = useScreenTheme();
  const idle = !(disabled || loading);
  const fill = tone === 'accent' ? colors.accent : colors.primaryFill;
  return (
    <TouchableOpacity
      style={[
        styles.filledBtn,
        size === 'hero' && styles.filledBtnHero,
        { backgroundColor: fill, opacity: idle ? 1 : 0.45 },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!idle}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={!idle ? { disabled: true } : undefined}
    >
      {loading ? (
        <ActivityIndicator color={colors.textOnBrand} />
      ) : (
        <>
          {icon ? <IconSymbol name={icon as never} size={18} color={colors.textOnBrand} /> : null}
          <ThemedText style={[styles.filledBtnText, { color: colors.textOnBrand }]}>{label}</ThemedText>
        </>
      )}
    </TouchableOpacity>
  );
}

type FormSheetProps = {
  visible: boolean;
  title: string;
  cancelLabel: string;
  saveLabel: string;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
  saveDisabled?: boolean;
};

export function FormSheet({
  visible,
  title,
  cancelLabel,
  saveLabel,
  onClose,
  onSave,
  children,
  saveDisabled,
}: FormSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useScreenTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.sheet, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <ThemedText style={[styles.sheetHeaderBtn, { color: colors.tint }]}>{cancelLabel}</ThemedText>
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
            {title}
          </ThemedText>
          <TouchableOpacity onPress={onSave} hitSlop={8} disabled={saveDisabled}>
            <ThemedText
              style={[
                styles.sheetHeaderBtn,
                { color: colors.tint, fontWeight: '700', opacity: saveDisabled ? 0.4 : 1 },
              ]}
            >
              {saveLabel}
            </ThemedText>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

/** Grouped form field wrapper (picker, inputs inside sheets). */
export function GroupedFormSection({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, borderHairline } = useScreenTheme();
  return (
    <View
      style={[
        styles.formSection,
        { borderColor: colors.border, borderWidth: borderHairline, backgroundColor: colors.background },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function groupedRowIconColors(colors: ThemeColors) {
  return {
    iconBackgroundColor: colors.tint + '12',
    iconColor: colors.tint,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: 20,
    gap: 12,
  },
  back: {
    minWidth: Layout.touchMin,
    minHeight: Layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  title: { flex: 1, letterSpacing: -0.3, textAlign: 'left' },
  largeTitle: { flex: 1, letterSpacing: -0.6, textAlign: 'left' },
  titleNode: { flex: 1 },
  headerRightPlaceholder: { width: 26 },
  scroll: { paddingHorizontal: Layout.screenPaddingX, paddingTop: 4 },
  footnote: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '500', letterSpacing: 1.4, marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionAction: { fontSize: 14, fontWeight: '600' },
  groupCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: Layout.touchMin,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 13 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginTop: 4,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },
  filledBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    minHeight: Layout.touchMin,
    borderRadius: Radius.md,
    marginTop: 4,
  },
  filledBtnHero: {
    minHeight: 52,
    paddingVertical: 16,
  },
  filledBtnText: { fontSize: 15, fontWeight: '600' },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPaddingX,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 17 },
  sheetHeaderBtn: { fontSize: 16, minWidth: 64 },
  sheetBody: { paddingHorizontal: Layout.screenPaddingX, gap: 16, paddingTop: 8 },
  formSection: {
    borderRadius: Radius.lg,
    padding: 12,
    overflow: 'hidden',
  },
});
