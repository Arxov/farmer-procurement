import React from 'react';

const STEPS = [
  { key: 'booked', label: 'Booked', icon: '📋' },
  { key: 'checked_in', label: 'In Mandi', icon: '📍' },
  { key: 'weighed', label: 'Weighed', icon: '⚖️' },
  { key: 'quality_checked', label: 'QC Done', icon: '🔬' },
  { key: 'accepted', label: 'Accepted', icon: '🤝' },
  { key: 'paid', label: 'Paid', icon: '💰' },
];

const REJECTED_STEP = { key: 'rejected', label: 'Rejected', icon: '❌' };

export default function BookingStepper({ status }) {
  const isRejected = status === 'rejected';
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-[var(--chassis)] shadow-recessed rounded-lg border border-white/50">
        <span className="w-2 h-2 rounded-full bg-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></span>
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Booking Cancelled</span>
      </div>
    );
  }

  const steps = isRejected
    ? [...STEPS.slice(0, 4), REJECTED_STEP]
    : STEPS;

  const currentIndex = steps.findIndex(s => s.key === status);

  return (
    <div className="py-3 px-2 bg-[#e8ecef] rounded-xl border border-white shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between relative">
        {/* Recessed continuous wire channel in the background */}
        <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1.5 bg-[var(--chassis)] shadow-recessed rounded-full z-0" />
        
        {/* Active glowing wire */}
        {currentIndex > 0 && (
          <div 
            className="absolute left-4 top-3 -translate-y-1/2 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] z-10 transition-all duration-700"
            style={{ width: `calc(${(currentIndex / (steps.length - 1)) * 100}% - 2rem)` }}
          />
        )}

        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isRejectStep = step.key === 'rejected';

          return (
            <div key={step.key} className="flex flex-col items-center relative z-20" style={{ minWidth: '2.5rem' }}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all duration-500 ${
                isCompleted
                  ? 'bg-emerald-600 text-white shadow-floating border border-white/30'
                  : isCurrent
                  ? isRejectStep
                    ? 'bg-red-500 text-white shadow-[0_0_12px_#ef4444,inset_0_2px_4px_rgba(255,255,255,0.4)] border border-red-300 animate-pulse'
                    : 'bg-emerald-500 text-white shadow-[0_0_12px_#10b981,inset_0_2px_4px_rgba(255,255,255,0.4)] border border-emerald-300 animate-pulse'
                  : 'bg-[var(--chassis)] shadow-recessed text-slate-400 opacity-80'
              }`}>
                <span className="notranslate">{isCompleted ? '✓' : step.icon}</span>
              </div>
              <span className={`text-[9px] mt-1.5 font-black uppercase tracking-wider text-center leading-tight ${
                isCurrent
                  ? isRejectStep ? 'text-red-700' : 'text-emerald-800'
                  : isCompleted ? 'text-emerald-700' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
