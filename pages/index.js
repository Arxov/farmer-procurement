import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageToggle from '../components/LanguageToggle';

// Role SVG Icon Renderer (SVG precision, no emoji)
function renderRoleIcon(role, isSelected) {
  if (role === 'farmer') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    );
  }
  if (role === 'officer') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="13" x="3" y="6" rx="2" />
        <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M3 11h18" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

// Map specific phone/Aadhaar numbers to seeded demo accounts
const CREDENTIAL_MAP = {
  '9822100011': {
    email: 'farmer@demo.com',
    role: 'farmer',
    name: 'Ramesh Patil',
    title: 'Farmer',
    badge: 'Farmer',
    marathiRole: 'शेतकरी',
    hindiRole: 'किसान',
    themeColor: 'emerald',
  },
  '9422088990': {
    email: 'officer@demo.com',
    role: 'officer',
    name: 'APMC Officer Desk',
    title: 'Officer',
    badge: 'Officer',
    marathiRole: 'कृषी अधिकारी',
    hindiRole: 'कृषि अधिकारी',
    themeColor: 'blue',
  },
  '0202555123': {
    email: 'admin@demo.com',
    role: 'admin',
    name: 'National Admin HQ',
    title: 'Administrator',
    badge: 'Admin',
    marathiRole: 'प्रशासक',
    hindiRole: 'प्रशासक',
    themeColor: 'slate',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  // OTP Login state
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('9822100011');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active session tracking
  const [activeSession, setActiveSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Check for existing session or handle ?switch=true query
  useEffect(() => {
    async function checkAuth() {
      if (router.query.switch === 'true' || router.query.logout === 'true') {
        await supabase.auth.signOut();
        setActiveSession(null);
        setUserProfile(null);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setActiveSession(session);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile) setUserProfile(profile);
      }
    }
    checkAuth();
  }, [router.query]);

  // Navigate to appropriate dashboard based on role
  const navigateByRole = (role) => {
    if (role === 'farmer') router.push('/farmer/dashboard');
    else if (role === 'officer') router.push('/officer/dashboard');
    else if (role === 'admin') router.push('/admin/dashboard');
    else router.push('/farmer/dashboard');
  };

  // Input sanitizer: only digits, max 12 chars
  const handleIdentifierChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
    setIdentifier(val);
    setError(null);
  };

  // Quick select preset identity
  const handleSelectPreset = (phone) => {
    setIdentifier(phone);
    setError(null);
    setStep(1);
  };

  // OTP Step 1: Request OTP
  const handleGenerateOtp = (e) => {
    e.preventDefault();
    setError(null);

    const clean = identifier.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      setError(
        language === 'mr'
          ? 'कृपया वैध १०-अंकी मोबाईल किंवा १२-अंकी आधार क्रमांक प्रविष्ट करा.'
          : language === 'hi'
          ? 'कृपया मान्य १०-अंकीय मोबाइल या १२-अंकीय आधार नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number or 12-digit Aadhaar.'
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setOtp('');
    }, 450);
  };

  // OTP Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (otp !== '123456') {
      setError(
        language === 'mr'
          ? 'अवैध ओटीपी. चाचणीसाठी कृपया १२३४५६ प्रविष्ट करा.'
          : language === 'hi'
          ? 'अमान्य ओटीपी। डेमो सत्यापन के लिए कृपया 123456 दर्ज करें।'
          : 'Invalid OTP. Please enter 123456 for the demo verification.'
      );
      return;
    }

    const clean = identifier.replace(/\D/g, '');
    const account = CREDENTIAL_MAP[clean] || CREDENTIAL_MAP['9822100011'];

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: 'password123',
      });
      if (authError) throw authError;

      navigateByRole(account.role);
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please try again.');
      setLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setActiveSession(null);
    setUserProfile(null);
  };

  // Formatting helpers for phone & Aadhaar
  const cleanId = identifier.replace(/\D/g, '');
  const isAadhaar = cleanId.length === 12;
  const activePreset = CREDENTIAL_MAP[cleanId] || CREDENTIAL_MAP['9822100011'];

  const formattedDisplay = isAadhaar
    ? `${cleanId.slice(0, 4)} ${cleanId.slice(4, 8)} ${cleanId.slice(8, 12)}`
    : cleanId.length === 10
    ? `${cleanId.slice(0, 5)} ${cleanId.slice(5, 10)}`
    : cleanId;

  return (
    <>
      <Head>
        <title>Kisan Setu - Govt. of Maharashtra Digital Mandi Portal</title>
        <meta name="description" content="Kisan Setu - Government of Maharashtra Digital Mandi Procurement Portal" />
        <style>{`
          .marathi-font {
            font-family: 'Mukta', sans-serif;
          }
          .custom-shadow {
            box-shadow: 0 20px 40px -12px rgba(4, 46, 26, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.05);
          }
        `}</style>
      </Head>

      <div className="min-h-screen w-full bg-[#f0f5f2] flex flex-col overflow-x-hidden text-slate-800 antialiased selection:bg-emerald-600 selection:text-white font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Main outer layout container */}
        <main className="w-full min-h-screen bg-white overflow-hidden flex flex-col lg:flex-row relative flex-1">

          {/* BEGIN: LeftHeroSection */}
          {/* Left 52% Area: High-resolution official agricultural master artwork */}
          <section
            className="lg:w-[50%] xl:w-[52%] w-full relative flex flex-col justify-between overflow-hidden bg-[#074728]"
            data-purpose="hero-marketing-panel"
          >
            {/* Background Master Art */}
            <div className="w-full h-full min-h-[440px] lg:min-h-screen flex items-center justify-center relative bg-[#074728]">
              <img
                src="/images/hero-farmer.webp"
                alt="शेतकऱ्यांसाठी डिजिटल बाजारपेठ - Kisan Setu"
                className="w-full h-full object-cover object-center block select-none"
              />
            </div>
          </section>
          {/* END: LeftHeroSection */}

          {/* BEGIN: RightAuthSection */}
          {/* Right 48% Area: Government Emblems, Tactile Identity Passes, Smart Form, Trust Strip */}
          <section
            className="lg:w-[50%] xl:w-[48%] w-full bg-slate-100/90 dark:bg-neutral-950 flex flex-col justify-between p-4 sm:p-5 lg:p-6 xl:p-8 relative overflow-y-auto border-l border-slate-200/90 dark:border-neutral-800"
            data-purpose="auth-interaction-panel"
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar: Official Mandi Badge & Language Switcher */}
            <header className="flex items-center justify-between w-full pt-0 pb-1.5 z-20 gap-3" data-purpose="top-header">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-400 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-neutral-800 shadow-2xs select-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold tracking-tight notranslate" translate="no">
                  Digital Mandi Portal • अधिकृत पोर्टल
                </span>
              </div>
              <LanguageToggle />
            </header>

            {/* Active Session Alert (if user is currently signed in) */}
            {activeSession && (
              <div className="mb-3 bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs z-20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Active session: <strong>{userProfile?.full_name || activeSession.user?.email}</strong> (
                    <span className="capitalize">{userProfile?.role || 'user'}</span>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateByRole(userProfile?.role || 'farmer')}
                    className="font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    Go to Dashboard &rarr;
                  </button>
                  <button
                    id="btn-sign-out"
                    onClick={handleSignOut}
                    className="text-slate-500 hover:text-red-700 font-medium cursor-pointer ml-1 notranslate"
                    translate="no"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* Center Authentication Card Container */}
            <div className="w-full max-w-[480px] mx-auto my-auto relative z-10 py-0.5" data-purpose="login-card-container">

              {/* Point 1: Unified Government Masthead (Protected from translation) */}
              <div
                className="flex items-center justify-center gap-4 sm:gap-6 mb-2.5 sm:mb-3 select-none notranslate"
                translate="no"
                data-purpose="govt-mandi-branding"
              >
                {/* Seal of Maharashtra & Governance Title */}
                <div className="flex flex-col items-center text-center">
                  <img
                    src="/images/maharashtra-seal.webp"
                    alt="महाराष्ट्र राज्य मुद्रा"
                    className="w-11 h-11 sm:w-13 sm:h-13 object-contain mb-1 drop-shadow-sm hover:scale-105 transition-transform duration-200"
                  />
                  <div className="text-xs sm:text-[13px] font-extrabold text-slate-800 tracking-tight leading-tight uppercase marathi-font">
                    महाराष्ट्र शासन
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 tracking-wider uppercase leading-tight">
                    Government of Maharashtra
                  </div>
                </div>

                {/* Elegant Vertical Divider */}
                <div className="h-11 sm:h-13 w-[1.5px] bg-gradient-to-b from-transparent via-slate-300 to-transparent" />

                {/* Agriculture for a Better Tomorrow */}
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="text-left">
                    <span className="block text-xs sm:text-[13px] font-semibold text-slate-700 leading-tight">Agriculture</span>
                    <span className="block text-xs sm:text-[13px] font-semibold text-slate-700 leading-tight">for a Better</span>
                    <span className="block text-xs font-bold text-[#075330] leading-tight">Tomorrow</span>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 border border-emerald-300/80 flex items-center justify-center shadow-xs p-1 select-none">
                    <img
                      src="/images/agriculture-leaf.webp"
                      alt="Agriculture for a Better Tomorrow"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Login Card */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200/90 dark:border-neutral-800 ring-1 ring-slate-900/5">

                {/* Card Top Brand Bar: Impressive Kisan Setu Title */}
                <div className="bg-gradient-to-r from-[#042817] via-[#08522d] to-[#042817] px-6 py-3.5 flex items-center justify-center text-white border-b border-emerald-500/20 shadow-xs select-none">
                  <div className="flex items-center gap-3 notranslate" translate="no">
                    <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shadow-inner text-emerald-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3L2 8v2h20V8L12 3zm-7 7v9h2v-9H5zm4 0v9h2v-9H9zm6 0v9h2v-9h-2zm4 0v9h2v-9h-2zM2 20v2h20v-2H2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black tracking-wide text-white uppercase drop-shadow-xs">
                        Kisan Setu
                      </h3>
                      <span className="text-emerald-300 font-extrabold text-sm sm:text-base marathi-font">
                        • किसान सेतू
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        {/* Clean Mandi Login Header (Protected from mistranslation) */}
                        <div className="mb-4">
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug notranslate" translate="no">
                            {language === 'mr'
                              ? 'मंडी प्रवेश लॉगिन'
                              : language === 'hi'
                              ? 'मंडी प्रवेश लॉगिन'
                              : 'Mandi Login'}
                          </h2>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {language === 'mr'
                              ? 'पुढे जाण्यासाठी आपला नोंदणीकृत मोबाइल किंवा आधार क्रमांक प्रविष्ट करा.'
                              : language === 'hi'
                              ? 'आगे बढ़ने के लिए अपना पंजीकृत मोबाइल या आधार नंबर दर्ज करें।'
                              : 'Enter your registered mobile or Aadhaar number to proceed.'}
                          </p>
                        </div>

                        {/* Point 3: Apple HIG Segmented Control with Motion Primitives Spring Pill */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700 select-none">
                              {language === 'mr'
                                ? 'भूमिका निवडा (Demo Access):'
                                : language === 'hi'
                                ? 'भूमिका चुनें (Demo Access):'
                                : 'Select Role (Demo Access):'}
                            </label>
                          </div>

                          {/* Unified Segmented Control Track with Motion Primitives Spring Pill */}
                          <div
                            className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 select-none notranslate relative"
                            translate="no"
                            role="tablist"
                            aria-label="Role selection"
                          >
                            {Object.entries(CREDENTIAL_MAP).map(([phone, acc]) => {
                              const isSelected = cleanId === phone;
                              return (
                                <button
                                  key={phone}
                                  id={`preset-${acc.role}`}
                                  type="button"
                                  role="tab"
                                  aria-selected={isSelected}
                                  onClick={() => handleSelectPreset(phone)}
                                  className={`relative flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors duration-150 cursor-pointer z-10 ${
                                    isSelected
                                      ? 'text-emerald-950'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {isSelected && (
                                    <motion.div
                                      layoutId="activeRolePill"
                                      className="absolute inset-0 bg-white rounded-lg border border-emerald-900/10 shadow-xs"
                                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                      style={{ zIndex: -1 }}
                                    />
                                  )}
                                  <span className={`transition-all duration-150 ${isSelected ? 'text-emerald-700 scale-105' : 'text-slate-400'}`}>
                                    {renderRoleIcon(acc.role, isSelected)}
                                  </span>
                                  <span>{language === 'mr' ? acc.marathiRole : language === 'hi' ? acc.hindiRole : acc.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Error display */}
                            {error && (
                              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                              </div>
                            )}

                            {/* Point 4: Ergonomic Text Input with Clear Button */}
                            <form data-purpose="otp-login-form" method="POST" onSubmit={handleGenerateOtp}>
                              <div className="flex items-center justify-between mb-1.5">
                                <label
                                  className="block text-xs font-bold text-slate-700"
                                  htmlFor="phone-or-aadhaar"
                                >
                                  {language === 'mr'
                                    ? 'मोबाईल किंवा आधार क्रमांक'
                                    : language === 'hi'
                                    ? 'मोबाइल या आधार नंबर'
                                    : 'Mobile or Aadhaar Number'}
                                </label>
                                <span className="text-xs font-semibold text-slate-500">
                                  {isAadhaar
                                    ? (language === 'mr' ? '१२-अंकी आधार' : language === 'hi' ? '१२-अंकीय आधार' : '12-Digit Aadhaar')
                                    : (language === 'mr' ? '१०-अंकी मोबाईल' : language === 'hi' ? '१०-अंकीय मोबाइल' : '10-Digit Mobile')}
                                </span>
                              </div>

                              <div className="h-[50px] relative flex items-center rounded-xl border border-slate-300/90 bg-white focus-within:border-[#0c5c36] focus-within:ring-3 focus-within:ring-emerald-600/20 transition-all duration-200 shadow-2xs">
                                {/* Prefix */}
                                <div className="pl-3.5 pr-2.5 flex items-center gap-1 text-sm font-bold text-slate-800 border-r border-slate-200 select-none">
                                  {isAadhaar ? (
                                    <span className="text-[#0c5c36] font-extrabold text-xs tracking-wider">UID</span>
                                  ) : (
                                    <span>+91</span>
                                  )}
                                </div>

                                <input
                                  className="w-full h-full px-3 text-sm font-bold text-slate-900 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-slate-400 tracking-wider"
                                  id="phone-or-aadhaar"
                                  inputMode="numeric"
                                  name="identifier"
                                  pattern="[0-9]*"
                                  placeholder={isAadhaar ? "1234 5678 9012" : "98221 00011"}
                                  required
                                  type="text"
                                  value={identifier}
                                  onChange={handleIdentifierChange}
                                />

                                {/* Clear Button (Apple HIG Pattern) */}
                                {identifier && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIdentifier('');
                                      setError('');
                                    }}
                                    className="mr-2.5 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                    title={language === 'mr' ? 'हटवा' : language === 'hi' ? 'साफ़ करें' : 'Clear input'}
                                    aria-label={language === 'mr' ? 'हटवा' : language === 'hi' ? 'साफ़ करें' : 'Clear input'}
                                  >
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                )}
                              </div>

                              {/* Format Preview Helper */}
                              <div className="mt-1.5 text-xs text-slate-500 flex items-center justify-between">
                                <span>
                                  {language === 'mr' ? 'स्वरूप' : language === 'hi' ? 'प्रारूप' : 'Format'}: <strong className="text-slate-700 font-mono">{formattedDisplay}</strong>
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {cleanId.length === 10
                                    ? (language === 'mr' ? '✓ वैध मोबाईल' : language === 'hi' ? '✓ मान्य मोबाइल' : '✓ Verified Mobile')
                                    : cleanId.length === 12
                                    ? (language === 'mr' ? '✓ UIDAI आधार' : language === 'hi' ? '✓ UIDAI आधार' : '✓ UIDAI Format')
                                    : ''}
                                </span>
                              </div>

                              {/* Apple HIG Tactile Primary Button */}
                              <button
                                id="submit-generate-otp"
                                disabled={loading}
                                className="w-full h-[50px] mt-4 px-6 rounded-xl bg-[#0c5c36] hover:bg-[#08482a] active:scale-[0.985] text-white text-[15px] font-bold tracking-wide flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition-all duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed notranslate"
                                translate="no"
                                type="submit"
                              >
                                {loading ? (
                                  <>
                                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>
                                      {language === 'mr' ? 'ओटीपी पाठवत आहे...' : language === 'hi' ? 'ओटीपी भेजा जा रहा है...' : 'Sending OTP...'}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>
                                      {language === 'mr' ? 'ओटीपी मिळवा' : language === 'hi' ? 'ओटीपी प्राप्त करें' : 'Get Verification OTP'}
                                    </span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </>
                                )}
                              </button>

                              <p className="text-center text-xs text-slate-500 mt-2.5 font-medium">
                                {language === 'mr'
                                  ? 'नोंदणीकृत क्रमांकावर ६-अंकी सुरक्षित OTP पाठवला जाईल'
                                  : language === 'hi'
                                  ? 'पंजीकृत नंबर पर ६-अंकीय सुरक्षित OTP भेजा जाएगा'
                                  : 'A 6-digit secure OTP will be sent to your registered number'}
                              </p>
                            </form>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="step-2"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                          >
                            {/* Step 2: OTP Verification */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wide">
                                {language === 'mr'
                                  ? 'चरण २ पैकी २ • पडताळणी'
                                  : language === 'hi'
                                  ? 'चरण २ / २ • सत्यापन'
                                  : 'Step 2 of 2 • Verification'}
                              </span>
                              <button
                                id="btn-back-to-step1"
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer flex items-center gap-1"
                              >
                                &larr; <span>{language === 'mr' ? 'क्रमांक बदला' : language === 'hi' ? 'नंबर बदलें' : 'Change Number'}</span>
                              </button>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug marathi-font">
                              {language === 'mr'
                                ? 'सत्यापन कोड प्रविष्ट करा'
                                : language === 'hi'
                                ? 'सत्यापन कोड दर्ज करें'
                                : 'Enter Verification Code'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 mb-3 leading-relaxed">
                              {language === 'mr' ? 'येथे OTP पाठवला:' : language === 'hi' ? 'यहाँ OTP भेजा गया:' : 'OTP sent to'}{' '}
                              <span className="font-bold text-slate-800">+91 {identifier}</span>
                            </p>

                            {/* Demo OTP Helper with clean SVG */}
                            <div
                              className="mb-3.5 p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-center justify-between text-xs text-amber-950 select-none notranslate"
                              translate="no"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-amber-800 font-medium">
                                  {language === 'mr' ? 'चाचणी OTP कोड:' : language === 'hi' ? 'डेमो OTP कोड:' : 'Demo OTP:'}
                                </span>
                                <strong className="font-mono text-amber-950 font-black tracking-wider bg-amber-100/90 px-2 py-0.5 rounded border border-amber-200">
                                  123456
                                </strong>
                              </div>
                              <button
                                id="btn-autofill-otp"
                                type="button"
                                onClick={() => setOtp('123456')}
                                className="px-2.5 py-1 bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-extrabold rounded-lg transition-colors cursor-pointer text-[11px] shadow-2xs flex items-center gap-1 notranslate"
                                translate="no"
                              >
                                <svg className="w-3 h-3 text-amber-800" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                                <span>{language === 'mr' ? 'OTP भरा' : language === 'hi' ? 'OTP भरें' : 'Autofill OTP'}</span>
                              </button>
                            </div>

                            {/* Error display */}
                            {error && (
                              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                              </div>
                            )}

                            {/* Step 2 Form with shadcn 6-Box PIN */}
                            <form onSubmit={handleVerifyOtp}>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5 select-none">
                                {language === 'mr'
                                  ? '६-अंकी पडताळणी कोड'
                                  : language === 'hi'
                                  ? '६-अंकीय सत्यापन कोड'
                                  : '6-Digit OTP Code'}
                              </label>

                              {/* 6-Digit Segmented PIN Slots (shadcn / InputOTP pattern) */}
                              <div className="relative my-2.5">
                                <input
                                  id="otp-input"
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={6}
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  autoFocus
                                  className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer caret-transparent"
                                  aria-label="6-digit verification OTP"
                                />

                                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                                  {[0, 1, 2, 3, 4, 5].map((index) => {
                                    const digit = otp[index] || '';
                                    const isCurrentActive = otp.length === index;
                                    const isFilled = digit !== '';

                                    return (
                                      <div
                                        key={index}
                                        className={`h-12 sm:h-13 rounded-xl border flex flex-col items-center justify-center font-mono font-black text-xl transition-all duration-150 relative select-none ${
                                          isCurrentActive
                                            ? 'border-[#0c5c36] ring-3 ring-emerald-600/20 bg-white shadow-xs'
                                            : isFilled
                                            ? 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                                            : 'border-slate-200 bg-slate-50/70 text-slate-400'
                                        }`}
                                      >
                                        {digit ? (
                                          <span className="text-slate-900">{digit}</span>
                                        ) : isCurrentActive ? (
                                          <span className="w-2 h-0.5 bg-emerald-600 rounded-full animate-pulse" />
                                        ) : (
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <button
                                id="submit-verify-otp"
                                disabled={loading}
                                className="w-full h-[50px] mt-4 px-6 rounded-xl bg-[#0c5c36] hover:bg-[#08482a] active:scale-[0.985] text-white text-[15px] font-bold tracking-wide flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition-all duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed notranslate"
                                translate="no"
                                type="submit"
                              >
                                {loading ? (
                                  <>
                                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>
                                      {language === 'mr' ? 'पडताळणी चालू आहे...' : language === 'hi' ? 'सत्यापन हो रहा है...' : 'Verifying...'}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>
                                      {language === 'mr' ? 'प्रवेश करा • Verify & Enter Mandi' : language === 'hi' ? 'सत्यापित करें • Verify & Enter' : 'Verify & Enter Mandi'}
                                    </span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </>
                                )}
                              </button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>

                  {/* Security & Verification Badges */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          clipRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          fillRule="evenodd"
                        />
                      </svg>
                      <span>{language === 'mr' ? '२५६-बिट सुरक्षित डेटा (AES)' : language === 'hi' ? '२५६-बिट सुरक्षित डेटा (AES)' : '256-Bit Encrypted Data (AES)'}</span>
                    </div>
                    <div className="h-3 w-[1px] bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-700" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                      </svg>
                      <span>{language === 'mr' ? 'UIDAI ई-केवायसी सुरक्षित' : language === 'hi' ? 'UIDAI ई-केवाईसी सुरक्षित' : 'UIDAI e-KYC Secured'}</span>
                    </div>
                  </div>

                  {/* Working Navigation Links */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-semibold text-slate-500">
                    <Link
                      href="/farmer/guidelines"
                      className="text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                    >
                      {language === 'mr' ? 'मंडी मार्गदर्शक तत्त्वे' : language === 'hi' ? 'मंडी दिशानिर्देश' : 'Mandi Guidelines'} &rarr;
                    </Link>
                    <span className="text-slate-300">•</span>
                    <Link
                      href="/demo/ivr"
                      className="text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                    >
                      {language === 'mr' ? 'IVR व्हॉइस डेमो' : language === 'hi' ? 'IVR वॉइस डेमो' : 'IVR Voice Demo'} &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Point 6: Apple HIG Unified Trust & Stats Dock with Radar Beacon & Vector SVGs */}
            <div
              className="w-full max-w-[480px] mx-auto bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-slate-200/90 dark:border-neutral-800 rounded-2xl py-2.5 px-3 shadow-xs mt-3 flex items-center justify-between text-center select-none notranslate relative z-10"
              translate="no"
              data-purpose="mandi-trust-strip"
            >
              {/* Stat 1: Live APMC Network with Radar Beacon */}
              <div className="flex-1 flex items-center justify-center gap-2 border-r border-slate-200/80 pr-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <div className="text-left">
                  <div className="text-xs font-extrabold text-slate-800 leading-tight">
                    {language === 'mr' ? '३०५+ APMCs' : language === 'hi' ? '३०५+ APMCs' : '305+ APMCs'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium leading-tight">
                    {language === 'mr' ? 'थेट मंडई' : language === 'hi' ? 'सक्रिय मंडियां' : 'Live Mandis'}
                  </div>
                </div>
              </div>

              {/* Stat 2: 100% MSP Guarantee with Shield SVG */}
              <div className="flex-1 flex items-center justify-center gap-1.5 border-r border-slate-200/80 px-2">
                <span className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <div className="text-left">
                  <div className="text-xs font-extrabold text-slate-800 leading-tight">
                    {language === 'mr' ? '१००% MSP' : language === 'hi' ? '१००% MSP' : '100% MSP'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium leading-tight">
                    {language === 'mr' ? 'थेट बँक जमा' : language === 'hi' ? 'सीधा DBT भुगतान' : 'Direct DBT'}
                  </div>
                </div>
              </div>

              {/* Stat 3: 24x7 Support with Headset/Phone SVG */}
              <div className="flex-1 flex items-center justify-center gap-1.5 pl-2">
                <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <div className="text-left">
                  <div className="text-xs font-extrabold text-slate-800 leading-tight">
                    {language === 'mr' ? '२४×७ Support' : language === 'hi' ? '२४×७ सहायता' : '24×7 Support'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium leading-tight">
                    {language === 'mr' ? 'टोल-फ्री' : language === 'hi' ? 'टोल-फ्री' : 'Toll-Free'}
                  </div>
                </div>
              </div>
            </div>

            {/* Official Government Footer (Protected from translation duplication) */}
            <footer className="text-center pt-3 pb-1 relative z-10 select-none notranslate" translate="no" data-purpose="footer-links">
              <p className="text-[11px] font-bold text-slate-700 tracking-tight marathi-font">
                महाराष्ट्र राज्य कृषी पणन मंडळ (MSAMB), पुणे • महाराष्ट्र शासन
              </p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                Maharashtra State Agricultural Marketing Board • Government of Maharashtra
              </p>
              <div className="w-10 h-1 bg-[#0c5c36] rounded-full mx-auto mt-2 opacity-75" />
            </footer>
          </section>
          {/* END: RightAuthSection */}

        </main>
      </div>
    </>
  );
}
