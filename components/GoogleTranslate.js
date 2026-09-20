import { useEffect } from 'react';

const GoogleTranslate = () => {
  useEffect(() => {
    // Only load if not already loaded
    if (document.getElementById('google-translate-script')) return;
    
    // React + Google Translate DOM mismatch patch
    if (typeof Node === 'function' && Node.prototype) {
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function (child) {
        if (child.parentNode !== this) {
          if (console) {
            console.warn('Cannot remove a child from a different parent (Google Translate patch)', child, this);
          }
          return child;
        }
        return originalRemoveChild.apply(this, arguments);
      };

      const originalInsertBefore = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function (newNode, referenceNode) {
        if (referenceNode && referenceNode.parentNode !== this) {
          if (console) {
            console.warn('Cannot insert before a reference node from a different parent (Google Translate patch)', referenceNode, this);
          }
          return newNode;
        }
        return originalInsertBefore.apply(this, arguments);
      };
    }

    const addScript = document.createElement('script');
    addScript.id = 'google-translate-script';
    addScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(addScript);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,hi,mr,ta,te,gu,kn,ml,pa,bn,or',
        autoDisplay: false
      }, 'google_translate_element');
    };
  }, []);

  return (
    <>
      <div id="google_translate_element" style={{ display: 'none' }}></div>
      <style jsx global>{`
        /* Hide the ugly Google Translate top banner */
        .skiptranslate > iframe.skiptranslate,
        iframe.goog-te-banner-frame {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          top: 0px !important;
        }

        /* Completely remove Google Translate tooltip, balloon, and "Rate this translation" review popup */
        #goog-gt-tt,
        #goog-gt-vt,
        .goog-te-balloon-frame,
        .goog-tooltip,
        .goog-tooltip:hover,
        .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
        .VIpgJd-ZVi9od-vH1Gmf,
        .VIpgJd-yAWdn-mAdDbd,
        div[class*="VIpgJd-ZVi9od"],
        div[id*="goog-gt-"],
        div[class*="goog-te-balloon"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
          z-index: -9999 !important;
        }

        /* Remove ugly hover highlight background on translated text */
        .goog-text-highlight {
          background: transparent !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
};

export default GoogleTranslate;

