import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import LanguageToggle from '../../components/LanguageToggle';

const ISSUE_TYPES = [
  { value: 'quality_dispute', icon: '⚖️', labelKey: 'qualityDispute' },
  { value: 'weight_dispute', icon: '⚖️', labelKey: 'weightDispute' },
  { value: 'payment_delay', icon: '⏱️', labelKey: 'paymentDelay' },
  { value: 'long_wait', icon: '⏳', labelKey: 'longWait' },
  { value: 'other', icon: '📝', labelKey: 'other' },
];

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
  const { t, language } = useLanguage();

  const loadGrievances = async (userId) => {
    // First get farmer's booking IDs
    const { data: farmerBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('farmer_id', userId);

    const bookingIds = (farmerBookings || []).map((b) => b.id);
    if (bookingIds.length === 0) {
      setGrievances([]);
      return;
    }

    // Then get grievances for those bookings using supabaseAdmin via API
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

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
      setError(
        language === 'mr'
          ? 'कृपया सर्व आवश्यक रकाने भरा.'
          : language === 'hi'
          ? 'कृपया सभी आवश्यक फ़ील्ड भरें।'
          : 'Please select a booking, choose dispute category, and provide description.'
      );
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch('/api/grievances/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ bookingId, issueType, description }),
    });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error || 'Something went wrong');
      return;
    }

    setSuccess(t('grievanceSubmitted'));
    setBookingId('');
    setIssueType('');
    setDescription('');

    // Refresh
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await loadGrievances(user.id);
  };

  const getStatusBadge = (status) => {
    if (status === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>{t('resolved')}</span>
        </span>
      );
    }
    if (status === 'in_review') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
          <svg className="w-3.5 h-3.5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m0 14v1m8-8h-1M5 12H4m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
          </svg>
          <span>{t('inReview')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>{t('open')}</span>
      </span>
    );
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-slate-500 font-display text-sm">
          <svg className="animate-spin h-5 w-5 text-rose-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 dark:bg-neutral-950 pb-28 sm:pb-12 text-slate-900 dark:text-slate-100 transition-colors">
      <Head>
        <title>{t('fileGrievance')} | Kisan Setu</title>
      </Head>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5 sm:border-x sm:border-slate-200/80 dark:sm:border-neutral-800/60 sm:min-h-screen sm:bg-slate-50/50 dark:sm:bg-neutral-950 sm:shadow-xs">
        {/* Top Executive Navigation Bar */}
        <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-center gap-3">
            <motion.div whileTap={{ scale: 0.92 }}>
              <Link
                href="/farmer/dashboard"
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center justify-center transition shadow-2xs"
                title={t('back', 'Back')}
                aria-label="Back to Dashboard"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-tight text-emerald-900 dark:text-emerald-400 font-display">KISAN SETU</span>
                <span className="text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.2 rounded-md">
                  DISPUTE ARBITRATION
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Statutory Redressal Tribunal & Weighbridge Audit Trail
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
          </div>
        </div>

        {/* Sovereign Service Identity Header Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0 text-xl shadow-2xs">
                ⚖️
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700 font-display">
                    {t('grievanceCertBadge')}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                    SLA: 48-Hour Resolution Guarantee
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-0.5">
                  {t('fileGrievance')}
                </h1>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
            {t('grievanceSubtitle')}
          </p>

          {/* Statutory Trust Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold pt-1">
            <div className="bg-slate-50/90 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/60 p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-base">🛡️</span>
              <span className="text-[11px] text-slate-700 dark:text-neutral-300 font-display">
                {language === 'mr' ? '४८ तास निवारण हमी' : language === 'hi' ? '४८ घंटे में निवारण गारंटी' : '48-Hour Legal SLA'}
              </span>
            </div>

            <div className="bg-slate-50/90 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/60 p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="text-[11px] text-slate-700 dark:text-neutral-300 font-display">
                {language === 'mr' ? 'डिजिटल वजन पुरावा' : language === 'hi' ? 'डिजिटल तौल साक्ष्य' : 'Weighbridge Audit Log'}
              </span>
            </div>

            <div className="bg-slate-50/90 dark:bg-neutral-800/50 border border-slate-200/80 dark:border-neutral-700/60 p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-base">🏛️</span>
              <span className="text-[11px] text-slate-700 dark:text-neutral-300 font-display">
                {language === 'mr' ? 'जिल्हा मध्यस्थता अधिकारी' : language === 'hi' ? 'जिला मध्यस्थता अधिकारी' : 'District Mandi Arbiter'}
              </span>
            </div>
          </div>
        </div>

        {/* Dispute Registration Form Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 space-y-4">
          <div className="border-b border-slate-100 dark:border-neutral-800 pb-3">
            <h2 className="text-xs font-black font-display text-slate-900 dark:text-white uppercase tracking-wider">
              {t('fileGrievance')}
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              {t('grievanceBookingHint')}
            </p>
          </div>

          {/* Select Booking */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              {t('selectBooking')} *
            </label>
            <div className="relative">
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition-all outline-none font-semibold appearance-none cursor-pointer"
              >
                <option value="">{t('selectBooking')}</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.centres?.name} — {b.commodities?.name} ({b.slot_date})
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tactile Issue Type Selector Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              {t('issueType')} *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ISSUE_TYPES.map((it) => {
                const isSelected = issueType === it.value;
                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    key={it.value}
                    onClick={() => setIssueType(it.value)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-600/30 shadow-2xs'
                        : 'border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-lg">{it.icon}</span>
                    <span className="text-xs font-bold font-display text-slate-900 dark:text-white mt-1.5 block">
                      {t(it.labelKey)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              {t('description')} *
            </label>
            <textarea
              className="w-full bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition-all outline-none font-medium h-28 resize-none placeholder:text-slate-400 dark:placeholder:text-neutral-500 leading-relaxed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('grievanceDescPlaceholder')}
            />
          </div>

          {/* Submit Action Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={submitGrievance}
            disabled={loading}
            className="w-full min-h-[46px] bg-rose-700 hover:bg-rose-800 text-white font-black font-display text-sm rounded-2xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Submit Grievance to Arbiter &rarr;</span>
              </>
            )}
          </motion.button>

          {/* Status Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{success}</span>
            </motion.div>
          )}
        </div>

        {/* Farmer's Past Grievances & Redressal History */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
            <h2 className="text-xs font-black font-display text-slate-900 dark:text-white uppercase tracking-wider">
              {t('myGrievances')}
            </h2>
            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2.5 py-0.5 rounded-full">
              {grievances.length}
            </span>
          </div>

          {grievances.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-neutral-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-700 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-neutral-700 text-slate-500 mx-auto flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xs font-bold font-display text-slate-700 dark:text-slate-300">
                {t('noGrievances')}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                All procurement appointments and weighment slips are currently in good standing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {grievances.map((g) => (
                <div
                  key={g.id}
                  className="p-4 bg-slate-50/90 dark:bg-neutral-800/60 rounded-2xl border border-slate-200/80 dark:border-neutral-700/60 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <p className="font-black font-display text-sm capitalize text-slate-900 dark:text-white">
                        {(g.issue_type || '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {g.centre_name || 'Procurement Mandi'} • {g.slot_date || ''}
                      </p>
                    </div>
                    <div>{getStatusBadge(g.status)}</div>
                  </div>

                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200/80 dark:border-neutral-800 text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                    {g.description}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 dark:text-neutral-500 pt-1">
                    <span>Token: #{String(g.id).slice(0, 8)}</span>
                    <span>
                      {language === 'mr' ? 'दाखल तारीख: ' : language === 'hi' ? 'दर्ज तारीख: ' : 'Filed: '}
                      {new Date(g.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statutory SLA Notice at Bottom */}
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans shadow-2xs">
          <strong className="text-slate-800 dark:text-slate-200 font-bold font-display">APMC Grievance Rules: </strong>
          {t('resolutionTargetNotice')}
        </div>
      </div>

      <FarmerBottomNav />
    </div>
  );
}
