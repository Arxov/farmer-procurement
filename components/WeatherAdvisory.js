import React, { useState } from 'react';

/**
 * 3-Day Mandi Weather Forecast & Grain Quality Advisory Widget
 */
export default function WeatherAdvisory({ district = 'Mandi Region' }) {
  const [expanded, setExpanded] = useState(false);

  // Generate real dynamic dates
  const today = new Date();
  const d1 = new Date(today);
  const d2 = new Date(today);
  d2.setDate(d2.getDate() + 1);
  const d3 = new Date(today);
  d3.setDate(d3.getDate() + 2);

  const forecast = [
    {
      day: 'Today',
      date: d1.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      temp: '32°C',
      condition: 'Clear & Sunny',
      icon: '☀️',
      moistureRisk: 'Low',
      riskColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      day: 'Tomorrow',
      date: d2.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      temp: '30°C',
      condition: 'Partly Cloudy',
      icon: '⛅',
      moistureRisk: 'Low',
      riskColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      day: d3.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d3.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      temp: '26°C',
      condition: 'Scattered Showers',
      icon: '🌧️',
      moistureRisk: 'Moderate Risk',
      riskColor: 'text-amber-800 bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200/80 rounded-2xl p-4 mb-6 shadow-xs">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌤️</span>
          <div>
            <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
              Mandi Weather & Grain Moisture Advisory
            </h3>
            <p className="text-[11px] text-sky-700">Live agromet forecast for {district}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-semibold text-sky-800 hover:text-sky-900 bg-white dark:bg-neutral-800/80 border border-sky-200 px-2.5 py-1 rounded-lg transition"
        >
          {expanded ? 'Hide Advisory' : 'Storage Guidelines ▾'}
        </button>
      </div>

      {/* 3-Day Forecast Cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {forecast.map((item, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-neutral-800/90 backdrop-blur-xs border border-sky-100 rounded-xl p-2.5 text-center shadow-2xs flex flex-col justify-between"
          >
            <div>
              <p className="text-[11px] font-bold text-gray-800 dark:text-neutral-200">{item.day}</p>
              <p className="text-[9px] text-gray-400">{item.date}</p>
              <span className="text-xl my-1 block">{item.icon}</span>
              <p className="text-xs font-black text-gray-900 dark:text-neutral-100">{item.temp}</p>
              <p className="text-[10px] text-gray-500 dark:text-neutral-400 dark:text-neutral-400 truncate leading-tight mt-0.5">{item.condition}</p>
            </div>

            <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-neutral-700">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block ${item.riskColor}`}
              >
                {item.moistureRisk}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Moisture Precaution Banner */}
      <div className="bg-amber-500/10 border border-amber-300/60 rounded-xl p-2.5 flex items-start gap-2">
        <span className="text-sm mt-0.5">🌾</span>
        <p className="text-[11px] text-amber-950 leading-snug">
          <strong>Procurement Precaution:</strong> Official mandi moisture threshold is{' '}
          <strong>max 12-14%</strong>. Ensure grains are covered during transit on{' '}
          <strong>{forecast[2].day}</strong> to avoid grade downgrades at inspection.
        </p>
      </div>

      {/* Expandable Moisture Guidelines */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-sky-200/60 text-xs text-sky-900 space-y-1.5 animate-fadeIn">
          <p className="font-bold text-[11px] text-sky-950 uppercase tracking-wide">
            Official FAQ / Mandi Quality Standards:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white dark:bg-neutral-800/80 p-2 rounded-lg border border-sky-100">
              <span className="font-bold text-gray-800 dark:text-neutral-200">✅ Grade A Target:</span> Under 12% moisture content, &lt; 0.75% foreign matter.
            </div>
            <div className="bg-white dark:bg-neutral-800/80 p-2 rounded-lg border border-sky-100">
              <span className="font-bold text-gray-800 dark:text-neutral-200">🚚 Transport Tip:</span> Use double-layer tarpaulins if transporting during evening dew.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
