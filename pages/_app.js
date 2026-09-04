import { AnimatePresence, motion } from 'framer-motion';
import Providers from '../components/Providers';
import { ThemeProvider } from 'next-themes';
import GoogleTranslate from '../components/GoogleTranslate';
import ThemeToggle from '../components/ThemeToggle';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/globals.css';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { LanguageProvider } from '../lib/i18n';
import LanguageToggle from '../components/LanguageToggle';
import OfflineBanner from '../components/OfflineBanner';
import { ToastProvider } from '../components/Toast';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <Providers>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <LanguageProvider>
      <ToastProvider>
        <div id="app-root">
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#15803d" />
            <link rel="manifest" href="/manifest.json" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <title>Kisan Procurement Portal</title>
          </Head>
          <ThemeToggle />
          <LanguageToggle />
          <OfflineBanner />
          <AnimatePresence mode="wait">
            <motion.main
              key={router.asPath}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ErrorBoundary>
                <Component {...pageProps} />
            <GoogleTranslate />
              </ErrorBoundary>
            </motion.main>
          </AnimatePresence>
        </div>
      </ToastProvider>
    </LanguageProvider>
    </ThemeProvider>
    </Providers>
  );
}


// Core Web Vitals telemetry listener
export function reportWebVitals(metric) {
  if (process.env.NODE_ENV !== 'production') {
    // In dev, log web vitals for performance tuning
    // Metrics: LCP, FID, CLS, FCP, TTFB, INP
    if (['LCP', 'CLS', 'FID', 'INP'].includes(metric.name)) {
      console.debug(`[Web Vital: ${metric.name}] ${metric.value.toFixed(2)} (Rating: ${metric.rating})`);
    }
  }
}

