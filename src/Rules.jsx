/* ============================================================
   נהלים במכינה
   ------------------------------------------------------------
   מסך אחד, מלל בלבד. חשוף לכל החניכים, ונערך על ידי ראש
   המכינה מתוך האפליקציה.

   ⚠ **הנוסח יושב בלוח monday ולא בקוד** (`טקסטים באפליקציה`,
     מפתח `mechina.rules`). זה עיקרון 1: נוהל שמשתנה באמצע
     שנה משתנה בלוח, בלי דיפלוי — וזה קורה, כי נהלים משתנים
     אחרי אירועים.

   ⚠ **הקוד אינו מכיר את התוכן.** הוא לא מפצל לסעיפים, לא
     מזהה כותרות ולא מספר קווים אדומים. כל מבנה שהיינו כופים
     היה נשבר בעריכה הראשונה של דני — והוא זה שכותב.

   ⚠ **ולכן `white-space: pre-wrap`.** המסמך נכתב עם שבירות
     שורה שמישהו התכוון אליהן, ורינדור שמוחק אותן הופך
     רשימה של עשרים קווים אדומים לפסקה אחת בלתי קריאה.
   ============================================================ */

import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import TextBlock from "./TextBlock.jsx";

const KEY = "mechina.rules";

export default function RulesPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api.getChores()
      .then((r) => { setD(r); setErr(""); })
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ⚠ כשל טעינה נראה אחרת מ"אין נהלים" — עיקרון 6. */
  if (err) return <><div className="screen-title">נהלים במכינה</div><div className="login-err">{err}</div></>;
  if (!d) return <><div className="screen-title">נהלים במכינה</div><div className="skel" style={{ height: 240 }} /></>;

  const block = (d.texts || []).find((t) => t.key === KEY);

  return (
    <>
      <div className="screen-title">נהלים במכינה</div>

      {/* ⚠ **בלוק שאינו קיים אינו שגיאה** — הוא נמחק בלוח, וזה
          מצב שאפשר לתקן ביצירת שורה עם אותו מפתח. המסך אומר
          את זה, ולא נופל. */}
      {block ? (
        <TextBlock block={block} canEdit={d.me.headText} say={say} onSaved={load} />
      ) : (
        <div className="empty">
          <div className="e-ico">✎</div>
          <b>הנוסח טרם הוזן</b>
          <span>
            ראש המכינה מזין אותו בלוח "טקסטים באפליקציה", בשורה בשם
            <b> {KEY}</b>.
          </span>
        </div>
      )}

      {/* ⚠ מי כתב ומתי — נשאר בתוך TextBlock, ליד הנוסח עצמו.
          כאן רק ההבהרה שזו הגרסה המחייבת. */}
      <div className="tm-note">
        זהו הנוסח המחייב של נהלי המכינה. הוא נערך על ידי ראש המכינה,
        וכל שינוי בו מופיע כאן מיד.
      </div>
    </>
  );
}
