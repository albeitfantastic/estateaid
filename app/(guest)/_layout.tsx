import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useInvitationStore } from '@/store/invitation-store';

export default function GuestTabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const currentUser = useAuthStore((s) => s.currentUser);
  const allInvitations = useInvitationStore((s) => s.invitations);

  const pendingInvitations = useMemo(
    () =>
      allInvitations.filter(
        (inv) =>
          ((currentUser?.email && inv.guestEmail === currentUser.email) ||
            inv.guestId === currentUser?.id) &&
          inv.status === 'pending'
      ),
    [allInvitations, currentUser?.email, currentUser?.id]
  );

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
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="invitations/index"
        options={{
          title: 'Invitations',
          tabBarIcon: ({ color }) => <IconSymbol name="envelope.fill" color={color} />,
          tabBarBadge: pendingInvitations.length > 0 ? pendingInvitations.length : undefined,
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
      <Tabs.Screen name="estates" options={{ href: null }} />
    </Tabs>
  );
}
