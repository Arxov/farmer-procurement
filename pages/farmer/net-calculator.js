import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import { useLanguage } from '../../lib/i18n';
import { getCropConfig } from '../../lib/cropIcons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import Link from 'next/link';

export default function NetCalculator() {
  const [commodities, setCommodities] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [quantity, setQuantity] = useState('');
  const [distance, setDistance] = useState('');
  const [transportMode, setTransportMode] = useState('solo');
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('commodities').select('*').order('name');
      setCommodities(data || []);
      if (data?.length > 0) setSelectedCrop(data[0].id);
      setLoading(false);
    };
    fetch();
  }, []);

  const crop = commodities.find(c => c.id === selectedCrop);
  const msp = crop ? Number(crop.msp_rate_per_quintal) : 0;
  const q = Number(quantity) || 0;
  const d = Number(distance) || 0;

  // Constants
  const PER_KM_RATE = transportMode === 'solo' ? 45 : 18; // Pooled transport is much cheaper
  const LABOUR_PER_Q = 12; // Loading/unloading
  const APMC_FEE_PCT = 0.01; // 1% mandi fee
  const BAG_COST = 25; // per quintal

  const grossValue = msp * q;
  const freight = d * PER_KM_RATE * (q > 0 ? (q/20 > 1 ? q/20 : 1) : 0); // Scale by trips
  const handling = q * LABOUR_PER_Q;
  const bags = q * BAG_COST;
  const apmcFee = grossValue * APMC_FEE_PCT;
  
  const totalDeductions = freight + handling + bags + apmcFee;
  const netTakeHome = grossValue - totalDeductions;
  const realizationPct = grossValue > 0 ? (netTakeHome / grossValue) * 100 : 0;

  if (loading) return <div className="min-h-screen bg-[var(--chassis)] flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest"><div className="animate-spin w-6 h-6 border-4 border-slate-500 border-t-transparent rounded-full mr-3" /> LOADING...</div>;

  return (
    <div className="min-h-screen bg-[var(--chassis)] pb-24 font-sans selection:bg-emerald-500/30">
      <Head>
        <title>Net Realization Calculator | Kisan Setu</title>
      </Head>

      <div className="max-w-md mx-auto px-4 pt-8">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link href="/farmer/dashboard" className="text-emerald-700 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition">
            &larr; Dashboard
          </Link>
        </div>

        {/* Physical Hardware Calculator Housing */}
        <Card elevated={true} withScrews={true} withVents={true} className="bg-[#e0e5ec] p-4 border border-white/50 w-full shadow-floating">
          
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NET YIELD CALC V1.0</span>
            <span className="text-[9px] font-bold text-slate-400 bg-white/50 px-2 py-0.5 rounded shadow-recessed inset-0">SOLAR PWR</span>
          </div>

          {/* LCD Display Screen */}
          <div className="bg-[#9ea79a] shadow-[inset_0_4px_8px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,1)] rounded-lg p-4 mb-6 border-4 border-[#8b9588] relative">
            {/* Screen Glass glare effect */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-lg pointer-events-none" />
            
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] text-slate-800/60 font-black uppercase tracking-widest">GROSS MSP</span>
              <span className="font-mono text-xl text-slate-800 font-black tracking-tight">{grossValue > 0 ? `₹${Math.round(grossValue).toLocaleString()}` : '0.00'}</span>
            </div>
            
            <div className="flex justify-between items-end border-b-2 border-slate-800/20 pb-2 mb-2">
              <span className="text-[10px] text-slate-800/60 font-black uppercase tracking-widest">- DEDUCTIONS</span>
              <span className="font-mono text-lg text-slate-800/80 font-bold tracking-tight">{totalDeductions > 0 ? `₹${Math.round(totalDeductions).toLocaleString()}` : '0.00'}</span>
            </div>
            
            <div className="flex justify-between items-end">
              <span className="text-[12px] text-slate-900 font-black uppercase tracking-widest">NET REALIZATION</span>
              <span className="font-mono text-3xl text-slate-900 font-black tracking-tighter drop-shadow-sm">{netTakeHome > 0 ? `₹${Math.round(netTakeHome).toLocaleString()}` : '0.00'}</span>
            </div>
            {grossValue > 0 && (
              <div className="text-right mt-1">
                <span className="text-[10px] font-mono font-bold text-slate-800/80 tracking-widest bg-slate-800/10 px-1.5 py-0.5 rounded">
                  MARGIN: {realizationPct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Input Controls */}
          <div className="space-y-4 px-2">
            
            <div className="bg-[var(--chassis)] p-4 rounded-xl shadow-recessed border border-white/60">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">COMMODITY SELECTOR</label>
              <select 
                value={selectedCrop} 
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full bg-[#f8fafc] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,1)] border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-700"
              >
                {commodities.map(c => (
                  <option key={c.id} value={c.id}>{getCropConfig(c.name).icon} {c.name.toUpperCase()} (₹{c.msp_rate_per_quintal}/Q)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--chassis)] p-4 rounded-xl shadow-recessed border border-white/60">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">QTY (QTL)</label>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-[#f8fafc] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,1)] border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-700 font-mono text-right"
                />
              </div>
              <div className="bg-[var(--chassis)] p-4 rounded-xl shadow-recessed border border-white/60">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">DIST (KM)</label>
                <input 
                  type="number" 
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-[#f8fafc] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,1)] border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-700 font-mono text-right"
                />
              </div>
            </div>

            <div className="bg-[var(--chassis)] p-4 rounded-xl shadow-recessed border border-white/60">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">TRANSPORT MODE TOGGLE</label>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setTransportMode('solo')}
                  variant={transportMode === 'solo' ? 'primary' : 'secondary'}
                  className={`flex-1 text-[10px] py-2 h-auto ${transportMode === 'solo' ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_#f59e0b,inset_0_1px_2px_rgba(255,255,255,0.4)]' : ''}`}
                >
                  🚜 SOLO
                </Button>
                <Button 
                  onClick={() => setTransportMode('pooled')}
                  variant={transportMode === 'pooled' ? 'primary' : 'secondary'}
                  className={`flex-1 text-[10px] py-2 h-auto ${transportMode === 'pooled' ? 'bg-emerald-500 border-emerald-600 shadow-[0_0_10px_#10b981,inset_0_1px_2px_rgba(255,255,255,0.4)]' : ''}`}
                >
                  🤝 POOLED
                </Button>
              </div>
            </div>

            {/* Print out slip for deductions */}
            {q > 0 && (
              <div className="mt-4 border-t-2 border-dashed border-slate-400/30 pt-4 px-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">DEDUCTIONS BREAKDOWN</p>
                <div className="space-y-1 font-mono text-xs text-slate-600 font-bold">
                  <div className="flex justify-between">
                    <span>FREIGHT ({transportMode.toUpperCase()})</span>
                    <span className="text-red-700/80">- {Math.round(freight)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LABOR/HANDLING</span>
                    <span className="text-red-700/80">- {Math.round(handling)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>APMC FEE (1%)</span>
                    <span className="text-red-700/80">- {Math.round(apmcFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GUNNY BAGS</span>
                    <span className="text-red-700/80">- {Math.round(bags)}</span>
                  </div>
                </div>

                {transportMode === 'solo' && d > 15 && (
                  <div className="mt-4 bg-amber-200/50 rounded p-2 text-center shadow-recessed">
                    <p className="text-[9px] font-black text-amber-900 uppercase tracking-widest leading-tight">
                      ⚠️ TIP: POOLED TRANSPORT SAVES ₹{Math.round(freight - (d * 18 * (q/20 > 1 ? q/20 : 1)))} ON THIS TRIP.
                    </p>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </Card>
      </div>
      <FarmerBottomNav />
    </div>
  );
}
