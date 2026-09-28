import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { readWeights, requestHealthAccess } from '@/lib/health';
import { supabase } from '@/lib/supabase';
import { renderScreen } from '@/test/render';

import { DevicesStep } from '../../onboarding/steps/HealthStep';
import { HealthScreen } from '../HealthScreen';
import { useHealthStore } from '../useHealth';

jest.mock('@/lib/health', () => ({
  healthPlatform: 'healthkit',
  READ_SCOPES: ['weight', 'body_fat', 'steps', 'active_energy', 'water'],
  healthAvailable: jest.fn(async () => true),
  requestHealthAccess: jest.fn(async () => true),
  readWeights: jest.fn(async () => []),
  readToday: jest.fn(async () => ({ steps: 4200, activeKcal: 310 })),
  writeWater: jest.fn(async () => undefined),
  writeWeight: jest.fn(async () => undefined),
  openHealthSettings: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

let connections: object[] = [];
const inserted: unknown[] = [];
const upserted: unknown[] = [];
beforeEach(() => {
  jest.clearAllMocks();
  connections = [];
  inserted.length = 0;
  upserted.length = 0;
  useHealthStore.setState({ connected: false });
  jest.spyOn(supabase, 'from').mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    const rows =
      table === 'device_connections'
        ? connections
        : [{ measured_at: '2026-09-20T08:00:00Z', weight_kg: 81 }];
    Object.assign(chain, {
      select: () => chain,
      eq: () => chain,
      gte: async () => ({ data: rows, error: null }),
      limit: async () => ({ data: rows, error: null }),
      insert: async (r: unknown) => (inserted.push(r), { data: null, error: null }),
      upsert: async (r: unknown) => (
        upserted.push(r),
        connections.push(r as object),
        { data: null, error: null }
      ),
      delete: () => chain,
    });
    return chain as never;
  });
});

describe('HealthScreen', () => {
  it('connects Apple Health, records the connection and imports new weights', async () => {
    (readWeights as jest.Mock).mockResolvedValue([
      { kg: 81, at: new Date('2026-09-20T08:00:30Z') }, // already stored
      { kg: 80.6, at: new Date('2026-09-25T07:30:00Z') },
    ]);
    await renderScreen(<HealthScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Connect Apple Health' }));
    expect(await screen.findByText('✅ Connected to Apple Health')).toBeOnTheScreen();
    expect(requestHealthAccess).toHaveBeenCalled();
    expect(upserted[0]).toMatchObject({
      platform: 'healthkit',
      scopes: ['weight', 'body_fat', 'steps', 'active_energy', 'water'],
    });
    expect(inserted[0]).toEqual([
      {
        user_id: 'user-1',
        measured_at: '2026-09-25T07:30:00.000Z',
        weight_kg: 80.6,
        source: 'healthkit',
      },
    ]);
    expect(useHealthStore.getState().connected).toBe(true);
  });

  it('explains when access is not granted', async () => {
    (requestHealthAccess as jest.Mock).mockResolvedValue(false);
    await renderScreen(<HealthScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Connect Apple Health' }));
    await waitFor(() => expect(screen.getByText(/Access wasn’t granted/)).toBeOnTheScreen());
    expect(upserted).toEqual([]);
  });
});

describe('DevicesStep', () => {
  it('explains that scales and wearables sync through Apple Health, with no pairing action', async () => {
    await renderScreen(<DevicesStep />);
    expect(await screen.findByText('Your scales and wearables')).toBeOnTheScreen();
    expect(
      screen.getByText('No pairing in DietBuddy: they sync through Apple Health'),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Via Apple Health').length).toBeGreaterThan(5);
    expect(screen.queryByRole('button', { name: /Apple Watch/ })).toBeNull();
  });

  it('marks every device as syncing once Apple Health is connected', async () => {
    connections = [{ id: 'c1' }];
    await renderScreen(<DevicesStep />);
    expect((await screen.findAllByText('✓ Via Apple Health')).length).toBeGreaterThan(5);
    expect(screen.queryByText('Via Apple Health')).toBeNull();
  });
});
