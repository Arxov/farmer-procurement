import { useState, useRef } from 'react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const THRESHOLD = 60;

  const handleTouchStart = (e) => {
    if (typeof window !== 'undefined' && window.scrollY <= 2 && !isRefreshing) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPullingRef.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0 && typeof window !== 'undefined' && window.scrollY <= 2) {
      // Apply smooth resistance
      const dampened = Math.min(diff * 0.45, 90);
      
      // Haptic bump when crossing threshold
      if (pullDistance < THRESHOLD && dampened >= THRESHOLD && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
      
      setPullDistance(dampened);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([20, 40, 20]); // Triple tick
      setIsRefreshing(true);
      setPullDistance(45);
      try {
        if (onRefresh) await onRefresh();
      } catch (err) {
        // silent catch
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull down indicator banner */}
      <div
        style={{ height: `${pullDistance}px` }}
        className="overflow-hidden flex items-center justify-center transition-all duration-150 ease-out select-none bg-emerald-50/70 border-b border-emerald-100"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 py-1.5">
          {isRefreshing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              <span>Updating live status...</span>
            </>
          ) : pullDistance >= THRESHOLD ? (
            <>
              <span className="text-sm transform rotate-180 transition-transform">↓</span>
              <span>Release to refresh</span>
            </>
          ) : (
            <>
              <span className="text-sm">↓</span>
              <span>Pull down to refresh</span>
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
