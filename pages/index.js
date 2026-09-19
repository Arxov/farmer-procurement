import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function MobileOtpLogin() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.role) {
              if (data.role === 'farmer') router.push('/farmer/dashboard');
              if (data.role === 'officer') router.push('/officer/dashboard');
              if (data.role === 'admin') router.push('/admin/dashboard');
            } else {
              router.push('/register');
            }
          });
      }
    });
  }, [router]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: '+91' + phone,
      });
      if (error) throw error;
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { data, error: authError } = await supabase.auth.verifyOtp({
        phone: '+91' + phone,
        token: otp,
        type: 'sms',
      });
      if (authError) throw authError;

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      
      if (!profile) {
        router.push('/register');
      } else if (profile.role === 'farmer') {
        router.push('/farmer/dashboard');
      } else if (profile.role === 'officer') {
        router.push('/officer/dashboard');
      } else if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Kisan Setu | National Digital Agriculture Platform</title>
      </Head>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative">
        <div className="bg-emerald-800 px-6 py-4 flex items-center justify-between border-b-4 border-emerald-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <span className="text-xl">🏛️</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Kisan Setu</h1>
              <p className="text-emerald-200 text-[10px] font-semibold uppercase tracking-wider">Govt. of Maharashtra</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            {step === 1 ? 'Login to Access Mandi' : 'OTP Verification'}
          </h2>
          <p className="text-sm text-slate-500 mb-8 font-medium">
            {step === 1 
              ? 'Enter your registered mobile number to proceed.' 
              : `We have sent a 6-digit secure OTP to +91 ${phone}.`}
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-semibold flex gap-2 items-center">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold">
                    +91
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 10-digit mobile"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-lg"
                    maxLength={10}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Generate OTP</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-center tracking-[0.5em] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-2xl"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Verify & Login</span>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); setError(null); }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                >
                  Change Mobile Number
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
