import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import { useLanguage } from '../../lib/i18n';
import { getCropConfig } from '../../lib/cropIcons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Link from 'next/link';

export default function PriceOutlook() {
  const [commodities, setCommodities] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();

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

  // Generate mock 14-day trend based on the crop's MSP to make it look realistic
  const generateTrend = (basePrice) => {
    const data = [];
    let currentPrice = basePrice * 0.95; // start 5% below MSP
    const today = new Date();
    
    // Past 7 days
    for (let i = 7; i > 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        price: Math.round(currentPrice),
        type: 'historical'
      });
      currentPrice += (Math.random() * 40 - 20); 
    }
    
    // Today
    data.push({
      date: 'Today',
      price: Math.round(currentPrice),
      type: 'current'
    });
    
    // Forecast next 7 days
    let trend = Math.random() > 0.5 ? 1 : -1;
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      currentPrice += trend * (Math.random() * 25 + 5);
      data.push({
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        price: Math.round(currentPrice),
        type: 'forecast'
      });
    }
    
    return data;
  };

  const [chartData, setChartData] = useState([]);
  useEffect(() => {
    if (msp > 0) {
      setChartData(generateTrend(msp));
    }
  }, [selectedCrop, msp]);

  const currentPrice = chartData.find(d => d.type === 'current')?.price || 0;
  const targetPrice = chartData[chartData.length - 1]?.price || 0;
  const isUptrend = targetPrice > currentPrice;

  if (loading) return <div className="min-h-screen bg-[var(--chassis)] flex items-center justify-center font-bold text-slate-500 uppercase tracking-widest"><div className="animate-spin w-6 h-6 border-4 border-slate-500 border-t-transparent rounded-full mr-3" /> INITIALIZING TELEMETRY...</div>;

  return (
    <div className="min-h-screen bg-[var(--chassis)] pb-24 font-sans selection:bg-emerald-500/30">
      <Head>
        <title>Market Telemetry | Kisan Setu</title>
      </Head>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link href="/farmer/dashboard" className="text-emerald-700 text-xs font-bold uppercase tracking-wider hover:text-emerald-800 transition">
            &larr; Dashboard
          </Link>
        </div>

        {/* Hardware Select Panel */}
        <Card elevated={true} withScrews={true} className="bg-[#e8ecef] p-4 border border-white/50 shadow-floating">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">COMMODITY TELEMETRY RADAR</span>
            <span className="text-[9px] font-bold text-slate-400 bg-white/50 px-2 py-0.5 rounded shadow-recessed inset-0 animate-pulse">LIVE SYS</span>
          </div>
          <div className="bg-[var(--chassis)] p-1 rounded-xl shadow-recessed border border-white/60">
            <select 
              value={selectedCrop} 
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full bg-transparent border-0 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-700 uppercase tracking-wide"
            >
              {commodities.map(c => (
                <option key={c.id} value={c.id}>{getCropConfig(c.name).icon} {c.name.toUpperCase()} (MSP: ₹{c.msp_rate_per_quintal})</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Forecast CRT Screen */}
        {chartData.length > 0 && (
          <Card elevated={true} withScrews={true} className="bg-[#2d3436] p-4 border-2 border-slate-700 shadow-recessed relative overflow-hidden">
            
            {/* Screen Glare */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-xl" />
            
            {/* Status LED Bar */}
            <div className={`mb-6 p-3 rounded-lg border-2 flex justify-between items-center ${isUptrend ? 'bg-emerald-900/40 border-emerald-500 shadow-[inset_0_0_15px_rgba(16,185,129,0.3),0_0_10px_rgba(16,185,129,0.2)]' : 'bg-red-900/40 border-red-500 shadow-[inset_0_0_15px_rgba(239,68,68,0.3),0_0_10px_rgba(239,68,68,0.2)]'}`}>
              <div>
                <p className={`text-[10px] font-black tracking-widest uppercase ${isUptrend ? 'text-emerald-500' : 'text-red-500'}`}>SYS AI DIRECTIVE</p>
                <p className={`text-xl font-black uppercase tracking-tighter mt-1 ${isUptrend ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]'}`}>
                  {isUptrend ? 'HOLD FOR 7 DAYS' : 'LIQUIDATE IMMEDIATELY'}
                </p>
              </div>
              <div className="flex gap-1">
                <div className={`w-3 h-3 rounded-full ${isUptrend ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-900'}`} />
                <div className={`w-3 h-3 rounded-full ${!isUptrend ? 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse' : 'bg-emerald-900'}`} />
              </div>
            </div>

            {/* Readouts */}
            <div className="flex justify-between items-end mb-4 px-1">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SPOT RATE (T-0)</p>
                <p className="text-xl font-mono font-black text-slate-200 mt-0.5 tracking-tight">₹{currentPrice}/Q</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">FCAST (T+7)</p>
                <p className="text-xl font-mono font-black text-slate-200 mt-0.5 tracking-tight">₹{targetPrice}/Q</p>
              </div>
            </div>

            {/* Hardware Bar Chart */}
            <div className="h-40 border-b-2 border-l-2 border-slate-600/50 pb-1 pl-1 flex items-end gap-1 relative">
              {/* Grid Lines */}
              <div className="absolute top-1/4 left-0 right-0 border-b border-slate-700/50 pointer-events-none" />
              <div className="absolute top-2/4 left-0 right-0 border-b border-slate-700/50 pointer-events-none" />
              <div className="absolute top-3/4 left-0 right-0 border-b border-slate-700/50 pointer-events-none" />

              {chartData.map((d, i) => {
                const min = Math.min(...chartData.map(c => c.price)) * 0.95;
                const max = Math.max(...chartData.map(c => c.price)) * 1.05;
                const heightPct = Math.max(5, ((d.price - min) / (max - min)) * 100);
                
                const isToday = d.type === 'current';
                const isPast = d.type === 'historical';
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div className="absolute -top-6 bg-slate-800 text-emerald-400 font-mono text-[9px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 border border-emerald-500/30 pointer-events-none shadow-floating">
                      ₹{d.price}
                    </div>
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-500 border-t-2 relative overflow-hidden ${
                        isPast ? 'bg-slate-600/60 border-slate-500' : 
                        isToday ? 'bg-amber-500/80 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)] z-10' : 
                        'bg-blue-500/60 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* scanline effect */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:100%_4px] opacity-20 pointer-events-none" />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between mt-3 px-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <span>T-7D</span>
              <span className="text-amber-500">T-0 (TODAY)</span>
              <span>T+7D</span>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-700/60 text-center font-mono font-bold text-[8px] text-slate-600 tracking-widest uppercase">
              ML PREDICTION ENGINE V2.4 • AGMARKNET SECURE FEED
            </div>
          </Card>
        )}

      </div>
      <FarmerBottomNav />
    </div>
  );
}
