import { LinearGradient } from 'expo-linear-gradient';
import { Image, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, children, ...otherProps }: ThemedViewProps) {
  const t = useAppTheme();
  const backgroundColor = (lightColor ?? darkColor) ?? t.colors.background;
  const noiseOpacity = 0.03;

  return (
    <View style={[{ backgroundColor }, style]} {...otherProps}>
      <Image
        pointerEvents="none"
        source={require('@/assets/images/noise.png.png')}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: noiseOpacity }}
        resizeMode="cover"
        // #region agent log
        onLoad={() => {fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66fa9b'},body:JSON.stringify({sessionId:'66fa9b',runId:'paper-texture',hypothesisId:'A',location:'components/themed-view.tsx:26',message:'Noise image loaded',data:{opacity:noiseOpacity},timestamp:Date.now()})}).catch(()=>{});}}
        // #endregion
        // #region agent log
        onError={(e) => {fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66fa9b'},body:JSON.stringify({sessionId:'66fa9b',runId:'paper-texture',hypothesisId:'B',location:'components/themed-view.tsx:29',message:'Noise image failed',data:{opacity:noiseOpacity,error:String((e as any)?.nativeEvent?.error ?? '')},timestamp:Date.now()})}).catch(()=>{});}}
        // #endregion
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(230, 216, 195, 0.06)', // warm paper wash
          'rgba(244, 242, 237, 0.00)',
          'rgba(230, 216, 195, 0.04)',
        ]}
        start={{ x: 0.15, y: 0.05 }}
        end={{ x: 0.85, y: 0.95 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(47, 93, 80, 0.02)', // subtle brand-tinted vignette
          'rgba(47, 93, 80, 0.00)',
          'rgba(47, 93, 80, 0.025)',
        ]}
        start={{ x: 0.5, y: 0.0 }}
        end={{ x: 0.5, y: 1.0 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {children}
    </View>
  );
}
