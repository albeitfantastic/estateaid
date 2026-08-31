import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupportedStorage } from '@supabase/supabase-js'
import { Platform } from 'react-native'

/** Expo web SSR evaluates modules in Node with no window. Native always has a real runtime. */
const isWebSSR = Platform.OS === 'web' && typeof window === 'undefined'

/**
 * AsyncStorage on web uses window.localStorage. During Expo web SSR / Metro Node
 * evaluation, window is missing — no-op so createClient session load cannot crash.
 * On native and browser client, AsyncStorage works normally.
 */
const authStorage: SupportedStorage = {
  getItem: (key) => {
    if (isWebSSR) return Promise.resolve(null)
    return AsyncStorage.getItem(key)
  },
  setItem: (key, value) => {
    if (isWebSSR) return Promise.resolve()
    return AsyncStorage.setItem(key, value)
  },
  removeItem: (key) => {
    if (isWebSSR) return Promise.resolve()
    return AsyncStorage.removeItem(key)
  },
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: !isWebSSR,
      persistSession: !isWebSSR,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
)
