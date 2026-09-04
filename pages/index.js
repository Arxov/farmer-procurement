import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';

export default function Home() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMode, setLoginMode] = useState('phone'); // 'phone' or 'aadhaar'
  const router = useRouter();
  const { t } = useLanguage();

  const sendOtp = async () => {
    if (loginMode === 'aadhaar') {
      // Aadhaar flow: validate 12-digit number, convert to phone for demo
      const cleaned = aadhaar.replace(/\s/g, '');
      if (!/^\d{12}$/.test(cleaned)) {
        setError('Please enter a valid 12-digit Aadhaar number');
        return;
      }
      // In production, this would call UIDAI API for eKYC.
      // For hackathon demo, we simulate by asking for the linked mobile number.
      setOtpSent(true);
      setError('');
      return;
    }

    if (!phone.trim()) {
      setError('Please enter a valid mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({ phone });
      setLoading(false);
      if (sendError) { setError(sendError.message); return; }
      setOtpSent(true);
    } catch (err) {
      setLoading(false);
      setError('Network error: Could not reach the server.');
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    // For Aadhaar mode, we also need the phone
    const loginPhone = loginMode === 'aadhaar' ? phone : phone;
    if (!loginPhone.trim()) {
      setError('Please enter your linked mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // If Aadhaar mode and OTP not yet sent via Supabase, send it now
      if (loginMode === 'aadhaar' && !loading) {
        const { error: sendError } = await supabase.auth.signInWithOtp({ phone: loginPhone });
        if (sendError) { setError(sendError.message); setLoading(false); return; }
        setLoading(false);
        setError('OTP sent to your Aadhaar-linked mobile. Enter the code below.');
        return;
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone: loginPhone, token: otp, type: 'sms' });
      setLoading(false);
      if (verifyError) { setError(verifyError.message); return; }

      if (!data?.user) {
        setError('Verification succeeded but no user was returned. Please try again.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile) { router.push('/register'); return; }
      if (profile.role === 'officer') router.push('/officer/dashboard');
      else if (profile.role === 'admin') router.push('/admin/dashboard');
      else router.push('/farmer/dashboard');
    } catch (err) {
      setLoading(false);
      setError('Network error: Could not reach the server.');
    }
  };

  // Aadhaar step tracking
  const [aadhaarStep, setAadhaarStep] = useState(0); // 0=enter aadhaar, 1=enter phone, 2=enter otp
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);

  const handleAadhaarNext = async () => {
    if (aadhaarStep === 0) {
      const cleaned = aadhaar.replace(/\s/g, '');
      if (!/^\d{12}$/.test(cleaned)) {
        setError('Please enter a valid 12-digit Aadhaar number');
        return;
      }
      setError('');
      setIsVerifyingAadhaar(true);

      // Simulate UIDAI eKYC protocol handshake
      setTimeout(() => {
        setIsVerifyingAadhaar(false);
        setAadhaarStep(1);
      }, 1600);
    } else if (aadhaarStep === 1) {
      if (!phone.trim()) {
        setError('Please enter your Aadhaar-linked mobile number');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const { error: sendError } = await supabase.auth.signInWithOtp({ phone });
        setLoading(false);
        if (sendError) { setError(sendError.message); return; }
        setAadhaarStep(2);
      } catch (err) {
        setLoading(false);
        setError('Network error: Could not reach the server.');
      }
    } else if (aadhaarStep === 2) {
      await verifyOtp();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col justify-between">
      {/* Official Government Tricolor Top Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-green-600 shadow-sm" />

      {/* Top Header Bar */}
      <header className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 px-4 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl font-bold text-amber-700">
              ðŸ›ï¸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-green-800 bg-green-100 px-2 py-0.5 rounded">
                  Govt. of India
                </span>
                <span className="text-xs text-gray-400 hidden sm:inline">Ministry of Consumer Affairs & Food</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-neutral-100 leading-tight">
                National Farmer Procurement Platform (CFPP)
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/ivr-demo"
              className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs"
            >
              <span>ðŸŽ™ï¸</span>
              <span>IVR Voice Demo</span>
            </Link>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Toll-Free Kisan Helpline</p>
              <p className="text-xs font-bold text-green-800">ðŸ“ž 1800-180-1551</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Landing & Login Section */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col lg:flex-row items-center gap-10 justify-center">
        {/* Left Hero Content */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            âœ¨ Smart Slot Booking & Live Queue Token Engine
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-neutral-100 tracking-tight leading-tight">
            Fair MSP, <span className="text-green-700">Zero Wait Time</span> at Mandis.
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-neutral-400 dark:text-neutral-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Eliminate long mandi lines with real-time token scheduling, direct bank transfers with milestone tracking, and seamless quality grading for all farmers.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left max-w-lg mx-auto lg:mx-0">
            <div className="flex items-start gap-2.5 bg-white dark:bg-neutral-800 p-3 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-xs">
              <span className="text-xl">âš–ï¸</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Direct MSP Assurance</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Verified weights and transparent grade-based pricing.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-white dark:bg-neutral-800 p-3 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-xs">
              <span className="text-xl">â±ï¸</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Smart Token Scheduling</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Real-time queue tracker with "Leave Now" alerts.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-white dark:bg-neutral-800 p-3 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-xs">
              <span className="text-xl">ðŸ’³</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Direct Bank Milestones</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Bank transfer tracking with automated UTR generation.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-white dark:bg-neutral-800 p-3 rounded-xl border border-gray-100 dark:border-neutral-700 shadow-xs">
              <span className="text-xl">ðŸ“¡</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Offline-Ready Sync</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Book even without internet; auto-syncs on reconnect.</p>
              </div>
            </div>
          </div>

          {/* Live Trust Metrics */}
          <div className="pt-4 border-t border-gray-200 dark:border-neutral-700 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
            <div>
              <p className="text-2xl font-bold text-green-700">100%</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">MSP Direct Payout</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">&lt; 30m</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">Avg. Mandi Wait</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">Multi-State</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400">All Major APMCs</p>
            </div>
          </div>
        </div>

        {/* Right Authentication Box */}
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-neutral-800 shadow-xl rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-neutral-700 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-700 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
              Secure Citizen & Staff Login
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100 mt-2 mb-1">{t('appName')}</h2>
            <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mb-5">{t('appTagline')}</p>

            {/* Login Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-neutral-800 rounded-xl p-1 mb-5">
              <button
                onClick={() => { setLoginMode('phone'); setError(''); setOtpSent(false); setAadhaarStep(0); }}
                className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${loginMode === 'phone' ? 'bg-white dark:bg-neutral-800 shadow-sm text-green-800' : 'text-gray-500 dark:text-neutral-400 dark:text-neutral-400 hover:text-gray-800 dark:text-neutral-200'}`}
              >
                ðŸ“± {t('mobileNumber')}
              </button>
              <button
                onClick={() => { setLoginMode('aadhaar'); setError(''); setOtpSent(false); setAadhaarStep(0); }}
                className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${loginMode === 'aadhaar' ? 'bg-white dark:bg-neutral-800 shadow-sm text-green-800' : 'text-gray-500 dark:text-neutral-400 dark:text-neutral-400 hover:text-gray-800 dark:text-neutral-200'}`}
              >
                ðŸªª Aadhaar eKYC
              </button>
            </div>

            {/* Phone Login Flow */}
            {loginMode === 'phone' && (
              <>
                {!otpSent ? (
                  <>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">{t('mobileNumber')}</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 mb-4 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <button onClick={sendOtp} disabled={loading} className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-sm shadow-sm transition disabled:opacity-50">
                      {loading ? t('sending') : `${t('sendOtp')} â†’`}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 text-green-800 p-2.5 rounded-lg mb-3 text-xs">
                      OTP sent to <strong>{phone}</strong>
                    </div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">{t('enterOtp')}</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 mb-4 text-sm tracking-widest text-center font-mono focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <button onClick={verifyOtp} disabled={loading} className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-sm shadow-sm transition disabled:opacity-50">
                      {loading ? t('verifying') : t('verifyAndContinue')}
                    </button>
                  </>
                )}
              </>
            )}

            {/* Aadhaar Login Flow */}
            {loginMode === 'aadhaar' && (
              <>
                {aadhaarStep === 0 && (
                  <>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">Aadhaar Number</label>
                    <input
                      type="text"
                      value={aadhaar}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d\s]/g, '');
                        if (v.replace(/\s/g, '').length <= 12) setAadhaar(v);
                      }}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 mb-2 text-sm tracking-widest text-center font-mono focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mb-4">Verified securely via UIDAI eKYC protocol</p>
                    <button onClick={handleAadhaarNext} className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-sm shadow-sm transition">
                      Verify Aadhaar â†’
                    </button>
                  </>
                )}

                {aadhaarStep === 1 && (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs">
                      <p className="text-green-800 font-medium">âœ… Aadhaar Validated: {aadhaar}</p>
                    </div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">Aadhaar-Linked Mobile</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 mb-4 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <button onClick={handleAadhaarNext} disabled={loading} className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-sm shadow-sm transition disabled:opacity-50">
                      {loading ? t('sending') : 'Send Aadhaar OTP â†’'}
                    </button>
                  </>
                )}

                {aadhaarStep === 2 && (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs">
                      <p className="text-green-800 font-medium">âœ… Aadhaar: {aadhaar}</p>
                      <p className="text-green-700 mt-0.5">ðŸ“± OTP sent to {phone}</p>
                    </div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">{t('enterOtp')}</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      className="w-full border border-gray-300 dark:border-neutral-600 rounded-xl px-3.5 py-2.5 mb-4 text-sm tracking-widest text-center font-mono focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <button onClick={handleAadhaarNext} disabled={loading} className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-sm shadow-sm transition disabled:opacity-50">
                      {loading ? t('verifying') : t('verifyAndContinue')}
                    </button>
                  </>
                )}
              </>
            )}

            {error && <p className="text-red-600 text-xs mt-3 text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
          </div>

          {/* UIDAI e-KYC Handshake Modal Simulation */}
          {isVerifyingAadhaar && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-gray-100 dark:border-neutral-700 relative overflow-hidden">
                {/* Government Tricolor Top Line */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600" />

                {/* Emblem / Aadhaar Graphic */}
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-50 border-2 border-orange-200 rounded-full flex items-center justify-center text-3xl shadow-inner relative">
                  <span>ðŸ†”</span>
                  <div className="absolute inset-0 rounded-full border-2 border-orange-500 animate-ping opacity-25" />
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-neutral-100">UIDAI e-KYC Authentication</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-1">Connecting to Central Identities Data Repository (CIDR)...</p>

                {/* Progress Scanner Animation */}
                <div className="my-5 p-3 bg-slate-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-xl text-left font-mono text-[11px] space-y-1.5 text-gray-600 dark:text-neutral-400 dark:text-neutral-400">
                  <div className="flex items-center justify-between text-green-700 font-semibold">
                    <span>â–¶ Encrypting 256-bit Token...</span>
                    <span>âœ“ OK</span>
                  </div>
                  <div className="flex items-center justify-between text-green-700 font-semibold">
                    <span>â–¶ Validating Demographic Hash...</span>
                    <span>âœ“ OK</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-700 font-semibold animate-pulse">
                    <span>â–¶ Fetching Linked OTP Gateway...</span>
                    <span>99.2%</span>
                  </div>
                </div>

                <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden mb-2">
                  <div className="bg-green-600 h-2 rounded-full animate-pulse w-4/5" />
                </div>
                <p className="text-[10px] text-gray-400">Compliant with Aadhaar Act (2016) e-KYC Regulations</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="bg-gray-900 text-gray-400 text-xs py-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div>
            <p className="text-gray-300 font-semibold">Central Farmer Procurement Platform (CFPP) â€¢ SIH26032</p>
            <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400 text-[11px] mt-0.5">Developed for Ministry of Consumer Affairs, Food & Public Distribution</p>
          </div>
          <div className="flex gap-4 text-[11px] text-gray-400">
            <span>Direct Benefit Transfer (DBT)</span>
            <span>â€¢</span>
            <span>UIDAI Aadhaar Verified</span>
            <span>â€¢</span>
            <span>e-NAM Interoperable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

