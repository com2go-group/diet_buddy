import { Linking, Platform } from 'react-native';

import { storeReviewLinks } from '@/lib/site';

/**
 * Opens the store's review page for DietBuddy (the store app if it can, else the web page).
 * Resolves false when there is no store to open (web) or nothing could be opened.
 */
export async function openStoreReview(os: string = Platform.OS): Promise<boolean> {
  const links =
    os === 'ios' ? storeReviewLinks.ios : os === 'android' ? storeReviewLinks.android : [];
  for (const url of links) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // Try the next link (e.g. no store app on a simulator).
    }
  }
  return false;
}
