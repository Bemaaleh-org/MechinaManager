/* ============================================================
   גרסה ישנה בדפדפן — נאמרת, ולא מנוחשת
   ------------------------------------------------------------
   ⚠⚠ הדיווח חזר פעמיים (23.9.2026): *"לא מופיע"* על תכונה
   שנדחפה. בשני המקרים הקוד היה תקין לחלוטין — `origin/main`
   נבנה נקי, החבילה הכילה את התכונה, והשרת החזיר את השדה
   החדש — **ומה שרץ בדפדפן היה חבילה ישנה.**

   אין שום דרך לדעת את זה מהמסך, ולכן כל בדיקה כזו עלתה סבב
   שלם: אני בודק שלוש שכבות ומוצא שהכול תקין, והמשתמש ממשיך
   לראות את הישן.

   **שני הנתונים כבר היו קיימים, ואיש לא השווה ביניהם:**
     · `<meta name="build">` — הקומיט שממנו נבנתה החבילה
       שהדפדפן **טען** (מוזרק ב-vite.config.js).
     · `build` בתשובת `?action=me` — הקומיט שהשרת **מריץ**
       עכשיו. ההערה שם נכתבה בדיוק בשביל "דחפתי ולא רואים".

   שניהם נפרסים מאותו קומיט ב-Vercel, ולכן **הפרש ביניהם
   פירושו שאחד מהם ישן** — כמעט תמיד הדפדפן.

   ⚠ **שתיקה כשאחד מהם אינו ידוע.** בפיתוח שניהם "local",
     ואזהרה שמופיעה תמיד היא אזהרה שמפסיקים לראות (4כו).

   ⚠ **בשתי המעטפות.** חניך על חבילה ישנה סובל מאותו דבר
     בדיוק, ורצועה שקיימת רק אצל הצוות היא 4יט שחוזר.

   ⚠ **והרענון מנקה קודם את ה-Service Worker ואת המטמון** —
     בלעדיו הדפדפן עלול להגיש שוב בדיוק את אותה חבילה,
     והמשתמש ילחץ שוב ויראה את אותו דבר.
   ============================================================ */
import { useState } from "react";
import { isStale } from "./stale-build.js";

/** הקומיט שממנו נבנתה החבילה שהדפדפן טען. "" כשאינו ידוע. */
export function pageBuild() {
  try {
    const m = document.querySelector('meta[name="build"]');
    return (m && m.getAttribute("content")) || "";
  } catch {
    return "";
  }
}

/* ⚠ הכלל עצמו יושב ב-src/stale-build.js — קובץ בלי JSX,
   כדי ש-node יוכל לבדוק אותו. */
export { isStale };

export default function StaleBuild({ server }) {
  const [busy, setBusy] = useState(false);
  const page = pageBuild();
  if (!isStale(server, page)) return null;

  const refresh = async () => {
    setBusy(true);
    /* ⚠ כל שלב נתפס בנפרד — הרענון חייב לקרות גם אם הניקוי
       נכשל, אחרת הכפתור פשוט לא עושה כלום. */
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
    } catch { /* אין SW — אין מה לעדכן */ }
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { /* מטמון חסום בגלישה פרטית */ }
    window.location.reload();
  };

  return (
    <div className="ro-bar sb-bar">
      <span>
        <b>יש גרסה חדשה באוויר</b> — מה שמוצג כאן נטען מגרסה ישנה,
        ותכונות חדשות לא יופיעו עד רענון.
      </span>
      <button type="button" className="sb-go" disabled={busy} onClick={refresh}>
        {busy ? "מרענן…" : "רענון"}
      </button>
      {/* ⚠ שני המזהים מוצגים: הם מה שהופך "לא מופיע" משאלה
          פתוחה לשאלה שאפשר לענות עליה בשתי שניות. */}
      <span className="sb-sha" dir="ltr">{page} → {server}</span>
    </div>
  );
}
