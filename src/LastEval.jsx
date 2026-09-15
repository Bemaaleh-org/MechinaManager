/* ============================================================
   חוות הדעת האחרונה — כרטיס במסך הבית
   ------------------------------------------------------------
   הבקשה: *"בדף הבית שיהיה שחוות דעת האחרונה תופיע אצל הצוות
   בדף הבית עד שיש חוות דעת חדשה, עם הדירוג והחוות דעת
   המילולית, נגזרת מחוות דעת הכללית."*

   ⚠ **רכיב אחד לשתי המעטפות** — מסך הבית של המנהל ושל אחראי
     הלו״ז. זה בדיוק הדפוס של `LessonChangesCard`, ומאותה
     סיבה: עיקרון 4יט נשבר פעם אחת כששני מסכים שאמורים להיות
     זהים נבנו בנפרד.

   ⚠ **"עד שיש חדשה" אינו דגל "נקרא".** חוות דעת אינה התראה —
     אין מה "לטפל" בה. הכרטיס מציג תמיד את העדכנית ביותר,
     והיא מתחלפת מעצמה (4כו).

   ⚠ **הציון לעולם לא לבד** (4ב): לצידו המקור — ★ להצבעות
     חניכים, בלי כוכב לציון ידני — ומספר המדרגים. ממוצע של
     33 חניכים וציון שמדריך אחד זכר הם שני דברים, וציון בלי
     מניין אינו אומר אם הוא של הכיתה או של שניים (5כו).

   ⚠ **והצבע לפי הציון ולא לפי המקור**, כמו בכל שאר המערכת.
   ============================================================ */
import { useEffect, useState } from "react";
import { api } from "./api.js";

/* ⚠ אותו סולם בדיוק של Archive.jsx ושל מסך חוות הדעת (4ב).
   9+ ירוק · 8 כחול · 6 ענבר · מתחת ל-6 חימר. */
const scoreTone = (n) =>
  n == null ? "" : n >= 9 ? "sc-ok" : n >= 8 ? "sc-blue" : n >= 6 ? "sc-amber" : "sc-clay";

const dm = (iso) => (iso ? iso.slice(8, 10) + "." + iso.slice(5, 7) : "");

/**
 * @param enabled    האם בכלל לטעון. ⚠ שער זול לפני קריאת רשת (4צ).
 * @param onOpen     מעבר למסך חוות הדעת
 * @param onSettled  דיווח ל-useHomeGate, גם בכישלון
 */
export function LastEvalCard({ enabled = false, onOpen, onSettled }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!enabled) { onSettled?.(); return; }
    let live = true;
    api.getLastEval()
      .then((r) => { if (live) setD(r.latest || null); })
      /* ⚠ כרטיס שנופל אינו מפיל את מסך הבית (4כו). */
      .catch(() => {})
      .finally(() => { if (live) onSettled?.(); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  /* ⚠ **אין חוות דעת — אין כרטיס.** לא ריק, לא "טרם נכתבה".
     כותרת מעל ריק נראית כמו תקלה, ומסך שמלא בקופסאות ריקות
     מלמד להתעלם מהן (4מא, 4ש). */
  if (!d) return null;

  const stars = d.source === "students";

  return (
    <button type="button" className="card lev" onClick={onOpen}>
      <div className="lev-h">
        <span className="lev-k">חוות הדעת האחרונה</span>
        {d.at && <span className="lev-d">{dm(d.at)}</span>}
      </div>

      <div className="lev-top">
        <div className="lev-who">
          <b>{d.name}</b>
          {(d.topic || d.field) && <span>{d.topic || d.field}</span>}
        </div>
        {/* ⚠ הציון עם המקור והמניין — לעולם לא לבדו (4ב, 5כו). */}
        {d.score != null && (
          <div className={"lev-sc " + scoreTone(d.score)}>
            <b className="num">{d.score}{stars ? "★" : ""}</b>
            <span>
              {stars
                ? (d.votes ? `${d.votes} דירגו` : "הצבעות חניכים")
                : "ציון ידני"}
            </span>
          </div>
        )}
      </div>

      <p className="lev-op">
        {d.opinion}
        {/* ⚠ נחתך — ונאמר. טקסט שנקטע בלי סימן נקרא כאילו זה כל
            מה שנכתב. */}
        {d.truncated && <span className="lev-more"> … לקריאה מלאה</span>}
      </p>

      {/* ⚠ תאריך השיעור נפרד מתאריך הכתיבה (5ג), ומוצג רק כשהוא
          באמת אחר — שני תאריכים זהים זה לצד זה נראים כמו באג. */}
      {d.lessonDate && d.lessonDate !== d.at && (
        <div className="lev-f">השיעור התקיים ב-{dm(d.lessonDate)}</div>
      )}
    </button>
  );
}

export const LASTEVAL_CSS = `
.kx .lev{display:block;width:100%;text-align:right;margin-bottom:11px;
  padding:13px 15px;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-lg);box-shadow:var(--sh-1);cursor:pointer;
  transition:box-shadow .12s var(--ease)}
.kx .lev:hover{box-shadow:var(--sh-2)}
.lev-h{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.lev-k{font-size:10.5px;font-weight:900;letter-spacing:1px;color:var(--faint)}
.lev-d{margin-inline-start:auto;font-size:11.5px;font-weight:700;color:var(--faint)}
.lev-top{display:flex;align-items:flex-start;gap:10px}
.lev-who{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}
.lev-who b{font-size:15px;font-weight:800;line-height:1.3}
.lev-who span{font-size:12px;font-weight:600;color:var(--faint)}
/* ⚠⚠ **מוקף ב-.lev-sc ולא בשמות עירומים.** ב-styles.js יש
   משפחת .sc-* אחרת לגמרי (sc-top · sc-good · sc-ok · sc-low),
   ושם .sc-ok הוא **ענבר** — בעוד scoreTone נותן אותו ל-9 ומעלה
   שאמור להיות ירוק. בלי ההיקוף ציון 9.5 היה נצבע ענבר בשקט.
   אותו פתרון בדיוק של .ar-sc ב-Archive.jsx. */
.lev-sc{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:1px;
  padding:5px 11px;border-radius:var(--r-md);background:var(--t1-s);color:var(--ink)}
.lev-sc.sc-ok{background:var(--ok-soft);color:var(--ok)}
.lev-sc.sc-blue{background:var(--accent-soft);color:var(--accent)}
.lev-sc.sc-amber{background:var(--amber-soft);color:var(--amber)}
.lev-sc.sc-clay{background:var(--clay-soft);color:var(--clay)}
.lev-sc b{font-size:19px;font-weight:900;line-height:1.1}
.lev-sc span{font-size:10px;font-weight:700;opacity:.85;white-space:nowrap}
.lev-op{margin:9px 0 0;font-size:13.5px;line-height:1.6;color:var(--muted);
  font-weight:500;white-space:pre-wrap}
.lev-more{font-weight:800;color:var(--accent);white-space:nowrap}
.lev-f{margin-top:8px;font-size:11.5px;font-weight:700;color:var(--faint)}
`;
