/* ============================================================
   דפי הקיצור במסך הבית — נגזרים מהמגירה
   ------------------------------------------------------------
   הבקשה: *"כל פעם שיש עדכון באפליקציה, לדוגמה דף חדש, הוא
   מתווסף לדפי הקיצור. כל דבר שמשפיע על דברים אחרים — תוסיף
   אותו לשם."*

   ⚠⚠ **עד היום אלה היו שתי רשימות כתובות ביד** — תשעה אריחים
     בכל מסך בית — **ליד** המגירה, שהיא המפה המלאה. כל מסך
     שנבנה אחריהן (קניות, מליאות, חדר כביסה, המשמר…) נכנס
     למגירה ולא לאריחים, כי איש לא זכר שיש רשימה שלישית. זה
     4מד בדיוק: שתי רשימות מקבילות מתפצלות בתוספת הראשונה.

     עכשיו האריחים **הם** המגירה: אותו `navGroups` שממנו נגזר
     גם שם היעד של חץ החזרה. דף שנוסף למגירה מופיע כאן מעצמו,
     באותה קבוצה ובאותה הרשאה — כי המגירה כבר החליטה מי רואה
     מה. אין כאן שום ידיעה על הרשאות.

   שני סימונים, ושניהם נגזרים ואינם נכתבים ביד:

     **חדש**   — דף שהמכשיר הזה לא ראה עד היום. נשמר במכשיר
                 (`localStorage`): בפעם הראשונה כל הקיים נרשם
                 כ"ישן", ומה שמופיע אחר כך מסומן — עד שנכנסים
                 אליו או עד שעברו 14 יום.
     **עודכן** — דף שרשומה ב"מה חדש" מהשבועות האחרונים מציינת
                 ב-`screens`. **כאן נכנס "כל דבר שמשפיע על דברים
                 אחרים"**: שינוי אחד שנוגע בשלושה מסכים מסמן את
                 שלושתם, ולא רק את זה שבו נבנה.

   ⚠ **"חדש" במכשיר ולא בשרת** — זו שאלה על מה *אני* ראיתי,
     והיא אינה שווה עמודה בלוח ובקשה בכל טעינת בית. מכשיר חדש
     מתחיל נקי ואינו מסמן את כל המערכת כחדשה.
   ============================================================ */

import React, { useMemo } from "react";
import { toneOf } from "../shared/duties.js";
import { newsFor } from "../shared/whats-new.js";
import { israelDateStr } from "./testDate.js";

const NEW_DAYS = 14;
const NEWS_DAYS = 21;

const daysBetween = (a, b) =>
  Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);

/* ⚠ כל גישה עטופה: בחלון פרטי, בתצוגה מקדימה או בדפדפן שחוסם
   נתוני אתר, הגישה עצמה זורקת — והאריחים חייבים להופיע גם אז. */
function readSeen(scope) {
  try {
    const raw = localStorage.getItem("kx_screens_v1:" + scope);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeSeen(scope, map) {
  try { localStorage.setItem("kx_screens_v1:" + scope, JSON.stringify(map)); } catch { /* ראו למעלה */ }
}

/**
 * groups: navGroups של המעטפת — [{ label, items:[{ key,label,icon,active,badge,onClick }] }]
 * skip:   מפתחות שלא יוצגו (מסך הבית עצמו)
 * extra:  פעולות שאינן דפים ("בקשת יציאה חדשה") — בראש הרשימה
 * scope:  "staff" | "student" — גם קהל "מה חדש" וגם מפתח הזיכרון
 */
export default function Shortcuts({ groups, skip = [], extra = [], scope = "staff" }) {
  const today = israelDateStr();

  /* ⚠ הקבוצות מהמגירה, בלי המסך הנוכחי ובלי כפילות לפי שם.
     אותו דף יכול לשבת בשתי קבוצות (תפקיד ומובילשים), ואריח
     כפול נראה כמו באג (4ק). */
  const shown = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const g of groups || []) {
      const items = [];
      for (const it of (g && g.items) || []) {
        if (!it || !it.label || skip.includes(it.key) || seen.has(it.label)) continue;
        seen.add(it.label);
        items.push(it);
      }
      if (items.length) out.push({ label: g.label || "", items });
    }
    return out;
  }, [groups, skip]);

  /* ---------- "עודכן": מה ש"מה חדש" אומר שנגע בו ---------- */
  const updated = useMemo(() => {
    const set = new Set();
    for (const n of newsFor(scope === "student")) {
      if (!n.date || daysBetween(n.date, today) > NEWS_DAYS) continue;
      for (const s of n.screens || []) set.add(s);
    }
    return set;
  }, [scope, today]);

  /* ---------- "חדש": מה שהמכשיר הזה לא ראה ----------
     ⚠ נכתב בזמן הרינדור ולא ב-effect: הרשימה נקבעת פעם אחת לכל
       טעינה, והרישום אידמפוטנטי — שם שכבר נרשם אינו משתנה. */
  const fresh = useMemo(() => {
    const labels = shown.flatMap((g) => g.items.map((it) => it.label));
    let map = readSeen(scope);
    const first = !map;
    map = map || {};
    let dirty = false;
    for (const l of labels) {
      if (map[l]) continue;
      /* ⚠ בפעם הראשונה הכול "ישן" — אחרת מכשיר חדש היה מסמן
         את כל ארבעים הדפים כחדשים, והסימון היה מאבד משמעות. */
      map[l] = first ? "old" : today;
      dirty = true;
    }
    if (dirty) writeSeen(scope, map);
    return new Set(labels.filter((l) =>
      map[l] !== "old" && daysBetween(map[l], today) <= NEW_DAYS));
  }, [shown, scope, today]);

  /* ⚠ כניסה לדף מורידה את "חדש" — הסימון עשה את שלו. */
  const open = (it) => {
    if (fresh.has(it.label)) {
      const map = readSeen(scope) || {};
      map[it.label] = "old";
      writeSeen(scope, map);
    }
    it.onClick && it.onClick();
  };

  const tile = (it) => {
    const isNew = fresh.has(it.label);
    const isUpd = !isNew && updated.has(it.label);
    return (
      <button key={it.key} className={"qk-t tone-" + toneOf(it.label)} onClick={() => open(it)}>
        <span className="qk-ic">{it.icon}</span>
        <span className="qk-l">{it.label}</span>
        {/* ⚠ המילה ולא רק נקודה: נקודה אדומה נקראת כ"יש כאן
            משהו לטפל בו", וזה מה שהמונה אומר (4ג). */}
        {isNew && <i className="qk-flag qk-new">חדש</i>}
        {isUpd && <i className="qk-flag qk-upd">עודכן</i>}
        {it.badge > 0 && <b className="qk-b num">{it.badge > 99 ? "99+" : it.badge}</b>}
      </button>
    );
  };

  return (
    <div className="qk">
      <div className="sec-label">כל המערכת</div>
      {!!extra.length && <div className="qk-g">{extra.map(tile)}</div>}
      {shown.map((g, i) => (
        <div key={g.label + i}>
          {g.label && <div className="qk-h">{g.label}</div>}
          <div className="qk-g">{g.items.map(tile)}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   ⚠ קידומת `qk-` — נבדקה ב-grep לפני שנכתבה.
   ⚠ הגוון מ-`.tone-N` הקיים (4ג): הגוון נגזר מהשם, ולכן דף
     חדש מקבל צבע מעצמו בלי שאיש יבחר לו.
   ⚠ שלוש עמודות ולא שתיים: אלה ארבעים דפים ולא תשעה, ובשתי
     עמודות הרשימה הייתה גלילה של שלושה מסכים.
   ============================================================ */
export const SHORTCUTS_CSS = `
.qk{margin-top:4px}
.qk-h{font-size:11.5px;font-weight:800;color:var(--faint);letter-spacing:.3px;
  margin:14px 2px 7px}
.qk-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.kx .qk-t{position:relative;display:flex;flex-direction:column;align-items:center;
  justify-content:flex-start;gap:6px;min-height:84px;padding:11px 5px 9px;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);
  box-shadow:var(--sh-1);color:var(--ink);text-align:center;
  transition:transform 120ms var(--ease)}
.kx .qk-t:active{transform:scale(.97)}
.qk-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;
  justify-content:center;background:var(--t-s,var(--accent-soft));color:var(--t,var(--accent))}
.qk-ic svg{width:19px;height:19px}
.qk-l{font-size:12px;font-weight:800;line-height:1.3;max-width:100%;
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.qk-flag{position:absolute;top:5px;left:5px;font-style:normal;font-size:9.5px;
  font-weight:900;line-height:1;padding:3px 5px;border-radius:999px}
.qk-new{background:var(--accent);color:#fff}
.qk-upd{background:var(--accent-soft);color:var(--accent)}
.qk-b{position:absolute;top:5px;right:5px;min-width:17px;height:17px;padding:0 4px;
  display:flex;align-items:center;justify-content:center;border-radius:999px;
  background:var(--clay);color:#fff;font-size:10px;font-weight:900}
@media (prefers-reduced-motion: reduce){ .kx .qk-t:active{transform:none} }
`;
