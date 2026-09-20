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
    title: 'Farmer Portal',
    badge: 'Farmer',
    icon: '🌾',
  },
  '9422088990': {
    email: 'officer@demo.com',
    role: 'officer',
    name: 'APMC Officer Desk',
    title: 'APMC Mandi Desk',
    badge: 'Officer',
    icon: '🏢',
  },
  '0202555123': {
    email: 'admin@demo.com',
    role: 'admin',
    name: 'National Admin HQ',
    title: 'National Command Center',
    badge: 'Admin',
    icon: '🏛️',
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
            box-shadow: 0 16px 36px -6px rgba(4, 46, 26, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04);
          }
        `}</style>
      </Head>

      <div className="min-h-screen w-full bg-[#f0f5f2] flex flex-col overflow-x-hidden text-slate-800 antialiased selection:bg-emerald-600 selection:text-white font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Main outer layout container simulating 16:10 / desktop aspect ratio matching reference */}
        <main className="w-full min-h-screen bg-white overflow-hidden flex flex-col lg:flex-row relative flex-1">

          {/* BEGIN: LeftHeroSection */}
          {/* Left 58% Area: High visual agricultural imagery with typography & highlight badges */}
          <section
            className="lg:w-[55%] w-full relative flex flex-col justify-between overflow-hidden bg-[#074728]"
            data-purpose="hero-marketing-panel"
          >
            <div className="w-full h-full min-h-[420px] lg:min-h-screen flex items-center justify-center relative">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFT8e1eafyS0kkD_i9b-hbmXjGhUdvfc0UjOsak5-FMGxfFGmcK4cexeFGWurUcXjV_uT9hjMbtMgkBwnqOK62Ir5yVwleuCE050gX1fFZxEmV1GnJPPD0OtfTwBkDUAJxfPwKPl20HA9rl5Jtl_2ycvrOz8PvZhF1deWpbyXVZqHUrWl-Bb9Dwh5JPXtDfSuzxQyFcJ2SO95zNMBvg6YI5894znFIxxqdyS5tSf2LHO1JvixE7qZEFkdfUVyux55M"
                alt="शेतकऱ्यांसाठी डिजिटल बाजारपेठ - Kisan Setu"
                className="w-full h-full object-cover object-center block"
              />
            </div>
          </section>
          {/* END: LeftHeroSection */}

          {/* BEGIN: RightAuthSection */}
          {/* Right 42% Area: Government emblems, Authentication Card, Security Badges & Footer Navigation */}
          <section
            className="lg:w-[45%] w-full bg-gradient-to-br from-[#fbfdfc] via-[#f1f8f4] to-[#e7f4ed] flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 relative overflow-y-auto"
            data-purpose="auth-interaction-panel"
          >
            {/* Ambient Background Glows & Organic Accents */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-200/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-100/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 pointer-events-none opacity-[0.07] transform translate-x-8 translate-y-8">
              <svg className="w-80 h-80 text-emerald-800" fill="currentColor" viewBox="0 0 200 200">
                <path d="M40 180 C40 180 60 120 120 90 C180 60 200 10 200 10 C200 10 180 70 120 100 C60 130 40 180 40 180 Z" />
                <path d="M120 90 C90 70 85 40 85 40 C85 40 105 60 130 80 Z" />
                <path d="M140 60 C120 45 118 20 118 20 C118 20 135 35 150 50 Z" />
              </svg>
            </div>

            {/* Top Bar: Official Mandi Badge & Language Switcher */}
            <header className="flex items-center justify-between w-full pt-1 pb-3 z-20 gap-3" data-purpose="top-header">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-900/10 shadow-2xs select-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-emerald-800 font-bold tracking-tight">Digital Mandi Portal</span>
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

            {/* Center Authentication Card */}
            <div className="w-full max-w-[480px] mx-auto my-auto relative z-10 py-2" data-purpose="login-card-container">
              {/* Government of Maharashtra & Agriculture Header - Positioned Centered Above Login Box */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-5 select-none" data-purpose="govt-mandi-branding">
                {/* Seal of Maharashtra & Governance Title */}
                <div className="flex flex-col items-center text-center">
                  <img
                    src="/images/maharashtra-seal.webp"
                    alt="महाराष्ट्र राज्य मुद्रा"
                    className="w-12 h-12 sm:w-14 sm:h-14 object-contain mb-1 drop-shadow-sm hover:scale-105 transition-transform duration-200"
                  />
                  <div className="text-xs sm:text-[13px] font-extrabold text-slate-800 tracking-tight leading-tight uppercase marathi-font">
                    महाराष्ट्र शासन
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 tracking-wider uppercase leading-tight">
                    Government of Maharashtra
                  </div>
                </div>

                {/* Elegant Divider */}
                <div className="h-12 sm:h-14 w-[1.5px] bg-gradient-to-b from-transparent via-slate-300 to-transparent" />

                {/* Agriculture for a Better Tomorrow */}
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="text-left">
                    <span className="block text-xs sm:text-[13px] font-semibold text-slate-700 leading-tight">Agriculture</span>
                    <span className="block text-xs sm:text-[13px] font-semibold text-slate-700 leading-tight">for a Better</span>
                    <span className="block text-xs font-bold text-[#075330] leading-tight">Tomorrow</span>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100/80 border border-emerald-200/80 flex items-center justify-center shadow-xs">
                    <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-700 -rotate-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 3.5c-4.5 0-8.5 3-10 7.5-.5 1.5-.7 3.2-.7 5 0 .7.6 1.3 1.3 3.5 0 7-1.5 9.4-4 2.5-2.5 3.5-6 3.5-9.3 0-.3-.2-.5-.5-.5z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl custom-shadow overflow-hidden border border-slate-100">

                {/* Card Top Brand Bar */}
                <div className="bg-[#074728] px-6 py-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3L2 8v2h20V8L12 3zm-7 7v9h2v-9H5zm4 0v9h2v-9H9zm6 0v9h2v-9h-2zm4 0v9h2v-9h-2zM2 20v2h20v-2H2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight leading-tight">Kisan Setu</h3>
                      <p className="text-[9px] font-semibold text-emerald-100 tracking-wider uppercase leading-none">
                        Govt. of Maharashtra
                      </p>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-white/15 border border-white/20 text-[10px] font-bold tracking-wider uppercase text-emerald-100">
                    e-Gov Portal
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 sm:p-8">
                  {step === 1 ? (
                    <>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
                        {language === 'mr' ? 'मंडी प्रवेशासाठी लॉगिन करा' : language === 'hi' ? 'मंडी प्रवेश के लिए लॉगिन करें' : 'Login to Access Mandi'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1.5 mb-5 leading-relaxed">
                        {language === 'mr'
                          ? 'पुढे जाण्यासाठी आपला नोंदणीकृत मोबाइल किंवा आधार क्रमांक प्रविष्ट करा.'
                          : language === 'hi'
                          ? 'आगे बढ़ने के लिए अपना पंजीकृत मोबाइल या आधार नंबर दर्ज करें।'
                          : 'Enter your registered mobile or Aadhaar number to proceed.'}
                      </p>

                      {/* Quick Role Selection Chips */}
                      <div className="mb-4">
                        <label className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                          Quick Demo Accounts:
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {Object.entries(CREDENTIAL_MAP).map(([phone, acc]) => {
                            const isSelected = identifier === phone;
                            return (
                              <button
                                key={phone}
                                id={`preset-${acc.role}`}
                                type="button"
                                onClick={() => handleSelectPreset(phone)}
                                className={`text-[11px] py-1.5 px-2 rounded-lg border font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600'
                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span>{acc.icon}</span>
                                <span>{acc.badge}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Error display */}
                      {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                          {error}
                        </div>
                      )}

                      {/* Step 1 Form */}
                      <form data-purpose="otp-login-form" method="POST" onSubmit={handleGenerateOtp}>
                        <label
                          className="block text-[10px] font-extrabold tracking-wider text-slate-700 uppercase mb-2"
                          htmlFor="phone-or-aadhaar"
                        >
                          Mobile / Aadhaar Number
                        </label>
                        <div className="relative flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all duration-200">
                          <div className="pl-4 pr-1 text-sm font-semibold text-slate-500 select-none">+91</div>
                          <input
                            className="w-full py-3.5 pr-4 pl-1 text-sm font-bold text-slate-800 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-slate-400 tracking-wide"
                            id="phone-or-aadhaar"
                            inputMode="numeric"
                            name="identifier"
                            pattern="[0-9]*"
                            placeholder="Enter 10-digit number"
                            required
                            type="text"
                            value={identifier}
                            onChange={handleIdentifierChange}
                          />
                        </div>

                        <button
                          id="submit-generate-otp"
                          disabled={loading}
                          className="w-full mt-4 py-3.5 px-6 rounded-xl bg-[#0c5c36] hover:bg-[#094d2c] active:bg-[#063b21] text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition duration-150 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                          type="submit"
                        >
                          <span>{loading ? 'Sending OTP...' : 'Generate OTP'}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      {/* Step 2: OTP Verification */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wide">
                          Step 2 of 2
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                        >
                          &larr; Change Number
                        </button>
                      </div>

                      <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
                        Enter Verification Code
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                        OTP sent to <span className="font-bold text-slate-800">+91 {identifier}</span>
                      </p>

                      {/* Demo OTP Helper */}
                      <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                        <span>Demo OTP is: <strong>123456</strong></span>
                        <button
                          id="btn-autofill-otp"
                          type="button"
                          onClick={() => setOtp('123456')}
                          className="px-2 py-1 bg-amber-200/70 hover:bg-amber-300 text-amber-900 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
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
                          6-Digit OTP Code
                        </label>
                        <div className="relative flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all duration-200">
                          <input
                            className="w-full py-3.5 px-4 text-center text-lg font-black text-slate-900 tracking-[0.4em] bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-slate-300"
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
                          className="w-full mt-4 py-3.5 px-6 rounded-xl bg-[#0c5c36] hover:bg-[#094d2c] active:bg-[#063b21] text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition duration-150 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                          type="submit"
                        >
                          <span>{loading ? 'Verifying...' : 'Verify & Enter Mandi'}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </form>
                    </>
                  )}

                  {/* Security & Verification Badges */}
                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          clipRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          fillRule="evenodd"
                        />
                      </svg>
                      <span>256-bit AES Encryption</span>
                    </div>
                    <div className="h-3 w-[1px] bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-700" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 4h18v16H3V4zm2 2v12h14V6H5zm3 3h3v3H8V9zm0 5h3v1H8v-1zm5-5h3v1h-3V9zm0 3h3v3h-3v-3z" />
                      </svg>
                      <span>UIDAI e-KYC Verified</span>
                    </div>
                  </div>

                  {/* Working Navigation Links */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-semibold text-slate-500">
                    <Link
                      href="/farmer/guidelines"
                      className="text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                    >
                      Mandi Guidelines &rarr;
                    </Link>
                    <span className="text-slate-300">•</span>
                    <Link
                      href="/demo/ivr"
                      className="text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                    >
                      IVR Voice Demo &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Mandi Trust & Stats Highlights Strip */}
            <div className="w-full max-w-[480px] mx-auto grid grid-cols-3 gap-2 text-center select-none mt-4 relative z-10" data-purpose="mandi-trust-strip">
              <div className="bg-white/80 backdrop-blur-xs border border-emerald-900/8 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="text-[11px] font-black text-[#075330]">०१२३+</div>
                <div className="text-[10px] text-slate-500 font-semibold tracking-tight">APMC Mandis</div>
              </div>
              <div className="bg-white/80 backdrop-blur-xs border border-emerald-900/8 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="text-[11px] font-black text-[#075330]">MSP Direct</div>
                <div className="text-[10px] text-slate-500 font-semibold tracking-tight">Direct Payout</div>
              </div>
              <div className="bg-white/80 backdrop-blur-xs border border-emerald-900/8 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="text-[11px] font-black text-[#075330]">24×7</div>
                <div className="text-[10px] text-slate-500 font-semibold tracking-tight">Helpline</div>
              </div>
            </div>

            {/* Official Government Footer */}
            <footer className="text-center pt-3 pb-1 relative z-10" data-purpose="footer-links">
              <p className="text-[11px] font-bold text-slate-600 tracking-tight">
                महाराष्ट्र राज्य कृषी पणन मंडळ (MSAMB)
              </p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                Digital Agriculture • Transparent Markets • Prosperous Farmers
              </p>
              <div className="w-10 h-1 bg-[#0c5c36] rounded-full mx-auto mt-2 opacity-70" />
            </footer>
          </section>
          {/* END: RightAuthSection */}

        </main>
      </div>
    </>
  );
}
