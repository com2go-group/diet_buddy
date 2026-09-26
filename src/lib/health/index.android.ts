import {
  aggregateRecord,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import type { HealthPlatform, TodayActivity, WeightSample } from './types';

export type { HealthPlatform, TodayActivity, WeightSample } from './types';
export { READ_SCOPES, WRITE_SCOPES } from './types';

export const healthPlatform: HealthPlatform | null = 'health_connect';

let ready = false;
async function ensureReady(): Promise<boolean> {
  if (!ready) ready = await initialize();
  return ready;
}

export async function healthAvailable(): Promise<boolean> {
  const status = await getSdkStatus().catch(() => SdkAvailabilityStatus.SDK_UNAVAILABLE);
  return status === SdkAvailabilityStatus.SDK_AVAILABLE;
}

/** Shows Health Connect's permission screen; true if everything DietBuddy reads was granted. */
export async function requestHealthAccess(): Promise<boolean> {
  if (!(await ensureReady())) return false;
  const granted = await requestPermission([
    { accessType: 'read', recordType: 'Weight' },
    { accessType: 'read', recordType: 'BodyFat' },
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'read', recordType: 'Hydration' },
    { accessType: 'write', recordType: 'Weight' },
    { accessType: 'write', recordType: 'Hydration' },
  ]);
  return granted.some(
    (p) => 'recordType' in p && p.recordType === 'Weight' && p.accessType === 'read',
  );
}

export async function readWeights(since: Date): Promise<WeightSample[]> {
  if (!(await ensureReady())) return [];
  const { records } = await readRecords('Weight', {
    timeRangeFilter: { operator: 'after', startTime: since.toISOString() },
  });
  return records.map((r) => ({ kg: r.weight.inKilograms, at: new Date(r.time) }));
}

export async function readToday(): Promise<TodayActivity> {
  if (!(await ensureReady())) return { steps: null, activeKcal: null };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const timeRangeFilter = {
    operator: 'between' as const,
    startTime: start.toISOString(),
    endTime: new Date().toISOString(),
  };
  const [steps, energy] = await Promise.all([
    aggregateRecord({ recordType: 'Steps', timeRangeFilter }).catch(() => null),
    aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter }).catch(() => null),
  ]);
  return {
    steps: steps ? Math.round(steps.COUNT_TOTAL) : null,
    activeKcal: energy ? Math.round(energy.ACTIVE_CALORIES_TOTAL.inKilocalories) : null,
  };
}

export async function writeWeight(kg: number, at: Date): Promise<void> {
  if (!(await ensureReady())) return;
  await insertRecords([
    { recordType: 'Weight', weight: { value: kg, unit: 'kilograms' }, time: at.toISOString() },
  ]);
}

export async function writeWater(ml: number, at: Date): Promise<void> {
  if (!(await ensureReady())) return;
  const start = new Date(at.getTime() - 60_000);
  await insertRecords([
    {
      recordType: 'Hydration',
      volume: { value: ml, unit: 'milliliters' },
      startTime: start.toISOString(),
      endTime: at.toISOString(),
    },
  ]);
}

export function openHealthSettings(): void {
  openHealthConnectSettings();
}
