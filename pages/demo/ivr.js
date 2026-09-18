import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function IVRDemo() {
  const [step, setStep] = useState(0);

  const steps = [
    { text: "📞 Dialing 1800-180-1551...", delay: 2000, caller: 'system' },
    { text: "🔊 Namaste! Kisan Setu mein aapka swagat hai. Slot book karne ke liye 1 dabayein, status janne ke liye 2 dabayein.", delay: 4000, caller: 'ivr' },
    { text: "1", delay: 1000, caller: 'farmer' },
    { text: "🔊 Kripaya apna 12-ankon ka Aadhaar number darj karein.", delay: 3000, caller: 'ivr' },
    { text: "9 8 7 6 5 4 3 2 1 0 1 2", delay: 3000, caller: 'farmer' },
    { text: "🔊 Dhanyawad. Aapki fasal 'Gehu' aur mandi 'Pune APMC' chuni gayi hai. 20 September ke slot ke liye 1 dabayein, anya tareekh ke liye 2 dabayein.", delay: 5000, caller: 'ivr' },
    { text: "1", delay: 1000, caller: 'farmer' },
    { text: "🔊 Aapka slot 20 September, subah 10 baje ka book ho gaya hai. SMS dwara pushti bhej di gayi hai. Token number: 47. Kisan Setu mein call karne ke liye dhanyawad.", delay: 6000, caller: 'ivr' },
    { text: "Call Ended.", delay: 0, caller: 'system' }
  ];

  const playDemo = async () => {
    setStep(0);
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, steps[i].delay));
      setStep(i + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center justify-center font-sans">
      <Head><title>IVR Demo | Kisan Setu</title></Head>
      
      <div className="w-full max-w-sm bg-black rounded-[3rem] p-4 shadow-2xl border-8 border-gray-800 relative h-[700px] flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl" />
        
        {/* Screen */}
        <div className="flex-1 bg-gray-900 rounded-[2rem] overflow-hidden flex flex-col relative">
          
          <div className="p-4 bg-green-800 text-white flex justify-between items-center z-10 shadow">
            <Link href="/" className="text-xl">🔙</Link>
            <span className="font-bold">Feature Phone IVR</span>
            <span>📶</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-20">
            {step === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <span className="text-6xl mb-4">📱</span>
                <h2 className="text-xl font-bold text-white mb-2">IVR Fallback Demo</h2>
                <p className="text-gray-400 text-sm mb-8">For farmers without smartphones or internet access.</p>
                <button 
                  onClick={playDemo}
                  className="bg-green-600 text-white font-bold py-3 px-8 rounded-full w-full hover:bg-green-500 transition"
                >
                  Simulate Call
                </button>
              </div>
            )}

            {steps.slice(0, step).map((s, idx) => (
              <div 
                key={idx} 
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  s.caller === 'system' ? 'bg-gray-800 text-gray-400 text-center text-xs mx-auto w-full' :
                  s.caller === 'ivr' ? 'bg-gray-800 text-gray-200 mr-auto rounded-tl-sm border-l-4 border-green-500' :
                  'bg-green-600 text-white ml-auto rounded-tr-sm text-right'
                }`}
              >
                {s.text}
              </div>
            ))}
          </div>

          {/* Keypad Visual */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 p-4 rounded-b-[2rem] border-t border-gray-700">
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(key => (
                <div key={key} className="bg-gray-700 h-12 rounded flex items-center justify-center text-white font-bold text-xl active:bg-gray-600">
                  {key}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setStep(0)} className="flex-1 bg-red-600 h-12 rounded-full text-white font-bold">End Call</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center max-w-md">
        <h3 className="font-bold text-gray-800 text-lg">Universal Accessibility</h3>
        <p className="text-sm text-gray-600 mt-2">Kisan Setu works on any device. Feature phone users can dial the toll-free number and use the DTMF interactive voice response system to book slots, check status, and receive SMS confirmations.</p>
      </div>
    </div>
  );
}
