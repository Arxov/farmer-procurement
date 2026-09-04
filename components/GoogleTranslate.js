import { useEffect } from 'react';

const GoogleTranslate = () => {
  useEffect(() => {
    // Only load if not already loaded
    if (document.getElementById('google-translate-script')) return;
    
    const addScript = document.createElement('script');
    addScript.id = 'google-translate-script';
    addScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(addScript);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,hi,mr,ta,te,gu,kn,ml,pa,bn,or',
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
      }, 'google_translate_element');
    };
  }, []);

  return (
    <>
      <div id="google_translate_element" className="fixed bottom-20 sm:bottom-6 right-4 z-50 bg-white dark:bg-neutral-800 p-1.5 rounded-xl shadow-2xl border border-green-200 dark:border-green-900 overflow-hidden"></div>
      <style jsx global>{`
        /* Hide the ugly Google Translate top banner */
        .skiptranslate > iframe.skiptranslate {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          top: 0px !important;
        }
        /* Customize the widget */
        .goog-te-gadget-simple {
          background-color: transparent !important;
          border: none !important;
          padding: 4px !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
        }
        .goog-te-gadget-simple span {
          color: #15803d !important;
          font-weight: 600 !important;
          font-family: inherit !important;
        }
        .goog-te-gadget-icon {
          display: none !important;
        }
      `}</style>
    </>
  );
};

export default GoogleTranslate;
