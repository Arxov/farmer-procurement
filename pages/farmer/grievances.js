import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import FarmerBottomNav from '../../components/FarmerBottomNav';

const ISSUE_TYPES = [
  { value: 'quality_dispute', labelKey: 'qualityDispute' },
  { value: 'weight_dispute', labelKey: 'weightDispute' },
  { value: 'payment_delay', labelKey: 'paymentDelay' },
  { value: 'long_wait', labelKey: 'longWait' },
  { value: 'other', labelKey: 'other' },
];

const STATUS_COLORS = {
  open: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
};

export default function GrievancesPage() {
  const [bookings, setBookings] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [bookingId, setBookingId] = useState('');
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

  const loadGrievances = async (userId) => {
    // First get farmer's booking IDs
    const { data: farmerBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('farmer_id', userId);

    const bookingIds = (farmerBookings || []).map(b => b.id);
    if (bookingIds.length === 0) {
      setGrievances([]);
      return;
    }

    // Then get grievances for those bookings using supabaseAdmin via API
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/grievances/list`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      const { grievances: gData } = await res.json();
      setGrievances(gData || []);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('id, slot_date, slot_window, centres(name), commodities(name)')
        .eq('farmer_id', user.id)
        .order('created_at', { ascending: false });

      setBookings(bookingData || []);
      await loadGrievances(user.id);
      setPageLoading(false);
    };
    load();
  }, [router]);

  const submitGrievance = async () => {
    if (!bookingId || !issueType || !description.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/grievances/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ bookingId, issueType, description }),
    });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) { setError(result.error || 'Something went wrong'); return; }

    setSuccess(t('grievanceSubmitted'));
    setBookingId('');
    setIssueType('');
    setDescription('');

    // Refresh
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadGrievances(user.id);
  };

  const getStatusLabel = (status) => {
    if (status === 'open') return t('open');
    if (status === 'in_review') return t('inReview');
    if (status === 'resolved') return t('resolved');
    return status;
  };

  if (pageLoading) return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 pt-10 pb-28 sm:pb-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/farmer/dashboard" className="text-green-700 text-sm mb-4 inline-block">&larr; {t('back')}</Link>

        {/* File Grievance Form */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-6 mb-6">
          <h1 className="text-xl font-bold mb-4">{t('fileGrievance')}</h1>

          <label className="block text-sm font-medium mb-1">{t('selectBooking')}</label>
          <select className="w-full border rounded-lg px-3 py-2 mb-3" value={bookingId} onChange={e => setBookingId(e.target.value)}>
            <option value="">{t('selectBooking')}</option>
            {bookings.map(b => (
              <option key={b.id} value={b.id}>
                {b.centres?.name} - {b.commodities?.name} ({b.slot_date})
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium mb-1">{t('issueType')}</label>
          <select className="w-full border rounded-lg px-3 py-2 mb-3" value={issueType} onChange={e => setIssueType(e.target.value)}>
            <option value="">Select type</option>
            {ISSUE_TYPES.map(it => (
              <option key={it.value} value={it.value}>{t(it.labelKey)}</option>
            ))}
          </select>

          <label className="block text-sm font-medium mb-1">{t('description')}</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 mb-4 h-24 resize-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('description')}
          />

          <button
            onClick={submitGrievance}
            disabled={loading}
            className="w-full bg-green-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
          >
            {loading ? t('loading') : t('submit')}
          </button>

          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          {success && <p className="text-green-600 text-sm mt-3">{success}</p>}
        </div>

        {/* Grievances List (Read-Only) */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-4">{t('myGrievances')}</h2>

          {grievances.length === 0 && <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{t('noGrievances')}</p>}

          <div className="space-y-3">
            {grievances.map(g => (
              <div key={g.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm capitalize">{(g.issue_type || '').replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{g.centre_name || ''} — {g.slot_date || ''}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[g.status] || 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200'}`}>
                    {getStatusLabel(g.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-neutral-400 dark:text-neutral-400 mt-2 bg-gray-50 dark:bg-neutral-900 rounded p-2">{g.description}</p>
                <p className="text-xs text-gray-400 mt-2">Filed: {new Date(g.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <FarmerBottomNav />
    </div>
  );
}
