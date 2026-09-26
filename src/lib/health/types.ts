export type HealthPlatform = 'healthkit' | 'health_connect';

export interface WeightSample {
  kg: number;
  at: Date;
}

export interface TodayActivity {
  steps: number | null;
  activeKcal: number | null;
}

/** What DietBuddy reads and writes (CLAUDE.md §7.12). */
export const READ_SCOPES = ['weight', 'body_fat', 'steps', 'active_energy', 'water'] as const;
export const WRITE_SCOPES = ['weight', 'water'] as const;
