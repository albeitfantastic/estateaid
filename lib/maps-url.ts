/** Open this query in Google Maps (app or browser). */
export function googleMapsSearchUrl(address: string, placeId?: string): string {
  const params = new URLSearchParams({ api: '1', query: address });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
