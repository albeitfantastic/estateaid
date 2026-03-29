import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const C = {
  bg: '#FAFAF8',
  navy: '#1C3D5A',
  gold: '#C9A96E',
  text: '#0E1C2D',
  muted: '#6B7A8D',
  border: '#E5E7EA',
  surface: '#FFFFFF',
};

export default function RoleScreen() {
  const router = useRouter();

  function chooseOwner() {
    router.push({ pathname: '/(onboarding)/rating', params: { role: 'owner' } } as never);
  }

  function chooseGuest() {
    router.push({ pathname: '/(onboarding)/rating', params: { role: 'guest' } } as never);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Almost there</Text>
        <Text style={styles.title}>How will you use{'\n'}EstateAid?</Text>
        <Text style={styles.subtitle}>
          Choose your role. You can always switch later.
        </Text>

        <View style={styles.cards}>
          {/* Owner card */}
          <TouchableOpacity style={styles.card} onPress={chooseOwner} activeOpacity={0.85}>
            <View style={[styles.iconWrap, { backgroundColor: C.navy + '15' }]}>
              <Text style={styles.iconEmoji}>🏡</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>I'm a Property Owner</Text>
              <Text style={styles.cardDesc}>
                Manage estates, invite guests, approve stays and keep everything in one place.
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>From €5/week</Text>
            </View>
          </TouchableOpacity>

          {/* Guest card */}
          <TouchableOpacity style={styles.card} onPress={chooseGuest} activeOpacity={0.85}>
            <View style={[styles.iconWrap, { backgroundColor: C.gold + '20' }]}>
              <Text style={styles.iconEmoji}>🛎️</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>I'm a Guest</Text>
              <Text style={styles.cardDesc}>
                View properties you've been invited to, request stays and raise any issues.
              </Text>
            </View>
            <View style={[styles.tag, styles.tagFree]}>
              <Text style={[styles.tagText, { color: C.navy }]}>Always free</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  eyebrow: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: C.text,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: C.muted,
    lineHeight: 24,
    marginBottom: 40,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 20,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 28,
  },
  cardBody: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  cardDesc: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: C.navy,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagFree: {
    backgroundColor: C.gold + '30',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
