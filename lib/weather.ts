/** Open-Meteo current + 16-day daily forecast. No API key. */

export const WEATHER_FORECAST_HORIZON_DAYS = 16;

export type WeatherIconName =
  | 'sun.max.fill'
  | 'moon.fill'
  | 'cloud.fill'
  | 'cloud.sun.fill'
  | 'cloud.rain.fill'
  | 'cloud.snow.fill'
  | 'cloud.bolt.fill'
  | 'cloud.fog.fill';

export type WeatherNow = {
  temperatureC: number;
  weatherCode: number;
  isDay: boolean;
  icon: WeatherIconName;
};

export type WeatherStayForecast = {
  minC: number;
  maxC: number;
  weatherCode: number;
  icon: WeatherIconName;
};

export type PropertyWeather = {
  now: WeatherNow | null;
  stay: WeatherStayForecast | null;
};

type Coords = { latitude: number; longitude: number };

const geocodeCache = new Map<string, Coords | null>();
const weatherCache = new Map<string, { at: number; data: PropertyWeather }>();
const WEATHER_TTL_MS = 20 * 60 * 1000;

function weatherCacheKey(coords: Coords, stayFrom?: string, stayTo?: string): string {
  return `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}:${stayFrom ?? ''}:${stayTo ?? ''}`;
}

function uniqueQueries(location: string): string[] {
  const trimmed = location.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  const candidates = [trimmed];
  if (parts.length >= 2) candidates.push(parts.slice(-2).join(', '));
  if (parts.length >= 3) candidates.push(parts.slice(1).join(', '));
  return [...new Set(candidates)];
}

async function geocode(location: string, signal?: AbortSignal): Promise<Coords | null> {
  const key = location.trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  for (const query of uniqueQueries(location)) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', query);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    try {
      const res = await fetch(url.toString(), { signal });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        results?: { latitude: number; longitude: number }[];
      };
      const hit = json.results?.[0];
      if (hit && Number.isFinite(hit.latitude) && Number.isFinite(hit.longitude)) {
        const coords = { latitude: hit.latitude, longitude: hit.longitude };
        geocodeCache.set(key, coords);
        return coords;
      }
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }

  geocodeCache.set(key, null);
  return null;
}

/** WMO weather interpretation codes → SF Symbol. */
export function weatherIcon(code: number, isDay = true): WeatherIconName {
  if (code === 0) return isDay ? 'sun.max.fill' : 'moon.fill';
  if (code <= 3) return isDay ? 'cloud.sun.fill' : 'cloud.fill';
  if (code === 45 || code === 48) return 'cloud.fog.fill';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'cloud.rain.fill';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'cloud.snow.fill';
  if (code >= 95) return 'cloud.bolt.fill';
  return 'cloud.fill';
}

function severity(code: number): number {
  if (code >= 95) return 5;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 4;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 3;
  if (code === 45 || code === 48) return 2;
  if (code >= 1) return 1;
  return 0;
}

function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function todayYmd(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function formatTempC(c: number): string {
  return `${Math.round(c)}°`;
}

export function formatTempRangeC(min: number, max: number): string {
  const lo = Math.round(min);
  const hi = Math.round(max);
  if (lo === hi) return `${lo}°`;
  return `${lo}–${hi}°`;
}

export async function fetchPropertyWeather(opts: {
  location: string;
  timeZone?: string;
  stayFrom?: string;
  stayTo?: string;
  signal?: AbortSignal;
}): Promise<PropertyWeather | null> {
  const location = opts.location.trim();
  if (!location) return null;

  const coords = await geocode(location, opts.signal);
  if (!coords) return null;

  const cacheKey = weatherCacheKey(coords, opts.stayFrom, opts.stayTo);
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.at < WEATHER_TTL_MS) return cached.data;

  const tz = opts.timeZone?.trim() || 'auto';
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(coords.latitude));
  url.searchParams.set('longitude', String(coords.longitude));
  url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', tz);
  url.searchParams.set('forecast_days', String(WEATHER_FORECAST_HORIZON_DAYS));

  const res = await fetch(url.toString(), { signal: opts.signal });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
    };
  };

  const cur = json.current;
  const now: WeatherNow | null =
    cur && Number.isFinite(cur.temperature_2m) && Number.isFinite(cur.weather_code)
      ? {
          temperatureC: cur.temperature_2m!,
          weatherCode: cur.weather_code!,
          isDay: cur.is_day !== 0,
          icon: weatherIcon(cur.weather_code!, cur.is_day !== 0),
        }
      : null;

  let stay: WeatherStayForecast | null = null;
  const times = json.daily?.time ?? [];
  const codes = json.daily?.weather_code ?? [];
  const maxes = json.daily?.temperature_2m_max ?? [];
  const mins = json.daily?.temperature_2m_min ?? [];
  if (opts.stayFrom && opts.stayTo && times.length > 0) {
    const horizonEnd = addDaysYmd(todayYmd(), WEATHER_FORECAST_HORIZON_DAYS - 1);
    const from = opts.stayFrom > todayYmd() ? opts.stayFrom : todayYmd();
    const to = opts.stayTo < horizonEnd ? opts.stayTo : horizonEnd;
    if (from <= to && from <= horizonEnd) {
      const picked: { code: number; min: number; max: number }[] = [];
      for (let i = 0; i < times.length; i++) {
        const day = times[i];
        if (!day || day < from || day > to) continue;
        const code = codes[i];
        const min = mins[i];
        const max = maxes[i];
        if (!Number.isFinite(code) || !Number.isFinite(min) || !Number.isFinite(max)) continue;
        picked.push({ code: code!, min: min!, max: max! });
      }
      if (picked.length > 0) {
        const weatherCode = picked.reduce((best, d) => (severity(d.code) > severity(best) ? d.code : best), picked[0]!.code);
        stay = {
          minC: Math.min(...picked.map((d) => d.min)),
          maxC: Math.max(...picked.map((d) => d.max)),
          weatherCode,
          icon: weatherIcon(weatherCode, true),
        };
      }
    }
  }

  const data: PropertyWeather = { now, stay };
  weatherCache.set(cacheKey, { at: Date.now(), data });
  return data;
}
