import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSupabaseClient } from '../../lib/supabaseClient';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import LanguageToggle from '../../components/LanguageToggle';
import { useLanguage } from '../../lib/i18n';
import { getCropConfig } from '../../lib/cropIcons';

export default function NetCalculator() {
  const supabase = useSupabaseClient();
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-neutral-900">
      <Head>
        <title>Net Realization Calculator | Kisan Setu</title>
      </Head>

      <div className="bg-green-700 text-white px-4 py-6 rounded-b-3xl shadow-sm relative">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-1">{language === 'hi' ? 'शुद्ध आय कैलकुलेटर' : 'Net Realization Calculator'}</h1>
            <p className="text-green-100 text-sm">{language === 'hi' ? 'मंडी शुल्क और परिवहन के बाद अपनी वास्तविक कमाई जानें' : 'Know your true take-home after transport & mandi fees'}</p>
          </div>
          <LanguageToggle />
        </div>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto space-y-4">
        
        {/* Input Form */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-neutral-300 mb-1">Select Crop</label>
              <select 
                value={selectedCrop} 
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:border-green-500 block p-3 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
              >
                {commodities.map(c => (
                  <option key={c.id} value={c.id}>{getCropConfig(c.name).icon} {c.name} (MSP: ₹{c.msp_rate_per_quintal}/q)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-neutral-300 mb-1">Quantity (Quintals)</label>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:border-green-500 block p-3 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-neutral-300 mb-1">Distance to Mandi (km)</label>
                <input 
                  type="number" 
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="e.g. 40"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-green-500 focus:border-green-500 block p-3 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-neutral-300 mb-1">Transport Mode</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTransportMode('solo')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${transportMode === 'solo' ? 'bg-orange-100 text-orange-800 border-2 border-orange-500' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                >
                  🚜 Solo Tractor
                </button>
                <button 
                  onClick={() => setTransportMode('pooled')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${transportMode === 'pooled' ? 'bg-green-100 text-green-800 border-2 border-green-500' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                >
                  🤝 Pooled Transport
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {q > 0 && (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-700 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Gross Value (MSP)</p>
                <p className="text-lg font-black text-gray-800 dark:text-white">₹{Math.round(grossValue).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600 uppercase tracking-wider font-bold">Net Realization</p>
                <p className="text-xl font-black text-green-600">₹{Math.round(netTakeHome).toLocaleString()}</p>
                <p className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full inline-block mt-0.5">{(realizationPct).toFixed(1)}% of Gross</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-1 dark:border-neutral-700">Estimated Deductions</p>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-neutral-400">Freight ({distance}km @ ₹{PER_KM_RATE}/km)</span>
                <span className="font-semibold text-red-500">-₹{Math.round(freight).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-neutral-400">Loading/Unloading</span>
                <span className="font-semibold text-red-500">-₹{Math.round(handling).toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-neutral-400">APMC Commission (1%)</span>
                <span className="font-semibold text-red-500">-₹{Math.round(apmcFee).toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-neutral-400">Gunny Bags</span>
                <span className="font-semibold text-red-500">-₹{Math.round(bags).toLocaleString()}</span>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-neutral-700 flex justify-between font-bold">
                <span className="text-gray-800 dark:text-neutral-200">Total Deductions</span>
                <span className="text-red-600">-₹{Math.round(totalDeductions).toLocaleString()}</span>
              </div>
            </div>
            
            {transportMode === 'solo' && d > 15 && (
              <div className="bg-orange-50 border-t border-orange-100 p-3">
                <p className="text-xs text-orange-800 font-medium">
                  💡 Tip: Using a pooled transport with other farmers could save you <strong className="font-bold">₹{Math.round(freight - (d * 18 * (q/20 > 1 ? q/20 : 1))).toLocaleString()}</strong> on freight!
                </p>
              </div>
            )}
          </div>
        )}

      </div>
      <FarmerBottomNav />
    </div>
  );
}
