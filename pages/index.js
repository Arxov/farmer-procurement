import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageToggle from '../components/LanguageToggle';

// Map specific phone/Aadhaar numbers to seeded demo accounts
const CREDENTIAL_MAP = {
  '9822100011': {
    email: 'farmer@demo.com',
    role: 'farmer',
    name: 'Ramesh Patil',
    title: 'Farmer',
    badge: 'Farmer',
    marathiRole: 'शेतकरी',
    icon: '🌾',
    themeColor: 'emerald',
  },
  '9422088990': {
    email: 'officer@demo.com',
    role: 'officer',
    name: 'APMC Officer Desk',
    title: 'Officer',
    badge: 'Officer',
    marathiRole: 'कृषी अधिकारी',
    icon: '🏢',
    themeColor: 'blue',
  },
  '0202555123': {
    email: 'admin@demo.com',
    role: 'admin',
    name: 'National Admin HQ',
    title: 'Administrator',
    badge: 'Admin',
    marathiRole: 'प्रशासक',
    icon: '🏛️',
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
            className="lg:w-[50%] xl:w-[48%] w-full bg-gradient-to-br from-[#fbfdfc] via-[#f1f8f4] to-[#e7f4ed] flex flex-col justify-between p-4 sm:p-5 lg:p-6 xl:p-8 relative overflow-y-auto"
            data-purpose="auth-interaction-panel"
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-200/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-100/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar: Official Mandi Badge & Language Switcher */}
            <header className="flex items-center justify-between w-full pt-0 pb-1.5 z-20 gap-3" data-purpose="top-header">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-900/10 shadow-2xs select-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-emerald-800 font-bold tracking-tight notranslate" translate="no">
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
                    onClick={handleSignOut}
                    className="text-slate-500 hover:text-red-700 font-medium cursor-pointer ml-1"
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
              <div className="bg-white rounded-2xl custom-shadow overflow-hidden border border-slate-100">

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
                <div className="p-4 sm:p-5">
                  {step === 1 ? (
                    <>
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

                      {/* Point 3: Tactile Identity Pass Selectors */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-extrabold tracking-wider text-slate-700 uppercase flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            {language === 'mr'
                              ? 'त्वरित चाचणी ओळखपत्र:'
                              : language === 'hi'
                              ? 'त्वरित परीक्षण पहचान पत्र:'
                              : 'Select Identity Pass:'}
                          </label>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Demo Access
                          </span>
                        </div>

                        {/* 3 Identity Pass Cards (Protected from translation corruption) */}
                        <div className="grid grid-cols-3 gap-2 notranslate" translate="no">
                          {Object.entries(CREDENTIAL_MAP).map(([phone, acc]) => {
                            const isSelected = cleanId === phone;

                            // Role-specific theme styling
                            let activeClasses = '';
                            let badgeBg = '';
                            if (acc.role === 'farmer') {
                              activeClasses = isSelected
                                ? 'bg-gradient-to-b from-emerald-50 to-emerald-100/70 border-[#0c5c36] text-[#063f23] ring-2 ring-[#0c5c36]/25 shadow-xs'
                                : 'bg-slate-50/90 hover:bg-emerald-50/40 border-slate-200 text-slate-700';
                              badgeBg = isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200/80 text-slate-600';
                            } else if (acc.role === 'officer') {
                              activeClasses = isSelected
                                ? 'bg-gradient-to-b from-blue-50 to-blue-100/70 border-blue-700 text-blue-950 ring-2 ring-blue-700/25 shadow-xs'
                                : 'bg-slate-50/90 hover:bg-blue-50/40 border-slate-200 text-slate-700';
                              badgeBg = isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-600';
                            } else {
                              activeClasses = isSelected
                                ? 'bg-gradient-to-b from-slate-100 to-slate-200/80 border-slate-700 text-slate-950 ring-2 ring-slate-700/25 shadow-xs'
                                : 'bg-slate-50/90 hover:bg-slate-100 border-slate-200 text-slate-700';
                              badgeBg = isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200/80 text-slate-600';
                            }

                            return (
                              <button
                                key={phone}
                                id={`preset-${acc.role}`}
                                type="button"
                                onClick={() => handleSelectPreset(phone)}
                                className={`relative p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer ${activeClasses}`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-lg select-none">{acc.icon}</span>
                                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${badgeBg}`}>
                                    {acc.badge}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-xs font-extrabold leading-tight">
                                    {language === 'mr' ? acc.marathiRole : acc.title}
                                  </div>
                                </div>
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

                      {/* Point 4: Smart Phone / Aadhaar Input Form */}
                      <form data-purpose="otp-login-form" method="POST" onSubmit={handleGenerateOtp}>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            className="block text-[10px] font-extrabold tracking-wider text-slate-700 uppercase"
                            htmlFor="phone-or-aadhaar"
                          >
                            {language === 'mr'
                              ? 'मोबाईल किंवा आधार क्रमांक'
                              : language === 'hi'
                              ? 'मोबाइल या आधार नंबर'
                              : 'Mobile or Aadhaar Number'}
                          </label>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {isAadhaar
                              ? (language === 'mr' ? '🪪 १२-अंकी आधार' : '12-Digit Aadhaar')
                              : (language === 'mr' ? '📱 १०-अंकी मोबाईल' : '10-Digit Mobile')}
                          </span>
                        </div>

                        <div className="relative flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#0c5c36] focus-within:ring-3 focus-within:ring-emerald-600/20 transition-all duration-200">
                          {/* Prefix Badge without 'IN' */}
                          <div className="pl-3.5 pr-2.5 py-3 flex items-center gap-1 text-xs font-bold text-slate-700 border-r border-slate-200 select-none bg-slate-50/80 rounded-l-xl">
                            {isAadhaar ? (
                              <span className="text-emerald-800 font-extrabold">UID</span>
                            ) : (
                              <span className="font-extrabold text-slate-800">+91</span>
                            )}
                          </div>

                          <input
                            className="w-full py-3.5 px-3 text-sm font-bold text-slate-900 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-slate-400 tracking-wider"
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

                          {/* Dynamic UIDAI / Verified Indicator */}
                          <div className="pr-3.5 select-none">
                            {isAadhaar ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                                UIDAI
                              </span>
                            ) : cleanId.length === 10 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                Mobile
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Format Preview Helper (without SMS OTP text) */}
                        <div className="mt-1.5 text-[11px] text-slate-500">
                          <span>
                            {language === 'mr' ? 'स्वरूप' : 'Format'}: <strong className="text-slate-700 font-mono">{formattedDisplay}</strong>
                          </span>
                        </div>

                        {/* Gradient CTA Button */}
                        <button
                          id="submit-generate-otp"
                          disabled={loading}
                          className="w-full mt-4 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#074b2a] via-[#0c5c36] to-[#0f7646] hover:from-[#053d22] hover:via-[#094d2c] hover:to-[#0c5c36] active:scale-[0.99] text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition-all duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed notranslate"
                          translate="no"
                          type="submit"
                        >
                          <span className="text-sm font-bold">
                            {loading
                              ? (language === 'mr' ? 'ओटीपी पाठवत आहे...' : language === 'hi' ? 'ओटीपी भेजा जा रहा है...' : 'Sending OTP...')
                              : (language === 'mr' ? 'ओटीपी मिळवा' : language === 'hi' ? 'ओटीपी प्राप्त करें' : 'Get Verification OTP')}
                          </span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
                          नोंदणीकृत क्रमांकावर ६-अंकी सुरक्षित OTP पाठवला जाईल
                        </p>
                      </form>
                    </>
                  ) : (
                    <>
                      {/* Step 2: OTP Verification */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wide">
                          Step 2 of 2 • पडताळणी
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          &larr; <span>Change Number / क्रमांक बदला</span>
                        </button>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug marathi-font">
                        सत्यापन कोड प्रविष्ट करा
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 mb-3 leading-relaxed">
                        OTP sent to <span className="font-bold text-slate-800">+91 {identifier}</span>
                      </p>

                      {/* Demo OTP Helper */}
                      <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                        <div>
                          <span>चाचणी OTP कोड: <strong className="font-mono text-amber-950 font-bold">123456</strong></span>
                        </div>
                        <button
                          id="btn-autofill-otp"
                          type="button"
                          onClick={() => setOtp('123456')}
                          className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-extrabold rounded-lg transition-colors cursor-pointer text-[11px] shadow-2xs"
                        >
                          ⚡ Autofill OTP
                        </button>
                      </div>

                      {/* Error display */}
                      {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                          {error}
                        </div>
                      )}

                      {/* Step 2 Form */}
                      <form onSubmit={handleVerifyOtp}>
                        <label className="block text-[10px] font-extrabold tracking-wider text-slate-700 uppercase mb-2">
                          ६-अंकी पडताळणी कोड / 6-Digit OTP Code
                        </label>
                        <div className="relative flex items-center rounded-xl border-2 border-slate-300 bg-white focus-within:border-[#0c5c36] focus-within:ring-3 focus-within:ring-emerald-600/20 transition-all duration-200">
                          <input
                            className="w-full py-3.5 px-4 text-center text-xl font-black text-slate-900 tracking-[0.5em] bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-slate-300 font-mono"
                            id="otp-input"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="------"
                            required
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            autoFocus
                          />
                        </div>

                        <button
                          id="submit-verify-otp"
                          disabled={loading}
                          className="w-full mt-4 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#074b2a] via-[#0c5c36] to-[#0f7646] hover:from-[#053d22] hover:via-[#094d2c] hover:to-[#0c5c36] text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition duration-150 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed notranslate"
                          translate="no"
                          type="submit"
                        >
                          <span className="marathi-font font-bold">
                            {loading ? 'पडताळणी चालू आहे... / Verifying...' : 'प्रवेश करा • Verify & Enter Mandi'}
                          </span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </form>
                    </>
                  )}

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
                      <span>२५६-बिट सुरक्षित डेटा (AES)</span>
                    </div>
                    <div className="h-3 w-[1px] bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-700" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                      </svg>
                      <span>UIDAI ई-केवायसी सुरक्षित</span>
                    </div>
                  </div>

                  {/* Working Navigation Links */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-semibold text-slate-500">
                    <Link
                      href="/farmer/guidelines"
                      className="text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                    >
                      मंडी मार्गदर्शक तत्त्वे &rarr;
                    </Link>
                    <span className="text-slate-300">•</span>
                    <Link
                      href="/demo/ivr"
                      className="text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                    >
                      IVR व्हॉइस डेमो &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Point 6: Polished Mandi Trust & Stats Highlights Strip */}
            <div className="w-full max-w-[480px] mx-auto grid grid-cols-3 gap-2 text-center select-none mt-3 relative z-10" data-purpose="mandi-trust-strip">
              {/* Stat 1 */}
              <div className="bg-white/85 backdrop-blur-md border border-emerald-900/10 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-[#075330] tracking-tight">३०५+ APMC</span>
                </div>
                <div className="text-[10px] text-slate-600 font-semibold tracking-tight leading-tight marathi-font">
                  सक्रिय बाजार समित्या
                </div>
                <div className="text-[9px] text-slate-400 font-medium leading-none">
                  Live Mandis
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-white/85 backdrop-blur-md border border-emerald-900/10 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className="text-xs">🛡️</span>
                  <span className="text-xs font-black text-[#075330] tracking-tight">१००% MSP</span>
                </div>
                <div className="text-[10px] text-slate-600 font-semibold tracking-tight leading-tight marathi-font">
                  थेट हमीभाव खरेदी
                </div>
                <div className="text-[9px] text-slate-400 font-medium leading-none">
                  Direct DBT Payout
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-white/85 backdrop-blur-md border border-emerald-900/10 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className="text-xs">📞</span>
                  <span className="text-xs font-black text-[#075330] tracking-tight">२४×७ मदत</span>
                </div>
                <div className="text-[10px] text-slate-600 font-semibold tracking-tight leading-tight marathi-font">
                  टोल-फ्री सहाय्यता
                </div>
                <div className="text-[9px] text-slate-400 font-medium leading-none">
                  Farmer Support
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
