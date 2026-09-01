import { generateUuidV4 } from '@/lib/id';

export type PlaceSuggestion = {
  id: string;
  /** Value written into the location field. */
  label: string;
  title: string;
  /** Optional secondary line in the suggestion list. */
  detail?: string;
};

function googlePlacesKey(): string | null {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() || null;
}

let googleSessionToken: string | null = null;

/** New token while the user is typing; reset after they pick a place. */
export function beginPlaceSearchSession(): void {
  googleSessionToken = generateUuidV4();
}

export function endPlaceSearchSession(): void {
  googleSessionToken = null;
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = googlePlacesKey();
  if (key) {
    try {
      const google = await searchGooglePlaces(q, key, signal);
      if (google.length > 0) return google;
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }

  return searchPhoton(q, signal);
}

async function searchGooglePlaces(
  query: string,
  key: string,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  if (!googleSessionToken) googleSessionToken = generateUuidV4();
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', query);
  url.searchParams.set('key', key);
  url.searchParams.set('types', 'geocode');
  url.searchParams.set('sessiontoken', googleSessionToken);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  const json = (await res.json()) as {
    status?: string;
    predictions?: {
      place_id: string;
      description: string;
      structured_formatting?: { main_text?: string; secondary_text?: string };
    }[];
  };
  if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(json.status);
  }
  return (json.predictions ?? []).slice(0, 6).map((p) => ({
    id: p.place_id,
    label: p.description,
    title: p.structured_formatting?.main_text ?? p.description,
    detail: p.structured_formatting?.secondary_text,
  }));
}

type PhotonFeature = {
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
};

async function searchPhoton(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '6');
  url.searchParams.set('lang', 'en');

  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Place search HTTP ${res.status}`);
  const json = (await res.json()) as { features?: PhotonFeature[] };

  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const feature of json.features ?? []) {
    const formatted = formatPhoton(feature.properties);
    if (!formatted) continue;
    const key = formatted.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${feature.properties?.osm_type ?? 'p'}-${feature.properties?.osm_id ?? formatted.label}`,
      ...formatted,
    });
    if (out.length >= 6) break;
  }
  return out;
}

function uniqueParts(parts: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const part of parts) {
    if (!part?.trim()) continue;
    if (!out.some((u) => u.toLowerCase() === part.toLowerCase())) out.push(part);
  }
  return out;
}

function formatPhoton(
  p: PhotonFeature['properties'] | undefined
): Pick<PlaceSuggestion, 'label' | 'title' | 'detail'> | null {
  if (!p?.name) return null;
  const cityLike = p.type === 'city' || p.type === 'town' || p.type === 'village';
  const parts = cityLike
    ? uniqueParts([p.name, p.country])
    : uniqueParts([p.name, p.city, p.state, p.country]);
  if (parts.length === 0) return null;
  return {
    title: parts[0]!,
    label: parts.join(', '),
    detail: parts.slice(1).join(', ') || undefined,
  };
}
