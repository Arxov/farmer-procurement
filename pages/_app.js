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
    // Ensure Next.js dev FOUC blocker is cleared
    const fouc = document.querySelector('style[data-next-hide-fouc]');
    if (fouc) fouc.remove();
    if (document.body.style.display === 'none') {
      document.body.style.display = 'block';
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
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
              <OfflineBanner />
              <AnimatePresence mode="wait" initial={false}>
                <motion.main
                  key={router.asPath}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  <ErrorBoundary>
                    <Component {...pageProps} />
                  </ErrorBoundary>
                </motion.main>
              </AnimatePresence>
              <GoogleTranslate />
            </div>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Providers>
  );
}

