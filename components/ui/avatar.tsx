import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';

interface AvatarProps {
  name: string;
  imageUri?: string;
  size?: number;
  color?: string;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, imageUri, size = 40, color = '#687076' }: AvatarProps) {
  const fontSize = size * 0.38;

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <ThemedText style={[styles.text, { fontSize, color: '#fff' }]}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: '700',
    lineHeight: undefined,
  },
});
