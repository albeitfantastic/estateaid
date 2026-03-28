import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useMemo } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEstateStore } from '@/store/estate-store';
import { useAuthStore } from '@/store/auth-store';
import { useStayStore } from '@/store/stay-store';

export default function OwnerTabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allEstates = useEstateStore((s) => s.estates);
  const allStayRequests = useStayStore((s) => s.stayRequests);

  const myEstates = useMemo(
    () => allEstates.filter((e) => e.ownerId === currentUser?.id),
    [allEstates, currentUser?.id]
  );
  const pendingCount = useMemo(() => {
    const estateIds = myEstates.map((e) => e.id);
    return allStayRequests.filter(
      (r) => estateIds.includes(r.estateId) && r.status === 'pending'
    ).length;
  }, [allStayRequests, myEstates]);

  return (
    <Tabs
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
        name="dashboard/index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="estates"
        options={{
          title: 'Estates',
          tabBarIcon: ({ color }) => <IconSymbol name="building.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests/index"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <IconSymbol name="tray.fill" color={color} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
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
      />
    </Tabs>
  );
}
