/* ============================================================
   מה זז בלו״ז — ההתראה שמאפשרת לעדכן את היומן החיצוני
   ------------------------------------------------------------
   הבקשה: *"אני רוצה שלאחראי לו״ז תקפוץ התראה בראש מסך הבית
   כשגיליון הוזז שונה או נמחק, ככה שהוא ידע לשנות את זה בגוגל
   קאלנדר בשביל עצמו."*

   ⚠ **המערכת אינה כותבת ליומן החיצוני** — זה שירות נוסף וסוד
     נוסף ב-.env, ולא נבנה (אותו גבול של הדחיפה והמייל, 4כו).
     מה שהיא כן עושה הוא לומר בדיוק מה השתנה, כדי שמי שמתחזק
     את היומן יידע מה לפתוח.

   ⚠⚠ **וכשאין מה לומר — אין כרטיס.** מחזיר `null` ברוב הימים,
     ולכן אינו דוחק דבר במסך רגיל. קופסה קבועה שכתוב בה "אין
     שינויים" מלמדת להתעלם מהמקום הזה.

   ⚠ **"שיניתי בעצמי" מוצג ומסומן ואינו מסונן.** בפעמון הוא
     יורד — התראה על פעולה שהרגע עשית היא רעש (5כה) — אבל
     במסך הוא בדיוק התזכורת: הזזת, עדכנת ביומן?

   ⚠ **וכשל הקמה נראה אחרת מ"אין שינויים"** (עיקרון 6):
     `ready:false` מקבל שורה שאומרת מה להריץ, ולא שקט.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";

const CI = {
  cal: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  chev: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  warn: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

/** חותמת ISO → "היום 14:32" / "אתמול" / "12.09". */
function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = (x) => `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}`;
  const now = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (same(d, now)) return "היום " + hm;
  const y = new Date(now.getTime() - 86400_000);
  if (same(d, y)) return "אתמול " + hm;
  return day(d);
}

/**
 * @param {boolean} enabled  האם הקורא רשאי בכלל לראות את הלו״ז.
 *   ⚠ **נשלח מהמסך, והכרטיס עדיין מדווח `onSettled`** — שער
 *   מסך הבית סופר מקורות, ורכיב שאינו מדווח היה משאיר את
 *   המסך תלוי עד הטיים-אאוט (useHomeGate).
 */
export function LessonChangesCard({ enabled = false, onOpen, onSettled }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!enabled) { if (onSettled) onSettled(); return undefined; }
    let alive = true;
    api.getLessonChanges()
      /* ⚠ כישלון אינו מפיל את מסך הבית — הכרטיס אינו מוצג. */
      .then((r) => { if (alive) setD(r); })
      .catch(() => {})
      .finally(() => { if (alive && onSettled) onSettled(); });
    return () => { alive = false; };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!enabled || !d) return null;

  if (d.ready === false) {
    return (
      <div className="alert a-amber lc-setup">
        <CI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">יומן השינויים טרם הוקם</div>
          <div className="bd">{d.hint}</div>
        </div>
      </div>
    );
  }

  const list = d.changes || [];
  if (!list.length) return null;

  return (
    <button className="card lc-card" onClick={onOpen}>
      <div className="lc-h">
        <div className="lc-ico"><CI.cal /></div>
        <div className="lc-t">
          <b>{list.length === 1 ? "שינוי בלו״ז" : `${list.length} שינויים בלו״ז`}</b>
          <span>לעדכן ביומן החיצוני</span>
        </div>
        <CI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
      </div>
      <div className="lc-list">
        {list.slice(0, 6).map((c) => (
          <div className="lc-r" key={c.id + c.at}>
            <b>{c.subject}</b>
            <span>{c.note}</span>
            <i>
              {when(c.at)}
              {/* ⚠ "שינית" ולא השם שלי — נגזר בשרת (`mine`). */}
              {c.mine ? " · שינית" : c.by ? " · " + c.by : ""}
            </i>
          </div>
        ))}
        {list.length > 6 && <div className="lc-more">ועוד {list.length - 6}</div>}
      </div>
    </button>
  );
}

/* ============================================================
   שינויים בלו״ז — הדף המלא (13.9.2026)
   ------------------------------------------------------------
   הבקשה: *"שכרטיס השינויים בלו״ז יהיה מקושר לדף חדש שמראה
   בהרחבה את השינויים שהיו — וזה באחריות אחראי הלו״ז."*

   ⚠ **השינוי האחרון בכל גיליון, ולא היסטוריה.** הרישום הוא שורה
     אחת לגיליון שנדרסת (api/_lesson-changes.js) — ולכן הדף אומר
     זאת במילים, כדי שאיש לא יחפש כאן שינוי קודם באותו גיליון.
   ⚠ **חלון לבחירה** — שבועיים, חודש או שלושה חודשים — רשימה סגורה
     שהשרת מכיר ולא מספר חופשי.
   ⚠ **מי מלמד ומתי** — שם המרצה ויום ושעה בלבד; פרטי הקשר והמחיר
     אינם יוצאים מהגיליון לכאן (עיקרון 4).
   ============================================================ */
const dayKey = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toDateString();
};
const dayLabel = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "היום";
  if (d.toDateString() === new Date(now.getTime() - 86400_000).toDateString()) return "אתמול";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const hm = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? ""
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function LessonChangesPage() {
  const [days, setDays] = useState(14);
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setD(null);
    api.getLessonChanges(days)
      .then((r) => { if (alive) { setD(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, [days]);

  const list = (d && d.changes) || [];
  const groups = [];
  for (const c of list) {
    const k = dayKey(c.at);
    const g = groups.find((x) => x.k === k);
    if (g) g.items.push(c); else groups.push({ k, label: dayLabel(c.at), items: [c] });
  }

  return (
    <>
      <div className="tm-sub">
        כל גיליון שזז, בוטל, חזר ללו״ז, נוסף או נמחק — כדי לעדכן את היומן החיצוני.
        <b> באחריות אחראי הלו״ז.</b> לכל גיליון מוצג השינוי האחרון שלו.
      </div>
      <div className="seg">
        {[14, 30, 90].map((n) => (
          <button key={n} className={days === n ? "on" : ""} onClick={() => setDays(n)}>
            {n === 14 ? "שבועיים" : n === 30 ? "חודש" : "שלושה חודשים"}
          </button>
        ))}
      </div>

      {err ? (
        <div className="alert a-clay">
          <CI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">לא הצלחנו לטעון את השינויים</div>
            <div className="bd">{err.message}</div>
          </div>
        </div>
      ) : !d ? (
        <><div className="skel skel-card" /><div className="skel skel-card" /></>
      ) : d.ready === false ? (
        <div className="alert a-amber">
          <CI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">יומן השינויים טרם הוקם</div>
            <div className="bd">{d.hint}</div>
          </div>
        </div>
      ) : !list.length ? (
        <div className="empty">
          <div className="e-ico"><CI.cal /></div>
          <b>אין שינויים בלו״ז</b>
          <span>בתקופה שנבחרה אף גיליון לא זז, לא בוטל ולא נוסף.</span>
        </div>
      ) : groups.map((g) => (
        <div className="lcp-g" key={g.k}>
          <div className="lcp-h">{g.label}</div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {g.items.map((c) => (
              <div className="lcp-r" key={c.id + c.at}>
                <div className="lcp-t">
                  <b>{c.subject}</b>
                  <i>{hm(c.at)}</i>
                </div>
                <div className="lcp-n">{c.note}</div>
                {(c.lecturer || c.dayTime) && (
                  <div className="lcp-m">
                    {[c.lecturer, c.dayTime].filter(Boolean).join(" · ")}
                  </div>
                )}
                <div className={"lcp-m" + (c.mine ? " lcp-mine" : "")}>
                  {c.mine ? "שינית בעצמך — עדכנת ביומן?" : c.by ? "שינה: " + c.by : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export const LESSONCHANGES_CSS = `
.kx .lc-card{display:block;width:100%;text-align:right;margin-bottom:14px}
.lc-setup{margin-bottom:14px}
.lc-h{display:flex;align-items:center;gap:11px}
.lc-ico{flex:0 0 auto;width:36px;height:36px;border-radius:var(--r-sm);
  display:flex;align-items:center;justify-content:center;background:var(--t4-s);color:var(--t4)}
.lc-t{flex:1;min-width:0}
.lc-t b{display:block;font-size:13.5px;font-weight:900;color:var(--ink)}
.lc-t span{display:block;font-size:11.5px;font-weight:700;color:var(--faint);margin-top:2px}
.lc-list{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.lc-r{background:var(--soft);border-radius:var(--r-sm);padding:7px 10px}
.lc-r b{display:block;font-size:12.5px;font-weight:900;color:var(--ink)}
.lc-r span{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-top:1px}
.lc-r i{display:block;font-style:normal;font-size:10.5px;font-weight:700;
  color:var(--faint);margin-top:2px}
.lc-more{font-size:11.5px;font-weight:800;color:var(--faint);padding-inline-start:4px}

/* ---------- הדף המלא ---------- */
.lcp-g{margin-bottom:14px}
.lcp-h{font-size:12px;font-weight:800;color:var(--faint);margin:0 2px 6px}
.lcp-r{padding:12px 14px;border-bottom:1px solid var(--line)}
.lcp-r:last-child{border-bottom:none}
.lcp-t{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.lcp-t b{font-size:15px;font-weight:800;color:var(--ink)}
.lcp-t i{font-style:normal;font-size:12px;font-weight:700;color:var(--faint);flex-shrink:0}
.lcp-n{font-size:13.5px;font-weight:700;color:var(--ink);margin-top:3px}
.lcp-m{font-size:12px;font-weight:600;color:var(--muted);margin-top:2px}
.lcp-mine{color:var(--accent)}
`;
