import React from 'react';

export function BookingSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 border-l-4 border-l-gray-200 animate-pulse space-y-3">
      <span className="sr-only">Loading booking details...</span>
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </div>
      <div className="h-10 bg-gray-100 dark:bg-neutral-800 rounded-lg w-full"></div>
      <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-neutral-700">
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/6"></div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <span className="sr-only">Loading metrics...</span>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 animate-pulse space-y-2">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'No items found',
  description = 'There are no records to display yet.',
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-8 text-center border border-dashed border-emerald-100 my-4 flex flex-col items-center">
      <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner border border-emerald-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 text-emerald-600 opacity-80"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 21v-4" />
          <path d="M8 21v-3" />
          <path d="M16 21v-3" />
          <path d="M12 17a3 3 0 0 1 -3 -3v-2" />
          <path d="M8 18a3 3 0 0 1 -3 -3v-2" />
          <path d="M16 18a3 3 0 0 0 3 -3v-2" />
          <path d="M12 12a3 3 0 0 0 3 -3v-2" />
          <path d="M12 12a3 3 0 0 1 -3 -3v-2" />
          <path d="M12 4v-1" />
          <path d="M12 3a2 2 0 0 0 -2 2v2a2 2 0 0 0 2 2" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-gray-800 dark:text-neutral-200">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-400 max-w-sm mx-auto mt-1.5 mb-5 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 shadow-sm transition-transform active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
