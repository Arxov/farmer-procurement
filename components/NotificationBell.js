import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NotificationBell({ bookings = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState([]);

  // Load persisted read notifications from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('farmer_read_notifications') || '[]');
      if (Array.isArray(saved)) setReadIds(saved);
    } catch {
      // ignore
    }
  }, []);

  const persistReadIds = (newIds) => {
    setReadIds(newIds);
    try {
      localStorage.setItem('farmer_read_notifications', JSON.stringify(newIds));
    } catch {
      // ignore
    }
  };

  // Generate notifications dynamically from actual booking & payment state
  const notifications = [];

  bookings.forEach(b => {
    // 1. Payment notification
    if (b.payments?.[0]) {
      const p = b.payments[0];
      if (p.status === 'paid') {
        notifications.push({
          id: `pay-paid-${b.id}`,
          title: '💰 DBT Payment Credited',
          message: `₹${Number(p.amount || 0).toLocaleString()} credited for ${b.commodities?.name || 'crop'}. UTR: ${p.utr_reference || 'N/A'}`,
          time: 'Payment Confirmed',
          type: 'success',
          link: '/farmer/dashboard',
        });
      } else if (p.status === 'initiated') {
        notifications.push({
          id: `pay-init-${b.id}`,
          title: '⏳ Payment Initiated',
          message: `₹${Number(p.amount || 0).toLocaleString()} DBT transfer initiated to your linked bank account.`,
          time: 'Transfer in progress',
          type: 'info',
          link: '/farmer/dashboard',
        });
      }
    }

    // 2. Gate pass issued notification
    if (b.gate_passes?.[0]) {
      notifications.push({
        id: `gate-${b.id}`,
        title: '🎫 Gate Pass Ready',
        message: `Mandi clearance pass issued for ${b.commodities?.name}. Scan at entrance/exit gate.`,
        time: 'Inspection Complete',
        type: 'success',
        link: `/farmer/gate-pass/${b.id}`,
      });
    }

    // 3. Queue Alert / Leave Now
    const queuePos = b.queue_entries?.[0]?.queue_position;
    if (queuePos && queuePos <= 3 && ['booked', 'checked_in'].includes(b.status)) {
      notifications.push({
        id: `queue-${b.id}`,
        title: '🚨 Mandi Queue Alert',
        message: queuePos === 1 ? "It's your turn at the weighbridge!" : `Your turn is coming up soon! Position: #${queuePos}`,
        time: 'Active Queue',
        type: 'warning',
        link: '/farmer/dashboard',
      });
    }

    // 4. Booking confirmed notification
    if (b.status === 'booked') {
      notifications.push({
        id: `book-${b.id}`,
        title: '📝 Slot Booking Confirmed',
        message: `Appointment for ${b.commodities?.name} at ${b.centres?.name} on ${b.slot_date} (${b.slot_window}).`,
        time: b.slot_date,
        type: 'info',
        link: '/farmer/dashboard',
      });
    }

    // 5. Rejection notification
    if (b.status === 'rejected') {
      notifications.push({
        id: `reject-${b.id}`,
        title: '❌ Consignment Rejected',
        message: `Booking for ${b.commodities?.name} was rejected. ${b.quality_notes || ''}`,
        time: 'Action Required',
        type: 'error',
        link: '/farmer/grievances',
      });
    }
  });

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    const allIds = Array.from(new Set([...readIds, ...notifications.map(n => n.id)]));
    persistReadIds(allIds);
  };

  const markSingleRead = (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!readIds.includes(id)) {
      persistReadIds([...readIds, id]);
    }
  };

  return (
    <>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:bg-neutral-900 shadow-2xs transition"
        title="Notifications"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-neutral-800 shadow-2xl flex flex-col z-10 border-l border-gray-200 dark:border-neutral-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-neutral-700 flex justify-between items-center bg-slate-50 dark:bg-neutral-950">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-neutral-100">Notifications & Alerts</h3>
                  <p className="text-[10px] text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{unreadCount} unread update(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-green-700 hover:text-green-800"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 dark:text-neutral-400 dark:text-neutral-400 flex items-center justify-center text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notification Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  <span className="text-3xl block mb-2">🔕</span>
                  No alerts right now. Your appointment and payment updates will appear here.
                </div>
              ) : (
                notifications.map(n => {
                  const isRead = readIds.includes(n.id);
                  const isWarning = n.type === 'warning';
                  const isError = n.type === 'error';
                  const isSuccess = n.type === 'success';

                  return (
                    <div
                      key={n.id}
                      className={`block p-3 rounded-xl border text-left transition ${
                        isRead
                          ? 'bg-white dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 opacity-60'
                          : isWarning
                          ? 'bg-amber-50 border-amber-200 shadow-2xs'
                          : isError
                          ? 'bg-red-50 border-red-200 shadow-2xs'
                          : isSuccess
                          ? 'bg-emerald-50 border-emerald-200 shadow-2xs'
                          : 'bg-blue-50 border-blue-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-0.5">
                        <Link
                          href={n.link}
                          onClick={() => {
                            markSingleRead(n.id);
                            setIsOpen(false);
                          }}
                          className="text-xs font-bold text-gray-900 dark:text-neutral-100 hover:underline flex-1"
                        >
                          {n.title}
                        </Link>
                        <span className="text-[9px] text-gray-400 font-medium ml-2">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-neutral-400 dark:text-neutral-400 leading-snug">{n.message}</p>

                      <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-neutral-700 flex justify-between items-center text-[10px]">
                        <Link
                          href={n.link}
                          onClick={() => {
                            markSingleRead(n.id);
                            setIsOpen(false);
                          }}
                          className="text-green-700 font-semibold hover:underline inline-flex items-center gap-0.5"
                        >
                          View details &rarr;
                        </Link>

                        {!isRead ? (
                          <button
                            type="button"
                            onClick={(e) => markSingleRead(n.id, e)}
                            className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400 hover:text-gray-800 dark:text-neutral-200 bg-white dark:bg-neutral-800/90 border border-gray-200 dark:border-neutral-700 px-2 py-0.5 rounded font-medium transition hover:bg-gray-50 dark:bg-neutral-900"
                          >
                            ✓ Mark as read
                          </button>
                        ) : (
                          <span className="text-gray-400">Read</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900 text-center text-[10px] text-gray-400">
              Central Farmer Procurement Platform (CFPP) Alert Engine
            </div>
          </div>
        </div>
      )}
    </>
  );
}
