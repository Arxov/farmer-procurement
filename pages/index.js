import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function DemoLogin() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If already logged in, redirect based on role
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.role) {
              if (data.role === 'farmer') router.push('/farmer/dashboard');
              if (data.role === 'officer') router.push('/officer/dashboard');
              if (data.role === 'admin') router.push('/admin/dashboard');
            }
          });
      }
    });
  }, []);

  const handleDemoLogin = async (role, email) => {
    setLoadingRole(role);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'password123',
      });
      if (error) throw error;
      
      if (role === 'farmer') router.push('/farmer/dashboard');
      if (role === 'officer') router.push('/officer/dashboard');
      if (role === 'admin') router.push('/admin/dashboard');
    } catch (err) {
      setError(err.message);
      setLoadingRole(null);
    }
  };

  const demoAccounts = [
    {
      id: 'farmer',
      email: 'farmer@demo.com',
      name: 'Ramesh Patil',
      roleTitle: 'Farmer',
      badge: 'Registered Progressive Farmer',
      location: 'Baramati Cluster, Pune',
      uid: 'ID: 9822100011',
      icon: '🌱',
      btnLabel: 'Enter Portal as Ramesh'
    },
    {
      id: 'officer',
      email: 'officer@demo.com',
      name: 'APMC Officer Desk',
      roleTitle: 'Quality Inspector',
      badge: 'Verified Mandi Official (MSAMB)',
      location: 'Baramati Krushi APMC',
      uid: 'ID: 9422088990',
      icon: '📋',
      btnLabel: 'Enter Portal as Officer'
    },
    {
      id: 'admin',
      email: 'admin@demo.com',
      name: 'Kisan Setu National Admin',
      roleTitle: 'Admin',
      badge: 'State Portal & Nodal Authority',
      location: 'State Agricultural Operations Center',
      uid: 'ID: 0202555123',
      icon: '🛡️',
      btnLabel: 'Enter Portal as Admin'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Kisan Setu | Demo Login Hub</title>
      </Head>

      <div className="text-center max-w-3xl mb-12 mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
          Kisan Setu
        </h1>
        <p className="text-sm md:text-base text-slate-500 mb-6 font-medium px-4">
          National Digital Agriculture Platform: Direct Mandi Procurement & Settlements
        </p>
        
        <div className="flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Enterprise Production v3.0
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Zero-Trust JWT Authentication
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium w-full max-w-4xl text-center">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mb-12">
        {demoAccounts.map(account => (
          <div key={account.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-shadow flex flex-col h-full">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-2xl border border-emerald-100 shrink-0">
                {account.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{account.name}</h2>
                <p className="text-sm font-semibold text-emerald-700">{account.roleTitle}</p>
              </div>
            </div>

            <div className="flex-1 space-y-1 mb-8 text-sm">
              <p className="text-slate-600 font-medium">{account.badge}</p>
              <p className="text-slate-500">{account.location}</p>
              <p className="text-slate-400 text-xs mt-2">{account.uid}</p>
            </div>

            <button
              onClick={() => handleDemoLogin(account.id, account.email)}
              disabled={loadingRole !== null}
              className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              {loadingRole === account.id ? 'Authenticating...' : account.btnLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
