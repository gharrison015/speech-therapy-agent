'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);

    if (isStandalone) return;

    // Check if dismissed before
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    setIsIOS(isiOS);

    // Show prompt after a brief delay
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-slide-up">
        <h3 className="text-xl font-bold mb-3">Add to Home Screen</h3>

        {isIOS ? (
          <div className="space-y-3 text-base">
            <p>To use this like an app on your phone:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted">
              <li>Tap the <strong>Share</strong> button <span className="text-2xl">⬆️</span> at the bottom of your screen</li>
              <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
              <li>Tap <strong>&quot;Add&quot;</strong> in the top right</li>
            </ol>
            <p className="text-sm text-muted">Then you can open it from your home screen just like any other app.</p>
          </div>
        ) : (
          <div className="space-y-3 text-base">
            <p>To use this like an app:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted">
              <li>Tap the <strong>menu</strong> button (three dots) in your browser</li>
              <li>Tap <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong></li>
            </ol>
          </div>
        )}

        <button
          onClick={dismiss}
          className="w-full mt-5 py-3 bg-primary text-white text-lg font-semibold rounded-xl"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
