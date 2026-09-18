import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function KisanMitraWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Buttons */}
      <div className="fixed bottom-20 md:bottom-8 right-4 flex flex-col gap-3 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-transform hover:scale-110 relative"
        >
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-yellow-200">AI</span>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
        
        <button 
          onClick={() => {
            alert('Voice Assistant activated! (Simulation)');
          }}
          className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-transform hover:scale-110"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>
      </div>

      {/* Mock Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 md:bottom-24 right-4 w-[320px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">🤖</div>
                <div>
                  <h3 className="text-sm font-bold">Kisan Mitra AI</h3>
                  <p className="text-[10px] text-emerald-100">Trilingual Voice Assistant</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-4 h-[250px] overflow-y-auto bg-gray-50 dark:bg-neutral-800 space-y-3">
              <div className="bg-white dark:bg-neutral-700 p-3 rounded-xl rounded-tl-none border border-gray-100 dark:border-neutral-600 shadow-sm text-xs text-gray-800 dark:text-neutral-200 max-w-[85%]">
                नमस्ते! I am Kisan Mitra. How can I help you with your harvest today?
              </div>
              
              <div className="flex justify-end">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-xl rounded-tr-none text-xs text-emerald-900 dark:text-emerald-100 max-w-[85%]">
                  I have 50 quintals of wheat to sell. (गेहूँ बेचना है)
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-700 p-3 rounded-xl rounded-tl-none border border-gray-100 dark:border-neutral-600 shadow-sm text-xs text-gray-800 dark:text-neutral-200 max-w-[85%]">
                <p>Prices are highest at Pune APMC today (₹2,150/qtl).</p>
                <button className="mt-2 w-full py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Book slot for tomorrow?</button>
              </div>
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 flex gap-2">
              <input type="text" placeholder="Type or speak (मराठी/हिंदी)..." className="flex-1 text-xs px-3 py-2 bg-gray-100 dark:bg-neutral-800 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800 dark:text-gray-200" disabled />
              <button className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
