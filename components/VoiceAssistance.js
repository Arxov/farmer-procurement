import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../lib/i18n';

export default function VoiceAssistance({ profile, bookings = [], commodities = [] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { language, t } = useLanguage();

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

    const name = profile?.full_name || (language === 'mr' ? 'शेतकरी मित्र' : language === 'hi' ? 'किसान भाई' : 'Farmer');
    const activeBookings = bookings.filter(b => ['booked', 'checked_in'].includes(b.status));
    const activeQueue = activeBookings.find(b => b.queue_entries?.[0]);

    let text = '';
    let voiceLang = 'en-IN';

    if (language === 'mr') {
      voiceLang = 'mr-IN';
      text = `नमस्कार ${name} जी. किसान खरेदी पोर्टलमध्ये आपले स्वागत आहे. `;

      if (activeBookings.length > 0) {
        text += `तुमच्याकडे ${activeBookings.length} सक्रिय खरेदी नोंदणी आहेत. `;
      } else {
        text += `सध्या तुमची कोणतीही सक्रिय नोंदणी नाही. `;
      }

      if (activeQueue && activeQueue.queue_entries?.[0]) {
        const pos = activeQueue.queue_entries[0].queue_position;
        const wait = activeQueue.queue_entries[0].estimated_wait_minutes;
        text += `मंडी रांगेत तुमचा टोकन नंबर ${pos} आहे. अंदाजे प्रतीक्षा वेळ ${wait} मिनिटे आहे. `;
      }

      if (commodities.length > 0) {
        const top = commodities[0];
        text += `आजचा सरकारी हमीभाव: ${top.name} चा दर ${top.msp_rate_per_quintal} रुपये प्रति क्विंटल आहे. `;
      }

      text += 'धन्यवाद आणि आपला दिवस चांगला जावो.';
    } else if (language === 'hi') {
      voiceLang = 'hi-IN';
      text = `नमस्ते ${name} जी। किसान खरीद मंच में आपका स्वागत है। `;

      if (activeBookings.length > 0) {
        text += `आपके पास ${activeBookings.length} सक्रिय स्लॉट हैं। `;
      } else {
        text += `वर्तमान में आपका कोई सक्रिय स्लॉट नहीं है। `;
      }

      if (activeQueue && activeQueue.queue_entries?.[0]) {
        const pos = activeQueue.queue_entries[0].queue_position;
        const wait = activeQueue.queue_entries[0].estimated_wait_minutes;
        text += `मंडी कतार में आपका टोकन नंबर ${pos} है। अनुमानित समय ${wait} मिनट है। `;
      }

      if (commodities.length > 0) {
        const top = commodities[0];
        text += `आज का शीर्ष एमएसपी भाव: ${top.name} का ${top.msp_rate_per_quintal} रुपये प्रति क्विंटल है। `;
      }

      text += 'धन्यवाद और शुभ दिन।';
    } else {
      voiceLang = 'en-IN';
      text = `Hello ${name}. Welcome to Kisan Setu Procurement Platform. `;

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
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={toggleSpeech}
      className={`min-h-[44px] px-3 py-2 rounded-2xl border transition-all shadow-2xs flex items-center gap-1.5 font-display text-xs font-bold ${
        isPlaying
          ? 'bg-amber-500 text-white animate-pulse ring-2 ring-amber-200 border-amber-600'
          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
      }`}
      title={isPlaying ? t('stopAudio', 'Stop Audio') : t('listen', 'Listen to Summary')}
      aria-label={isPlaying ? t('stopAudio', 'Stop Audio') : t('listen', 'Listen to Summary')}
    >
      {isPlaying ? (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{language === 'mr' ? 'थांबवा' : language === 'hi' ? 'रोकें' : 'Stop'}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <span className="hidden sm:inline">{language === 'mr' ? 'ऐका' : language === 'hi' ? 'सुनें' : 'Listen'}</span>
        </>
      )}
    </motion.button>
  );
}
