/* ============================================================
   מי לא כאן היום
   ------------------------------------------------------------
   השאלה שמוביל השבוע ואיש הצוות שואלים בבוקר, ושעד היום
   דרשה לפתוח את מסך סימון הנוכחות ולקרוא 33 שורות.

   ⚠⚠ **שני מקורות ושני מצבים שונים**, ואי אפשר לאחד אותם:
     · **מאושר** — יש שורת היעדרות ליום הזה, כלומר בקשת יציאה
       שהוכרעה. זה ידוע מראש.
     · **לא סומן** — היום עדיין לא נסמן בכלל. זה **אינו**
       "כולם כאן": זה "אין נתון" (עיקרון 6), ולכן נאמר במפורש
       ולא מוצג כאפס.

   ⚠⚠ **ולחניך אין סוג ואין פירוט.** מוביל שבוע הוא חניך,
     וההבחנה בין "חופש" ל"מחלה" היא נתון רפואי על חבר שלו
     (4א, 5כד). הצוות רואה את הסוג; המוביל רואה שם בלבד.

   ⚠ **וכשאין מה לומר — אין כרטיס.** יום שאינו יום לימודים,
     או יום שכולם בו נוכחים, אינו מקבל קופסה ריקה שמלמדת
     להתעלם מהמקום הזה.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { israelDateStr } from "./testDate.js";

const AI = {
  users: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.6"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M17 5.2a3.6 3.6 0 0 1 0 6.9M18 20a6.6 6.6 0 0 0-2-4.7"/></svg>,
  chev: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  warn: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

/**
 * @param {boolean} staff  האם הקורא הוא איש צוות. ⚠ קובע אם
 *   הסוג מוצג — ראו ההערה בראש הקובץ. נשלח מהמסך ולא נגזר
 *   כאן, כי המסך הוא שיודע באיזו מעטפת הוא יושב (4יט).
 */
export function AbsentTodayCard({ staff = false, onOpen }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    let alive = true;
    /* ⚠ כישלון אינו מפיל את מסך הבית — הכרטיס פשוט אינו מוצג. */
    api.getAttendanceDay(israelDateStr())
      .then((r) => { if (alive) setD(r); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!d || !d.day || d.outOfYear) return null;
  /* ⚠ יום שאינו יום לימודים — אין על מה לדווח, ולא "אף אחד
     לא נעדר". שני דברים שונים. */
  if (!d.day.isSchoolDay) return null;

  const list = (d.students || []).filter((s) => s.absent);
  const unmarked = d.marked ? (d.counts ? d.counts.unmarked : null) : null;
  const notMarked = !d.marked;

  if (!list.length && !notMarked && !unmarked) return null;

  return (
    <button className="card ab-card" onClick={onOpen}>
      <div className="ab-h">
        <div className="ab-ico"><AI.users /></div>
        <div className="ab-t">
          <b>מי לא כאן היום</b>
          <span>
            {list.length ? `${list.length} נעדרים מאושרים` : "אין היעדרויות מאושרות"}
            {notMarked ? " · היום טרם סומן" : ""}
          </span>
        </div>
        <AI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
      </div>

      {list.length > 0 && (
        <div className="ab-list">
          {list.map((s) => (
            <span className="ab-p" key={s.id}>
              {s.name}
              {/* ⚠ הסוג לצוות בלבד. ראו ההערה בראש הקובץ. */}
              {staff && s.type ? <i>{s.type}</i> : null}
            </span>
          ))}
        </div>
      )}

      {/* ⚠ "טרם סומן" הוא מצב שלישי ולא אפס — הוא נאמר במילים,
          כי בלעדיו הרשימה נראית כמו התמונה המלאה (עיקרון 6). */}
      {notMarked && (
        <div className="ab-warn"><AI.warn />הנוכחות היומית טרם סומנה, ולכן זו אינה התמונה המלאה</div>
      )}
      {!notMarked && unmarked > 0 && (
        <div className="ab-warn"><AI.warn />{unmarked} חניכים לא סומנו לא כנוכחים ולא כנעדרים</div>
      )}
    </button>
  );
}

export const ABSENT_CSS = `
.kx .ab-card{display:block;width:100%;text-align:right;margin-bottom:14px}
.ab-h{display:flex;align-items:center;gap:11px}
.ab-ico{flex:0 0 auto;width:36px;height:36px;border-radius:var(--r-sm);
  display:flex;align-items:center;justify-content:center;background:var(--t2-s);color:var(--t2)}
.ab-t{flex:1;min-width:0}
.ab-t b{display:block;font-size:13.5px;font-weight:900;color:var(--ink)}
.ab-t span{display:block;font-size:11.5px;font-weight:700;color:var(--faint);margin-top:2px}
.ab-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.ab-p{display:inline-flex;align-items:baseline;gap:5px;background:var(--soft);
  border-radius:999px;padding:4px 10px;font-size:12px;font-weight:800;color:var(--ink)}
.ab-p i{font-style:normal;font-size:10.5px;font-weight:700;color:var(--faint)}
.ab-warn{display:flex;align-items:center;gap:6px;margin-top:9px;font-size:11.5px;
  font-weight:800;color:var(--t6)}
`;
