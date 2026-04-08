import { StyleSheet, Text, View } from 'react-native';
import { MC } from '../paywall-tokens';

interface TimelineStepProps {
  heading: string;
  body: string;
  isLast?: boolean;
}

export function TimelineStep({ heading, body, isLast = false }: TimelineStepProps) {
  return (
    <View style={styles.row}>
      {/* Left column: dot + connector line */}
      <View style={styles.left}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Right column: text */}
      <View style={[styles.content, !isLast && styles.contentWithGap]}>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  left: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: MC.brand,
    marginTop: 4,
    flexShrink: 0,
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: MC.border,
    marginTop: 4,
    marginBottom: 0,
  },
  content: {
    flex: 1,
    paddingBottom: 28,
    gap: 4,
  },
  contentWithGap: {
    // extra space handled by paddingBottom
  },
  heading: {
    fontSize: MC.body,
    fontWeight: '600',
    color: MC.text,
    fontFamily: 'Manrope_600SemiBold',
  },
  body: {
    fontSize: MC.secondary,
    color: MC.textSecondary,
    lineHeight: 22,
    fontFamily: 'Manrope_400Regular',
  },
});
