import { router, Tabs, useSegments } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TabBarGlassBackground } from '@/components/ui/tab-bar-glass-background';
import { useAppTheme } from '@/theme/useAppTheme';

function shouldHideTabBar(segments: string[]): boolean {
  return segments.some(
    (s) => s === 'customer-center' || s === 'paywall' || s.startsWith('paywall-')
  );
}

function isNestedStack(tabState: { routes: { name: string; state?: { index?: number; routes?: { name: string }[] } }[] }, tabName: string) {
  const route = tabState.routes.find((r) => r.name === tabName);
  const stack = route?.state;
  if (!stack || typeof stack.index !== 'number') return false;
  const focused = stack.routes?.[stack.index];
  return stack.index > 0 || (!!focused && focused.name !== 'index');
}

export default function AppTabLayout() {
  const appTheme = useAppTheme();
  const { t, i18n } = useTranslation();
  const segments = useSegments();
  const hideTabBar = shouldHideTabBar(segments as string[]);

  return (
    <Tabs
      key={i18n.resolvedLanguage}
      screenOptions={{
        tabBarActiveTintColor: appTheme.colors.primary,
        tabBarInactiveTintColor: appTheme.colors.iconMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => <TabBarGlassBackground />,
        tabBarStyle: hideTabBar
          ? { display: 'none' }
          : {
              position: 'absolute',
              backgroundColor: 'transparent',
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: appTheme.colors.border,
              ...Platform.select({
                ios: {
                  shadowColor: '#252220',
                  shadowOffset: { width: 0, height: -6 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                },
                android: { elevation: 12 },
                default: {},
              }),
            },
        tabBarLabelStyle: {
          fontFamily: appTheme.typography.fontFamily.medium,
          fontSize: 12,
          letterSpacing: 0.15,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'house.fill' : 'house'} color={color} />,
        }}
        listeners={{
          tabPress: () => {
            router.replace('/(app)/home' as never);
          },
        }}
      />
      <Tabs.Screen
        name="estates"
        options={{
          title: t('tabs.properties'),
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'building.2.fill' : 'building.2'} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            if (isNestedStack(navigation.getState(), 'estates')) {
              router.replace('/(app)/estates' as never);
            }
          },
        })}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name="calendar" color={color} weight={focused ? 'semibold' : 'regular'} />
          ),
        }}
        listeners={{
          tabPress: () => {
            router.replace('/(app)/calendar?segment=month' as never);
          },
        }}
      />
      {/* Reachable from Home and deep links, but not a tab of its own. */}
      <Tabs.Screen name="maintenance/index" options={{ href: null }} />
      <Tabs.Screen name="stays" options={{ href: null }} />
      <Tabs.Screen name="guests" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
