import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { guestEmailsMatch } from '@/lib/invite-email';
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
          (guestEmailsMatch(inv.guestEmail, currentUser?.email) || inv.guestId === currentUser?.id) &&
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
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'house.fill' : 'house'} color={color} />,
        }}
      />
       <Tabs.Screen
        name="estates"
        options={{
          title: 'Properties',
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'building.2.fill' : 'building.2'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol name="calendar" color={color} weight={focused ? 'semibold' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="stays"
        options={{
          title: 'Stays',
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'suitcase.fill' : 'suitcase'} color={color} />,
        }}
      />
        <Tabs.Screen
        name="invitations/index"
        options={{
          title: 'Invites',
          tabBarIcon: ({ color, focused }) => <IconSymbol name={focused ? 'envelope.fill' : 'envelope'} color={color} />,
        }}
      />

      
      <Tabs.Screen name="requests/index" options={{ href: null }} />
      <Tabs.Screen name="profile/index" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  
    );
    
}
