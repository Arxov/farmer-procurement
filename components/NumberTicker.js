import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

/**
 * Animated Number Ticker with Spring Physics (motion-primitives inspired)
 * Zero-dependency (uses existing framer-motion ^13.2.0)
 * Supports Indian locale formatting (en-IN), prefixes (e.g. ₹), and suffixes (e.g. q, %)
 */
export default function NumberTicker({
  value = 0,
  direction = 'up',
  delay = 0,
  className = '',
  decimalPlaces = 0,
  prefix = '',
  suffix = '',
  locale = 'en-IN',
}) {
  const ref = useRef(null);
  const numValue = Number(value) || 0;
  const motionValue = useMotionValue(direction === 'down' ? numValue : 0);
  const springValue = useSpring(motionValue, {
    damping: 28,
    stiffness: 110,
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === 'down' ? 0 : numValue);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [motionValue, isInView, delay, numValue, direction]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        const formatted = Number(latest.toFixed(decimalPlaces)).toLocaleString(locale, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        });
        ref.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });
  }, [springValue, decimalPlaces, prefix, suffix, locale]);

  return (
    <span
      ref={ref}
      className={`inline-block tabular-nums tracking-tight ${className}`}
    >
      {prefix}
      {numValue.toLocaleString(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      })}
      {suffix}
    </span>
  );
}
