import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// GET: all commodities | POST: create | PATCH: update | DELETE: delete
export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' });

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userData.user.id).single();
  if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('commodities').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ commodities: data || [] });
  }

  if (req.method === 'POST') {
    const { name, msp_rate_per_quintal, season } = req.body;
    if (!name || !msp_rate_per_quintal) return res.status(400).json({ error: 'Name and MSP rate are required' });

    const { data, error } = await supabaseAdmin.from('commodities').insert({
      name, msp_rate_per_quintal: parseFloat(msp_rate_per_quintal), season: season || null,
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ commodity: data });
  }

  if (req.method === 'PATCH') {
    const { id, name, msp_rate_per_quintal, season } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const updateObj = {};
    if (name !== undefined) updateObj.name = name;
    if (msp_rate_per_quintal !== undefined) updateObj.msp_rate_per_quintal = parseFloat(msp_rate_per_quintal);
    if (season !== undefined) updateObj.season = season;

    const { data, error } = await supabaseAdmin.from('commodities').update(updateObj).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ commodity: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabaseAdmin.from('commodities').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
