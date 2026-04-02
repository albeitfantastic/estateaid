import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts, Glass } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function GuestTabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const glass = Glass[colorScheme ?? 'light'];
  const { t, i18n } = useTranslation();

  return (
    <Tabs
      key={i18n.resolvedLanguage}
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.tabBar }]} />
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: glass.border,
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
          fontFamily: Fonts.label,
          fontSize: 10,
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
      />
      <Tabs.Screen
        name="estates"
        options={{
          title: t('tabs.properties'),
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'building.2.fill' : 'building.2'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name="calendar" color={color} weight={focused ? 'semibold' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="stays"
        options={{
          title: t('tabs.stays'),
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'suitcase.fill' : 'suitcase'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="invitations/index"
        options={{
          title: t('tabs.invites'),
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'envelope.fill' : 'envelope'} color={color} />,
        }}
      />
      <Tabs.Screen name="requests/index" options={{ href: null }} />
      <Tabs.Screen name="profile/index" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
