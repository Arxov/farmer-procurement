import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';

export default function AdminCommodities() {
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', msp_rate_per_quintal: '', season: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const load = async () => {
    const token = await getToken();
    if (!token) { router.push('/'); return; }
    const res = await fetch('/api/admin/commodities', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) { router.push('/'); return; }
    if (res.ok) {
      const { commodities: c } = await res.json();
      setCommodities(c || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({ name: item.name, msp_rate_per_quintal: item.msp_rate_per_quintal, season: item.season || '' });
    setError('');
  };

  const startNew = () => {
    setEditing('new');
    setForm({ name: '', msp_rate_per_quintal: '', season: '' });
    setError('');
  };

  const cancelEdit = () => { setEditing(null); setError(''); };

  const save = async () => {
    if (!form.name.trim() || !form.msp_rate_per_quintal) { setError('Name and MSP rate are required'); return; }
    setSaving(true);
    setError('');
    const token = await getToken();
    const isNew = editing === 'new';

    const res = await fetch('/api/admin/commodities', {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(isNew ? form : { id: editing, ...form }),
    });

    setSaving(false);
    if (!res.ok) { const r = await res.json(); setError(r.error || 'Failed'); return; }
    setEditing(null);
    load();
  };

  const deleteCommodity = async (id) => {
    if (!confirm('Delete this commodity? Existing bookings using it will be unaffected.')) return;
    const token = await getToken();
    await fetch('/api/admin/commodities', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>{t('loading')}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/admin/dashboard" className="text-green-700 text-sm">&larr; Dashboard</Link>
            <h1 className="text-xl font-bold mt-1">Commodity & MSP Management</h1>
          </div>
          <button onClick={startNew} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Commodity</button>
        </div>

        {/* Add/Edit Form */}
        {editing && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-6 mb-6">
            <h2 className="font-bold mb-3">{editing === 'new' ? 'Add New Commodity' : 'Edit Commodity'}</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Commodity Name *</label>
                <input className="w-full border rounded-lg px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wheat" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">MSP Rate (₹/quintal) *</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2" value={form.msp_rate_per_quintal} onChange={e => setForm({ ...form, msp_rate_per_quintal: e.target.value })} placeholder="e.g. 2275" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Season</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.season} onChange={e => setForm({ ...form, season: e.target.value })}>
                  <option value="">Select</option>
                  <option value="kharif">Kharif</option>
                  <option value="rabi">Rabi</option>
                  <option value="zaid">Zaid</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={cancelEdit} className="bg-gray-200 text-gray-700 dark:text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 dark:text-neutral-400 dark:text-neutral-400">
                <th className="p-3">Commodity</th>
                <th className="p-3">MSP Rate (₹/q)</th>
                <th className="p-3">Season</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commodities.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 dark:bg-neutral-900">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">₹{Number(c.msp_rate_per_quintal).toLocaleString()}</td>
                  <td className="p-3 capitalize">{c.season || '-'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(c)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button>
                      <button onClick={() => deleteCommodity(c.id)} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {commodities.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500 dark:text-neutral-400 dark:text-neutral-400">No commodities. Click "Add Commodity" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
