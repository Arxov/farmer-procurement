import React from 'react';

const STEPS = [
  { key: 'booked', label: 'Booked', icon: '📋' },
  { key: 'checked_in', label: 'Checked In', icon: '✅' },
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
      <div className="flex items-center gap-2 py-2 px-3 bg-gray-100 dark:bg-neutral-800 rounded-lg">
        <span className="text-gray-400">🚫</span>
        <span className="text-xs text-gray-500 font-medium">Booking Cancelled</span>
      </div>
    );
  }

  const steps = isRejected
    ? [...STEPS.slice(0, 4), REJECTED_STEP]
    : STEPS;

  const currentIndex = steps.findIndex(s => s.key === status);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between relative">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isRejectStep = step.key === 'rejected';

          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <div className={`flex-1 h-0.5 mx-0.5 transition-all duration-500 ${
                  isCompleted || isCurrent
                    ? isRejectStep ? 'bg-red-400' : 'bg-green-400'
                    : 'bg-gray-200 dark:bg-neutral-700'
                }`} />
              )}
              <div className="flex flex-col items-center relative" style={{ minWidth: '2rem' }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all duration-500 ${
                  isCompleted
                    ? 'bg-green-500 text-white shadow-sm'
                    : isCurrent
                    ? isRejectStep
                      ? 'bg-red-500 text-white shadow-md ring-2 ring-red-200 animate-pulse'
                      : 'bg-green-600 text-white shadow-md ring-2 ring-green-200 animate-pulse'
                    : 'bg-gray-200 dark:bg-neutral-700 text-gray-400'
                }`}>
                  <span className="notranslate">{isCompleted ? '✓' : step.icon}</span>
                </div>
                <span className={`text-[8px] mt-1 font-medium text-center leading-tight ${
                  isCurrent
                    ? isRejectStep ? 'text-red-600 font-bold' : 'text-green-700 font-bold'
                    : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
