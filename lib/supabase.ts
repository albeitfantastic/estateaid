import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupportedStorage } from '@supabase/supabase-js'

const hasWindow = typeof window !== 'undefined'

// #region agent log
fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1393f3'},body:JSON.stringify({sessionId:'1393f3',runId:'post-fix',hypothesisId:'H1',location:'lib/supabase.ts:module',message:'supabase module load env',data:{hasWindow,typeofWindow:typeof window,platform:typeof process!=='undefined'?process?.release?.name:null},timestamp:Date.now()})}).catch(()=>{});
// #endregion

/**
 * AsyncStorage on web uses window.localStorage. During Expo web SSR / Metro Node
 * evaluation, window is missing — no-op so createClient session load cannot crash.
 * On the real browser client, AsyncStorage works normally.
 */
const authStorage: SupportedStorage = {
  getItem: (key) => {
    // #region agent log
    fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1393f3'},body:JSON.stringify({sessionId:'1393f3',runId:'post-fix',hypothesisId:'H2',location:'lib/supabase.ts:getItem',message:'auth storage getItem',data:{keyPrefix:String(key).slice(0,24),hasWindow:typeof window!=='undefined'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (typeof window === 'undefined') return Promise.resolve(null)
    return AsyncStorage.getItem(key)
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return Promise.resolve()
    return AsyncStorage.setItem(key, value)
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return Promise.resolve()
    return AsyncStorage.removeItem(key)
  },
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: authStorage,
      // Avoid SSR refresh timers / session restore against missing window (H2 spam in Node).
      autoRefreshToken: hasWindow,
      persistSession: hasWindow,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
)

// #region agent log
fetch('http://127.0.0.1:7410/ingest/3b21f73e-4d1e-45e8-beb0-f14c26a6554d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1393f3'},body:JSON.stringify({sessionId:'1393f3',runId:'post-fix',hypothesisId:'H4',location:'lib/supabase.ts:afterCreateClient',message:'createClient ok',data:{ok:true,autoRefreshToken:hasWindow,persistSession:hasWindow},timestamp:Date.now()})}).catch(()=>{});
// #endregion
