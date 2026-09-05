/* ============================================================
   מגמות — מסך הצוות
   ------------------------------------------------------------
   ⚠⚠⚠ **אין כאן שום מספר על חניך מסוים.** ההבטחה כתובה במסך
     ולא רק בקוד: מי שלא יידע שהיא קיימת ינהג כאילו היא לא.
     ראו api/_trends.js.

   ⚠ **מגמה דורשת מספיק נקודות, ואחרת נאמר שאין.** שתי נקודות
     שמחוברות בקו נראות כמו מסקנה, וזה בדיוק מה שהן לא (4ג).

   ⚠ **הגרף ב-SVG ובלי ספרייה.** שש סדרות של שמונה נקודות אינן
     מצדיקות חבילה חיצונית — וגם: nodemailer היא התלות
     החיצונית היחידה במאגר, ויש סיבה טובה לשמור על זה.
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const dmy = (iso) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export default function TrendsPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(() => {
    setErr(null);
    api.trends().then(setD).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (err) {
    return (
      <>
        <div className="screen-title">מגמות</div>
        <div className="banner-bad">{err}</div>
      </>
    );
  }
  if (!d) return <div className="skel" style={{ height: 240 }} />;

  return (
    <>
      <div className="screen-title">מגמות</div>

      {/* ⚠⚠ ההבטחה ראשונה, לפני הנתונים. */}
      <div className="tr-promise">{d.promise}</div>

      <div className="tm-note" style={{ marginTop: 0 }}>
        שמונת השבועות שהסתיימו, {dmy(d.from)} – {dmy(d.to)}.
        השבוע הנוכחי אינו נספר — הוא טרם נגמר, וכל מדד בו נמוך מטבעו.
      </div>

      {/* ⚠ רשימה חלקית אומרת שהיא חלקית (עיקרון 6). */}
      {d.failed > 0 && (
        <div className="note-warn" style={{ marginBottom: 12 }}>
          {d.failed === 1 ? "מדד אחד לא נטען" : `${d.failed} מדדים לא נטענו`}.
        </div>
      )}

      {d.series.length === 0 && (
        <div className="empty">
          <div className="e1">אין עדיין נתונים</div>
          <div className="e2">המגמות נבנות מהשבועות שהסתיימו.</div>
        </div>
      )}

      {d.series.map((s) => <Series key={s.title} s={s} min={d.minPoints} />)}
    </>
  );
}

function Series({ s, min }) {
  const real = s.points.filter((p) => p.value != null);

  if (!s.enough) {
    /* ⚠ **מצב משלו ולא גרף ריק.** גרף של נקודה אחת נראה כמו
       נתון, והוא אינו. */
    return (
      <div className="tr-card">
        <div className="tr-h"><div className="tr-t">{s.title}</div></div>
        <div className="tr-none">
          עוד אין מספיק נתונים למגמה — צריך לפחות {min} שבועות עם נתון,
          ויש {real.length}.
        </div>
        {s.note && <div className="tr-n">{s.note}</div>}
      </div>
    );
  }

  const vals = real.map((p) => p.value);
  const max = Math.max(...vals, s.unit === "%" ? 100 : 1);
  const last = vals[vals.length - 1];
  /* ⚠ הכיוון נגזר בשרת ולא כאן — שני חישובים היו נפרדים. */
  const up = s.change != null && s.change > 0;
  const flat = s.change === 0;

  return (
    <div className="tr-card">
      <div className="tr-h">
        <div className="tr-t">{s.title}</div>
        <div className="tr-now num">
          {last}{s.unit}
          {s.change != null && !flat && (
            <span className={"tr-ch " + (up ? "up" : "dn")}>
              {up ? "▲" : "▼"} {Math.abs(s.change)}{s.unit}
            </span>
          )}
          {flat && <span className="tr-ch">ללא שינוי</span>}
        </div>
      </div>

      {/* ⚠ **עמודות ולא קו.** קו בין נקודות מרמז על ערכים
          שביניהן, ואין כאן ערכים שביניהן — יש שמונה שבועות.
          ⚠ ושבוע בלי נתון מסומן ואינו מדולג: חור הוא מידע. */}
      <div className="tr-bars" dir="rtl">
        {s.points.map((p) => (
          <div className="tr-col" key={p.label} title={dmy(p.label)}>
            {p.value == null ? (
              <div className="tr-bar tr-gap" style={{ height: "6px" }} />
            ) : (
              <div className="tr-bar"
                style={{ height: Math.max(4, (p.value / max) * 92) + "px" }} />
            )}
            <div className="tr-lab">{dmy(p.label)}</div>
          </div>
        ))}
      </div>

      {/* ⚠ מקרא לחור, כי עמודה נמוכה וחור נראים דומה בהצצה. */}
      {s.points.some((p) => p.value == null) && (
        <div className="tr-n">שבוע ללא נתון מסומן בקו דק — לא אפס.</div>
      )}
      {s.note && <div className="tr-n">{s.note}</div>}
    </div>
  );
}
