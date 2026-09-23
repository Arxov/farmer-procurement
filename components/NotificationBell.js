import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../lib/i18n';

export default function NotificationBell({ bookings = [] }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'bulletins' | 'transactions'
  const [mounted, setMounted] = useState(false);
  const [playingId, setPlayingId] = useState(null);

  // Client hydration check for createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load persisted read notifications from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('farmer_read_notifications') || '[]');
      if (Array.isArray(saved)) setReadIds(saved);
    } catch {
      // ignore
    }
  }, []);

  // Listen for open-farmer-notifications event dispatched by in-page alert banners
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-farmer-notifications', handleOpen);
    return () => window.removeEventListener('open-farmer-notifications', handleOpen);
  }, []);

  // Lock body scroll and register escape key while drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen]);

  const persistReadIds = (newIds) => {
    setReadIds(newIds);
    try {
      localStorage.setItem('farmer_read_notifications', JSON.stringify(newIds));
    } catch {
      // ignore
    }
  };

  // Generate notifications dynamically from actual booking & payment state + sovereign mandi bulletins
  const notifications = [];

  // 1. Dynamic alerts from farmer's actual bookings
  bookings.forEach(b => {
    // 1A. Payment notification
    if (b.payments?.[0]) {
      const p = b.payments[0];
      if (p.status === 'paid') {
        notifications.push({
          id: `pay-paid-${b.id}`,
          category: 'transaction',
          title:
            language === 'mr'
              ? 'डीबीटी थेट लाभ रक्कम जमा'
              : language === 'hi'
              ? 'डीबीटी भुगतान खाते में जमा'
              : 'DBT Payment Credited',
          message:
            language === 'mr'
              ? `₹${Number(p.amount || 0).toLocaleString()} रक्कम ${b.commodities?.name || 'धान्य'} साठी जमा झाली. UTR: ${p.utr_reference || 'N/A'}`
              : language === 'hi'
              ? `₹${Number(p.amount || 0).toLocaleString()} राशि ${b.commodities?.name || 'उपज'} हेतु अंतरित हुई। UTR: ${p.utr_reference || 'N/A'}`
              : `₹${Number(p.amount || 0).toLocaleString()} credited for ${b.commodities?.name || 'crop'}. UTR: ${p.utr_reference || 'N/A'}`,
          time: language === 'mr' ? 'शासकीय जमा' : language === 'hi' ? 'भुगतान सफल' : 'Payment Confirmed',
          type: 'success',
          link: `/farmer/dashboard#booking-${b.id}`,
        });
      } else if (p.status === 'initiated') {
        notifications.push({
          id: `pay-init-${b.id}`,
          category: 'transaction',
          title:
            language === 'mr'
              ? 'डीबीटी देयक प्रक्रिया सुरू'
              : language === 'hi'
              ? 'डीबीटी अंतरण प्रक्रियाधीन'
              : 'DBT Payment Initiated',
          message:
            language === 'mr'
              ? `₹${Number(p.amount || 0).toLocaleString()} चे थेट हस्तांतरण आधार संलग्न बँक खात्यात पाठवले जात आहे.`
              : language === 'hi'
              ? `₹${Number(p.amount || 0).toLocaleString()} का डीबीटी अंतरण आपके आधार लिंक बैंक खाते में भेजा जा रहा है।`
              : `₹${Number(p.amount || 0).toLocaleString()} DBT transfer initiated to your linked bank account.`,
          time: language === 'mr' ? 'प्रक्रिया सुरू' : language === 'hi' ? 'प्रक्रियाधीन' : 'Transfer in progress',
          type: 'info',
          link: `/farmer/dashboard#booking-${b.id}`,
        });
      }
    }

    // 1B. Gate pass issued notification
    if (b.gate_passes?.[0]) {
      notifications.push({
        id: `gate-${b.id}`,
        category: 'transaction',
        title:
          language === 'mr'
            ? 'नमुना ४-अ ई-गेट पास तयार'
            : language === 'hi'
            ? 'प्रारूप ४-क ई-गेट पास तैयार'
            : 'Form 4-A Gate Pass Ready',
        message:
          language === 'mr'
            ? `${b.commodities?.name || 'धान्य'} साठी अधिकृत आवक गेट पास जारी झाला आहे. वजनकाटा व प्रवेशद्वारावर स्कॅन करा.`
            : language === 'hi'
            ? `${b.commodities?.name || 'उपज'} के लिए आधिकारिक आवक गेट पास जारी। तौल व गेट पर स्कैन कराएं।`
            : `Mandi clearance pass issued for ${b.commodities?.name}. Scan at entrance/exit gate.`,
        time: language === 'mr' ? 'तपासणी पूर्ण' : language === 'hi' ? 'सत्यापन पूर्ण' : 'Inspection Complete',
        type: 'success',
        link: `/farmer/gate-pass/${b.id}`,
      });
    }

    // 1C. Queue Alert / Leave Now
    const queuePos = b.queue_entries?.[0]?.queue_position;
    if (queuePos && queuePos <= 3 && ['booked', 'checked_in'].includes(b.status)) {
      notifications.push({
        id: `queue-${b.id}`,
        category: 'transaction',
        title:
          language === 'mr'
            ? 'मंडी कतार थेट अलर्ट (पाळी जवळ आली)'
            : language === 'hi'
            ? 'मंडी कतार लाइव अलर्ट (बारी निकट)'
            : 'Mandi Queue Live Alert',
        message:
          queuePos === 1
            ? language === 'mr'
              ? 'तुमची पाळी आली आहे! वाहन प्रमाणित वजनकाट्यावर आणा.'
              : language === 'hi'
              ? 'आपकी बारी आ गई है! वाहन धर्मकांटे पर लाएं।'
              : "It's your turn at the certified weighbridge!"
            : language === 'mr'
            ? `तुमची पाळी लवकरच येत आहे! कतार क्रमांक: #${queuePos}. केंद्राकडे प्रस्थान करा.`
            : language === 'hi'
            ? `आपकी बारी निकट आ रही है! कतार क्रमांक: #${queuePos}। केंद्र हेतु प्रस्थान करें।`
            : `Your turn is coming up soon! Position: #${queuePos}`,
        time: language === 'mr' ? 'थेट कतार' : language === 'hi' ? 'लाइव कतार' : 'Active Queue',
        type: 'warning',
        link: `/farmer/dashboard#booking-${b.id}`,
      });
    }

    // 1D. Booking confirmed notification
    if (b.status === 'booked') {
      notifications.push({
        id: `book-${b.id}`,
        category: 'transaction',
        title:
          language === 'mr'
            ? 'खरेदी स्लॉट नोंदणी निश्चित'
            : language === 'hi'
            ? 'खरीद स्लॉट बुकिंग पुष्ट'
            : 'Slot Booking Confirmed',
        message:
          language === 'mr'
            ? `${b.commodities?.name || 'धान्य'} साठी ${b.centres?.name || 'मंडी केंद्र'} येथे दिनांक ${b.slot_date} (${b.slot_window}) रोजी अपॉइंटमेंट निश्चित.`
            : language === 'hi'
            ? `${b.commodities?.name || 'उपज'} हेतु ${b.centres?.name || 'मंडी केंद्र'} पर दिनांक ${b.slot_date} (${b.slot_window}) को स्लॉट पक्का हुआ।`
            : `Appointment for ${b.commodities?.name} at ${b.centres?.name} on ${b.slot_date} (${b.slot_window}).`,
        time: b.slot_date,
        type: 'info',
        link: `/farmer/dashboard#booking-${b.id}`,
      });
    }

    // 1E. Rejection notification
    if (b.status === 'rejected') {
      notifications.push({
        id: `reject-${b.id}`,
        category: 'transaction',
        title:
          language === 'mr'
            ? 'गुणवत्ता मानक शेरा / अस्वीकृती'
            : language === 'hi'
            ? 'गुणवत्ता मानक टिप्पणी / अस्वीकृति'
            : 'Consignment Quality Notice',
        message:
          language === 'mr'
            ? `${b.commodities?.name} बाबत गुणवत्ता कारणामुळे शेरा: ${b.quality_notes || 'CACP मानकानुसार नाही'}. ७ दिवसांत अपील नोंदवा.`
            : language === 'hi'
            ? `${b.commodities?.name} गुणवत्ता मानक अनुरूप नहीं: ${b.quality_notes || 'मानक विचलन'}। 7 दिनों में कानूनी अपील दर्ज करें।`
            : `Booking for ${b.commodities?.name} was rejected. ${b.quality_notes || 'CACP FAQ discrepancy'}. Appeal within 7 days.`,
        time: language === 'mr' ? 'तक्रार निवारण' : language === 'hi' ? 'कार्रवाई अपेक्षित' : 'Action Required',
        type: 'error',
        link: '/farmer/grievances',
      });
    }
  });

  // 2. Official Sovereign Government Mandi Bulletins & Statutory Advisories
  notifications.push({
    id: 'bulletin-cacp-msp-2025',
    category: 'bulletin',
    title:
      language === 'mr'
        ? 'CACP हमीभाव अधिसूचना (KMS २०२५–२६)'
        : language === 'hi'
        ? 'CACP एमएसपी वैधानिक अधिसूचना (KMS 2025–26)'
        : 'CACP Statutory MSP Rates (KMS 2025–26)',
    message:
      language === 'mr'
        ? 'सोयाबीन ₹४,८९२/क्विंटल व कापूस ₹७,१२१/क्विंटल या अधिकृत हमीभावाने APMC नोडल केंद्रांवर थेट खरेदी सुरू आहे.'
        : language === 'hi'
        ? 'सोयाबीन ₹4,892/क्विंटल एवं कपास ₹7,121/क्विंटल के सरकारी समर्थन मूल्य पर खरीद केंद्रों पर सुगम पंजीकरण जारी है।'
        : 'Soybean ₹4,892/qtl and Cotton ₹7,121/qtl statutory procurement active across all APMC Nodal Centers.',
    time: 'KMS 2025–26',
    type: 'info',
    link: '/farmer/dashboard#msp-rates',
  });

  notifications.push({
    id: 'bulletin-moisture-compliance',
    category: 'bulletin',
    title:
      language === 'mr'
        ? 'अनाज ओलावा मानक सूचना (FAQ ग्रेड-अ)'
        : language === 'hi'
        ? 'अनाज नमी मानक परामर्श (FAQ ग्रेड-ए)'
        : 'Moisture Compliance Norm (FAQ Grade-A)',
    message:
      language === 'mr'
        ? 'कायदेशीर मापनशास्त्र अधिनियमानुसार धान्यामध्ये ओलावा १२% पेक्षा जास्त नसावा. धान्य स्वच्छ व वाळवून आणल्यास संपूर्ण दर मिळतो.'
        : language === 'hi'
        ? 'विधिक मापविज्ञान अधिनियम 2009 के तहत अनाज में नमी 12% से कम होनी चाहिए। उपज सुखाकर लाएं जिससे शून्य कटौती हो।'
        : 'Legal Metrology Act 2009 standard: Moisture must be ≤ 12.0%, foreign matter < 0.75% for zero deduction.',
    time: language === 'mr' ? 'वैधानिक निकष' : language === 'hi' ? 'वैधानिक मानक' : 'Statutory Norm',
    type: 'warning',
    link: '/farmer/guidelines',
  });

  notifications.push({
    id: 'bulletin-pfms-dbt-escrow',
    category: 'bulletin',
    title:
      language === 'mr'
        ? 'PFMS थेट बँक जमा हमी (२४-४८ तास)'
        : language === 'hi'
        ? 'PFMS डायरेक्ट बेनिफिट ट्रांसफर गारंटी'
        : 'PFMS DBT Escrow Settlement Guarantee',
    message:
      language === 'mr'
        ? 'वजनकाटा तपासणीनंतर २४ ते ४८ तासांत रक्कम थेट आधार संलग्न NPCI बँक खात्यात वर्ग केली जाते. मध्यस्थमुक्त हमी.'
        : language === 'hi'
        ? 'तौल रसीद के 24 से 48 घंटे के भीतर सीधे आधार-लिंक्ड बैंक खाते में कोषागार द्वारा भुगतान अंतरित किया जाता है।'
        : 'Settlement credited directly to NPCI Aadhaar-linked bank accounts within 24–48 hours post-weighbridge.',
    time: '24–48h SLA',
    type: 'success',
    link: '/farmer/dashboard#passbook',
  });

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;
  const bulletinCount = notifications.filter(n => n.category === 'bulletin').length;
  const transactionCount = notifications.filter(n => n.category === 'transaction').length;

  // Filtered notifications list
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !readIds.includes(n.id);
    if (activeFilter === 'bulletins') return n.category === 'bulletin';
    if (activeFilter === 'transactions') return n.category === 'transaction';
    return true;
  });

  const markAllRead = () => {
    const allIds = Array.from(new Set([...readIds, ...notifications.map(n => n.id)]));
    persistReadIds(allIds);
  };

  const clearReadAlerts = () => {
    // Clear only persisted read alerts that are not vital statutory bulletins
    persistReadIds([]);
  };

  const markSingleRead = (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!readIds.includes(id)) {
      persistReadIds([...readIds, id]);
    }
  };

  const speakNotification = (n, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (playingId === n.id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingId(n.id);

    const speechText = `${n.title}. ${n.message}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.92;

    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const navigateToLink = (link, id) => {
    markSingleRead(id);
    setIsOpen(false);
    if (link.includes('#') && router.pathname === link.split('#')[0]) {
      const targetId = link.split('#')[1];
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-emerald-400', 'transition-all');
        setTimeout(() => el.classList.remove('ring-4', 'ring-emerald-400'), 2500);
      }
    } else {
      router.push(link);
    }
  };

  return (
    <>
      {/* High-Visibility Bell Trigger Button with Unread Badge & Label */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(true)}
        className="relative min-h-[44px] px-3.5 py-2 rounded-2xl bg-white dark:bg-neutral-800 border border-slate-200/90 dark:border-neutral-700 text-slate-800 dark:text-neutral-100 hover:bg-slate-50 dark:hover:bg-neutral-700/60 shadow-xs transition-all flex items-center gap-2 select-none"
        title={t('notificationsAlerts')}
        aria-label={t('notificationsAlerts')}
      >
        <div className="relative flex items-center justify-center">
          <svg className="w-5 h-5 text-slate-700 dark:text-neutral-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2.5 bg-rose-600 text-white text-[10.5px] font-black min-w-[19px] h-[19px] px-1 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-neutral-900 shadow-xs animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs font-black text-slate-800 dark:text-slate-100 hidden sm:inline">
          {language === 'mr' ? 'सूचना' : language === 'hi' ? 'सूचनाएं' : 'Alerts'}
        </span>
      </motion.button>

      {/* Spacious, Sovereign Portal-Mounted Notification Drawer */}
      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden" role="dialog" aria-modal="true">
          {/* High-Contrast Backdrop with Soft Blur */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Large, Expansive Drawer Panel (w-full max-w-xl md:max-w-2xl lg:max-w-3xl for spacious reading) */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xl md:max-w-2xl lg:max-w-3xl bg-white dark:bg-neutral-900 shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-neutral-800">
            {/* Sovereign Government Tricolor Ribbon */}
            <div className="h-1.5 w-full grid grid-cols-3 shrink-0">
              <div className="bg-[#FF9933]" />
              <div className="bg-white" />
              <div className="bg-[#138808]" />
            </div>

            {/* Header: Title, Unread Count & Fast Close */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/90 dark:bg-neutral-950/90 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 border border-emerald-600/25 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {t('notificationsAlerts')}
                      </h2>
                      {unreadCount > 0 && (
                        <span className="bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-black px-2 py-0.5 rounded-full">
                          {unreadCount} {language === 'mr' ? 'नवीन' : language === 'hi' ? 'नया' : 'new'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'mr'
                        ? 'शासकीय हमीभाव, वजनकाटा कतार व डीबीटी थेट जमा सूचना फलक'
                        : language === 'hi'
                        ? 'सरकारी समर्थन मूल्य, मंडी धर्मकांटा कतार व डीबीटी अंतरण सूचना पटल'
                        : 'Official Mandi MSP, Weighbridge Queue & DBT Direct Settlement Dispatch'}
                    </p>
                  </div>
                </div>

                {/* Top Action Buttons (Mark All Read & 44px Accessible Close Button) */}
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="min-h-[40px] text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl transition"
                    >
                      {t('markAllRead')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="min-w-[44px] min-h-[44px] rounded-2xl bg-slate-200/80 hover:bg-slate-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition shadow-2xs"
                    title={t('closeAlerts')}
                    aria-label={t('closeAlerts')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Categorization Segmented Control / Filter Tabs */}
              <div className="mt-4 flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-neutral-800/80 rounded-xl overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`min-h-[34px] px-3.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'all'
                      ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('tabAllAlerts')}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                    {notifications.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('unread')}
                  className={`min-h-[34px] px-3.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'unread'
                      ? 'bg-white dark:bg-neutral-900 text-rose-700 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('tabUnreadAlerts')}</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('bulletins')}
                  className={`min-h-[34px] px-3.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'bulletins'
                      ? 'bg-white dark:bg-neutral-900 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('tabBulletins')}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {bulletinCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('transactions')}
                  className={`min-h-[34px] px-3.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'transactions'
                      ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('tabTransactions')}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {transactionCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Notification Scrollable Feed (Spacious Padding, Large Cards) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              {filteredNotifications.length === 0 ? (
                <div className="py-24 text-center text-slate-400 dark:text-neutral-500 text-xs flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-slate-800 dark:text-neutral-200">
                    {activeFilter === 'unread'
                      ? (language === 'mr' ? 'सर्व सूचना वाचून झाल्या आहेत' : language === 'hi' ? 'सभी सूचनाएं पढ़ी जा चुकी हैं' : 'All alerts have been read')
                      : t('noAlertsTitle')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                    {t('noAlertsDesc')}
                  </p>
                </div>
              ) : (
                filteredNotifications.map(n => {
                  const isRead = readIds.includes(n.id);
                  const isWarning = n.type === 'warning';
                  const isError = n.type === 'error';
                  const isSuccess = n.type === 'success';
                  const isPlayingThis = playingId === n.id;

                  // High-Contrast Theme with Clear Semantic Accent
                  const cardTheme = isRead
                    ? 'bg-slate-50/90 dark:bg-neutral-800/50 border-slate-200 dark:border-neutral-700/60 opacity-75'
                    : isWarning
                    ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/70 shadow-xs'
                    : isError
                    ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700/70 shadow-xs'
                    : isSuccess
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/70 shadow-xs'
                    : 'bg-blue-50/90 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700/70 shadow-xs';

                  return (
                    <div
                      key={n.id}
                      className={`p-4 sm:p-5 rounded-2xl border text-left transition-all ${cardTheme}`}
                    >
                      {/* Top Header Row with Semantic Icon, Title, and Badge */}
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="flex items-start gap-2.5 flex-1">
                          <div className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isSuccess
                              ? 'bg-emerald-600 text-white'
                              : isWarning
                              ? 'bg-amber-600 text-white'
                              : isError
                              ? 'bg-rose-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}>
                            {isSuccess ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isWarning ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            ) : isError ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1">
                            <button
                              type="button"
                              onClick={() => navigateToLink(n.link, n.id)}
                              className="text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-left leading-snug"
                            >
                              {n.title}
                            </button>
                          </div>
                        </div>

                        {/* Status/SLA Badge */}
                        <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/95 dark:bg-black/50 px-2.5 py-1 rounded-lg border border-slate-300/80 dark:border-neutral-700/80 shrink-0">
                          {n.time}
                        </span>
                      </div>

                      {/* Message Content: Clean, High Legibility, 14px Text */}
                      <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed pl-9">
                        {n.message}
                      </p>

                      {/* Card Footer with Direct 44px Action Targets */}
                      <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-neutral-700/80 flex flex-wrap justify-between items-center gap-2 pl-9">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigateToLink(n.link, n.id)}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>
                              {language === 'mr' ? 'तपशील पहा व ट्रॅक करा' : language === 'hi' ? 'विवरण देखें व ट्रैक करें' : 'View details & track'}
                            </span>
                            <span aria-hidden="true">&rarr;</span>
                          </button>

                          {/* Audio Speech Button */}
                          <button
                            type="button"
                            onClick={(e) => speakNotification(n, e)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-bold transition inline-flex items-center gap-1.5 ${
                              isPlayingThis
                                ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                                : 'bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-neutral-600'
                            }`}
                            title={t('listenAlert')}
                            aria-label={t('listenAlert')}
                          >
                            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                            <span className="hidden sm:inline">
                              {isPlayingThis
                                ? (language === 'mr' ? 'चालू आहे...' : language === 'hi' ? 'बोल रहा है...' : 'Speaking...')
                                : t('listenAlert')}
                            </span>
                          </button>
                        </div>

                        {/* Read State Toggle */}
                        {!isRead ? (
                          <button
                            type="button"
                            onClick={(e) => markSingleRead(n.id, e)}
                            className="min-h-[38px] text-xs font-bold text-slate-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 px-3 py-1.5 rounded-xl transition hover:bg-slate-100 dark:hover:bg-neutral-700 inline-flex items-center gap-1 shadow-2xs"
                          >
                            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>
                              {language === 'mr' ? 'वाचले' : language === 'hi' ? 'पढ़ा हुआ' : 'Mark read'}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 dark:text-neutral-500 inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{language === 'mr' ? 'वाचलेले' : language === 'hi' ? 'पढ़ा गया' : 'Read'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sovereign Mandi Footer Notice */}
            <div className="p-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {language === 'mr'
                    ? 'केंद्रीय शेतकरी खरेदी मंच (CFPP) • २४×७ थेट अलर्ट प्रणाली'
                    : language === 'hi'
                    ? 'केंद्रीय किसान खरीद मंच (CFPP) • 24×7 लाइव अलर्ट प्रणाली'
                    : 'Central Farmer Procurement Platform (CFPP) • 24×7 Live Nodal Alert'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {readIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearReadAlerts}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
                  >
                    {t('clearAllAlerts')}
                  </button>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {language === 'mr' ? 'अधिसूचना क्रमांक: KMS/२०२५/९०२' : language === 'hi' ? 'अधिसूचना संख्या: KMS/2025/902' : 'Notification Ref: KMS/2025/902'}
                </span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
