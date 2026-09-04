// Notification service - demo mode logs to the server console.
// Replace the marked block with a real SMS/WhatsApp provider call for production;
// nothing else in the app needs to change since every caller just POSTs here.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Only allow internal server-to-server calls authenticated with the service role key
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  const { bookingId, message } = req.body;

  console.log(`[NOTIFY] Booking ${bookingId}: ${message}`);

  // --- Swap this in for real SMS delivery (example using a generic provider) ---
  // await fetch('https://www.fast2sms.com/dev/bulkV2', {
  //   method: 'POST',
  //   headers: { authorization: process.env.SMS_API_KEY, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ route: 'q', message, numbers: farmerPhoneNumber }),
  // });
  //
  // --- Or for WhatsApp via the WhatsApp Cloud API ---
  // await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ messaging_product: 'whatsapp', to: farmerPhoneNumber, type: 'text', text: { body: message } }),
  // });

  return res.status(200).json({ sent: true, mode: 'demo-log' });
}
