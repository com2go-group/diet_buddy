/**
 * Image helpers shared by Edge Functions and the app (no Deno or Node APIs; atob/btoa only).
 */

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

/** The image type from its first bytes (the claimed type is not trusted). */
export function detectMediaType(base64: string): ImageMediaType | null {
  let head: string;
  try {
    head = atob(base64.slice(0, 16));
  } catch {
    return null;
  }
  if (head.startsWith('\xFF\xD8\xFF')) return 'image/jpeg';
  if (head.startsWith('\x89PNG\r\n\x1A\n')) return 'image/png';
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Removes a JPEG's APP1–APP15 segments (EXIF incl. GPS location, XMP, maker notes) and comments
 * before the photo leaves our server. Returns the input unchanged if the file isn't parseable.
 */
export function stripJpegMetadata(base64: string): string {
  let bin: string;
  try {
    bin = atob(base64);
  } catch {
    return base64;
  }
  if (bin.charCodeAt(0) !== 0xff || bin.charCodeAt(1) !== 0xd8) return base64;
  const kept: string[] = [bin.slice(0, 2)];
  let i = 2;
  while (i + 4 <= bin.length) {
    if (bin.charCodeAt(i) !== 0xff) return base64;
    const marker = bin.charCodeAt(i + 1);
    // Start of scan: the image data follows; keep the rest as is.
    if (marker === 0xda) {
      kept.push(bin.slice(i));
      return btoa(kept.join(''));
    }
    const length = (bin.charCodeAt(i + 2) << 8) | bin.charCodeAt(i + 3);
    if (length < 2) return base64;
    const drop = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!drop) kept.push(bin.slice(i, i + 2 + length));
    i += 2 + length;
  }
  return base64;
}
