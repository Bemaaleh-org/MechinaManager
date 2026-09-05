import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
/* ⚠ **לפני הרינדור הראשון.** העדפה שמוחלת אחרי שהמסך צויר
   נראית כהבהוב לבן — וזה בדיוק מה שמצב לילה נועד למנוע. */
import { watch } from "./prefs.js";

watch();

/* ============================================================
   ⚠⚠ **ה-Service Worker נרשם בטעינה, ולא רק כשמפעילים התראות.**

   קודם הוא נרשם רק מתוך `src/push.js` — כלומר מי שלא הפעיל
   התראות לא היה מקבל גם עבודה לא מקוונת, וזה בדיוק ההפך: מי
   שנמצא במקום בלי קליטה הוא הראשון שצריך אותה.

   ⚠ **וכישלון ברישום אינו מפיל את האפליקציה.** דפדפן ישן,
     גלישה בסתר או HTTP במקום HTTPS — בכולם `register` נכשל,
     והאפליקציה חייבת לעבוד בדיוק כמו קודם.
   ============================================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* ריק */ });
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
