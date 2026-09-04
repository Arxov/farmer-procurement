import {
  getOfflineQueue,
  addToOfflineQueue,
  clearOfflineQueue,
  syncOfflineQueue,
} from '@/lib/offlineQueue';

let mockDbStore: Record<string, any> = {};

jest.mock('idb-keyval', () => ({
  get: jest.fn((key: string) => Promise.resolve(mockDbStore[key])),
  set: jest.fn((key: string, val: any) => {
    mockDbStore[key] = val;
    return Promise.resolve();
  }),
  del: jest.fn((key: string) => {
    delete mockDbStore[key];
    return Promise.resolve();
  }),
}));

describe('offlineQueue utility (IndexedDB)', () => {
  beforeEach(() => {
    mockDbStore = {};
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('returns an empty array when queue is empty', async () => {
    const queue = await getOfflineQueue();
    expect(queue).toEqual([]);
  });

  it('adds booking items to IndexedDB with a queued_at timestamp', async () => {
    const item = {
      centreId: 'centre-123',
      commodityId: 'comm-456',
      date: '2026-09-10',
      slotWindow: '10:00-12:00',
      quantity: '25',
    };

    await addToOfflineQueue(item);

    const queue = await getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].centreId).toBe('centre-123');
    expect(queue[0].queued_at).toBeDefined();
  });

  it('clears all items from the offline queue', async () => {
    await addToOfflineQueue({
      centreId: 'c1',
      commodityId: 'comm1',
      date: '2026-09-10',
      slotWindow: '10:00-12:00',
    });
    expect((await getOfflineQueue()).length).toBe(1);

    await clearOfflineQueue();
    expect((await getOfflineQueue()).length).toBe(0);
  });

  it('syncOfflineQueue does nothing when queue is empty', async () => {
    const res = await syncOfflineQueue('token-123');
    expect(res).toEqual({ synced: 0, failed: 0 });
  });

  it('syncs offline items and removes synced ones on HTTP 200', async () => {
    await addToOfflineQueue({
      centreId: 'c1',
      commodityId: 'comm1',
      date: '2026-09-10',
      slotWindow: '10:00-12:00',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const result = await syncOfflineQueue('token-xyz');
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect((await getOfflineQueue()).length).toBe(0);
  });

  it('discards 400 validation error items to avoid poison pill loops', async () => {
    await addToOfflineQueue({
      centreId: 'c-invalid',
      commodityId: 'comm1',
      date: '2026-09-10',
      slotWindow: '10:00-12:00',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid data' }),
    });

    const result = await syncOfflineQueue('token-xyz');
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
    // Discarded because status < 500
    expect((await getOfflineQueue()).length).toBe(0);
  });
});
