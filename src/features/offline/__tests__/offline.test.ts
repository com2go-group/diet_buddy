import { isNetworkError, useOfflineQueue } from '@/lib/offline/queue';

import { addGlass } from '../../home/api';
import { logFood } from '../../meals/api';
import { flushQueue } from '../sync';

jest.mock('../../home/api', () => ({ addGlass: jest.fn() }));
jest.mock('../../meals/api', () => ({ logFood: jest.fn() }));

const food = (name: string) => ({
  kind: 'food' as const,
  userId: 'u1',
  entry: {
    slot: 'lunch' as const,
    loggedAt: '2026-09-29T12:00:00.000Z',
    name,
    foodRef: null,
    quantity: 1,
    unit: 'bowl',
    macros: { kcal: 400, proteinG: 20, carbsG: 40, fatG: 10 },
    source: 'manual' as const,
  },
});

describe('offline queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOfflineQueue.setState({ items: [] });
  });

  it('recognises a lost connection', () => {
    expect(isNetworkError(new Error('TypeError: Network request failed'))).toBe(true);
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('new row violates row-level security policy'))).toBe(false);
  });

  it('sends waiting logs in order with their original time, only for this user', async () => {
    const queue = useOfflineQueue.getState();
    queue.add(food('Soup'));
    queue.add({ kind: 'water', userId: 'u1', loggedAt: '2026-09-29T12:05:00.000Z', ml: 250 });
    queue.add({ ...food('Other person'), userId: 'u2' });
    expect(await flushQueue('u1')).toBe(2);
    expect((logFood as jest.Mock).mock.calls[0]).toEqual([
      'u1',
      expect.objectContaining({ name: 'Soup', loggedAt: new Date('2026-09-29T12:00:00.000Z') }),
    ]);
    expect(addGlass).toHaveBeenCalledWith('u1', new Date('2026-09-29T12:05:00.000Z'), 250);
    expect(useOfflineQueue.getState().items.map((i) => i.userId)).toEqual(['u2']);
  });

  it('stops while still offline and drops entries the server rejects', async () => {
    const queue = useOfflineQueue.getState();
    queue.add(food('Rejected'));
    queue.add(food('Waiting'));
    (logFood as jest.Mock)
      .mockRejectedValueOnce(new Error('check constraint'))
      .mockRejectedValueOnce(new Error('Network request failed'));
    expect(await flushQueue('u1')).toBe(0);
    expect(useOfflineQueue.getState().items.map((i) => i.kind === 'food' && i.entry.name)).toEqual([
      'Waiting',
    ]);
  });
});
