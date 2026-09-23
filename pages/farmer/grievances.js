import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import LanguageToggle from '../../components/LanguageToggle';

const ISSUE_TYPES = [
  { value: 'quality_dispute', labelKey: 'qualityDispute' },
  { value: 'weight_dispute', labelKey: 'weightDispute' },
  { value: 'payment_delay', labelKey: 'paymentDelay' },
  { value: 'long_wait', labelKey: 'longWait' },
  { value: 'other', labelKey: 'other' },
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
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {t('resolved')}
        </span>
      );
    }
    if (status === 'in_review') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
          <svg className="w-3 h-3 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m0 14v1m8-8h-1M5 12H4m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
          </svg>
          {t('inReview')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {t('open')}
      </span>
    );
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 pb-28 sm:pb-12 text-slate-900 dark:text-slate-100 transition-colors">
      <Head>
        <title>{t('fileGrievance')} | Kisan Setu</title>
      </Head>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {/* Top Brand Bar & Trust Indicators */}
        <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <motion.div whileTap={{ scale: 0.94 }}>
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-emerald-900 dark:text-emerald-400">KISAN SETU</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">• APMC Grid</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  {t('fciSync')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
          </div>
        </div>

        {/* Executive Service Identity Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-neutral-800/80 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-600/10 dark:bg-rose-400/10 border border-rose-500/25 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0 shadow-2xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-neutral-700">
                    {t('grievanceCertBadge')}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                    SLA: 48-Hour Resolution
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-0.5">
                  {t('fileGrievance')}
                </h1>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {t('grievanceSubtitle')}
          </p>

          {/* Clean Trust Verification Badges */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-rose-900 dark:text-rose-300 pt-1">
            <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? '४८ तास निवारण हमी' : language === 'hi' ? '४८ घंटे में निवारण गारंटी' : '48-Hour Resolution SLA'}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'डिजिटल वजन पुरावा' : language === 'hi' ? 'डिजिटल तौल साक्ष्य' : 'Legal Weighment Audit Trail'}</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-xl">
              <svg className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{language === 'mr' ? 'जिल्हा मध्यस्थता अधिकारी' : language === 'hi' ? 'जिला मध्यस्थता अधिकारी' : 'District Mandi Arbiter'}</span>
            </span>
          </div>
        </div>

        {/* Dispute Registration Form */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-neutral-800 pb-3">
            <h2 className="text-sm font-black font-display text-slate-900 dark:text-white uppercase tracking-wider">
              {t('fileGrievance')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('grievanceBookingHint')}
            </p>
          </div>

          {/* Select Booking */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              {t('selectBooking')}
            </label>
            <div className="relative">
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all outline-none font-medium appearance-none cursor-pointer"
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

          {/* Issue Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              {t('issueType')}
            </label>
            <div className="relative">
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all outline-none font-medium appearance-none cursor-pointer"
              >
                <option value="">
                  {language === 'mr'
                    ? '-- वाद / तक्रारीचा प्रकार निवडा --'
                    : language === 'hi'
                    ? '-- विवाद / शिकायत का प्रकार चुनें --'
                    : '-- Select Dispute Category --'}
                </option>
                {ISSUE_TYPES.map((it) => (
                  <option key={it.value} value={it.value}>
                    {t(it.labelKey)}
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

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
              {t('description')}
            </label>
            <textarea
              className="w-full bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all outline-none font-medium h-28 resize-none placeholder:text-slate-400 dark:placeholder:text-neutral-500 leading-relaxed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('grievanceDescPlaceholder')}
            />
          </div>

          {/* Submit Action Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={submitGrievance}
            disabled={loading}
            className="w-full min-h-[48px] bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-800 hover:to-rose-700 text-white font-black font-display text-sm rounded-2xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>{t('submit')}</span>
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

        {/* Farmer's Past Grievances & Arbitration List */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
            <h2 className="text-sm font-black font-display text-slate-900 dark:text-white uppercase tracking-wider">
              {t('myGrievances')}
            </h2>
            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 px-2.5 py-0.5 rounded-full">
              {grievances.length}
            </span>
          </div>

          {grievances.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-neutral-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-700">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-neutral-700 text-slate-500 mx-auto flex items-center justify-center mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('noGrievances')}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                All procurement appointments are currently in good standing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {grievances.map((g) => (
                <div
                  key={g.id}
                  className="p-4 bg-slate-50 dark:bg-neutral-800/60 rounded-2xl border border-slate-200/60 dark:border-neutral-700/60 space-y-2.5"
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

                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-slate-200/50 dark:border-neutral-800 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
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
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
          <strong className="text-slate-800 dark:text-slate-200 font-bold">APMC Grievance Rules: </strong>
          {t('resolutionTargetNotice')}
        </div>
      </div>

      <FarmerBottomNav />
    </div>
  );
}
