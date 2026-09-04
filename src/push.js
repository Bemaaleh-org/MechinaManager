/* ============================================================
   הרשמה להתראות בטלפון — צד הדפדפן
   ------------------------------------------------------------
   ⚠ **כל שלב כאן יכול להיכשל מסיבה אחרת לגמרי, ולכל אחת
     מהן צריכה להיות תשובה משלה.** "לא עבד" אינו מידע: הדפדפן
     לא תומך, המשתמש חסם, ה-PWA לא מותקן ב-iOS, או שהשרת עוד
     לא הוגדר — ארבע בעיות עם ארבע פעולות שונות.
   ============================================================ */
import { api } from "./api.js";

export const pushSupported = () =>
  typeof window !== "undefined"
  && "serviceWorker" in navigator
  && "PushManager" in window
  && "Notification" in window;

/* ⚠ **iOS מאפשר דחיפה רק ל-PWA מותקן**, מ-16.4 והלאה. משתמש
   שיאשר בסאפרי ולא יקבל דבר יסיק שהמערכת שבורה, ולכן זה
   נבדק **לפני** שמבקשים ממנו אישור. */
export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches
  || window.navigator.standalone === true;

/** למה אי אפשר להירשם כאן — או null אם אפשר */
export function pushBlocker() {
  if (!pushSupported()) return "הדפדפן הזה אינו תומך בהתראות";
  if (isIOS() && !isStandalone()) {
    return 'ב-iPhone צריך קודם להוסיף את האפליקציה למסך הבית: '
      + 'כפתור השיתוף ← "הוספה למסך הבית", ואז לפתוח אותה משם';
  }
  if (Notification.permission === "denied") {
    return "ההתראות חסומות לאתר הזה בהגדרות הדפדפן. שם גם מבטלים את החסימה";
  }
  return null;
}

const toBytes = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/**
 * רושם את המכשיר הזה.
 * ⚠ מחזיר `{ ok, why }` ולעולם אינו זורק — כל כישלון כאן הוא
 *   מצב שהמסך צריך להסביר, לא שגיאה שמפילה אותו.
 */
export async function enablePush() {
  const blocked = pushBlocker();
  if (blocked) return { ok: false, why: blocked };

  try {
    const state = await api.getPush();
    if (!state.ready) {
      return { ok: false, why: "התראות לטלפון טרם הופעלו במערכת (חסרים מפתחות VAPID)" };
    }

    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, why: "לא ניתן אישור להתראות" };

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    /* ⚠ מנוי קיים נעשה בו שימוש חוזר. ביטול ויצירה מחדש בכל
       כניסה מייצרים מנויים מתים בשרת. */
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(state.publicKey),
      });
    }

    await api.setPush(sub.toJSON());
    return { ok: true, why: null };
  } catch (e) {
    console.error("[push]", e);
    return { ok: false, why: e && e.message ? e.message : "ההרשמה נכשלה" };
  }
}

/** מבטל את המכשיר הזה בלבד — לא את שאר המכשירים של המשתמש. */
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) {
      await api.clearPush(sub.endpoint);
      await sub.unsubscribe();
    }
    return { ok: true };
  } catch (e) {
    console.error("[push:off]", e);
    return { ok: false, why: e && e.message };
  }
}
