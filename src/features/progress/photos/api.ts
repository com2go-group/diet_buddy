import * as Crypto from 'expo-crypto';

import { base64ToBytes, type ImageMediaType } from '@/lib/images';
import { optional, supabase } from '@/lib/supabase';

export const PHOTO_BUCKET = 'progress-photos';
/** Signed URLs are short-lived (CLAUDE.md §13); the query refreshes them before they expire. */
export const SIGNED_URL_SECONDS = 600;

export interface ProgressPhoto {
  id: string;
  takenAt: string;
  path: string;
  url: string | null;
}

const EXTENSION: Record<ImageMediaType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** The user's photos, oldest first, each with a short-lived signed URL. */
export async function loadPhotos(userId: string): Promise<ProgressPhoto[]> {
  const rows =
    optional(
      await supabase
        .from('progress_photos')
        .select('id, taken_at, storage_path')
        .eq('user_id', userId)
        .order('taken_at')
        .limit(500),
    ) ?? [];
  if (!rows.length) return [];
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(
    rows.map((r) => r.storage_path),
    SIGNED_URL_SECONDS,
  );
  if (error) throw error;
  const urls = new Map((data ?? []).map((d) => [d.path, d.error ? null : d.signedUrl]));
  return rows.map((r) => ({
    id: r.id,
    takenAt: r.taken_at,
    path: r.storage_path,
    url: urls.get(r.storage_path) ?? null,
  }));
}

/** Uploads to <user_id>/<uuid>.<ext> in the private bucket, then records it. */
export async function addPhoto(
  userId: string,
  photo: { base64: string; mediaType: ImageMediaType },
): Promise<void> {
  const path = `${userId}/${Crypto.randomUUID()}.${EXTENSION[photo.mediaType]}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, base64ToBytes(photo.base64), { contentType: photo.mediaType, upsert: false });
  if (error) throw error;
  const inserted = await supabase
    .from('progress_photos')
    .insert({ user_id: userId, storage_path: path });
  if (inserted.error) {
    // Don't leave an orphaned file behind.
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw inserted.error;
  }
}

/** Removes the file first, then the row, so a failure never leaves an unlisted file. */
export async function deletePhoto(photo: Pick<ProgressPhoto, 'id' | 'path'>): Promise<void> {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([photo.path]);
  if (error) throw error;
  optional(await supabase.from('progress_photos').delete().eq('id', photo.id));
}
