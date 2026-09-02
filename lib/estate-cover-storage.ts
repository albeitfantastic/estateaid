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

/** Uploads a picked cover photo and returns its public HTTPS URL. */
export async function uploadEstateCover(
  estateId: string | string[],
  localUri: string,
  mimeType?: string | null
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
    const path = `${id}/cover.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
      contentType: mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: true,
    });
    if (error) {
      return { url: null, error: error.message };
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
