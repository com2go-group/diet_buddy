import * as ImagePicker from 'expo-image-picker';

import type { Macros, PhotoItem } from './types';

/** The server accepts up to 5,000,000 base64 characters. */
export const MAX_PHOTO_BASE64 = 5_000_000;

export type PickOutcome =
  | { kind: 'photo'; base64: string }
  | { kind: 'cancelled' }
  | { kind: 'denied' }
  | { kind: 'tooLarge' };

/**
 * Takes or chooses a photo as compressed JPEG base64. Only the image data is kept, in memory,
 * until it is sent for analysis.
 */
export async function pickFoodPhoto(source: 'camera' | 'library'): Promise<PickOutcome> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { kind: 'denied' };
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.4,
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
  const base64 = asset.base64 ?? (asset.uri.startsWith('data:') ? asset.uri : null);
  if (!base64) return { kind: 'cancelled' };
  if (base64.length > MAX_PHOTO_BASE64) return { kind: 'tooLarge' };
  return { kind: 'photo', base64 };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** USDA per-100 g numbers × grams (null when the item has no USDA match). */
export function photoItemMacros(item: PhotoItem, grams: number): Macros | null {
  if (!item.food) return null;
  const f = grams / 100;
  const p = item.food.per100g;
  return {
    kcal: Math.round(p.kcal * f),
    proteinG: round1(p.proteinG * f),
    carbsG: round1(p.carbsG * f),
    fatG: round1(p.fatG * f),
  };
}

export const PHOTO_GRAMS: [number, number] = [5, 2000];
