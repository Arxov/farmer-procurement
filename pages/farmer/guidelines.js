import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import { getCropConfig } from '../../lib/cropIcons';
import { useLanguage } from '../../lib/i18n';

export default function Guidelines() {
  const [commodities, setCommodities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('commodities')
        .select('*')
        .order('name');
      setCommodities(data || []);
      if (data && data.length > 0) setSelected(data[0]);
      setLoading(false);
    };
    fetch();
  }, []);

  const guidelines = {
    wheat: {
      steps: [
        { title: 'Harvest Timing', desc: 'Harvest when grain moisture is below 20% and stalks turn golden-yellow.' },
        { title: 'Threshing', desc: 'Use mechanical thresher. Manual threshing leads to broken grains (FCI rejects above 6%).' },
        { title: 'Drying', desc: 'Spread on clean pucca floor. Sun-dry for 48-72 hours. Turn every 4 hours. Target: 14% moisture.' },
        { title: 'Cleaning', desc: 'Winnow to remove chaff, stones, and weed seeds. Admixture above 2% leads to rejection.' },
        { title: 'Storage', desc: 'Use clean, dry gunny bags. Store on raised platform away from walls. Prevent rat damage.' },
        { title: 'Transport', desc: 'Cover with tarpaulin during transport. Avoid exposure to rain or dew.' },
      ],
    },
    paddy: {
      steps: [
        { title: 'Harvest Timing', desc: 'Harvest when 80% of grains turn straw-coloured. Delay causes shattering losses.' },
        { title: 'Threshing', desc: 'Thresh within 24 hours of cutting to prevent grain deterioration.' },
        { title: 'Drying', desc: 'Sun-dry on clean floor for 2-3 days. Target moisture: 17%. Over-drying causes breakage.' },
        { title: 'Cleaning', desc: 'Remove empty husks, stones, and weed seeds. Keep admixture below 3%.' },
        { title: 'Quality Check', desc: 'Look for discolored, chalky, or damaged grains. FCI allows max 5% damaged.' },
        { title: 'Transport', desc: 'Use waterproof vehicle covering. Paddy absorbs moisture extremely fast.' },
      ],
    },
    soya: {
      steps: [
        { title: 'Harvest Timing', desc: 'Harvest when 95% of pods turn brown and leaves drop. Over-ripe pods shatter.' },
        { title: 'Threshing', desc: 'Adjust thresher speed to avoid splitting beans. Broken soyabean loses oil content.' },
        { title: 'Drying', desc: 'Sun-dry for 3-4 days until moisture drops below 12%. Store in jute bags.' },
        { title: 'Cleaning', desc: 'Remove soil, stones, and damaged beans. Max admixture: 2%.' },
        { title: 'Quality', desc: 'Avoid green/immature beans. Oil content test may be done at mandi.' },
        { title: 'Storage', desc: 'Keep in dry, ventilated area. High humidity causes fungal growth within days.' },
      ],
    },
    cotton: {
      steps: [
        { title: 'Picking', desc: 'Pick only fully open, dry bolls. Avoid morning dew hours (before 10 AM).' },
        { title: 'Sorting', desc: 'Separate stained, discoloured, or insect-damaged cotton. Keep different pickings separate.' },
        { title: 'Drying', desc: 'Spread cotton on clean surface in sun for 1-2 days. Target moisture: 12%.' },
        { title: 'Cleaning', desc: 'Remove all leaves, sticks, and coloured fibres. Max foreign matter: 1%.' },
        { title: 'Grading', desc: 'Longer staple length gets higher price. Avoid mixing short and long staple.' },
        { title: 'Packing', desc: 'Use clean white cotton bags. Avoid plastic bags (traps moisture).' },
      ],
    },
    default: {
      steps: [
        { title: 'Harvest at Right Time', desc: 'Do not harvest too early (immature) or too late (over-ripe, prone to shattering).' },
        { title: 'Proper Drying', desc: 'Sun-dry on clean surface until moisture is below the FCI limit for your crop.' },
        { title: 'Clean & Sort', desc: 'Remove foreign matter, damaged grains, and stones. High admixture leads to rejection.' },
        { title: 'Safe Storage', desc: 'Use dry, clean bags. Store on raised platforms. Protect from rain and pests.' },
        { title: 'Timely Transport', desc: 'Cover cargo during transport. Arrive at mandi on your scheduled slot date.' },
        { title: 'Bring Documents', desc: 'Carry your booking token, Aadhaar, and bank passbook for DBT payment.' },
      ],
    },
  };

  const getGuidelineKey = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('wheat')) return 'wheat';
    if (n.includes('paddy')) return 'paddy';
    if (n.includes('soya')) return 'soya';
    if (n.includes('cotton') || n.includes('kapas')) return 'cotton';
    return 'default';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;

  const guide = guidelines[getGuidelineKey(selected?.name)] || guidelines.default;
  const crop = getCropConfig(selected?.name || '');

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-neutral-900">
      <Head>
        <title>Crop Guidelines | Kisan Setu</title>
      </Head>

      <div className="bg-green-700 text-white px-4 py-6 rounded-b-3xl shadow-sm">
        <h1 className="text-2xl font-bold mb-1">{language === 'hi' ? 'फसल दिशानिर्देश' : 'Crop Guidelines'}</h1>
        <p className="text-green-100 text-sm">{language === 'hi' ? 'MSP पर स्वीकृति सुनिश्चित करने के लिए अपनी फसल तैयार करें' : 'Prepare your crop to guarantee MSP acceptance at mandi'}</p>
      </div>

      <div className="px-4 mt-5 max-w-lg mx-auto">
        {/* Crop Selector */}
        <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar">
          {commodities.map(c => {
            const cc = getCropConfig(c.name);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`whitespace-nowrap px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selected?.id === c.id
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700'
                }`}
              >
                <span className="notranslate">{cc.icon}</span> {c.name}
              </button>
            );
          })}
        </div>

        {selected && (
          <>
            {/* FCI Standards Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700 mt-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl notranslate">{crop.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-neutral-200">{selected.name}</h2>
                  {selected.hindi_name && <p className="text-xs text-gray-500 dark:text-neutral-400">{selected.hindi_name} | {selected.season} Season</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5 border border-amber-100 dark:border-amber-800 text-center">
                  <p className="text-[9px] uppercase font-bold text-amber-800 dark:text-amber-400 tracking-wider">Max Moisture</p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-500">{selected.max_moisture || 14}%</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 border border-blue-100 dark:border-blue-800 text-center">
                  <p className="text-[9px] uppercase font-bold text-blue-800 dark:text-blue-400 tracking-wider">Max Admixture</p>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-500">{selected.max_broken_percent || 6}%</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-2.5 border border-purple-100 dark:border-purple-800 text-center">
                  <p className="text-[9px] uppercase font-bold text-purple-800 dark:text-purple-400 tracking-wider">Govt MSP</p>
                  <p className="text-lg font-black text-purple-600 dark:text-purple-500">₹{Number(selected.msp_rate_per_quintal).toLocaleString()}</p>
                </div>
              </div>

              {selected.harvest_guidelines && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
                  <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
                    <span className="font-bold">Quick Tip:</span> {selected.harvest_guidelines}
                  </p>
                </div>
              )}
            </div>

            {/* Step-by-Step Guide */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700 mt-4">
              <h3 className="font-bold text-gray-700 dark:text-neutral-300 text-sm mb-4 flex items-center gap-2">
                📋 {language === 'hi' ? 'चरण-दर-चरण मार्गदर्शिका' : 'Step-by-Step Preparation Guide'}
              </h3>
              <div className="space-y-4">
                {guide.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-neutral-200">{step.title}</p>
                      <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Rejection Reasons */}
            <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-5 shadow-sm border border-red-100 dark:border-red-800 mt-4">
              <h3 className="font-bold text-red-800 dark:text-red-300 text-sm mb-3 flex items-center gap-2">
                ❌ {language === 'hi' ? 'सामान्य अस्वीकृति कारण' : 'Common Rejection Reasons'}
              </h3>
              <ul className="space-y-2">
                <li className="flex gap-2 items-start text-xs text-red-700 dark:text-red-400">
                  <span className="mt-0.5">•</span>
                  <span>Moisture above {selected.max_moisture || 14}% — most common reason for rejection across all mandis.</span>
                </li>
                <li className="flex gap-2 items-start text-xs text-red-700 dark:text-red-400">
                  <span className="mt-0.5">•</span>
                  <span>Foreign matter (stones, soil, weed seeds) above permissible limit.</span>
                </li>
                <li className="flex gap-2 items-start text-xs text-red-700 dark:text-red-400">
                  <span className="mt-0.5">•</span>
                  <span>Damaged/discolored grains due to fungus, insect attack, or improper storage.</span>
                </li>
                <li className="flex gap-2 items-start text-xs text-red-700 dark:text-red-400">
                  <span className="mt-0.5">•</span>
                  <span>Mixing different varieties or grades in the same lot.</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      <FarmerBottomNav />
    </div>
  );
}
