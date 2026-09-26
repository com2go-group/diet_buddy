import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type Svg from 'react-native-svg';

import { dayKey } from '@/lib/dates';
import { base64ToBytes } from '@/lib/images';

/** Export size: 1080 × 1920, the usual story format. */
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;

function toPng(svg: Svg): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 10_000);
    svg.toDataURL(
      (base64) => {
        clearTimeout(timer);
        if (base64) resolve(base64);
        else reject(new Error('empty image'));
      },
      { width: EXPORT_WIDTH, height: EXPORT_HEIGHT },
    );
  });
}

/**
 * Turns the story SVG into a PNG on the device and shares it. Web: the share sheet when the
 * browser can share files, else a download. Nothing is uploaded by the app.
 */
export async function shareStoryImage(
  svg: Svg,
  now = new Date(),
): Promise<'shared' | 'downloaded'> {
  const name = `dietbuddy-week-${dayKey(now)}.png`;
  const base64 = await toPng(svg);
  if (Platform.OS === 'web') {
    const blob = new Blob([base64ToBytes(base64) as BlobPart], { type: 'image/png' });
    const file = new globalThis.File([blob], name, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'shared';
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(base64ToBytes(base64));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'image/png',
    dialogTitle: name,
    UTI: 'public.png',
  });
  return 'shared';
}
