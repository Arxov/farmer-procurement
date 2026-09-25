import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageToggle from '../components/LanguageToggle';
import NumberTicker from '../components/NumberTicker';

// First-time profile setup or KYC profile edit
export default function Register() {
  const [fullName, setFullName] = useState('');
  const [village, setVillage] = useState('');
  const [land, setLand] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { t, language } = useLanguage();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          router.push('/');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .maybeSingle();

        if (profile) {
          if (profile.full_name) setFullName(profile.full_name);
          if (profile.village) setVillage(profile.village);
          if (profile.land_holding_acres !== null && profile.land_holding_acres !== undefined) {
            setLand(String(profile.land_holding_acres));
          }
        }
      } catch (err) {
        console.error('Network error loading profile:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const submit = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) { router.push('/'); return; }

      const parsedLand = land ? parseFloat(land) : null;
      if (parsedLand !== null && (Number.isNaN(parsedLand) || parsedLand < 0)) {
        setLoading(false);
        setError('Please enter a valid land holding value in acres.');
        return;
      }

      // Check if profile already exists to preserve role if set
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      const role = existingProfile?.role || 'farmer';

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userData.user.id,
        full_name: fullName,
        phone: userData.user.phone,
        village,
        land_holding_acres: parsedLand,
        role,
      }, { onConflict: 'id' });

      setLoading(false);
      if (upsertError) { setError(upsertError.message); return; }

      if (role === 'officer') router.push('/officer/dashboard');
      else if (role === 'admin') router.push('/admin/dashboard');
      else router.push('/farmer/dashboard');
    } catch (err) {
      setLoading(false);
      setError('Network error: Could not save profile. Please try again.');
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-slate-500 font-display text-sm">
          <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  const estQuota = land && !Number.isNaN(parseFloat(land))
    ? Math.round(parseFloat(land) * 25)
    : 0;

  return (
    <div className="min-h-screen bg-slate-100/90 dark:bg-neutral-950 px-4 py-8 flex flex-col justify-center items-center text-slate-900 dark:text-white transition-colors relative overflow-hidden">
      <Head>
        <title>{t('completeProfile')} | Kisan Setu</title>
      </Head>

      {/* Background Decorative Rings */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-4 relative z-10">

        {/* Top Sovereign Banner & Language Switcher */}
        <div className="flex justify-between items-center bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-neutral-800 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-base">
              🌾
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-emerald-900 dark:text-emerald-400 font-display block">
                KISAN SETU
              </span>
              <span className="text-[10px] text-slate-400 font-sans">
                National Farmer Procurement Registry
              </span>
            </div>
          </div>
          <LanguageToggle />
        </div>

        {/* KYC Onboarding Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-slate-200/90 dark:border-neutral-800 ring-1 ring-slate-900/5 overflow-hidden">

          {/* National Tricolor Apex Ribbon */}
          <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-white to-green-600" />

          <div className="p-6 sm:p-7 space-y-5">
            {/* Header */}
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-0.5 rounded-full inline-block">
                BENEFICIARY KYC ENROLLMENT
              </span>
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-1">
                {t('completeProfile')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                Register verified land holding and Tehsil details for statutory MSP procurement slots.
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  {t('fullName')} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                    placeholder="e.g. Ramesh Shankar Patil"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Village / Tehsil */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  {t('village')} / Tehsil *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                    placeholder="e.g. Daund, Pune District"
                    value={village}
                    onChange={e => setVillage(e.target.value)}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Land Holding */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black font-display uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                    {t('landHolding')} (Acres) *
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">7/12 Land Record</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full min-h-[46px] bg-slate-50 dark:bg-neutral-800/80 border border-slate-200/80 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                    placeholder="e.g. 4.5"
                    value={land}
                    onChange={e => setLand(e.target.value)}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
                    ACRES
                  </div>
                </div>
              </div>

              {/* Projected Procurement Ceiling Banner */}
              {estQuota > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-3.5 flex justify-between items-center"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 font-display block">
                      Statutory Procurement Quota
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-sans">
                      Calculated at standard CACP yield cap
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-900 dark:text-emerald-200">
                      ~<NumberTicker value={estQuota} /> q
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-display">Max per Season</span>
                  </div>
                </motion.div>
              )}

              {/* Submit Action Button */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={submit}
                disabled={loading}
                className="w-full min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black font-display text-sm shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer pt-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('saving')}</span>
                  </>
                ) : (
                  <span>{t('saveAndContinue')} &rarr;</span>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Statutory Confidentiality Notice */}
        <p className="text-center text-[10px] text-slate-400 font-mono">
          Protected under Digital Personal Data Protection (DPDP) Act • Government of India
        </p>

      </div>
    </div>
  );
}
