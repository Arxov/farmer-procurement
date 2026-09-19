import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/apiAuth';

// GET: all centres | POST: create | PATCH: update | DELETE: delete
async function handler(req, res) {
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
    if (error) {
      if (error.code === '23503' || error.message.includes('foreign key constraint')) {
        return res.status(400).json({ error: 'Cannot delete centre: it has existing bookings associated with it.' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default withAuth(handler, { roles: ['admin'] });
