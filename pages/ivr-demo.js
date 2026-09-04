import { useState } from 'react';
import Link from 'next/link';

export default function IvrDemo() {
  const [callActive, setCallActive] = useState(false);
  const [step, setStep] = useState(0); // 0: not in call, 1: lang, 2: crop, 3: centre, 4: confirmed
  const [selectedLang, setSelectedLang] = useState('hi');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedMandi, setSelectedMandi] = useState('');
  const [tokenNumber, setTokenNumber] = useState(null);
  const [smsReceived, setSmsReceived] = useState(false);

  // Play audio voice prompt using browser SpeechSynthesis
  const speak = (text, langCode = 'hi-IN') => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startCall = () => {
    setCallActive(true);
    setStep(1);
    setSmsReceived(false);
    speak("किसान खरीद सेवा में आपका स्वागत है। हिंदी के लिए 1 दबाएं। For English, press 2.", "hi-IN");
  };

  const pressKey = (key) => {
    if (!callActive) return;

    if (step === 1) {
      if (key === '1') {
        setSelectedLang('hi');
        setStep(2);
        speak("फसल चुनें। गेहूं के लिए 1 दबाएं। धान के लिए 2 दबाएं। तुअर के लिए 3 दबाएं।", "hi-IN");
      } else if (key === '2') {
        setSelectedLang('en');
        setStep(2);
        speak("Select your crop. Press 1 for Wheat. Press 2 for Paddy. Press 3 for Tur.", "en-IN");
      }
    } else if (step === 2) {
      const cropMap = { '1': 'गेहूं (Wheat)', '2': 'धान (Paddy)', '3': 'तुअर (Tur)' };
      if (cropMap[key]) {
        setSelectedCrop(cropMap[key]);
        setStep(3);
        if (selectedLang === 'hi') {
          speak("मंडी केंद्र चुनें। पुणे मंडी के लिए 1 दबाएं। बारामती केंद्र के लिए 2 दबाएं।", "hi-IN");
        } else {
          speak("Select Mandi centre. Press 1 for Pune APMC. Press 2 for Baramati Centre.", "en-IN");
        }
      }
    } else if (step === 3) {
      const mandiMap = { '1': 'Sector 12 Mandi (Pune)', '2': 'Baramati Centre' };
      if (mandiMap[key]) {
        setSelectedMandi(mandiMap[key]);
        const randToken = Math.floor(Math.random() * 80) + 12;
        setTokenNumber(randToken);
        setStep(4);

        if (selectedLang === 'hi') {
          speak(`आपका स्लॉट कल सुबह 10 बजे बुक हो गया है। आपका टोकन नंबर ${randToken} है। विवरण एसएमएस द्वारा भेजा गया है। धन्यवाद।`, "hi-IN");
        } else {
          speak(`Your slot is confirmed for tomorrow 10 AM. Your token number is ${randToken}. Details have been sent via SMS. Thank you.`, "en-IN");
        }

        setTimeout(() => {
          setSmsReceived(true);
        }, 1800);
      }
    }
  };

  const endCall = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallActive(false);
    setStep(0);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-8 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <Link href="/farmer/dashboard" className="text-emerald-400 text-xs font-semibold hover:underline inline-flex items-center gap-1 mb-1">
              &larr; Return to Dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Toll-Free IVR & Feature Phone Simulator
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive demonstration for SIH26032: Enabling slot booking without internet or smartphones.
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono px-2.5 py-1 rounded-full">
              Toll-Free: 1800-200-26032
            </span>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Feature Phone */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-72 bg-slate-800 rounded-3xl p-5 border-4 border-slate-700 shadow-2xl shadow-emerald-950/40">
              {/* Speaker & Brand */}
              <div className="flex flex-col items-center mb-3">
                <div className="w-10 h-1 bg-slate-600 rounded-full mb-1" />
                <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase">KISAN CONNECT</span>
              </div>

              {/* Phone Screen */}
              <div className="bg-emerald-950/70 border-2 border-emerald-800/80 rounded-xl p-3 h-44 flex flex-col justify-between text-emerald-300 font-mono shadow-inner mb-4 relative overflow-hidden">
                <div className="flex justify-between text-[10px] text-emerald-400/80 border-b border-emerald-900 pb-1">
                  <span>📶 2G GSM</span>
                  <span>10:45 AM</span>
                  <span>🔋 92%</span>
                </div>

                <div className="py-2 text-center text-xs flex-1 flex flex-col justify-center">
                  {!callActive && (
                    <div>
                      <p className="text-slate-300 text-sm font-bold">1800-200-26032</p>
                      <p className="text-[11px] text-emerald-400 mt-1">Press Call to connect</p>
                    </div>
                  )}

                  {callActive && step === 1 && (
                    <div>
                      <p className="text-emerald-200 font-bold text-xs">🔊 Audio Playing...</p>
                      <p className="text-[11px] mt-1 text-white">Press 1 for Hindi</p>
                      <p className="text-[11px] text-white">Press 2 for English</p>
                    </div>
                  )}

                  {callActive && step === 2 && (
                    <div>
                      <p className="text-emerald-200 font-bold text-xs">Select Crop:</p>
                      <p className="text-[11px] text-white mt-0.5">1: Wheat (गेहूं)</p>
                      <p className="text-[11px] text-white">2: Paddy (धान)</p>
                      <p className="text-[11px] text-white">3: Tur (तुअर)</p>
                    </div>
                  )}

                  {callActive && step === 3 && (
                    <div>
                      <p className="text-emerald-200 font-bold text-xs">Select Mandi:</p>
                      <p className="text-[11px] text-white mt-0.5">1: Pune APMC</p>
                      <p className="text-[11px] text-white">2: Baramati Mandi</p>
                    </div>
                  )}

                  {callActive && step === 4 && (
                    <div>
                      <p className="text-emerald-300 font-bold text-xs">✅ BOOKED!</p>
                      <p className="text-sm font-black text-white mt-1">Token #{tokenNumber}</p>
                      <p className="text-[10px] text-emerald-400 mt-0.5">SMS dispatched</p>
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-center text-emerald-500/80 border-t border-emerald-900 pt-1">
                  {callActive ? '🔴 In Call • Tap keys below' : '⚪ Ready'}
                </div>
              </div>

              {/* Call Controls */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={startCall}
                  disabled={callActive}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl py-2 font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition"
                >
                  📞 Call
                </button>
                <button
                  onClick={endCall}
                  disabled={!callActive}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl py-2 font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition"
                >
                  🛑 End
                </button>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => (
                  <button
                    key={k}
                    onClick={() => pressKey(k)}
                    className="bg-slate-700 hover:bg-slate-600 active:bg-slate-50 dark:bg-neutral-9500 text-white rounded-xl py-2.5 text-sm font-bold shadow-xs transition"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Virtual SMS Notification Card */}
            {smsReceived && (
              <div className="mt-5 w-72 bg-emerald-900/90 border border-emerald-500 text-emerald-100 p-3 rounded-2xl shadow-xl animate-bounce">
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                  <span>📩</span>
                  <span>SMS from GOV-CFPP</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  प्रिय किसान, आपका टोकन <strong>#{tokenNumber}</strong> कल 10:00 AM के लिए {selectedMandi} में कन्फर्म है। फसल: {selectedCrop}। गेट पास लिंक: cfpp.gov.in/t/{tokenNumber}
                </p>
              </div>
            )}
          </div>

          {/* Right: Architectural Explanation For Evaluation Jury */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-emerald-400 mb-2">
                Why IVR Integration Wins Hackathons
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Over <strong>42% of marginal farmers</strong> in India use 2G feature phones without access to Android or web browsers. Our architecture ensures complete digital inclusion by plugging an Interactive Voice Response (IVR) gateway directly into the same Supabase database backend.
              </p>
            </div>

            {/* System Flow Diagram */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                End-to-End IVR Architecture
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">1</div>
                  <div>
                    <p className="font-bold text-white">Farmer Dials Toll-Free Number</p>
                    <p className="text-slate-400 mt-0.5">Incoming call routed through Telecom PSTN to Asterisk/Twilio Voice Gateway.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">2</div>
                  <div>
                    <p className="font-bold text-white">DTMF Keypad & Language Selection</p>
                    <p className="text-slate-400 mt-0.5">Prompts delivered in local regional languages (Hindi, Marathi, Punjabi, Tamil).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">3</div>
                  <div>
                    <p className="font-bold text-white">Automated Booking via REST API</p>
                    <p className="text-slate-400 mt-0.5">Webhook invokes <code>/api/bookings/create</code>, reserving capacity and computing queue position.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">4</div>
                  <div>
                    <p className="font-bold text-white">Instant SMS Confirmation</p>
                    <p className="text-slate-400 mt-0.5">SMS gateway sends token number, date, and gate pass PIN to farmer's mobile.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Try It Instructions */}
            <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-2xl p-4 text-xs">
              <p className="font-bold text-emerald-300">💡 Interactive Demo Instructions:</p>
              <ol className="list-decimal list-inside text-emerald-200/90 mt-1 space-y-1">
                <li>Ensure computer speakers are on, then click the green <strong>Call</strong> button.</li>
                <li>Listen to the voice prompt and tap <strong>1</strong> for Hindi or <strong>2</strong> for English.</li>
                <li>Tap <strong>1</strong> for Wheat, then <strong>1</strong> for Pune APMC.</li>
                <li>Observe the simulated audio confirmation and watch the instant SMS notification pop up!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
        SIH26032 Ministry of Consumer Affairs, Food & Public Distribution • Central Farmer Procurement Platform
      </footer>
    </div>
  );
}
