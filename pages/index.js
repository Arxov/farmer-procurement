import { SignIn, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import { useSupabaseClient } from '../lib/supabaseClient';

export default function Home() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Check if user has a profile in supabase
      supabase.from('profiles').select('role').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.role) {
            if (data.role === 'farmer') router.push('/farmer/dashboard');
            else if (data.role === 'officer') router.push('/officer/dashboard');
            else if (data.role === 'admin') router.push('/admin/dashboard');
            else router.push('/register');
          } else {
            router.push('/register');
          }
        }).catch(err => {
          console.error(err);
          router.push('/register');
        });
    }
  }, [isLoaded, isSignedIn, user, router, supabase]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Head>
        <title>Kisan Setu | Login</title>
      </Head>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold text-emerald-800">Kisan Setu</h1>
        <p className="text-slate-600">National Digital Agriculture Platform</p>
      </div>
      <SignIn routing="hash" />
    </div>
  );
}
