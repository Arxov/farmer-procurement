import { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth, AuthenticatedNextApiRequest } from '../../../lib/apiAuth';
import { getPagination, paginatedResponse } from '../../../lib/pagination';
import { UpdatePaymentStatusSchema, validateBody } from '../../../lib/validations';

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { page, limit, offset } = getPagination(req.query);

    const { data, error, count } = await supabaseAdmin
      .from('payments')
      .select('*, bookings(slot_date, farmer_id, profiles(full_name, phone), centres(name), commodities(name, msp_rate_per_quintal))', { count: 'exact' })
      .order('booking_id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(paginatedResponse(data || [], count || 0, { page, limit, offset }));
  }

  if (req.method === 'PATCH') {
    const validation = validateBody(UpdatePaymentStatusSchema, req.body);
    if (validation.success === false) {
      return res.status(400).json({ error: (validation as any).error });
    }

    const { id, status } = (validation as any).data;
    const updateObj: any = { status };
    
    if (status === 'paid') {
      updateObj.paid_at = new Date().toISOString();
      updateObj.utr_reference = `UTR${Date.now()}${Math.floor(Math.random() * 10000)}`;
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (status === 'paid' && data) {
      await supabaseAdmin.from('bookings').update({ status: 'paid' }).eq('id', data.booking_id);
    }

    return res.status(200).json({ payment: data });
  }

  return res.status(405).end();
}

export default withAuth(handler, { roles: ['admin'] });
