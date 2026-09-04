// Direct notification utility to avoid self-referencing HTTP fetch deadlocks in Next.js
export async function sendNotification({ bookingId, message }) {
  try {
    console.log(`[NOTIFY] Booking ${bookingId}: ${message}`);
    // For production SMS / WhatsApp delivery (e.g. Fast2SMS / Twilio / WhatsApp Cloud API),
    // execute provider request directly here without calling internal HTTP endpoints.
  } catch (err) {
    console.error('[NOTIFY ERROR]', err);
  }
}
