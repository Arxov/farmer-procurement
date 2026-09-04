import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// GET: all centres | POST: create | PATCH: update | DELETE: delete
export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userData.user.id).single();
  if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('centres').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ centres: data || [] });
  }

  if (req.method === 'POST') {
    const { name, district, state, daily_capacity } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data, error } = await supabaseAdmin.from('centres').insert({
      name, district: district || null, state: state || 'Maharashtra', daily_capacity: daily_capacity || 100,
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ centre: data });
  }

  if (req.method === 'PATCH') {
    const { id, name, district, state, daily_capacity } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const updateObj = {};
    if (name !== undefined) updateObj.name = name;
    if (district !== undefined) updateObj.district = district;
    if (state !== undefined) updateObj.state = state;
    if (daily_capacity !== undefined) updateObj.daily_capacity = parseInt(daily_capacity);

    const { data, error } = await supabaseAdmin.from('centres').update(updateObj).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ centre: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabaseAdmin.from('centres').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
