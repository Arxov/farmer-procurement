import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';

/**
 * 3-Day Mandi Weather Forecast & Grain Quality Advisory Widget
 */
export default function WeatherAdvisory({ district = 'Mandi Region' }) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate real dynamic dates
  const today = new Date();
  const d1 = new Date(today);
  const d2 = new Date(today);
  d2.setDate(d2.getDate() + 1);
  const d3 = new Date(today);
  d3.setDate(d3.getDate() + 2);

  const forecast = [
    {
      day: language === 'mr' ? 'आज' : language === 'hi' ? 'आज' : 'Today',
      date: d1.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      temp: '32°C',
      condition: language === 'mr' ? 'स्वच्छ व सूर्यप्रकाश' : language === 'hi' ? 'साफ व धूप' : 'Clear & Sunny',
      iconType: 'sun',
      moistureRisk: language === 'mr' ? 'कमी जोखीम' : language === 'hi' ? 'कम जोखिम' : 'Low Risk',
      riskColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
    {
      day: language === 'mr' ? 'उद्या' : language === 'hi' ? 'कल' : 'Tomorrow',
      date: d2.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      temp: '30°C',
      condition: language === 'mr' ? 'अंशतः ढगाळ' : language === 'hi' ? 'आंशिक बादल' : 'Partly Cloudy',
      iconType: 'cloud-sun',
      moistureRisk: language === 'mr' ? 'कमी जोखीम' : language === 'hi' ? 'कम जोखिम' : 'Low Risk',
      riskColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
    {
      day: d3.toLocaleDateString(language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short' }),
      date: d3.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      temp: '26°C',
      condition: language === 'mr' ? 'हलक्या सरी' : language === 'hi' ? 'हल्की बारिश' : 'Light Showers',
      iconType: 'rain',
      moistureRisk: language === 'mr' ? 'मध्यम जोखीम' : language === 'hi' ? 'मध्यम जोखिम' : 'Moderate',
      riskColor: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    },
  ];

  const renderWeatherIcon = (type) => {
    switch (type) {
      case 'sun':
        return (
          <svg className="w-6 h-6 text-amber-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'cloud-sun':
        return (
          <svg className="w-6 h-6 text-sky-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        );
      case 'rain':
      default:
        return (
          <svg className="w-6 h-6 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
    }
  };

  if (!mounted) {
    return <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-3xl p-5 mb-5 shadow-xs h-[160px] animate-pulse"></div>;
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-xs">
      <div className="flex justify-between items-center mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-black font-display text-slate-900 dark:text-white uppercase tracking-wider">
              {t('weatherAdvisory')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Live agromet radar • {district}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-bold font-display text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl transition"
        >
          {expanded ? t('hideGuide') : t('moistureRules')}
        </button>
      </div>

      {/* 3-Day Forecast Cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {forecast.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-50 dark:bg-neutral-800/60 border border-slate-200/60 dark:border-neutral-700/60 rounded-2xl p-2.5 text-center shadow-2xs flex flex-col justify-between"
          >
            <div>
              <p className="text-[11px] font-bold font-display text-slate-800 dark:text-slate-200">{item.day}</p>
              <p className="text-[9px] text-slate-400 font-medium">{item.date}</p>
              <div className="my-1.5">{renderWeatherIcon(item.iconType)}</div>
              <p className="text-sm font-black font-display text-slate-900 dark:text-white">{item.temp}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">{item.condition}</p>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-200/50 dark:border-neutral-700/50">
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block ${item.riskColor}`}
              >
                {item.moistureRisk}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Moisture Precaution Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
          {language === 'mr' ? (
            <>
              <strong>अधिकृत दक्षता:</strong> सरकारी हमीभाव केंद्रावर धान्यातील ओलावा कमाल <strong>१२-१४%</strong> असावा. &apos;अ&apos; वर्ग (Grade A) हमीभाव मिळवण्यासाठी <strong>{forecast[2].day}</strong> रोजी वाहतुकीदरम्यान माल ताडपत्रीने झाकून ठेवा.
            </>
          ) : language === 'hi' ? (
            <>
              <strong>आधिकारिक सावधानी:</strong> सरकारी मंडी में अनाज की नमी अधिकतम <strong>१२-१४%</strong> होनी चाहिए। ग्रेड &apos;ए&apos; मूल्य सुनिश्चित करने हेतु <strong>{forecast[2].day}</strong> को परिवहन के दौरान फसल को तिरपाल से ढकें।
            </>
          ) : (
            <>
              <strong>Official Precaution:</strong> Government Mandi moisture threshold is{' '}
              <strong>max 12-14%</strong>. Ensure grains are covered with tarpaulin during transit on{' '}
              <strong>{forecast[2].day}</strong> to guarantee Grade A payout.
            </>
          )}
        </p>
      </div>

      {/* Expandable Moisture Guidelines */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <p className="font-bold text-[11px] text-slate-900 dark:text-white uppercase tracking-wide">
            {t('qualityGuidelines')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-50 dark:bg-neutral-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-neutral-700">
              {t('gradeACriteria')}
            </div>
            <div className="bg-slate-50 dark:bg-neutral-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-neutral-700">
              {t('transitProtocol')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
