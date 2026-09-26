import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { dayKey } from '@/lib/dates';

/** Web: downloads the JSON. Native: writes it to the cache and opens the share sheet. */
export async function saveExport(data: unknown, now = new Date()): Promise<void> {
  const name = `dietbuddy-export-${dayKey(now)}.json`;
  const text = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: name,
    UTI: 'public.json',
  });
}
