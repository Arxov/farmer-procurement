import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const ISSUE_TYPES = [
  { value: 'quality_dispute', labelKey: 'qualityDispute', icon: '⚖️' },
  { value: 'weight_dispute', labelKey: 'weightDispute', icon: '⚖️' },
  { value: 'payment_delay', labelKey: 'paymentDelay', icon: '💸' },
  { value: 'long_wait', labelKey: 'longWait', icon: '⏳' },
  { value: 'other', labelKey: 'other', icon: '⚠️' },
];

const STATUS_COLORS = {
  open: 'bg-amber-100 text-amber-800 border-amber-300',
  in_review: 'bg-blue-100 text-blue-800 border-blue-300',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
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
  }, []);

  const submitGrievance = async () => {
    if (!bookingId || !issueType || !description.trim()) {
      setError('PLEASE COMPLETE ALL MANDATORY FIELDS.');
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

    if (!res.ok) { setError(result.error?.toUpperCase() || 'SYSTEM ERROR. PLEASE RETRY.'); return; }

    setSuccess('GRIEVANCE TICKET LOGGED SUCCESSFULLY.');
    setBookingId('');
    setIssueType('');
    setDescription('');

    // Refresh
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadGrievances(user.id);
  };

  const getStatusLabel = (status) => {
    if (status === 'open') return 'TICKET OPEN';
    if (status === 'in_review') return 'IN REVIEW';
    if (status === 'resolved') return 'RESOLVED';
    return status.toUpperCase();
  };

  if (pageLoading) return <div className="min-h-screen bg-[var(--chassis)] flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest"><div className="animate-spin w-6 h-6 border-4 border-slate-500 border-t-transparent rounded-full mr-3" /> LOADING...</div>;

  return (
    <div className="min-h-screen bg-[var(--chassis)] px-4 pt-8 pb-28 sm:pb-10 font-sans selection:bg-emerald-500/30">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <Link href="/farmer/dashboard" className="text-emerald-700 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition">
            &larr; Dashboard
          </Link>
        </div>

        {/* File Grievance Terminal */}
        <Card elevated={true} withScrews={true} className="bg-[#e8ecef] p-4 border border-white/50 shadow-floating relative">
          {/* Status Indicator */}
          <div className="absolute top-4 right-4 flex gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] ${loading ? 'bg-amber-400 text-amber-400 animate-pulse' : success ? 'bg-emerald-500 text-emerald-500' : error ? 'bg-red-500 text-red-500 animate-pulse' : 'bg-slate-400 text-slate-400'}`} />
          </div>

          <div className="mb-5 border-b-2 border-slate-300 pb-3">
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Support Terminal</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Lodge an official APMC dispute</p>
          </div>

          <div className="space-y-4">
            
            <div className="bg-[var(--chassis)] p-3 rounded-xl shadow-recessed border border-white/60">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">SELECT BOOKING TICKET *</label>
              <select 
                className="w-full bg-[#f8fafc] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,1)] border border-slate-300 rounded-lg px-3 py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-700 uppercase tracking-wide" 
                value={bookingId} 
                onChange={e => setBookingId(e.target.value)}
              >
                <option value="">[ SELECT TICKET ID ]</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.centres?.name} — {b.slot_date}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[var(--chassis)] p-3 rounded-xl shadow-recessed border border-white/60">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">NATURE OF DISPUTE *</label>
              <select 
                className="w-full bg-[#f8fafc] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,1)] border border-slate-300 rounded-lg px-3 py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-700 uppercase tracking-wide" 
                value={issueType} 
                onChange={e => setIssueType(e.target.value)}
              >
                <option value="">[ SELECT CATEGORY ]</option>
                {ISSUE_TYPES.map(it => (
                  <option key={it.value} value={it.value}>{it.icon} {t(it.labelKey).toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="bg-[var(--chassis)] p-3 rounded-xl shadow-recessed border border-white/60">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">DETAILED REPORT *</label>
              <textarea
                className="w-full bg-[#f8fafc] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,1)] border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-700 uppercase tracking-wide h-24 resize-none leading-relaxed"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="DESCRIBE THE ISSUE IN DETAIL..."
              />
            </div>

            <Button
              onClick={submitGrievance}
              disabled={loading}
              variant="primary"
              className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_4px_rgba(217,119,6,0.3)] border-amber-700"
            >
              {loading ? 'TRANSMITTING...' : 'LODGE DISPUTE TICKET'}
            </Button>

            {error && (
              <div className="bg-red-900/10 border-l-4 border-red-500 p-2 shadow-recessed rounded-r">
                <p className="text-red-700 text-[10px] font-black tracking-wider uppercase">ERR: {error}</p>
              </div>
            )}
            {success && (
              <div className="bg-emerald-900/10 border-l-4 border-emerald-500 p-2 shadow-recessed rounded-r">
                <p className="text-emerald-700 text-[10px] font-black tracking-wider uppercase">ACK: {success}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Grievances List (Hardware Panel) */}
        <Card elevated={true} withScrews={true} className="bg-[var(--chassis)] p-4 border border-white/50 shadow-floating">
          <div className="mb-4 border-b-2 border-slate-300/40 pb-2 flex justify-between items-end">
            <div>
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight">Active Ticket Log</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Past 30 Days</p>
            </div>
            <div className="text-[9px] font-mono font-bold text-slate-400">COUNT: {grievances.length.toString().padStart(2, '0')}</div>
          </div>

          {grievances.length === 0 && (
            <div className="p-4 bg-slate-100 border-2 border-slate-200 border-dashed rounded-lg shadow-recessed text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NO LOGS DETECTED</p>
            </div>
          )}

          <div className="space-y-4">
            {grievances.map(g => (
              <div key={g.id} className="bg-[#e8ecef] rounded-xl p-3 border border-slate-300 shadow-[0_2px_5px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,1)]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-black text-[11px] text-slate-800 uppercase tracking-wide">{(g.issue_type || '').replace(/_/g, ' ')}</p>
                    <p className="text-[9px] font-bold font-mono text-slate-500 uppercase mt-0.5">{g.centre_name || 'UNKNOWN'} — {g.slot_date || 'N/A'}</p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border shadow-sm ${STATUS_COLORS[g.status] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                    {getStatusLabel(g.status)}
                  </span>
                </div>
                <div className="bg-[#f8fafc] shadow-recessed border-y border-slate-200/60 p-2.5 my-2">
                  <p className="text-[11px] font-medium text-slate-600 leading-relaxed uppercase">{g.description}</p>
                </div>
                <div className="text-[9px] font-mono font-bold text-slate-400 text-right">
                  FILED: {new Date(g.created_at).toISOString().slice(0, 10)}
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
      <FarmerBottomNav />
    </div>
  );
}
