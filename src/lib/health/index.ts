/**
 * Web and other platforms: no health store. Same API as index.ios.ts / index.android.ts.
 */
import type { HealthPlatform, TodayActivity, WeightSample } from './types';

export type { HealthPlatform, TodayActivity, WeightSample } from './types';
export { READ_SCOPES, WRITE_SCOPES } from './types';

export const healthPlatform: HealthPlatform | null = null;
export async function healthAvailable(): Promise<boolean> {
  return false;
}
export async function requestHealthAccess(): Promise<boolean> {
  return false;
}
export async function readWeights(_since: Date): Promise<WeightSample[]> {
  return [];
}
export async function readToday(): Promise<TodayActivity> {
  return { steps: null, activeKcal: null };
}
export async function writeWeight(_kg: number, _at: Date): Promise<void> {}
export async function writeWater(_ml: number, _at: Date): Promise<void> {}
export function openHealthSettings(): void {}
