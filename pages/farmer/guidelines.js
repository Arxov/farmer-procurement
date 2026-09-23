import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function Guidelines() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="min-h-screen bg-[var(--chassis)] px-4 pt-8 pb-28 sm:pb-10 font-sans selection:bg-emerald-500/30">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link href="/farmer/dashboard" className="text-emerald-700 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition">
            &larr; Dashboard
          </Link>
        </div>

        {/* Hardware Binder / Manual Panel */}
        <Card elevated={true} withScrews={true} className="bg-[#e8ecef] p-4 border border-white/50 shadow-floating relative">
          
          <div className="mb-6 border-b-2 border-slate-300 pb-3 flex justify-between items-end">
            <div>
              <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">System Manual</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Vol. 4: Protocols & Procedures</p>
            </div>
            <div className="text-[9px] font-mono font-bold text-slate-400 border border-slate-300 px-1.5 py-0.5 rounded">
              REV: 2.1
            </div>
          </div>

          {/* Hardware Toggle Switch for Tabs */}
          <div className="bg-[var(--chassis)] p-1.5 rounded-xl shadow-recessed border border-white/60 mb-6 flex gap-1 relative overflow-hidden">
            <Button
              variant={activeTab === 'general' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('general')}
              className={`flex-1 text-[9px] py-2 h-auto ${activeTab === 'general' ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-amber-950' : 'bg-transparent border-transparent shadow-none'}`}
            >
              PROTOCOLS
            </Button>
            <Button
              variant={activeTab === 'crops' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('crops')}
              className={`flex-1 text-[9px] py-2 h-auto ${activeTab === 'crops' ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-amber-950' : 'bg-transparent border-transparent shadow-none'}`}
            >
              QUALITY STDS
            </Button>
            <Button
              variant={activeTab === 'market' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('market')}
              className={`flex-1 text-[9px] py-2 h-auto ${activeTab === 'market' ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-amber-950' : 'bg-transparent border-transparent shadow-none'}`}
            >
              MARKET DATA
            </Button>
          </div>

          <div className="bg-[#f8fafc] rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,1)] border border-slate-300 p-4 min-h-[300px]">
            {activeTab === 'general' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-[10px] text-slate-500 font-black mb-2 uppercase tracking-widest border-b-2 border-slate-200 pb-1">
                    SECTION 1: REQ. DOCUMENTS
                  </h3>
                  <ul className="list-disc pl-4 text-xs font-bold text-slate-700 space-y-2 uppercase">
                    <li>AADHAAR CARD (MOBILE LINKED)</li>
                    <li>BANK PASSBOOK (DBT COMPLIANT)</li>
                    <li>LAND RECORDS (7/12 EXTRACT)</li>
                    <li>BOOKING TOKEN (DIGITAL OR PRINT)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[10px] text-slate-500 font-black mb-2 uppercase tracking-widest border-b-2 border-slate-200 pb-1">
                    SECTION 2: WEIGHBRIDGE SOP
                  </h3>
                  <ol className="list-decimal pl-4 text-xs font-bold text-slate-700 space-y-2 uppercase">
                    <li>ARRIVE STRICTLY DURING ALLOTTED TIME SLOT.</li>
                    <li>PROCEED TO DIGITAL WEIGHBRIDGE FOR GROSS WEIGHT.</li>
                    <li>AFTER UNLOADING, TARE WEIGHT IS RECORDED.</li>
                    <li>COLLECT PHYSICAL WEIGHMENT SLIP FROM OPERATOR.</li>
                  </ol>
                </div>
              </div>
            )}

            {activeTab === 'crops' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <div className="flex justify-between items-center border-b-2 border-amber-200 pb-1 mb-2">
                    <h3 className="text-[10px] text-amber-800 font-black uppercase tracking-widest">
                      WHEAT & PADDY (CEREALS)
                    </h3>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black border border-amber-200">MAX MOISTURE: 14%</span>
                  </div>
                  <ul className="list-disc pl-4 text-xs font-bold text-slate-700 space-y-2 uppercase">
                    <li>SUN-DRY HARVEST &ge;48 HRS BEFORE PACKING.</li>
                    <li>REMOVE CHAFF & DUST VIA SIEVING.</li>
                    <li>DO NOT HARVEST POST-RAINFALL.</li>
                    <li>TARP COVERS MANDATORY DURING TRANSIT.</li>
                  </ul>
                </div>

                <div>
                  <div className="flex justify-between items-center border-b-2 border-emerald-200 pb-1 mb-2">
                    <h3 className="text-[10px] text-emerald-800 font-black uppercase tracking-widest">
                      SOYABEAN & PULSES
                    </h3>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black border border-emerald-200">MAX MOISTURE: 12%</span>
                  </div>
                  <ul className="list-disc pl-4 text-xs font-bold text-slate-700 space-y-2 uppercase">
                    <li>PODS MUST BE 100% DRY. MOISTURE = FUNGUS = REJECTION.</li>
                    <li>NO MIXING OF OLD STOCK WITH FRESH HARVEST.</li>
                    <li>VENTILATED GUNNY BAGS ONLY. NO PLASTIC.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'market' && (
              <div className="space-y-5 animate-fadeIn">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed mb-4 p-2 bg-slate-100 rounded border border-slate-200">
                  SYSTEM ADVISORIES UPDATED VIA LIVE AGMARKNET FEED. DATA IS PREDICTIVE.
                </p>

                <div className="bg-red-50 p-3 rounded-lg border border-red-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                  <h3 className="text-[10px] text-red-800 font-black mb-1 uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    WARN: WHEAT OVERSUPPLY
                  </h3>
                  <p className="text-xs font-bold text-red-900/80 uppercase leading-relaxed mt-2">
                    HEAVY ARRIVALS DETECTED IN LOCAL MANDIS. WAIT TIMES EXTENDED. QUALITY CHECKS STRICT. BOOK SLOTS &ge;3 DAYS IN ADVANCE.
                  </p>
                </div>

                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                  <h3 className="text-[10px] text-emerald-800 font-black mb-1 uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    DEMAND SURGE: TUR (PULSES)
                  </h3>
                  <p className="text-xs font-bold text-emerald-900/80 uppercase leading-relaxed mt-2">
                    OPEN MARKET RATES EXCEEDING MSP LOCALLY. EVALUATE SPOT MARKET BIDS BEFORE GOVERNMENT PROCUREMENT LOG-IN.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      <FarmerBottomNav />
    </div>
  );
}
