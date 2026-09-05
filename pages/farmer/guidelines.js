import { useState } from 'react';
import Head from 'next/head';
import FarmerBottomNav from '../../components/FarmerBottomNav';

export default function Guidelines() {
  const [selected, setSelected] = useState('wheat');

  const guidelines = {
    wheat: {
      name: 'Wheat (Gehu)',
      moisture: 'Max 14%',
      admixture: 'Max 2%',
      tips: [
        'Sun-dry the harvested wheat for at least 48 hours.',
        'Use proper winnowing to remove dust and chaff.',
        'Store in clean, dry gunny bags to prevent fungus.'
      ]
    },
    paddy: {
      name: 'Paddy (Dhan)',
      moisture: 'Max 14%',
      admixture: 'Max 3%',
      tips: [
        'Avoid harvesting during rain or high dew.',
        'Dry the paddy in a clean yard, turn it frequently.',
        'Ensure no broken grains or black spots.'
      ]
    },
    cotton: {
      name: 'Cotton (Kapas)',
      moisture: 'Max 12%',
      admixture: 'Max 1%',
      tips: [
        'Pick cotton only when the bolls are fully open and dry.',
        'Avoid picking in the early morning dew.',
        'Keep separate from dry leaves and twigs.'
      ]
    }
  };

  const crop = guidelines[selected];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-neutral-900">
      <Head>
        <title>Crop Guidelines | Kisan Setu</title>
      </Head>

      <div className="bg-green-700 text-white px-4 py-6 rounded-b-3xl shadow-sm relative">
        <h1 className="text-2xl font-bold mb-1">Crop Guidelines</h1>
        <p className="text-green-100 text-sm">Prepare your crop to guarantee MSP acceptance</p>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
          {Object.entries(guidelines).map(([key, data]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition ${selected === key ? 'bg-green-600 text-white shadow-md' : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700'}`}
            >
              {data.name}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700 mt-2">
          <h2 className="text-lg font-bold text-gray-800 dark:text-neutral-200 mb-4">{crop.name} Standards (FCI)</h2>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
              <p className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 tracking-wider">Moisture</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-500">{crop.moisture}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
              <p className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-400 tracking-wider">Admixture / Chaff</p>
              <p className="text-xl font-black text-blue-600 dark:text-blue-500">{crop.admixture}</p>
            </div>
          </div>

          <h3 className="font-bold text-gray-700 dark:text-neutral-300 text-sm mb-3">Pre-Harvest Checklist</h3>
          <ul className="space-y-3">
            {crop.tips.map((tip, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i+1}</span>
                <span className="text-sm text-gray-600 dark:text-neutral-400 leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <FarmerBottomNav />
    </div>
  );
}
