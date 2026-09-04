import { get, set, del } from 'idb-keyval';

const QUEUE_KEY = 'offline_booking_queue';

export interface QueuedBookingItem {
  centreId: string;
  commodityId: string;
  date: string;
  slotWindow: string;
  quantity?: string | number;
  queued_at?: string;
  [key: string]: any;
}

export interface SyncResult {
  synced: number;
  failed: number;
}

export async function getOfflineQueue(): Promise<QueuedBookingItem[]> {
  if (typeof window === 'undefined') return [];
  try {
    const items = await get<QueuedBookingItem[]>(QUEUE_KEY);
    if (Array.isArray(items)) return items;
    // Fallback to localStorage
    const local = localStorage.getItem(QUEUE_KEY);
    return local ? JSON.parse(local) : [];
  } catch {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }
}

export async function addToOfflineQueue(bookingData: QueuedBookingItem): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push({ ...bookingData, queued_at: new Date().toISOString() });

  try {
    await set(QUEUE_KEY, queue);
  } catch {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  }

  // Register Background Sync if supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ('sync' in reg) {
        await (reg as any).sync.register('sync-offline-bookings');
      }
    } catch (e) {
      // Ignored: fallback to online event listener
    }
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await del(QUEUE_KEY);
  } catch {}
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {}
  }
}

export async function syncOfflineQueue(accessToken: string): Promise<SyncResult> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedBookingItem[] = [];

  for (const item of queue) {
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(item),
      });

      if (res.ok) {
        synced++;
      } else {
        failed++;
        // If it's a 5xx error or temporary issue, keep in queue; discard 4xx validation errors
        if (res.status >= 500) {
          remaining.push(item);
        } else {
          console.warn('Offline booking failed validation and was discarded:', item);
        }
      }
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  try {
    await set(QUEUE_KEY, remaining);
  } catch {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    }
  }

  return { synced, failed };
}
