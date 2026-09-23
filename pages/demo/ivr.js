import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function IVRDemo() {
  const [history, setHistory] = useState([]);
  const [callState, setCallState] = useState('idle'); // idle, dialing, active
  const [ivrState, setIvrState] = useState('none');
  const [inputBuffer, setInputBuffer] = useState('');
  const chatRef = useRef(null);
  
  const addMsg = (text, caller) => {
    setHistory(prev => [...prev, { text, caller, id: Date.now() + Math.random() }]);
  };

  const speak = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN'; // Hindi voice
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const startCall = async () => {
    setHistory([]);
    setInputBuffer('');
    setCallState('dialing');
    addMsg("📞 Dialing 1800-180-1551...", 'system');
    
    setTimeout(() => {
      setCallState('active');
      setIvrState('welcome');
      const msg = "Namaste! Kisan Setu mein aapka swagat hai. Slot book karne ke liye, 1 dabayein. Status janne ke liye, 2 dabayein.";
      addMsg("🔊 " + msg, 'ivr');
      speak(msg);
    }, 2000);
  };

  const endCall = () => {
    stopAudio();
    if (callState !== 'idle') {
      setCallState('idle');
      setIvrState('none');
      setInputBuffer('');
      addMsg("Call Ended.", 'system');
    }
  };

  const handleKeyPress = (key) => {
    if (callState !== 'active') return;
    
    // Stop current audio when a key is pressed (interrupt)
    stopAudio();
    
    if (ivrState === 'welcome') {
      addMsg(key.toString(), 'farmer');
      if (key === 1) {
        setIvrState('aadhaar');
        setTimeout(() => {
          const msg = "Kripaya apna 12 ankon ka Aadhaar number darj karein.";
          addMsg("🔊 " + msg, 'ivr');
          speak(msg);
        }, 500);
      } else {
        setTimeout(() => {
          const msg = "Yeh suvidha abhi uplabdh nahi hai. Kripaya 1 dabayein.";
          addMsg("🔊 " + msg, 'ivr');
          speak(msg);
        }, 500);
      }
    } 
    else if (ivrState === 'aadhaar') {
      const newBuffer = inputBuffer + key;
      setInputBuffer(newBuffer);
      addMsg(key.toString(), 'farmer');
      
      if (newBuffer.length === 12) {
        setIvrState('confirm');
        setInputBuffer('');
        setTimeout(() => {
          const msg = `Dhanyawad. Aapki fasal 'Gehu' aur mandi 'Pune APMC' chuni gayi hai. 20 September ke slot ke liye 1 dabayein. Anya tareekh ke liye 2 dabayein.`;
          addMsg("🔊 " + msg, 'ivr');
          speak(msg);
        }, 1000);
      }
    }
    else if (ivrState === 'confirm') {
      addMsg(key.toString(), 'farmer');
      if (key === 1) {
        setIvrState('success');
        setTimeout(() => {
          const msg = "Aapka slot 20 September, subah 10 baje ka book ho gaya hai. SMS dwara pushti bhej di gayi hai. Token number hai, 4 7. Kisan Setu mein call karne ke liye dhanyawad.";
          addMsg("🔊 " + msg, 'ivr');
          speak(msg);
          
          setTimeout(() => {
            endCall();
          }, 8000);
        }, 500);
      } else {
        setTimeout(() => {
          const msg = "Operator ko transfer kiya jaa raha hai. Kripaya line par bane rahein.";
          addMsg("🔊 " + msg, 'ivr');
          speak(msg);
          setTimeout(endCall, 4000);
        }, 500);
      }
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--chassis)] p-6 flex flex-col items-center justify-center font-sans">
      <Head><title>Interactive IVR Demo | Kisan Setu</title></Head>
      
      {/* Industrial Device Housing */}
      <Card elevated={true} withScrews={true} withVents={true} className="w-full max-w-sm p-4 h-[750px] flex flex-col border border-white/50 bg-[#e0e5ec]">
        
        {/* Screen */}
        <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden flex flex-col relative shadow-recessed border-4 border-slate-700">
          
          <div className="p-3 bg-emerald-900 border-b border-emerald-700 text-emerald-100 flex justify-between items-center z-10 shadow font-mono text-xs uppercase tracking-wider">
            <Link href="/" className="hover:text-white transition-colors">BACK</Link>
            <span className="font-bold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${callState === 'active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-slate-500'}`}></span>
              {callState === 'active' ? 'CALL ACTIVE' : callState === 'dialing' ? 'CONNECTING...' : 'SYSTEM READY'}
            </span>
            <span>📶</span>
          </div>

          <div ref={chatRef} className="flex-1 p-4 overflow-y-auto space-y-4 pb-4 scrollbar-thin scrollbar-thumb-emerald-700">
            {callState === 'idle' && history.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-2">
                <div className="w-16 h-16 rounded-full bg-slate-800 shadow-floating flex items-center justify-center mb-6">
                  <span className="text-3xl text-emerald-500">📞</span>
                </div>
                <h2 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Interactive IVR Test</h2>
                <p className="text-slate-400 text-xs mb-8 leading-relaxed">Ensure your device volume is up. Click start, then use the keypad below to interact with the voice prompts.</p>
                <Button 
                  onClick={startCall}
                  variant="primary"
                  className="w-full"
                >
                  Start Call
                </Button>
              </div>
            )}

            {history.map((s) => (
              <div 
                key={s.id} 
                className={`max-w-[90%] rounded-lg px-4 py-3 text-sm shadow-md ${
                  s.caller === 'system' ? 'bg-slate-800 text-slate-400 text-center text-xs mx-auto w-full border border-slate-700' :
                  s.caller === 'ivr' ? 'bg-slate-800 text-emerald-50 mr-auto border-l-4 border-emerald-500' :
                  'bg-emerald-700 text-white ml-auto border border-emerald-600'
                }`}
              >
                {s.text}
              </div>
            ))}
          </div>
        </div>

        {/* Industrial Keypad */}
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(key => (
              <button 
                key={key} 
                onClick={() => handleKeyPress(key)}
                disabled={callState !== 'active'}
                className="h-14 rounded-lg bg-[var(--chassis)] shadow-card active:shadow-pressed active:translate-y-[2px] transition-all duration-150 flex items-center justify-center text-slate-700 font-black text-xl border border-white/40 select-none hover:text-emerald-700 hover:shadow-floating disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            {callState === 'idle' ? (
              <Button onClick={startCall} variant="primary" className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-700">
                Start New Call
              </Button>
            ) : (
              <Button onClick={endCall} variant="ghost" className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                End Call
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      <div className="mt-8 text-center max-w-md">
        <h3 className="font-bold text-slate-800 text-lg">Universal DTMF Demo</h3>
        <p className="text-sm text-slate-500 mt-2">Listen to the prompts and press the physical dial-pad buttons to navigate the flow just like a real phone call.</p>
      </div>
    </div>
  );
}
