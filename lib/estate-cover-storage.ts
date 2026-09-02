import { supabase } from '@/lib/supabase';

const BUCKET = 'estate-covers';

export function isRemoteImageUrl(url: string | null | undefined): url is string {
  return !!url && (url.startsWith('https://') || url.startsWith('http://'));
}

function extensionForMime(mime: string | null | undefined): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  return 'jpg';
}

function objectPathFromPublicUrl(url: string | null | undefined, estateId: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0] ?? '');
  return path.startsWith(`${estateId}/`) ? path : null;
}

async function removeStaleCovers(estateId: string, keepPath: string, previousUrl?: string | null) {
  const stale = new Set<string>();
  const previousPath = objectPathFromPublicUrl(previousUrl, estateId);
  if (previousPath && previousPath !== keepPath) stale.add(previousPath);

  const { data: files } = await supabase.storage.from(BUCKET).list(estateId);
  for (const file of files ?? []) {
    if (!file.name) continue;
    const path = `${estateId}/${file.name}`;
    if (path !== keepPath) stale.add(path);
  }

  const paths = [...stale];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

/** Uploads a picked cover photo and returns its public HTTPS URL. */
export async function uploadEstateCover(
  estateId: string | string[],
  localUri: string,
  mimeType?: string | null,
  previousUrl?: string | null
): Promise<{ url: string | null; error: string | null }> {
  try {
    const id = (Array.isArray(estateId) ? estateId[0] : estateId)?.trim();
    if (!id) return { url: null, error: 'Missing property id' };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { url: null, error: 'Not signed in' };

    const response = await fetch(localUri);
    const body = await response.arrayBuffer();
    const ext = extensionForMime(mimeType ?? response.headers.get('content-type'));
    // Unique object name so replacing a cover always yields a new public URL.
    const path = `${id}/cover-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
      contentType: mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: false,
    });
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (error) {
      return { url: null, error: error.message };
    }
    try {
      await removeStaleCovers(id, path, previousUrl);
    } catch {
      // New cover is already live; leftover objects are non-fatal.
    }
    return { url: data.publicUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
