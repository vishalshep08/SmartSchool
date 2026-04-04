// Clear stale auth data on app startup
(function clearStaleAuth() {
  try {
    // Clear any old sms-auth data from localStorage
    // (leftover from previous config that used localStorage)
    const lsKeys = Object.keys(localStorage);
    lsKeys.forEach(k => {
      if (
        k.startsWith('sb-') ||
        k === 'sms-auth' ||
        (k.startsWith('sms-') && k !== 'sms_version')
      ) {
        localStorage.removeItem(k);
      }
    });

    // Version bump — forces clean state for all existing users
    const VERSION = 'sms_v7';
    if (localStorage.getItem('sms_version') !== VERSION) {
      // Clear sessionStorage auth data too
      try { sessionStorage.removeItem('sms-auth'); } catch {}
      localStorage.setItem('sms_version', VERSION);
      console.log('[STARTUP] Migrated to', VERSION);
    }
  } catch (e) {
    console.error('[STARTUP] Storage cleanup error:', e);
  }
})();

// Then render React normally
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
