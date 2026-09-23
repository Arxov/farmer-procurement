import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../lib/i18n';

/**
 * Kisan Mitra AI (किसान मित्र)
 * Intelligent Trilingual Conversational Mandi Assistant
 * Supports Speech-to-Text (STT), Text-to-Speech (TTS), real-time platform context,
 * quick query chips, and direct deep-linking action cards.
 */
export default function KisanMitraWidget({ profile, bookings = [], commodities = [] }) {
  const router = useRouter();
  const { language, changeLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initial welcome message based on language
  const getWelcomeMessage = (lang, farmerName) => {
    const name = farmerName ? ` ${farmerName}` : '';
    if (lang === 'mr') {
      return {
        id: 'welcome',
        sender: 'bot',
        text: `नमस्कार${name} जी! मी किसान मित्र AI आहे. हमीभाव (MSP), ओलावा निकष, रांग टोकन किंवा पेमेंटबद्दल काहीही विचारा.`,
        time: 'Just now',
        actions: [
          { label: 'सरकारी हमीभाव (MSP) पहा', query: 'आजचा हमीभाव काय आहे?' },
          { label: 'माझा रांग टोकन तपासा', query: 'माझा टोकन नंबर काय आहे?' },
        ],
      };
    }
    if (lang === 'hi') {
      return {
        id: 'welcome',
        sender: 'bot',
        text: `नमस्ते${name} जी! मैं किसान मित्र AI हूँ। सरकारी एमएसपी, अनाज नमी नियम, कतार टोकन या डीबीटी भुगतान संबंधी कोई भी सवाल पूछें।`,
        time: 'Just now',
        actions: [
          { label: 'सरकारी एमएसपी दर देखें', query: 'आज का एमएसपी दर क्या है?' },
          { label: 'मेरा कतार टोकन जांचें', query: 'मेरा टोकन नंबर क्या है?' },
        ],
      };
    }
    return {
      id: 'welcome',
      sender: 'bot',
      text: `Hello${name}! I am Kisan Mitra AI, your personal procurement assistant. Ask me anything about Govt MSP rates, moisture standards, queue tokens, or DBT payouts.`,
      time: 'Just now',
      actions: [
        { label: 'Live MSP Rates', query: 'What are today MSP rates?' },
        { label: 'Check Queue Status', query: 'Where is my queue token?' },
      ],
    };
  };

  const [messages, setMessages] = useState([]);

  // Set welcome message on mount or when language changes if no interaction yet
  useEffect(() => {
    const welcome = getWelcomeMessage(language, profile?.full_name);
    setMessages(prev => {
      if (prev.length <= 1) {
        return [welcome];
      }
      return prev;
    });
  }, [language, profile?.full_name]);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Clean up speech synthesis when component unmounts or closes
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Intelligent Context-Aware Response Engine
  const generateAIResponse = (query, currentLang) => {
    const q = (query || '').toLowerCase().trim();
    const activeBookings = bookings.filter(b => ['booked', 'checked_in', 'weighed', 'quality_checked'].includes(b.status));
    const activeBookingWithQueue = activeBookings.find(b => b.queue_entries?.[0]);
    const topCommodity = commodities[0] || { name: 'Wheat (गेहूँ)', msp_rate_per_quintal: 2275 };

    // 1. MSP & Commodity Rates Intent
    if (
      q.includes('msp') ||
      q.includes('rate') ||
      q.includes('price') ||
      q.includes('bhav') ||
      q.includes('dar') ||
      q.includes('भाव') ||
      q.includes('दर') ||
      q.includes('दाम') ||
      q.includes('एमएसपी') ||
      q.includes('हमीभाव') ||
      q.includes('wheat') ||
      q.includes('paddy') ||
      q.includes('soybean') ||
      q.includes('cotton') ||
      q.includes('chana') ||
      q.includes('गेहूँ') ||
      q.includes('धान') ||
      q.includes('सोयाबीन') ||
      q.includes('कापूस') ||
      q.includes('चना') ||
      q.includes('हरभरा')
    ) {
      const rateList = commodities.length > 0
        ? commodities.slice(0, 4).map(c => `• ${c.name}: ₹${Number(c.msp_rate_per_quintal).toLocaleString('en-IN')}/qtl`).join('\n')
        : `• Wheat: ₹2,275/qtl\n• Paddy: ₹2,183/qtl\n• Soybean: ₹4,600/qtl\n• Cotton: ₹6,620/qtl`;

      if (currentLang === 'mr') {
        return {
          text: `आजचे CACP सरकारी हमीभाव (MSP):\n${rateList}\n\nसर्व खरेदी केंद्रांवर हमीभावाने थेट DBT पेमेंट मिळते. आपण स्लॉट बुक करू शकता.`,
          actions: [
            { label: 'स्लॉट बुक करा →', href: '/farmer/book-slot' },
            { label: 'नफा कॅल्क्युलेटर →', href: '/farmer/net-calculator' },
          ],
        };
      }
      if (currentLang === 'hi') {
        return {
          text: `आज के CACP सरकारी एमएसपी दर:\n${rateList}\n\nसरकारी केंद्रों पर बिना किसी कटौती के न्यूनतम समर्थन मूल्य सुनिश्चित है।`,
          actions: [
            { label: 'स्लॉट बुक करें →', href: '/farmer/book-slot' },
            { label: 'भुगतान कैलकुलेटर →', href: '/farmer/net-calculator' },
          ],
        };
      }
      return {
        text: `Today's Govt. CACP Minimum Support Prices (MSP):\n${rateList}\n\nAll procurements guarantee full MSP with direct DBT settlement into your Aadhaar-linked bank account.`,
        actions: [
          { label: 'Book Slot Now →', href: '/farmer/book-slot' },
          { label: 'Net Payout Calculator →', href: '/farmer/net-calculator' },
        ],
      };
    }

    // 2. Queue, Token & Booking Status Intent
    if (
      q.includes('token') ||
      q.includes('queue') ||
      q.includes('status') ||
      q.includes('slot') ||
      q.includes('wait') ||
      q.includes('turn') ||
      q.includes('नंबर') ||
      q.includes('रांग') ||
      q.includes('टोकन') ||
      q.includes('नोंदणी') ||
      q.includes('कतार') ||
      q.includes('बारी') ||
      q.includes('पाळी') ||
      q.includes('वेटिंग')
    ) {
      if (activeBookingWithQueue) {
        const qPos = activeBookingWithQueue.queue_entries[0].queue_position;
        const wait = activeBookingWithQueue.queue_entries[0].estimated_wait_minutes;
        const crop = activeBookingWithQueue.commodities?.name || 'Crop';
        const centre = activeBookingWithQueue.centres?.name || 'Mandi';

        if (currentLang === 'mr') {
          return {
            text: `तुमचा सक्रिय टोकन नंबर #${qPos} आहे (${crop}, केंद्र: ${centre}). अंदाजे प्रतीक्षा वेळ: ${wait} मिनिटे. कृपया गेट पास तयार ठेवा.`,
            actions: [
              { label: 'अधिकृत गेट पास पहा →', href: `/farmer/gate-pass/${activeBookingWithQueue.id}` },
              { label: 'थेट डॅशबोर्ड ट्रॅक →', href: '/farmer/dashboard' },
            ],
          };
        }
        if (currentLang === 'hi') {
          return {
            text: `आपकी लाइव कतार टोकन संख्या #${qPos} है (${crop}, केंद्र: ${centre})। अनुमानित प्रतीक्षा समय: लगभग ${wait} मिनट है।`,
            actions: [
              { label: 'आधिकारिक गेट पास देखें →', href: `/farmer/gate-pass/${activeBookingWithQueue.id}` },
              { label: 'लाइव स्थिति ट्रैक →', href: '/farmer/dashboard' },
            ],
          };
        }
        return {
          text: `Your live queue token is #${qPos} for ${crop} at ${centre}. Estimated wait time is approximately ${wait} minutes.`,
          actions: [
            { label: 'View Official Gate Pass →', href: `/farmer/gate-pass/${activeBookingWithQueue.id}` },
            { label: 'Track on Dashboard →', href: '/farmer/dashboard' },
          ],
        };
      }

      if (activeBookings.length > 0) {
        const b = activeBookings[0];
        if (currentLang === 'mr') {
          return {
            text: `तुमची ${b.commodities?.name || 'माल'} साठी नोंदणी निश्चित आहे. तारीख: ${b.slot_date} (${b.slot_window || 'सकाळ'}), केंद्र: ${b.centres?.name || 'मंडी'}.`,
            actions: [
              { label: 'नोंदणी पावती पहा →', href: `/farmer/gate-pass/${b.id}` },
            ],
          };
        }
        if (currentLang === 'hi') {
          return {
            text: `आपकी ${b.commodities?.name || 'फसल'} की बुकिंग ${b.slot_date} (${b.slot_window || 'प्रातः'}) के लिए ${b.centres?.name || 'केंद्र'} पर निर्धारित है।`,
            actions: [
              { label: 'अपॉइंटमेंट पर्ची देखें →', href: `/farmer/gate-pass/${b.id}` },
            ],
          };
        }
        return {
          text: `You have an active appointment for ${b.commodities?.name || 'crop'} on ${b.slot_date} (${b.slot_window || 'Morning'}) at ${b.centres?.name || 'Procurement Centre'}.`,
          actions: [
            { label: 'View Appointment Slip →', href: `/farmer/gate-pass/${b.id}` },
          ],
        };
      }

      // No active booking
      if (currentLang === 'mr') {
        return {
          text: 'सध्या तुमची कोणतीही सक्रिय नोंदणी नाही. तुम्ही नवीन खरेदी स्लॉट ऑनलाइन बुक करू शकता.',
          actions: [{ label: 'नवीन स्लॉट बुक करा →', href: '/farmer/book-slot' }],
        };
      }
      if (currentLang === 'hi') {
        return {
          text: 'वर्तमान में आपकी कोई सक्रिय खरीद बुकिंग नहीं है। क्या आप आज नया स्लॉट बुक करना चाहते हैं?',
          actions: [{ label: 'नया स्लॉट बुक करें →', href: '/farmer/book-slot' }],
        };
      }
      return {
        text: 'You have no active appointment scheduled today. Would you like to book a slot for your produce?',
        actions: [{ label: 'Book Procurement Slot →', href: '/farmer/book-slot' }],
      };
    }

    // 3. Moisture & Quality Rules Intent
    if (
      q.includes('moisture') ||
      q.includes('water') ||
      q.includes('wet') ||
      q.includes('quality') ||
      q.includes('grade') ||
      q.includes('fci') ||
      q.includes('cacp') ||
      q.includes('नमी') ||
      q.includes('ओलावा') ||
      q.includes('गुणवत्ता') ||
      q.includes('प्रतवारी') ||
      q.includes('ग्रेड') ||
      q.includes('कचरा')
    ) {
      if (currentLang === 'mr') {
        return {
          text: `सरकारी FCI खरेदी गुणवत्ता निकष:\n• कमाल ओलावा (Moisture): १२% (कमाल १४% पर्यंत प्रमाणानुसार कपात).\n• कचरा व अवांछित घटक: ०.७५% पेक्षा कमी असावा.\n• वाहतुकीदरम्यान धान्य ताडपत्रीने झाकून ठेवावे.`,
          actions: [
            { label: 'संपूर्ण मंडी नियम वाचा →', href: '/farmer/guidelines' },
            { label: 'हवामान अंदाज तपासा →', href: '/farmer/dashboard' },
          ],
        };
      }
      if (currentLang === 'hi') {
        return {
          text: `सरकारी FCI व CACP गुणवत्ता दिशानिर्देश:\n• अधिकतम नमी: १२% (१४% तक मानक कटौती के साथ स्वीकार्य)।\n• बाह्य अवांछित तत्व: ०.७५% से कम।\n• ग्रेड 'ए' मूल्य पाने हेतु माल अच्छी तरह सुखाकर लाएं।`,
          actions: [
            { label: 'विस्तृत मंडी नियम →', href: '/farmer/guidelines' },
            { label: 'मौसम पूर्वानुमान देखें →', href: '/farmer/dashboard' },
          ],
        };
      }
      return {
        text: `FCI & CACP Official Procurement Quality Standards:\n• Maximum Moisture: 12% for Grade A (up to 14% allowed with standard deduction).\n• Foreign Matter: Below 0.75%.\n• Sun-dry grains thoroughly and cover with tarpaulin during transit.`,
        actions: [
          { label: 'View Mandi Guidelines →', href: '/farmer/guidelines' },
          { label: 'Check Weather Forecast →', href: '/farmer/dashboard' },
        ],
      };
    }

    // 4. DBT Payment & Bank Settlement Intent
    if (
      q.includes('payment') ||
      q.includes('money') ||
      q.includes('dbt') ||
      q.includes('bank') ||
      q.includes('account') ||
      q.includes('paisa') ||
      q.includes('rupee') ||
      q.includes('पैसे') ||
      q.includes('पेमेंट') ||
      q.includes('डीबीटी') ||
      q.includes('खाते') ||
      q.includes('खात्यात') ||
      q.includes('जमा') ||
      q.includes('रुपये')
    ) {
      if (currentLang === 'mr') {
        return {
          text: `डीबीटी (DBT) पेमेंट पद्धत:\n• वजन व प्रतवारी तपासणी पूर्ण झाल्यानंतर २४ ते ४८ तासांच्या आत रक्कम थेट आधारशी संलग्न बँक खात्यात जमा होते.\n• PFMS एस्क्रो प्रणालीद्वारे व्यवहार सुरक्षित व पारदर्शक असतो.`,
          actions: [
            { label: 'निव्वळ नफा कॅल्क्युलेटर →', href: '/farmer/net-calculator' },
            { label: 'माझ्या नोंदी तपासा →', href: '/farmer/dashboard' },
          ],
        };
      }
      if (currentLang === 'hi') {
        return {
          text: `डीबीटी (DBT) भुगतान प्रक्रिया:\n• मंडी में तुलाई व गुणवत्ता सत्यापन के २४ से ४८ घंटों के भीतर राशि सीधे आपके आधार लिंक बैंक खाते में भेज दी जाती है।\n• किसी बिचौलिए या कमीशन एजेंट की आवश्यकता नहीं है।`,
          actions: [
            { label: 'शुद्ध भुगतान कैलकुलेटर →', href: '/farmer/net-calculator' },
            { label: 'मेरी बुकिंग रिकॉर्ड →', href: '/farmer/dashboard' },
          ],
        };
      }
      return {
        text: `Direct Benefit Transfer (DBT) Payouts:\n• Payments are credited directly to your Aadhaar-seeded bank account within 24 to 48 hours of weighbridge & quality verification.\n• Zero middleman commissions via the central PFMS escrow grid.`,
        actions: [
          { label: 'Net Payout Calculator →', href: '/farmer/net-calculator' },
          { label: 'View My Records →', href: '/farmer/dashboard' },
        ],
      };
    }

    // 5. Required Documents Intent
    if (
      q.includes('document') ||
      q.includes('paper') ||
      q.includes('aadhaar') ||
      q.includes('7/12') ||
      q.includes('passbook') ||
      q.includes('कागदपत्रे') ||
      q.includes('कागद') ||
      q.includes('कागजात') ||
      q.includes('दस्तावेज') ||
      q.includes('आधार') ||
      q.includes('सातबारा') ||
      q.includes('पासबुक')
    ) {
      if (currentLang === 'mr') {
        return {
          text: `खरेदी केंद्रावर लागणारी आवश्यक कागदपत्रे:\n१. मूळ आधार कार्ड व छायाप्रत\n२. चालू वर्षाचा डिजिटल ७/१२ व ८-अ उतारा (पिकाची नोंद आवश्यक)\n३. बँक पासबुक / रद्द केलेला धनादेश\n४. वाहनाचा RC दाखला व चालकाचा परवाना\n५. ऑनलाइन नोंदणी टोकन पावती`,
          actions: [
            { label: 'मार्गदर्शक सूचना वाचा →', href: '/farmer/guidelines' },
          ],
        };
      }
      if (currentLang === 'hi') {
        return {
          text: `खरीद केंद्र पर आवश्यक दस्तावेज सूची:\n१. मूल आधार कार्ड व फोटोकॉपी\n२. भूमि रिकॉर्ड (खसरा / खतौनी / जमाबंदी नकल)\n३. बैंक पासबुक की प्रति (Aadhaar लिंक खाता)\n४. वाहन पंजीकरण प्रमाण (RC)\n५. ऑनलाइन स्लॉट बुकिंग पर्ची / QR कोड`,
          actions: [
            { label: 'दिशानिर्देश पढ़ें →', href: '/farmer/guidelines' },
          ],
        };
      }
      return {
        text: `Mandatory Documents for Mandi Gate Entry:\n1. Original Aadhaar Card & photocopy\n2. Land Ownership Record (7/12 extract / Khasra / Khatauni)\n3. Bank Passbook copy (Aadhaar-seeded)\n4. Vehicle Registration Certificate (RC)\n5. Online Slot Appointment Slip / QR Gate Pass`,
        actions: [
          { label: 'Read Guidelines →', href: '/farmer/guidelines' },
        ],
      };
    }

    // 6. Grievance & Complaints Intent
    if (
      q.includes('complaint') ||
      q.includes('issue') ||
      q.includes('help') ||
      q.includes('grievance') ||
      q.includes('fraud') ||
      q.includes('dispute') ||
      q.includes('तक्रार') ||
      q.includes('मदत') ||
      q.includes('समस्या') ||
      q.includes('शिकायत') ||
      q.includes('मदद')
    ) {
      if (currentLang === 'mr') {
        return {
          text: `आपल्याला वजन, प्रतवारी किंवा पेमेंट विलंबाबाबत काही अडचण असल्यास आपण थेट ऑनलाइन तक्रार नोंदवू शकता. नोडल अधिकारी २४ तासांत चौकशी करतात.`,
          actions: [
            { label: 'तक्रार निवारण कक्ष उघडा →', href: '/farmer/grievances' },
          ],
        };
      }
      if (currentLang === 'hi') {
        return {
          text: `यदि वजन में अंतर, गुणवत्ता कटौती या भुगतान में देरी संबंधी कोई समस्या है, तो आप तुरंत ऑनलाइन शिकायत दर्ज कर सकते हैं।`,
          actions: [
            { label: 'शिकायत निवारण डेस्क →', href: '/farmer/grievances' },
          ],
        };
      }
      return {
        text: `If you face any issues regarding weight disputes, quality deductions, or payment delays, our official Grievance Redressal Officer investigates within 24 hours.`,
        actions: [
          { label: 'Open Grievance Desk →', href: '/farmer/grievances' },
        ],
      };
    }

    // 7. General Greetings
    if (
      q.includes('hello') ||
      q.includes('hi') ||
      q.includes('namaste') ||
      q.includes('hey') ||
      q.includes('नमस्कार') ||
      q.includes('नमस्ते') ||
      q.includes('कोण आहे') ||
      q.includes('कौैन हो')
    ) {
      if (currentLang === 'mr') {
        return {
          text: `नमस्कार! मी किसान मित्र AI आहे. मी तुम्हाला हमीभाव, आजची रांग, ओलावा निकष आणि पेमेंटची अचूक माहिती देतो. खालीलपैकी काय मदत हवी आहे?`,
          actions: [
            { label: 'हमीभाव (MSP) दर', query: 'हमीभाव दर काय आहेत?' },
            { label: 'माझा रांग टोकन', query: 'माझा टोकन नंबर सांगा' },
            { label: 'ओलावा निकष', query: 'ओलावा निकष काय आहेत?' },
          ],
        };
      }
      if (currentLang === 'hi') {
        return {
          text: `नमस्ते! मैं किसान मित्र AI हूँ। मैं आपको सरकारी एमएसपी, मंडी कतार, नमी नियम और डीबीटी भुगतान की सही जानकारी देता हूँ।`,
          actions: [
            { label: 'एमएसपी दर', query: 'एमएसपी दर क्या है?' },
            { label: 'कतार टोकन', query: 'मेरा कतार टोकन' },
            { label: 'नमी नियम', query: 'नमी के नियम' },
          ],
        };
      }
      return {
        text: `Hello! I am Kisan Mitra AI. I provide real-time updates on Govt MSP rates, queue token positions, grain moisture criteria, and DBT settlements. How can I help today?`,
        actions: [
          { label: 'Govt MSP Rates', query: 'What are today MSP rates?' },
          { label: 'Check Queue Token', query: 'Where is my queue token?' },
          { label: 'Moisture Rules', query: 'What are moisture rules?' },
        ],
      };
    }

    // Default Fallback
    if (currentLang === 'mr') {
      return {
        text: `मी आपल्या प्रश्नावर मदत करू शकतो. कृपया सरकारी हमीभाव, रांग टोकन, ओलावा निकष किंवा पेमेंट संबंधी विचारा किंवा खालील पर्याय निवडा:`,
        actions: [
          { label: 'आजचा हमीभाव (MSP)', query: 'आजचा हमीभाव काय आहे?' },
          { label: 'रांग टोकन तपासा', query: 'माझा टोकन नंबर सांगा' },
          { label: 'कागदपत्रे यादी', query: 'कोणती कागदपत्रे लागतील?' },
        ],
      };
    }
    if (currentLang === 'hi') {
      return {
        text: `मैं आपके प्रश्न में सहायता कर सकता हूँ। कृपया सरकारी एमएसपी, कतार स्थिति, नमी नियम या बैंक भुगतान के बारे में पूछें या नीचे चुनें:`,
        actions: [
          { label: 'सरकारी एमएसपी दर', query: 'एमएसपी दर क्या है?' },
          { label: 'मेरा टोकन नंबर', query: 'मेरा टोकन नंबर' },
          { label: 'ज़रूरी कागज़ात', query: 'कौन से दस्तावेज चाहिए?' },
        ],
      };
    }
    return {
      text: `I'm here to assist you with procurement. You can ask about Govt MSP prices, live queue tokens, grain moisture rules, or DBT payments. Or choose an option below:`,
      actions: [
        { label: 'Check MSP Rates', query: 'What are today MSP rates?' },
        { label: 'Check Queue Status', query: 'Where is my queue token?' },
        { label: 'Required Documents', query: 'What documents are required?' },
      ],
    };
  };

  // Handle sending a user message
  const handleSendMessage = (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText) return;

    // Stop active speech if any
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Realistic micro-delay simulating AI reasoning
    setTimeout(() => {
      const response = generateAIResponse(queryText, language);
      const botMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.text,
        actions: response.actions || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setIsTyping(false);
      setMessages(prev => [...prev, botMessage]);

      // Optional: auto-speak if user was using voice
      if (isListening) {
        speakText(response.text, botMessage.id);
      }
    }, 450);
  };

  // Web Speech API: Text-to-Speech (TTS)
  const speakText = (text, messageId) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    if (isSpeakingId === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean bullet points and formatting for smooth natural speech
    const cleanSpeechText = text
      .replace(/•/g, '')
      .replace(/\*/g, '')
      .replace(/₹/g, language === 'mr' ? 'रुपये ' : language === 'hi' ? 'रुपये ' : 'rupees ')
      .replace(/\/qtl/gi, language === 'mr' ? ' प्रति क्विंटल' : language === 'hi' ? ' प्रति क्विंटल' : ' per quintal');

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.94;

    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);

    setIsSpeakingId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Web Speech API: Speech-to-Text (STT)
  const toggleListening = () => {
    if (!speechSupported) {
      setSpeechError(t('speechNotSupported'));
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSendMessage(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.warn('[Kisan Mitra Speech]', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission required.');
        } else {
          setSpeechError('Speech recognition timed out.');
        }
        setTimeout(() => setSpeechError(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition init error:', err);
      setIsListening(false);
    }
  };

  // Reset conversation
  const clearChat = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
    }
    const welcome = getWelcomeMessage(language, profile?.full_name);
    setMessages([welcome]);
  };

  return (
    <>
      {/* Unified Floating Action Button (FAB) */}
      <div className="fixed bottom-20 md:bottom-8 right-4 sm:right-6 z-40 print:hidden">
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative min-h-[50px] min-w-[50px] h-12 sm:h-13 px-3.5 sm:px-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
          title="Kisan Mitra AI"
          aria-label="Open Kisan Mitra AI Assistant"
        >
          {/* Subtle Ambient Pulse Ring */}
          <span className="absolute -inset-1 rounded-2xl bg-emerald-500/20 animate-pulse -z-10 pointer-events-none" />

          {/* AI Sparkle Badge */}
          <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs border border-amber-200">
            AI
          </span>

          {isOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              <span className="hidden sm:inline font-display text-xs font-bold tracking-wide">
                {language === 'mr' ? 'किसान मित्र' : language === 'hi' ? 'किसान मित्र' : 'Kisan Mitra'}
              </span>
            </>
          )}
        </motion.button>
      </div>

      {/* Main Interactive Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-x-3 bottom-24 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[410px] h-[560px] max-h-[82vh] bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-neutral-800 overflow-hidden z-50 flex flex-col backdrop-blur-xl"
            role="dialog"
            aria-label="Kisan Mitra AI Assistant"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white p-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
                  <svg className="w-5 h-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold tracking-tight">{t('kisanMitraTitle')}</h3>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-[9px] font-bold text-emerald-200 border border-emerald-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200/90 leading-tight">{t('kisanMitraSubtitle')}</p>
                </div>
              </div>

              {/* Utility Header Actions */}
              <div className="flex items-center gap-1.5">
                {/* Language Switcher Pills */}
                <div className="flex items-center bg-black/20 rounded-xl p-0.5 border border-white/10 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => changeLanguage('en')}
                    className={`px-1.5 py-0.5 rounded-lg transition ${language === 'en' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-emerald-100 hover:text-white'}`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage('hi')}
                    className={`px-1.5 py-0.5 rounded-lg transition ${language === 'hi' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-emerald-100 hover:text-white'}`}
                  >
                    हिं
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage('mr')}
                    className={`px-1.5 py-0.5 rounded-lg transition ${language === 'mr' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-emerald-100 hover:text-white'}`}
                  >
                    म
                  </button>
                </div>

                {/* Reset Chat */}
                <button
                  type="button"
                  onClick={clearChat}
                  title={t('clearChat')}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition"
                  aria-label="Clear chat conversation"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                  aria-label="Close chat window"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Context Prompt Chips Bar */}
            <div className="bg-slate-50 dark:bg-neutral-950 px-3 py-2 border-b border-slate-200/80 dark:border-neutral-800 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 ml-1">
                {t('quickSuggestions')}:
              </span>
              <button
                type="button"
                onClick={() => handleSendMessage(language === 'mr' ? 'आजचा सरकारी हमीभाव काय आहे?' : language === 'hi' ? 'आज का सरकारी एमएसपी दर क्या है?' : 'What are today Govt MSP rates?')}
                className="shrink-0 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-neutral-800 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 rounded-xl shadow-2xs hover:bg-emerald-50 dark:hover:bg-neutral-700 transition inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m0-20c-2.5 0-5 2.5-5 6 0 5 5 10 5 14m0-20c2.5 0 5 2.5 5 6 0 5-5 10-5 14" />
                </svg>
                <span>{t('promptMsp')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage(language === 'mr' ? 'माझा रांग टोकन नंबर काय आहे?' : language === 'hi' ? 'मेरा कतार टोकन नंबर क्या है?' : 'Where is my queue token?')}
                className="shrink-0 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-neutral-800 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 rounded-xl shadow-2xs hover:bg-emerald-50 dark:hover:bg-neutral-700 transition inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('promptQueue')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage(language === 'mr' ? 'धान्य ओलावा निकष काय आहेत?' : language === 'hi' ? 'अनाज नमी के क्या नियम हैं?' : 'What are grain moisture rules?')}
                className="shrink-0 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-neutral-800 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 rounded-xl shadow-2xs hover:bg-emerald-50 dark:hover:bg-neutral-700 transition inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span>{t('promptMoisture')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage(language === 'mr' ? 'मंडीत कोणती कागदपत्रे लागतील?' : language === 'hi' ? 'मंडी में कौन से दस्तावेज चाहिए?' : 'What documents are required at Mandi?')}
                className="shrink-0 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-neutral-800 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-1 rounded-xl shadow-2xs hover:bg-emerald-50 dark:hover:bg-neutral-700 transition inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{t('promptDocs')}</span>
              </button>
            </div>

            {/* Chat Message Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-neutral-900/50">
              {messages.map(msg => {
                const isBot = msg.sender === 'bot';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[88%]">
                      {isBot && (
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200 dark:border-emerald-800">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isBot
                            ? 'bg-white dark:bg-neutral-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-neutral-700'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-tr-xs font-medium'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>

                        {/* Interactive Direct Action Buttons */}
                        {isBot && msg.actions && msg.actions.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-neutral-700/80 flex flex-wrap gap-1.5">
                            {msg.actions.map((act, idx) => {
                              if (act.href) {
                                return (
                                  <Link
                                    key={idx}
                                    href={act.href}
                                    onClick={() => setIsOpen(false)}
                                    className="inline-flex items-center text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
                                  >
                                    {act.label}
                                  </Link>
                                );
                              }
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSendMessage(act.query)}
                                  className="inline-flex items-center text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-neutral-700/60 border border-slate-200 dark:border-neutral-600 px-2.5 py-1 rounded-xl hover:bg-slate-200 dark:hover:bg-neutral-700 transition"
                                >
                                  {act.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Message Sub-bar (Timestamp & Text-to-Speech Button) */}
                    <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                      <span>{msg.time}</span>
                      {isBot && (
                        <button
                          type="button"
                          onClick={() => speakText(msg.text, msg.id)}
                          className={`hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 font-semibold transition ${isSpeakingId === msg.id ? 'text-amber-600 font-bold' : ''}`}
                          title="Listen in your language"
                        >
                          {isSpeakingId === msg.id ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{t('stopAudio', 'Stop')}</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              <span>{t('listen', 'Listen')}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl rounded-tl-xs border border-slate-200/80 dark:border-neutral-700 shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                </div>
              )}

              {/* Active Voice Listening Banner */}
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 p-3 rounded-2xl flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      {t('listeningNow')}
                    </span>
                  </div>
                  {/* Sound Wave Bars */}
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-3.5 bg-emerald-600 rounded-full animate-pulse"></span>
                    <span className="w-1 h-5 bg-emerald-600 rounded-full animate-pulse [animation-delay:0.1s]"></span>
                    <span className="w-1 h-2.5 bg-emerald-600 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                    <span className="w-1 h-6 bg-emerald-600 rounded-full animate-pulse [animation-delay:0.3s]"></span>
                    <span className="w-1 h-3 bg-emerald-600 rounded-full animate-pulse [animation-delay:0.15s]"></span>
                  </div>
                </motion.div>
              )}

              {/* Speech Error Banner */}
              {speechError && (
                <div className="text-[11px] text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 rounded-xl text-center font-medium">
                  {speechError}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white dark:bg-neutral-900 border-t border-slate-200/80 dark:border-neutral-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? t('listeningNow') : t('askKisanMitra')}
                className="flex-1 text-xs px-3.5 py-2.5 bg-slate-100 dark:bg-neutral-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-transparent focus:border-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-h-[44px]"
              />

              {/* Mic STT Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={toggleListening}
                className={`min-h-[44px] min-w-[44px] w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                }`}
                title={isListening ? 'Stop listening' : 'Speak your query'}
                aria-label={isListening ? 'Stop microphone' : 'Start voice input'}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </motion.button>

              {/* Send Message Button */}
              <motion.button
                type="submit"
                whileTap={{ scale: 0.92 }}
                disabled={!input.trim()}
                className="min-h-[44px] min-w-[44px] w-11 h-11 bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-neutral-800 text-white disabled:text-slate-400 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition"
                aria-label="Send message"
              >
                <svg className="w-4 h-4 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
