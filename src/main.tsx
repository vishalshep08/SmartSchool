// RUN BEFORE REACT — clears stale auth data
(function() {
  const VERSION = 'sms_v6';
  const versionKey = 'sms_version';
  try {
    if (localStorage.getItem(versionKey) !== VERSION) {
      // Clear all auth-related storage
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('sb-') || k.startsWith('sms-') ||
            k.includes('supabase') || k.includes('auth')) {
          localStorage.removeItem(k);
        }
      });
      localStorage.setItem(versionKey, VERSION);
      console.log('[STARTUP] Auth storage cleared for', VERSION);
    }
  } catch (e) {
    try { localStorage.clear(); } catch {}
  }
})();

// Then render React normally
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
