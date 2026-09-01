import { generateUuidV4 } from '@/lib/id';

export type PlaceSuggestion = {
  id: string;
  /** Value written into the location field. */
  label: string;
  title: string;
  /** Optional secondary line in the suggestion list. */
  detail?: string;
  /** Google place_id when the result came from Places. */
  placeId?: string;
};

export type PlaceSearchOptions = {
  /** Include businesses (restaurants, shops) as well as street addresses. */
  includeBusinesses?: boolean;
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
  signal?: AbortSignal,
  options?: PlaceSearchOptions
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const key = googlePlacesKey();
  if (key) {
    try {
      const google = await searchGooglePlaces(q, key, signal, options);
      if (google.length > 0) return google;
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }

  return searchPhoton(q, signal);
}

/** Business name plus street-level address, without duplicating the name. */
export function composePlaceLabel(name?: string, formattedAddress?: string): string {
  const n = name?.trim() ?? '';
  const addr = formattedAddress?.trim() ?? '';
  if (n && addr && !addr.toLowerCase().startsWith(n.toLowerCase())) {
    return `${n}, ${addr}`;
  }
  return addr || n;
}

/** Fill in street number + business name from Place Details (same autocomplete session). */
export async function resolvePlace(suggestion: PlaceSuggestion): Promise<PlaceSuggestion> {
  const key = googlePlacesKey();
  const placeId = suggestion.placeId;
  if (!key || !placeId) return suggestion;
  if (!googleSessionToken) googleSessionToken = generateUuidV4();

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'place_id,name,formatted_address');
  url.searchParams.set('key', key);
  url.searchParams.set('sessiontoken', googleSessionToken);

  const res = await fetch(url.toString());
  if (!res.ok) return suggestion;
  const json = (await res.json()) as {
    status?: string;
    result?: { place_id?: string; name?: string; formatted_address?: string };
  };
  if (json.status !== 'OK' || !json.result) return suggestion;
  const label = composePlaceLabel(json.result.name, json.result.formatted_address);
  if (!label) return suggestion;
  return {
    ...suggestion,
    placeId: json.result.place_id ?? placeId,
    label,
    title: json.result.name ?? suggestion.title,
    detail: json.result.formatted_address ?? suggestion.detail,
  };
}

async function searchGooglePlaces(
  query: string,
  key: string,
  signal?: AbortSignal,
  options?: PlaceSearchOptions
): Promise<PlaceSuggestion[]> {
  if (!googleSessionToken) googleSessionToken = generateUuidV4();
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', query);
  url.searchParams.set('key', key);
  url.searchParams.set('sessiontoken', googleSessionToken);
  // Default stays address-only so property location search stays cities/streets.
  // Activities omit this so restaurants and other businesses appear with street numbers.
  if (!options?.includeBusinesses) {
    url.searchParams.set('types', 'geocode');
  }

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
    placeId: p.place_id,
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
    housenumber?: string;
    street?: string;
    postcode?: string;
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
  if (!p) return null;
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ').trim();
  const cityLike = p.type === 'city' || p.type === 'town' || p.type === 'village';
  if (cityLike && p.name) {
    const parts = uniqueParts([p.name, p.country]);
    return {
      title: parts[0]!,
      label: parts.join(', '),
      detail: parts.slice(1).join(', ') || undefined,
    };
  }

  const name = p.name?.trim();
  const nameIsStreet =
    !!name && !!streetLine && name.toLowerCase() === streetLine.toLowerCase();
  const title = (!nameIsStreet && name) || streetLine || name;
  if (!title) return null;

  const cityLine = [p.postcode, p.city].filter(Boolean).join(' ').trim() || p.city;
  const head =
    !nameIsStreet && name && streetLine ? `${name}, ${streetLine}` : title;
  const parts = uniqueParts([head, cityLine, p.state, p.country]);
  return {
    title,
    label: parts.join(', '),
    detail: parts.slice(1).join(', ') || undefined,
  };
}
