import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';

// First-time profile setup or profile edit
export default function Register() {
  const [fullName, setFullName] = useState('');
  const [village, setVillage] = useState('');
  const [land, setLand] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

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
        setError('Please enter a valid land holding value.');
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
      <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
        <p className="text-gray-500 dark:text-neutral-400 dark:text-neutral-400">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <div className="bg-white dark:bg-neutral-800 shadow-lg rounded-xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-green-800 mb-4">{t('completeProfile')}</h1>
        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('fullName')}</label>
        <input className="w-full border rounded-lg px-3 py-2 mb-3" placeholder={t('fullName')} value={fullName} onChange={e => setFullName(e.target.value)} />
        
        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('village')}</label>
        <input className="w-full border rounded-lg px-3 py-2 mb-3" placeholder={t('village')} value={village} onChange={e => setVillage(e.target.value)} />
        
        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">{t('landHolding')}</label>
        <input type="number" step="0.1" min="0" className="w-full border rounded-lg px-3 py-2 mb-4" placeholder={t('landHolding')} value={land} onChange={e => setLand(e.target.value)} />
        
        <button onClick={submit} disabled={loading} className="w-full bg-green-700 text-white rounded-lg py-2 font-medium disabled:opacity-50">
          {loading ? t('saving') : t('saveAndContinue')}
        </button>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>
    </div>
  );
}
