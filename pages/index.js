import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const CREDENTIAL_MAP = {
  '9822100011': { email: 'farmer@demo.com', role: 'farmer' },
  '9422088990': { email: 'officer@demo.com', role: 'officer' },
  '0202555123': { email: 'admin@demo.com', role: 'admin' },
};

export default function IndexPage() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [identifier, setIdentifier] = useState('9822100011');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        if (profile?.role) {
          router.push(`/${profile.role}/dashboard`);
        }
      }
    }
    checkAuth();
  }, [router]);

  const handleGetOtp = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 600);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    const clean = identifier.replace(/\D/g, '');
    const account = CREDENTIAL_MAP[clean] || CREDENTIAL_MAP['9822100011'];
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: 'password123',
      });
      if (!error) router.push(`/${account.role}/dashboard`);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Kisan Setu | The OS for Agriculture</title>
        <style>{`
          body { background-color: #000; color: #fff; margin: 0; }
          .bg-grid {
            background-size: 40px 40px;
            background-image: linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
            mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
          }
        `}</style>
      </Head>

      <div className="min-h-screen flex flex-col relative overflow-hidden font-sans selection:bg-white selection:text-black">
        {/* Vercel-style Background Glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
        <div className="absolute inset-0 bg-grid pointer-events-none" />

        {/* Minimal Navbar */}
        <nav className="w-full h-16 border-b border-white/10 flex items-center justify-between px-6 z-10 backdrop-blur-md bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <span className="text-[10px] font-black text-black">KS</span>
            </div>
            <span className="font-semibold tracking-tight text-white/90">Kisan Setu</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-neutral-400">
            <a href="#" className="hover:text-white transition-colors">Features</a>
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">Enterprise</a>
            <button 
              onClick={() => setShowAuth(true)}
              className="text-white bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-1.5 rounded-full transition-all active:scale-95"
            >
              Sign In
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 -mt-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center max-w-4xl"
          >
            {/* Linear-style Pill */}
            <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-neutral-300">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              Announcing Kisan Setu 2.0 <span className="text-neutral-500 mx-1">|</span> The new standard for APMC
            </div>

            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-500 pb-2">
              Ship produce.<br />Not paperwork.
            </h1>
            
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-10 font-medium leading-relaxed">
              The ruthless, high-performance operating system for modern agriculture. 
              Book mandi slots, verify quality, and get paid in milliseconds. 
              Built for speed. Optimized for conversion.
            </p>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAuth(true)}
                className="group relative inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-full text-sm font-bold tracking-wide hover:bg-neutral-200 transition-all active:scale-95"
              >
                Start Free Trial
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button className="inline-flex items-center justify-center gap-2 bg-transparent text-white px-8 py-4 rounded-full text-sm font-semibold tracking-wide border border-white/20 hover:bg-white/5 transition-all active:scale-95">
                Read the Docs
              </button>
            </div>
          </motion.div>
        </main>

        {/* Ruthless SaaS Auth Modal */}
        <AnimatePresence>
          {showAuth && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative"
              >
                <button 
                  onClick={() => setShowAuth(false)}
                  className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors z-10"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="p-8">
                  <div className="mb-8 text-center">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <span className="text-xs font-black text-black">KS</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome back</h2>
                    <p className="text-sm text-neutral-400">Enter your credentials to access the terminal.</p>
                  </div>

                  {step === 1 ? (
                    <form onSubmit={handleGetOtp} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Mobile Number</label>
                        <input 
                          type="text" 
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                          placeholder="e.g. 9822100011"
                        />
                      </div>
                      
                      {/* Vercel style preset selector */}
                      <div className="flex gap-2 pt-2">
                        {Object.entries(CREDENTIAL_MAP).map(([phone, acc]) => (
                          <button
                            key={phone}
                            type="button"
                            onClick={() => setIdentifier(phone)}
                            className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${identifier === phone ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-neutral-500 hover:text-neutral-300'}`}
                          >
                            {acc.role.charAt(0).toUpperCase() + acc.role.slice(1)}
                          </button>
                        ))}
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold rounded-lg px-4 py-3 mt-4 hover:bg-neutral-200 transition-colors active:scale-95 disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : 'Continue →'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex justify-between">
                          <span>Verification Code</span>
                          <span className="text-emerald-500 cursor-pointer hover:underline" onClick={() => setStep(1)}>Edit</span>
                        </label>
                        <input 
                          type="text" 
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          autoFocus
                          className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono tracking-[0.5em] text-center text-lg"
                          placeholder="••••••"
                        />
                      </div>
                      
                      <div className="text-center pt-1">
                        <button type="button" onClick={() => setOtp('123456')} className="text-xs text-neutral-500 hover:text-white transition-colors">
                          Click to autofill test OTP (123456)
                        </button>
                      </div>

                      <button 
                        type="submit"
                        disabled={loading || otp.length < 6}
                        className="w-full bg-emerald-500 text-black font-bold rounded-lg px-4 py-3 mt-2 hover:bg-emerald-400 transition-colors active:scale-95 disabled:opacity-50"
                      >
                        {loading ? 'Authenticating...' : 'Enter System'}
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
