import {
  isHealthDataAvailableAsync,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  requestAuthorization,
  saveQuantitySample,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

import type { HealthPlatform, TodayActivity, WeightSample } from './types';

export type { HealthPlatform, TodayActivity, WeightSample } from './types';
export { READ_SCOPES, WRITE_SCOPES } from './types';

export const healthPlatform: HealthPlatform | null = 'healthkit';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function healthAvailable(): Promise<boolean> {
  return isHealthDataAvailableAsync().catch(() => false);
}

/** Shows Apple's Health permission sheet. HealthKit never reveals whether reading was allowed. */
export async function requestHealthAccess(): Promise<boolean> {
  return requestAuthorization({
    toRead: [
      'HKQuantityTypeIdentifierBodyMass',
      'HKQuantityTypeIdentifierBodyFatPercentage',
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierDietaryWater',
    ],
    toShare: ['HKQuantityTypeIdentifierBodyMass', 'HKQuantityTypeIdentifierDietaryWater'],
  });
}

export async function readWeights(since: Date): Promise<WeightSample[]> {
  const samples = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
    limit: 500,
    unit: 'kg',
    ascending: true,
    filter: { date: { startDate: since } },
  });
  return samples.map((s) => ({ kg: s.quantity, at: new Date(s.startDate) }));
}

export async function readToday(): Promise<TodayActivity> {
  const filter = { date: { startDate: startOfToday(), endDate: new Date() } };
  const [steps, energy] = await Promise.all([
    queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
      filter,
      unit: 'count',
    }).catch(() => null),
    queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], {
      filter,
      unit: 'kcal',
    }).catch(() => null),
  ]);
  return {
    steps: steps?.sumQuantity ? Math.round(steps.sumQuantity.quantity) : null,
    activeKcal: energy?.sumQuantity ? Math.round(energy.sumQuantity.quantity) : null,
  };
}

export async function writeWeight(kg: number, at: Date): Promise<void> {
  await saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', kg, at, at);
}

export async function writeWater(ml: number, at: Date): Promise<void> {
  await saveQuantitySample('HKQuantityTypeIdentifierDietaryWater', 'mL', ml, at, at);
}

/** Opens the Health app (users manage DietBuddy's access under Sharing → Apps). */
export function openHealthSettings(): void {
  Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
}
