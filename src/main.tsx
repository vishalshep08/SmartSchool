// Clear stale auth data on app startup
(function clearStaleAuth() {
  try {
    const VERSION = 'sms_v8';

    // Always clear old auth keys from localStorage (legacy cleanup)
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-') ||
          k === 'sms-auth' ||
          k === 'sms-auth-session' ||
          (k.startsWith('sms-') && k !== 'sms_version')) {
        localStorage.removeItem(k);
      }
    });

    if (localStorage.getItem('sms_version') !== VERSION) {
      // Clear old session storage keys
      try {
        sessionStorage.removeItem('sms-auth');
        sessionStorage.removeItem('sms-auth-session');
      } catch {}
      localStorage.setItem('sms_version', VERSION);
      console.log('[STARTUP] Migrated to', VERSION);
    }
  } catch (e) {
    console.error('[STARTUP] Cleanup error:', e);
  }
})();

// Then render React normally
import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
