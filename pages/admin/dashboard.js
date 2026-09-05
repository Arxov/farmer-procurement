import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { StatusDonutChart, TrendAreaChart, CapacityRadialCard } from '../../components/AdminCharts';
import CropBadge from '../../components/CropBadge';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [byCentre, setByCentre] = useState([]);
  const [centreQC, setCentreQC] = useState([]);
  const [byDate, setByDate] = useState([]);
  const [revenue, setRevenue] = useState({ pending: 0, paid: 0, total: 0 });
  const [capacity, setCapacity] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [allBookingsRaw, setAllBookingsRaw] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  const [stateFilter, setStateFilter] = useState('all');
  const [states, setStates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const router = useRouter();
  const { t } = useLanguage();

  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/'); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile || profile.role !== 'admin') { router.push('/'); return; }
        setAuthorized(true);

        // 1. Total bookings by status (Limit to recent to avoid massive payloads)
        const { data: allBookings } = await supabase
          .from('bookings')
          .select('status, centre_id, slot_date, slot_window, expected_quantity_quintals, rejection_reason, centres(name, state), profiles(full_name), commodities(name)')
          .order('created_at', { ascending: false })
          .limit(5000);
          
        setAllBookingsRaw(allBookings || []);

        // Extract unique states
        const uniqueStates = [...new Set((allBookings || []).map(b => b.centres?.state).filter(Boolean))];
        setStates(uniqueStates);

        const statusMap = {};
        (allBookings || []).forEach(b => { statusMap[b.status] = (statusMap[b.status] || 0) + 1; });
        setStats({ total: allBookings?.length || 0, byStatus: statusMap });

        // 2. Bookings by centre
        const centreMap = {};
        (allBookings || []).forEach(b => {
          const name = b.centres?.name || 'Unknown';
          centreMap[name] = (centreMap[name] || 0) + 1;
        });
        setByCentre(Object.entries(centreMap).sort((a, b) => b[1] - a[1]));

        const centreMapQC = {};
        (allBookings || []).forEach(b => {
          const name = b.centres?.name || 'Unknown';
          if (!centreMapQC[name]) centreMapQC[name] = { total: 0, accepted: 0, rejected: 0, reasons: {} };
          centreMapQC[name].total++;
          if (['accepted', 'paid'].includes(b.status)) centreMapQC[name].accepted++;
          if (b.status === 'rejected') {
             centreMapQC[name].rejected++;
             if (b.rejection_reason) {
                centreMapQC[name].reasons[b.rejection_reason] = (centreMapQC[name].reasons[b.rejection_reason] || 0) + 1;
             }
          }
        });
        setCentreQC(Object.entries(centreMapQC).sort((a,b) => b[1].total - a[1].total));

        // 3. Bookings by date (last 7 days)
        const dateMap = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          dateMap[d.toISOString().split('T')[0]] = 0;
        }
        (allBookings || []).forEach(b => {
          if (b.slot_date && dateMap.hasOwnProperty(b.slot_date)) {
            dateMap[b.slot_date]++;
          }
        });
        setByDate(Object.entries(dateMap));

        // 4. Revenue
        const { data: payments } = await supabase.from('payments').select('amount, status').limit(5000);
        let pending = 0, paid = 0;
        (payments || []).forEach(p => {
          if (p.status === 'paid') paid += (p.amount || 0);
          else pending += (p.amount || 0);
        });
        setRevenue({ pending, paid, total: pending + paid });

        // 5. Capacity utilization (today)
        const todayStr = today.toISOString().split('T')[0];
        const { data: centres } = await supabase.from('centres').select('id, name, daily_capacity');
        const capData = [];
        for (const c of (centres || [])) {
          const count = (allBookings || []).filter(b => b.centre_id === c.id && b.slot_date === todayStr).length;
          capData.push({ name: c.name, booked: count, capacity: c.daily_capacity, pct: Math.round((count / c.daily_capacity) * 100) });
        }
        setCapacity(capData);

        // 6. Recent bookings
        const { data: recent } = await supabase
          .from('bookings')
          .select('id, slot_date, status, profiles(full_name), centres(name), commodities(name)')
          .order('created_at', { ascending: false })
          .limit(10);
        setRecentBookings(recent || []);
      } catch (err) {
        setError('Failed to load dashboard data. Please check your network connection.');
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const exportCSV = () => {
    const headers = ['Farmer', 'Centre', 'State', 'Commodity', 'Date', 'Time Slot', 'Quantity (q)', 'Status'];
    const rows = allBookingsRaw.map(b => [
      b.profiles?.full_name || '-',
      b.centres?.name || '-',
      b.centres?.state || '-',
      b.commodities?.name || '-',
      b.slot_date,
      b.slot_window || '-',
      b.expected_quantity_quintals || '-',
      (b.status || '').replace(/_/g, ' '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow text-center max-w-sm">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Retry</button>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  const maxCentre = Math.max(...byCentre.map(([, v]) => v), 1);
  const maxDate = Math.max(...byDate.map(([, v]) => v), 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-bold">{t('adminOverview')}</h1>
          <div className="flex gap-2 items-center">
            {states.length > 1 && (
              <select
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">📥 Download CSV</button>
            <button onClick={handleLogout} className="bg-gray-200 text-gray-700 dark:text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">{t('logout')}</button>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Link href="/admin/grievances" className="flex items-center gap-1 bg-white dark:bg-neutral-800 border rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:bg-neutral-900 shadow-sm">
            📋 Grievances
          </Link>
          <Link href="/admin/payments" className="flex items-center gap-1 bg-white dark:bg-neutral-800 border rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:bg-neutral-900 shadow-sm">
            💰 Payments
          </Link>
          <Link href="/admin/users" className="flex items-center gap-1 bg-white dark:bg-neutral-800 border rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:bg-neutral-900 shadow-sm">
            👥 Users
          </Link>
          <Link href="/admin/centres" className="flex items-center gap-1 bg-white dark:bg-neutral-800 border rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:bg-neutral-900 shadow-sm">
            🏛️ Centres
          </Link>
          <Link href="/admin/commodities" className="flex items-center gap-1 bg-white dark:bg-neutral-800 border rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:bg-neutral-900 shadow-sm">
            🌾 Commodities
          </Link>
        </div>

        {/* Visual Charts Row: Donut & 7-Day Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Breakdown Donut Chart */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">Procurement Stage Distribution</h2>
                <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Live breakdown of bookings by fulfillment stage</p>
              </div>
              <span className="text-[11px] font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                ● Live Funnel
              </span>
            </div>
            <StatusDonutChart byStatus={stats.byStatus} total={stats.total} />
          </div>

          {/* 7-Day Trend Area Chart */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">7-Day Influx Trend</h2>
                <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Daily procurement bookings volume</p>
              </div>
              <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                📈 Past 7 Days
              </span>
            </div>
            <TrendAreaChart data={byDate} />
          </div>
        </div>

        {/* Revenue & Payout Visual Metric */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">{t('revenueSummary')} & Payout Assurance</h2>
              <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Direct Bank Transfer (DBT) disbursement status</p>
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-neutral-100">
              Total ₹{revenue.total.toLocaleString()}
            </span>
          </div>

          {/* Two-tone Progress Bar */}
          {revenue.total > 0 ? (
            <div className="space-y-3">
              <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-3 flex overflow-hidden">
                <div
                  className="bg-emerald-500 h-3 transition-all"
                  style={{ width: `${Math.round((revenue.paid / revenue.total) * 100)}%` }}
                  title={`Paid: ₹${revenue.paid.toLocaleString()}`}
                />
                <div
                  className="bg-amber-400 h-3 transition-all"
                  style={{ width: `${Math.round((revenue.pending / revenue.total) * 100)}%` }}
                  title={`Pending: ₹${revenue.pending.toLocaleString()}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-emerald-800">✅ Disbursed (Paid)</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {Math.round((revenue.paid / revenue.total) * 100)}%
                    </span>
                  </div>
                  <p className="text-lg font-black text-emerald-900 mt-1">₹{revenue.paid.toLocaleString()}</p>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-amber-800">⏳ Pending Verification</span>
                    <span className="text-xs font-bold text-amber-700">
                      {Math.round((revenue.pending / revenue.total) * 100)}%
                    </span>
                  </div>
                  <p className="text-lg font-black text-amber-900 mt-1">₹{revenue.pending.toLocaleString()}</p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">🏛️ Total Committed</span>
                    <span className="text-xs font-bold text-gray-600 dark:text-neutral-400 dark:text-neutral-400">100%</span>
                  </div>
                  <p className="text-lg font-black text-gray-900 dark:text-neutral-100 mt-1">₹{revenue.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-3 text-center">No payment disbursements recorded yet.</p>
          )}
        </div>

        {/* Capacity Utilization Radial Cards */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">{t('capacityUtilization')}</h2>
              <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Real-time daily mandi congestion status</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {capacity.map(c => (
              <CapacityRadialCard
                key={c.name}
                name={c.name}
                booked={c.booked}
                capacity={c.capacity}
                pct={c.pct}
              />
            ))}
          </div>
        </div>

        {/* Bookings by Centre Distribution */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100 mb-1">{t('bookingsByCentre')}</h2>
          <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mb-4">Overall volume handled across individual Mandi hubs</p>
          <div className="space-y-3.5">
            {byCentre.map(([name, count]) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-gray-800 dark:text-neutral-200">{name}</span>
                  <span className="font-bold text-gray-900 dark:text-neutral-100">{count} bookings</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxCentre) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings Table */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border border-gray-100 dark:border-neutral-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">{t('recentBookings')}</h2>
              <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Live booking stream across all procurement centres</p>
            </div>

            {/* Table Search & Status Filter */}
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search farmer, centre, crop..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="border border-gray-300 dark:border-neutral-600 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-green-500 focus:outline-none w-full sm:w-56"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 dark:border-neutral-600 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-green-500 focus:outline-none capitalize"
              >
                <option value="all">All Statuses</option>
                {['booked', 'checked_in', 'weighed', 'quality_checked', 'accepted', 'paid', 'rejected', 'cancelled'].map(st => (
                  <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-neutral-700 text-left text-xs font-semibold text-gray-500 dark:text-neutral-400 dark:text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3">{t('farmer')}</th>
                  <th className="pb-3">{t('centre')}</th>
                  <th className="pb-3">{t('commodity')}</th>
                  <th className="pb-3">{t('date')}</th>
                  <th className="pb-3">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBookings
                  .filter(b => {
                    const q = searchQuery.toLowerCase();
                    const matchesSearch = !searchQuery.trim() ||
                      (b.profiles?.full_name || '').toLowerCase().includes(q) ||
                      (b.centres?.name || '').toLowerCase().includes(q) ||
                      (b.commodities?.name || '').toLowerCase().includes(q);
                    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map(b => {
                    const statusColors = {
                      booked: 'bg-blue-50 text-blue-800 border-blue-200',
                      checked_in: 'bg-amber-50 text-amber-800 border-amber-200',
                      weighed: 'bg-orange-50 text-orange-800 border-orange-200',
                      quality_checked: 'bg-purple-50 text-purple-800 border-purple-200',
                      accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      paid: 'bg-green-50 text-green-800 border-green-200',
                      rejected: 'bg-red-50 text-red-800 border-red-200',
                      cancelled: 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-700',
                    };

                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:bg-neutral-950 transition">
                        <td className="py-3 font-semibold text-gray-900 dark:text-neutral-100">{b.profiles?.full_name || '-'}</td>
                        <td className="py-3 text-gray-600 dark:text-neutral-400 dark:text-neutral-400">{b.centres?.name || '-'}</td>
                        <td className="py-3">
                          <CropBadge name={b.commodities?.name} size="xs" />
                        </td>
                        <td className="py-3 text-gray-500 dark:text-neutral-400 dark:text-neutral-400 text-xs">{b.slot_date}</td>
                        <td className="py-3">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${statusColors[b.status] || 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>
                            {(b.status ?? '').replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {recentBookings.filter(b => {
              const q = searchQuery.toLowerCase();
              const matchesSearch = !searchQuery.trim() ||
                (b.profiles?.full_name || '').toLowerCase().includes(q) ||
                (b.centres?.name || '').toLowerCase().includes(q) ||
                (b.commodities?.name || '').toLowerCase().includes(q);
              const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
              return matchesSearch && matchesStatus;
            }).length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400">
                No bookings found matching your search and filter criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
