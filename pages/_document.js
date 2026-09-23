import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Unblock Next.js dev FOUC displayContent in background / headless tabs where rAF is throttled
              if (typeof window !== 'undefined') {
                var nativeRAF = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 16); };
                window.requestAnimationFrame = function(callback) {
                  if (document.hidden) {
                    return setTimeout(function() { callback(performance.now()); }, 16);
                  }
                  var fired = false;
                  var timeoutId = setTimeout(function() {
                    if (!fired) {
                      fired = true;
                      callback(performance.now());
                    }
                  }, 50);
                  return nativeRAF(function(time) {
                    if (!fired) {
                      fired = true;
                      clearTimeout(timeoutId);
                      callback(time);
                    }
                  });
                };
              }
            `,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
