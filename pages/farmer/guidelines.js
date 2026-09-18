import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n';
import FarmerBottomNav from '../../components/FarmerBottomNav';
import LanguageToggle from '../../components/LanguageToggle';

export default function Guidelines() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 px-4 pt-8 pb-28 sm:pb-10">
      <div className="max-w-lg mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-4">
          <Link href="/farmer/dashboard" className="text-green-800 text-sm font-medium hover:underline inline-flex items-center gap-1">
            &larr; {t('back', 'Back to Dashboard')} 
          </Link>
        </div>

        <div className="bg-white dark:bg-neutral-800 shadow-xl rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-neutral-700 transition-all">
          <div className="border-b border-gray-100 dark:border-neutral-700 pb-3 mb-5 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-neutral-100">Farmer Guidelines & Advisories</h1>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">Crop Quality Precautions and Market Trends</p>
            </div>
            <LanguageToggle />
          </div>

          <div className="flex border-b border-gray-200 dark:border-neutral-700 mb-5">
            <button
              onClick={() => setActiveTab('general')}
              className={`pb-2 px-1 flex-1 text-sm font-semibold transition-colors ${activeTab === 'general' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500 hover:text-gray-700'}`}
            >
              General Setup
            </button>
            <button
              onClick={() => setActiveTab('crops')}
              className={`pb-2 px-1 flex-1 text-sm font-semibold transition-colors ${activeTab === 'crops' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Crop Precautions
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`pb-2 px-1 flex-1 text-sm font-semibold transition-colors ${activeTab === 'market' ? 'border-b-2 border-green-600 text-green-700 dark:text-green-400' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Market Demand
            </button>
          </div>

          {activeTab === 'general' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <h3 className="text-emerald-800 dark:text-emerald-300 font-bold mb-2 flex items-center gap-2">
                  <span>📄</span> Required Documents
                </h3>
                <ul className="list-disc pl-5 text-sm text-emerald-700 dark:text-emerald-400 space-y-1">
                  <li>Aadhaar Card (Linked with Mobile Number)</li>
                  <li>Bank Passbook (For Direct Benefit Transfer)</li>
                  <li>Land Records (7/12 Extract or equivalent)</li>
                  <li>Appointment Slip (Digital Token or Printed)</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <h3 className="text-blue-800 dark:text-blue-300 font-bold mb-2 flex items-center gap-2">
                  <span>⚖️</span> Weighbridge Process
                </h3>
                <ol className="list-decimal pl-5 text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>Arrive at the centre strictly during your allotted time window.</li>
                  <li>Proceed to the digital weighbridge for initial weighing of the loaded vehicle.</li>
                  <li>After unloading, the empty vehicle will be weighed again to calculate net weight.</li>
                  <li>Ensure you collect the final weighment slip from the operator.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'crops' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                <h3 className="text-amber-800 dark:text-amber-300 font-bold mb-1 flex items-center gap-2">
                  <span>🌾</span> Wheat & Paddy (Cereals)
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                  <strong>Moisture standard: &le; 14%</strong>
                </p>
                <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-400 space-y-1">
                  <li>Sun-dry the harvest for at least 48 hours before packing.</li>
                  <li>Remove chaff, dust, and foreign matter using proper sieving.</li>
                  <li>Do not harvest immediately after rainfall. Wait for dry conditions.</li>
                  <li>Cover your transport vehicles with tarpaulin to prevent moisture absorption during transit.</li>
                </ul>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                <h3 className="text-orange-800 dark:text-orange-300 font-bold mb-1 flex items-center gap-2">
                  <span>🌱</span> Soyabean & Pulses
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-400 mb-2">
                  <strong>Moisture standard: &le; 12%</strong>
                </p>
                <ul className="list-disc pl-5 text-sm text-orange-700 dark:text-orange-400 space-y-1">
                  <li>Ensure pods are completely dry. High moisture leads to fungus and rejection.</li>
                  <li>Avoid mixing different grades or old stock with fresh harvest.</li>
                  <li>Store in well-ventilated gunny bags, not plastic bags.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'market' && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
                These advisories are updated based on current market arrivals, regional abundance, and demand patterns.
              </p>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                <h3 className="text-red-800 dark:text-red-300 font-bold mb-1 flex items-center gap-2">
                  <span>📉</span> Abundance Warning: Wheat
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400">
                  Wheat is currently in <strong>Oversupply</strong> in the local mandis. Due to heavy arrivals, wait times are higher than usual and quality checks are strictly enforced. We recommend booking slots at least 3 days in advance and ensuring your crop is completely dry.
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                <h3 className="text-green-800 dark:text-green-300 font-bold mb-1 flex items-center gap-2">
                  <span>📈</span> High Demand: Pulses (Tur/Arhar)
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Tur is currently in <strong>High Demand</strong>. Open market prices are trending higher than the Minimum Support Price (MSP) in several regions. You may want to check local market rates before committing to government procurement.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
      <FarmerBottomNav />
    </div>
  );
}
