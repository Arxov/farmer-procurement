import { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';

export default function VoiceAssistance({ profile, bookings = [], commodities = [] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    }
  }, []);

  const toggleSpeech = () => {
    if (!isSupported) {
      alert('Voice assistance is not supported in this browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();

    const name = profile?.full_name || (language === 'hi' ? 'à¤•à¤¿à¤¸à¤¾à¤¨ à¤­à¤¾à¤ˆ' : 'Farmer');
    const activeBookings = bookings.filter(b => ['booked', 'checked_in'].includes(b.status));
    const activeQueue = bookings.find(b => b.queue_entries?.[0]);

    let text = '';
    let voiceLang = 'hi-IN';

    if (language === 'hi') {
      voiceLang = 'hi-IN';
      text = `à¤¨à¤®à¤¸à¥à¤¤à¥‡ ${name} à¤œà¥€à¥¤ à¤•à¤¿à¤¸à¤¾à¤¨ à¤–à¤°à¥€à¤¦ à¤®à¤‚à¤š à¤®à¥‡à¤‚ à¤†à¤ªà¤•à¤¾ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆà¥¤ `;

      if (activeBookings.length > 0) {
        text += `à¤†à¤ªà¤•à¥‡ à¤ªà¤¾à¤¸ ${activeBookings.length} à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤¸à¥à¤²à¥‰à¤Ÿ à¤¹à¥ˆà¤‚à¥¤ `;
      } else {
        text += `à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ à¤®à¥‡à¤‚ à¤†à¤ªà¤•à¤¾ à¤•à¥‹à¤ˆ à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤¸à¥à¤²à¥‰à¤Ÿ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤ `;
      }

      if (activeQueue && activeQueue.queue_entries?.[0]) {
        const pos = activeQueue.queue_entries[0].queue_position;
        const wait = activeQueue.queue_entries[0].estimated_wait_minutes;
        text += `à¤®à¤‚à¤¡à¥€ à¤•à¤¤à¤¾à¤° à¤®à¥‡à¤‚ à¤†à¤ªà¤•à¤¾ à¤¨à¤‚à¤¬à¤° ${pos} à¤¹à¥ˆà¥¤ à¤…à¤¨à¥à¤®à¤¾à¤¨à¤¿à¤¤ à¤¸à¤®à¤¯ ${wait} à¤®à¤¿à¤¨à¤Ÿ à¤¹à¥ˆà¥¤ `;
      }

      if (commodities.length > 0) {
        const top = commodities[0];
        text += `à¤†à¤œ à¤•à¤¾ à¤¶à¥€à¤°à¥à¤· à¤à¤®à¤à¤¸à¤ªà¥€ à¤­à¤¾à¤µ: ${top.name} à¤•à¤¾ ${top.msp_rate_per_quintal} à¤°à¥à¤ªà¤¯à¥‡ à¤ªà¥à¤°à¤¤à¤¿ à¤•à¥à¤µà¤¿à¤‚à¤Ÿà¤² à¤¹à¥ˆà¥¤ `;
      }

      text += 'à¤§à¤¨à¥à¤¯à¤µà¤¾à¤¦ à¤”à¤° à¤¶à¥à¤­ à¤¦à¤¿à¤¨à¥¤';
    } else {
      voiceLang = 'en-IN';
      text = `Hello ${name}. Welcome to Central Farmer Procurement Platform. `;

      if (activeBookings.length > 0) {
        text += `You have ${activeBookings.length} active procurement slot${activeBookings.length > 1 ? 's' : ''}. `;
      } else {
        text += 'You have no active appointments right now. ';
      }

      if (activeQueue && activeQueue.queue_entries?.[0]) {
        const pos = activeQueue.queue_entries[0].queue_position;
        const wait = activeQueue.queue_entries[0].estimated_wait_minutes;
        text += `Your live queue token is number ${pos}, with approximately ${wait} minutes wait time. `;
      }

      if (commodities.length > 0) {
        const top = commodities[0];
        text += `Today's top Govt MSP rate is ${top.name} at rupees ${top.msp_rate_per_quintal} per quintal. `;
      }

      text += 'Have a productive day.';
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.92;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleSpeech}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs ${
        isPlaying
          ? 'bg-amber-500 text-white animate-pulse ring-2 ring-amber-200'
          : 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/60'
      }`}
      title="Listen to dashboard overview in your language"
    >
      <span>{isPlaying ? 'â¹ï¸' : 'ðŸ”Š'}</span>
      <span>{isPlaying ? (language === 'hi' ? 'à¤°à¥‹à¤•à¥‡à¤‚' : 'Stop Audio') : (language === 'hi' ? 'à¤¬à¥‹à¤²à¤•à¤° à¤¸à¥à¤¨à¥‡à¤‚' : 'Listen')}</span>
    </button>
  );
}

