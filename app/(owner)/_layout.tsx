import { router, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PAYWALL_ROUTES = new Set([
  'paywall-trust',
  'paywall-main',
  'paywall-trial',
  'paywall-outcome',
  'paywall-exit',
  'paywall',
]);

export default function OwnerTabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t, i18n } = useTranslation();

  return (
    <Tabs
      key={i18n.resolvedLanguage}
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
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
        listeners={{
          tabPress: () => {
            router.replace('/(owner)/estates' as never);
          },
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
      
      {/*<Tabs.Screen
        name="calendar/index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <IconSymbol name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol name="person.fill" color={color} />,
        }}
      
      />*/}
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
      <Tabs.Screen name="guests" options={{ href: null }} />
      <Tabs.Screen name="plan-stay" options={{ href: null }} />
      <Tabs.Screen name="invite" options={{ href: null }} />
      <Tabs.Screen name="requests/index" options={{ href: null }} />
      <Tabs.Screen name="tickets/new-ticket" options={{ href: null }} />
      <Tabs.Screen name="tickets/index" options={{ href: null }} />
      <Tabs.Screen name="profile/index" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      
    </Tabs>
  );
}
