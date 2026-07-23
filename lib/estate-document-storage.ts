import type { DocumentPickerAsset } from 'expo-document-picker';
import { supabase } from '@/lib/supabase';

const BUCKET = 'estate-documents';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/** Uploads a picked file under `{estateId}/{documentId}-{filename}` and returns its storage path. */
export async function uploadEstateDocumentFile(
  estateId: string,
  documentId: string,
  file: DocumentPickerAsset
): Promise<{ path: string; error: string | null }> {
  try {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const path = `${estateId}/${documentId}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: file.mimeType ?? 'application/octet-stream',
        upsert: false,
      });
    if (error) return { path: '', error: error.message };
    return { path, error: null };
  } catch (e) {
    return { path: '', error: e instanceof Error ? e.message : 'Upload failed' };
  }
}

/** Generates a short-lived signed URL to view/download a stored document. */
export async function getEstateDocumentSignedUrl(
  storagePath: string
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 5);
  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}
