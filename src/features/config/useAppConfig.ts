import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { optional, supabase, type Json } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';

/** Switches the admin dashboard can turn off; everything is on unless set to false. */
export type Feature = 'barcode' | 'food_photo' | 'restaurant' | 'grocery';

async function loadConfig(): Promise<Map<string, Json>> {
  const rows = optional(await supabase.from('app_config').select('key, value')) ?? [];
  return new Map(rows.map((r) => [r.key, r.value]));
}

export function useAppConfig() {
  const signedIn = useSessionStore((s) => s.session !== null);
  return useQuery({
    queryKey: ['appConfig'],
    enabled: signedIn,
    queryFn: loadConfig,
    staleTime: 10 * 60_000,
  });
}

/** On when the setting is missing, unreadable or true; off only when an admin set it to false. */
export function useFeature(feature: Feature): boolean {
  const config = useAppConfig();
  return config.data?.get(`feature_${feature}`) !== false;
}

/** "1.10.0" > "1.9.3"; non-numeric parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number(n) || 0);
  const pb = b.split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** True when this app build is older than the minimum version set in the dashboard (native only). */
export function useUpdateRequired(): boolean {
  const config = useAppConfig();
  const min = config.data?.get('min_app_version');
  const current = Constants.expoConfig?.version ?? '0.0.0';
  return Platform.OS !== 'web' && typeof min === 'string' && compareVersions(current, min) < 0;
}
