/* ============================================================
   הבאנר של המצב הלא-מקוון
   ------------------------------------------------------------
   ⚠⚠ **הוא אומר שני דברים ולא אחד:** שאין חיבור, ו**ממתי**
     הנתון שעל המסך. "אין חיבור" לבדו משאיר את המשתמש בלי
     לדעת אם מה שהוא רואה נכון להיום או לשבוע שעבר.

   ⚠ **ושהשינויים אינם נשמרים** — זו ההצהרה החשובה. מי שלא
     יידע ינסה לסמן נוכחות, יראה הודעת שגיאה, ויניח שזה
     ייקלט אחר כך. הוא לא (ראו public/sw.js).

   ⚠ **מוצג רק כשיש מה לומר.** באנר קבוע שנעלם ומופיע הופך
     לרעש שמפסיקים לראות, וזה בדיוק הרגע שבו הוא נחוץ.
   ============================================================ */
import React, { useState, useEffect } from "react";
import { onOffline } from "./api.js";

const hhmm = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  } catch { return null; }
};

export default function OfflineBar() {
  const [st, setSt] = useState({ offline: false, staleAt: null });
  useEffect(() => onOffline(setSt), []);

  if (!st.offline) return null;
  const at = hhmm(st.staleAt);

  return (
    <div className="off-bar" role="status">
      <span className="off-dot" />
      <div>
        <b>אין חיבור.</b>{" "}
        {at
          ? `מוצג מה שנטען לאחרונה, ב-${at}.`
          : "מוצג מה שנטען לאחרונה."}{" "}
        שינויים לא יישמרו עד שיחזור החיבור.
      </div>
    </div>
  );
}
