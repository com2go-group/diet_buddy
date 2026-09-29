import { useOfflineQueue } from '@/lib/offline/queue';

import { logFood } from '../api';
import type { NewFoodLog } from '../types';
import { logOrQueue } from '../useMeals';

jest.mock('../api', () => ({ ...jest.requireActual('../api'), logFood: jest.fn() }));

const entry = (name: string): NewFoodLog => ({
  slot: 'dinner',
  loggedAt: new Date('2026-09-29T19:00:00.000Z'),
  name,
  foodRef: null,
  quantity: 100,
  unit: 'g',
  macros: { kcal: 200, proteinG: 10, carbsG: 20, fatG: 5 },
  source: 'photo',
});

describe('logging without a connection', () => {
  beforeEach(() => useOfflineQueue.setState({ items: [] }));

  it('keeps the rest of the foods on the phone when the connection drops', async () => {
    (logFood as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('TypeError: Network request failed'));
    await logOrQueue('u1', [entry('Rice'), entry('Fish'), entry('Salad')]);
    expect(useOfflineQueue.getState().items.map((i) => i.kind === 'food' && i.entry.name)).toEqual([
      'Fish',
      'Salad',
    ]);
    expect(useOfflineQueue.getState().items[0]).toMatchObject({
      userId: 'u1',
      entry: { loggedAt: '2026-09-29T19:00:00.000Z', source: 'photo' },
    });
  });

  it('still reports other errors', async () => {
    (logFood as jest.Mock).mockRejectedValueOnce(new Error('permission denied'));
    await expect(logOrQueue('u1', [entry('Rice')])).rejects.toThrow('permission denied');
    expect(useOfflineQueue.getState().items).toEqual([]);
  });
});
