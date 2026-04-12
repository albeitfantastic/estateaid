import { Image } from 'expo-image';

type Props = { size?: number };

/** Official multicolor Google mark (bundled PNG); avoids react-native-svg path quirks on some builds. */
export function GoogleLogo({ size = 18 }: Props) {
  return (
    <Image
      source={require('../../assets/images/google-g.png')}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}
