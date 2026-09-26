import * as ImagePicker from 'expo-image-picker';

import {
  BASE64,
  detectMediaType,
  stripJpegMetadata,
  type ImageMediaType,
} from '../../../supabase/functions/_shared/image';

export { detectMediaType, stripJpegMetadata, type ImageMediaType };

/** Upload and analysis limit: 5,000,000 base64 characters (~3.7 MB). */
export const MAX_PHOTO_BASE64 = 5_000_000;

export type PickOutcome =
  | { kind: 'photo'; base64: string; mediaType: ImageMediaType }
  | { kind: 'cancelled' }
  | { kind: 'denied' }
  | { kind: 'tooLarge' }
  | { kind: 'unsupported' };

/**
 * Takes or chooses a photo as base64 (native pickers re-encode it as a compressed JPEG). JPEG
 * metadata such as the GPS location is removed before the photo goes anywhere.
 */
export async function pickPhoto(source: 'camera' | 'library', quality = 0.4): Promise<PickOutcome> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { kind: 'denied' };
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality,
    base64: true,
    exif: false,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { kind: 'cancelled' };
  // On web the picker returns a data URL instead of base64.
  const raw = asset.base64 ?? (asset.uri.startsWith('data:') ? asset.uri : null);
  if (!raw) return { kind: 'cancelled' };
  const base64 = raw.replace(/^data:[^,]*,/, '');
  if (base64.length > MAX_PHOTO_BASE64) return { kind: 'tooLarge' };
  const mediaType = BASE64.test(base64) ? detectMediaType(base64) : null;
  if (!mediaType) return { kind: 'unsupported' };
  return {
    kind: 'photo',
    base64: mediaType === 'image/jpeg' ? stripJpegMetadata(base64) : base64,
    mediaType,
  };
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
