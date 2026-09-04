import React, { useState } from 'react';

// Color map and domain explanations for booking statuses
const STATUS_CONFIG = {
  booked: {
    stroke: '#3b82f6',
    bg: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    label: 'Booked',
    desc: 'Registered appointment; slot confirmed, awaiting arrival at Mandi.',
    icon: '📝',
  },
  checked_in: {
    stroke: '#f59e0b',
    bg: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    label: 'Checked In',
    desc: 'Farmer arrived at gate; vehicle entered the mandi queue.',
    icon: '🚚',
  },
  weighed: {
    stroke: '#8b5cf6',
    bg: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    label: 'Weighed',
    desc: 'Gross weighbridge weight captured by officer.',
    icon: '⚖️',
  },
  quality_checked: {
    stroke: '#6366f1',
    bg: 'bg-indigo-500',
    lightBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    label: 'Quality Checked',
    desc: 'Moisture content, foreign matter, and grade assessed.',
    icon: '🔬',
  },
  accepted: {
    stroke: '#10b981',
    bg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    label: 'Accepted',
    desc: 'Procurement accepted; gate pass issued, payment queued.',
    icon: '✅',
  },
  paid: {
    stroke: '#059669',
    bg: 'bg-green-600',
    lightBg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    label: 'Disbursed (Paid)',
    desc: 'MSP funds transferred via Direct Bank Transfer (DBT).',
    icon: '💰',
  },
  rejected: {
    stroke: '#ef4444',
    bg: 'bg-red-500',
    lightBg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    label: 'Rejected',
    desc: 'Declined due to moisture/quality standards; grievance option open.',
    icon: '❌',
  },
  cancelled: {
    stroke: '#9ca3af',
    bg: 'bg-gray-400',
    lightBg: 'bg-gray-50 dark:bg-neutral-900',
    border: 'border-gray-200 dark:border-neutral-700',
    text: 'text-gray-700 dark:text-neutral-300',
    label: 'Cancelled',
    desc: 'Slot voluntarily cancelled or rescheduled by farmer.',
    icon: '🚫',
  },
};

/**
 * Modern Interactive SVG Donut Chart with Hover Inspection
 */
export function StatusDonutChart({ byStatus = {}, total = 0 }) {
  const [hoveredStatus, setHoveredStatus] = useState(null);

  const radius = 62;
  const defaultStroke = 18;
  const activeStroke = 24;
  const circumference = 2 * Math.PI * radius;

  // Filter out 0 count items
  const entries = Object.entries(byStatus).filter(([, count]) => count > 0);
  const totalCount = total || entries.reduce((acc, [, c]) => acc + c, 0) || 1;

  let cumulativePercent = 0;

  const activeItem = hoveredStatus ? {
    status: hoveredStatus,
    count: byStatus[hoveredStatus] || 0,
    pct: Math.round(((byStatus[hoveredStatus] || 0) / totalCount) * 100),
    config: STATUS_CONFIG[hoveredStatus] || { label: hoveredStatus, desc: '' },
  } : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col md:flex-row items-center justify-around gap-6">
        {/* SVG Ring with Hover States */}
        <div className="relative w-48 h-48 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90 transform cursor-pointer" viewBox="0 0 160 160">
            {/* Background Ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#f3f4f6"
              strokeWidth={defaultStroke}
              fill="transparent"
            />

            {/* Interactive Segments */}
            {entries.map(([status, count]) => {
              const pct = count / totalCount;
              const strokeDasharray = `${pct * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativePercent * circumference;
              cumulativePercent += pct;

              const config = STATUS_CONFIG[status] || { stroke: '#9ca3af' };
              const isHovered = hoveredStatus === status;
              const hasHover = Boolean(hoveredStatus);

              return (
                <circle
                  key={status}
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={config.stroke}
                  strokeWidth={isHovered ? activeStroke : defaultStroke}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  onMouseEnter={() => setHoveredStatus(status)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  className="transition-all duration-300"
                  style={{
                    opacity: hasHover ? (isHovered ? 1 : 0.3) : 1,
                    filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' : 'none',
                  }}
                />
              );
            })}
          </svg>

          {/* Dynamic Center Readout on Hover */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            {activeItem ? (
              <div className="animate-fadeIn">
                <span className="text-xl block">{activeItem.config.icon}</span>
                <span className="text-xl font-extrabold text-gray-900 dark:text-neutral-100 block leading-tight">
                  {activeItem.count}
                </span>
                <span className="text-[10px] font-bold text-gray-500 dark:text-neutral-400 dark:text-neutral-400 uppercase tracking-wider block">
                  {activeItem.pct}% of total
                </span>
              </div>
            ) : (
              <div>
                <span className="text-2xl font-black text-gray-900 dark:text-neutral-100 leading-none">{total}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                  Total Bookings
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend List with Hover Highlighting */}
        <div className="flex flex-col gap-2 w-full flex-1 max-w-xs text-xs">
          {entries.map(([status, count]) => {
            const config = STATUS_CONFIG[status] || { bg: 'bg-gray-400', label: status, text: 'text-gray-700 dark:text-neutral-300' };
            const pct = Math.round((count / totalCount) * 100);
            const isHovered = hoveredStatus === status;

            return (
              <button
                key={status}
                type="button"
                onMouseEnter={() => setHoveredStatus(status)}
                onMouseLeave={() => setHoveredStatus(null)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-left border transition-all ${
                  isHovered
                    ? 'bg-slate-50 dark:bg-neutral-950 border-gray-400 dark:border-neutral-500 shadow-xs ring-2 ring-gray-200 dark:ring-neutral-700'
                    : 'bg-white dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${config.bg}`} />
                  <span className={`font-semibold text-xs whitespace-nowrap ${isHovered ? 'text-gray-900 dark:text-neutral-100' : 'text-gray-700 dark:text-neutral-300'}`}>
                    {config.label || status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-neutral-100 flex-shrink-0 text-xs pl-3">
                  <span>{count}</span>
                  <span className="text-gray-400 dark:text-neutral-400 text-[10px] font-normal">({pct}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Meaning / Explanatory Tooltip Banner */}
      <div className="pt-3 border-t border-gray-100 dark:border-neutral-700">
        {activeItem ? (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${activeItem.config.lightBg} ${activeItem.config.border}`}
          >
            <span className="text-lg mt-0.5">{activeItem.config.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${activeItem.config.text}`}>
                  {activeItem.config.label}:
                </span>
                <span className="font-semibold text-gray-800 dark:text-neutral-200">
                  {activeItem.count} booking(s) ({activeItem.pct}%)
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-neutral-400 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {activeItem.config.desc}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5 py-1">
            <span>💡</span>
            <span>Hover over any stage or ring segment above to inspect its volume, percentage, and definition.</span>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Modern SVG Gradient Area & Trend Chart (7-Day Procurements)
 */
export function TrendAreaChart({ data = [] }) {
  // data is array of [dateStr, count]
  if (!data || data.length === 0) {
    return <p className="text-xs text-gray-400 py-6 text-center">No trend data available.</p>;
  }

  const counts = data.map(([, c]) => c);
  const maxCount = Math.max(...counts, 5); // At least 5 scale
  const width = 500;
  const height = 140;
  const padX = 25;
  const padY = 20;

  const chartWidth = width - padX * 2;
  const chartHeight = height - padY * 2;

  // Calculate points
  const points = data.map(([, count], index) => {
    const x = padX + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padY + chartHeight - (count / maxCount) * chartHeight;
    return { x, y, count };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x},${pt.y}`;
    // Bezier curve smoothing
    const prev = points[idx - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX},${prev.y} ${cpX},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - padY} L ${points[0].x},${height - padY} Z`;

  return (
    <div className="w-full">
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#f3f4f6" strokeDasharray="3 3" />
          <line x1={padX} y1={padY + chartHeight / 2} x2={width - padX} y2={padY + chartHeight / 2} stroke="#f3f4f6" strokeDasharray="3 3" />
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#e5e7eb" />

          {/* Area Fill */}
          <path d={areaD} fill="url(#areaGradient)" />

          {/* Trend Line */}
          <path d={pathD} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill="#ffffff"
                stroke="#16a34a"
                strokeWidth="2.5"
                className="transition-all group-hover:r-6"
              />
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                className="text-[10px] font-bold fill-gray-700 select-none"
              >
                {pt.count}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Date Labels */}
      <div className="flex justify-between px-3 text-[11px] font-medium text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-1">
        {data.map(([date]) => {
          const d = new Date(date + 'T00:00:00');
          const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
          const dayNum = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          return (
            <div key={date} className="text-center">
              <span className="block font-bold text-gray-700 dark:text-neutral-300">{dayName}</span>
              <span className="block text-[10px] text-gray-400">{dayNum}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Circular Capacity Utilization Card
 */
export function CapacityRadialCard({ name, booked, capacity, pct }) {
  const radius = 32;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const cappedPct = Math.min(100, pct || 0);
  const strokeDashoffset = circumference - (cappedPct / 100) * circumference;

  const color =
    pct >= 85 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981';

  return (
    <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h4 className="font-bold text-gray-900 dark:text-neutral-100 text-sm truncate">{name}</h4>
        <p className="text-xs text-gray-500 dark:text-neutral-400 dark:text-neutral-400 mt-0.5">
          <strong className="text-gray-900 dark:text-neutral-100">{booked}</strong> of {capacity} slots used today
        </p>
        <span
          className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            pct >= 85
              ? 'bg-red-50 text-red-700'
              : pct >= 50
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {pct >= 85 ? '🚨 High Congestion' : pct >= 50 ? '⚖️ Moderate' : '✅ Optimal Flow'}
        </span>
      </div>

      {/* Radial Progress Ring */}
      <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute text-center leading-none">
          <span className="text-xs font-black text-gray-800 dark:text-neutral-200">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
