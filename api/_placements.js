/* ============================================================
   /api/students?action=placements — שיבוצי חניכים
     GET   מנהל: ההגדרות, כל השיבוצים ורשימת החניכים לשיבוץ
           חניך: ההגדרות והשיבוצים שלו בלבד
     POST  { placementId, semester, studentIds: [...] }   מנהל

   ⚠ הגוף נושא את הרשימה המלאה הרצויה, לא "הוסף"/"הסר" — אותו
     שיקול שבסימון הנוכחות ובתפקידים: שתי כתיבות כמעט בו-זמנית
     שולחות כוונה שלמה, לא פעולה שתלויה במה שקדם לה.

   ⚠ ההגדרות עצמן (אילו ענפים, מה המכסה, מה התקופה) נערכות
     בלוח monday בלבד — אין כאן נקודת קצה שכותבת אליהן. זה
     עיקרון 1: מה שאפשר להגדיר בלוח, מוגדר בלוח.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { invalidateGuides } from "./_guides.js";
import { activeStudents } from "./_student-rows.js";
import {
  PLACEMENT_BOARDS, PLACEMENT_COLS, CATEGORIES, PERIOD, placementsReady, semestersFor,
  byCategory,
} from "../shared/placements.js";

const D = PLACEMENT_COLS.definitions;
const A = PLACEMENT_COLS.assignments;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/** ההגדרות: מהם השיבוצים. הסדר — כסדר הלוח. */
export async function loadDefinitions({ force = false } = {}) {
  return cached("placement-defs", async () => {
    const items = await allItems(PLACEMENT_BOARDS.definitions);
    return items
      .map((i) => {
        const cap = val(i, D.capacity);
        return {
          id: String(i.id),
          name: String(i.name || "").trim(),
          category: val(i, D.category),
          period: val(i, D.period) || PERIOD.yearly,
          capacity: cap === "" ? null : Number(cap),
          /* ⚠ פירוט לצוות בלבד — ראו toStudentDef */
          hours: val(i, D.hours) || null,
          desc: val(i, D.desc) || null,
          needs: val(i, D.needs) || null,
          lead: val(i, D.lead) || null,
          /* ⚠ יו״ר הוא **חניך**, ו-lead הוא המדריך המלווה.
             שתי עמודות ולא אחת — ראו shared/placements-ids.js */
          chair: val(i, D.chair) || null,
          chairName: val(i, D.chairName) || null,
          /* ⚠ **ריק פירושו פעיל.** הקוטביות הפוכה בכוונה: כל
             שורה שקיימת היום נכתבה לפני שהעמודה נוספה, ותיבה
             ריקה שמשמעותה "מוארכב" הייתה מעלימה את כולן
             בשקט — שם מסך השיבוצים היה נראה כמו לוח ריק. */
          archived: val(i, D.archived) === "v",
        };
      })
      .filter((x) => x.name && CATEGORIES.includes(x.category));
  }, { force });
}

/** השיבוצים בפועל */
export async function loadAssignments({ force = false } = {}) {
  return cached("placement-asgn", async () => {
    const items = await allItems(PLACEMENT_BOARDS.assignments);
    return items
      .map((i) => ({
        id: String(i.id),
        student: val(i, A.student),
        studentName: val(i, A.studentName),
        placement: val(i, A.placement),
        placementName: val(i, A.placementName),
        semester: val(i, A.semester),
      }))
      .filter((x) => x.student && x.placement);
  }, { force });
}

/* ⚠ גם מפת המדריכים: היא נגזרת מהשיבוצים, וחניך
   שהועבר בין קבוצות אמור להגיע למדריך החדש מיד. */
const invalidatePlacements = () => {
  invalidate("placement-defs"); invalidate("placement-asgn"); invalidateGuides();
};

/**
 * מה חניך רואה על שיבוץ. שם ושעות פעילות — המידע התפעולי
 * שהוא צריך כדי לדעת לאן ומתי.
 * ⚠ מיפוי מפורש ולא השמטה: עמודה חדשה בלוח לא תדלוף מעצמה.
 */
const toStudentDef = (d) => ({
  id: d.id, name: d.name, category: d.category, period: d.period, hours: d.hours,
});

/** מי משובץ לשיבוץ הזה — מזהי חניכים, בכל סמסטר */
export async function membersOf(placementId) {
  if (!placementsReady()) return [];
  const asg = await loadAssignments();
  const id = String(placementId);
  const out = new Map();
  for (const a of asg) {
    if (a.placement !== id) continue;
    if (!out.has(a.student)) out.set(a.student, { id: a.student, name: a.studentName, semesters: [] });
    out.get(a.student).semesters.push(a.semester);
  }
  return [...out.values()];
}

/* ============================================================
   מי יו״ר של מה
   ------------------------------------------------------------
   ⚠ מזהה חניך → ההגדרות שהוא יו״ר שלהן. נקרא מעמודת `chair`
     שבלוח ההגדרות, שהיא **חניך** — להבדיל מ-`lead`, שהיא
     המדריך המלווה ונקראת על ידי api/_guides.js.

   ⚠ יו״ר יכול להיות של יותר מוועדה אחת, ולכן מערך ולא ערך.
   ============================================================ */
export async function chairMap({ force = false } = {}) {
  if (!placementsReady()) return new Map();
  const defs = await loadDefinitions({ force });
  const out = new Map();
  for (const d of defs) {
    if (!d.chair) continue;
    if (!out.has(d.chair)) out.set(d.chair, []);
    out.get(d.chair).push({
      id: d.id, name: d.name, category: d.category, chairName: d.chairName,
    });
  }
  return out;
}

/* ============================================================
   השיבוצים של חניך אחד — **לצוות בלבד**
   ------------------------------------------------------------
   ⚠ מחזירה את ההגדרה המלאה (שעות, אחראי, תיאור) ולא את
     `toStudentDef`. הקוראת היחידה היא נקודת הקצה של הפרופיל,
     שכבר אכפה `session.isManager` לפניה — ואסור שתיקרא ממקום
     שלא אכף. הפרטים האלה הם חומר של הצוות.

   ⚠ לוח שטרם הוקם מחזיר רשימה ריקה ולא זורק: מסך החניך של
     המדריך לא אמור ליפול בגלל שלוחות השיבוצים לא הוקמו.
   ============================================================ */
export async function placementsFor(studentId) {
  if (!placementsReady()) return [];
  const [definitions, assignments] = await Promise.all([
    loadDefinitions(), loadAssignments(),
  ]);
  const byId = new Map(definitions.map((d) => [d.id, d]));

  return assignments
    .filter((a) => a.student === String(studentId))
    .map((a) => {
      const d = byId.get(a.placement);
      if (!d) return null;
      return {
        id: a.id, semester: a.semester,
        name: d.name, category: d.category, period: d.period,
        hours: d.hours, lead: d.lead, desc: d.desc,
      };
    })
    .filter(Boolean)
    /* ⚠ byCategory מ-shared ולא מערך מקומי: מערך סגור נותן
       -1 לקטגוריה חדשה והיא קופצת לראש המיון בשקט. */
    .sort((a, b) => byCategory(a.category, b.category)
      || a.name.localeCompare(b.name, "he"));
}

async function handler(req, res, session) {
  if (!placementsReady()) {
    return res.status(503).json({
      error: "לוחות השיבוצים טרם הוקמו ב-monday. הריצו: node --env-file=.env tools/seed-placements.mjs",
      setupRequired: true,
    });
  }

  try {
    if (req.method === "GET") {
      const [definitions, assignments] = await Promise.all([loadDefinitions(), loadAssignments()]);

      /* חניך מקבל את שלו בלבד. ⚠ הסינון כאן, בשרת — לא בתצוגה.
         והתיאורים, הדרישות והמכסות אינם יוצאים אליו כלל: החלטת
         המכינה היא שהחומר הזה הוא חומר של הצוות. */
      if (!session.isManager) {
        const mine = assignments
          .filter((x) => x.student === String(session.itemId))
          .map(({ id, placement, placementName, semester }) => ({ id, placement, placementName, semester }));
        return res.status(200).json({ definitions: definitions.map(toStudentDef), mine });
      }

      const roster = (await activeStudents()).map((r) => ({ id: r.id, name: r.name }));
      return res.status(200).json({ definitions, assignments, roster });
    }

    if (req.method === "POST") {
      /* ⚠ הכתיבה למנהל בלבד. הנתב לא בודק — הבדיקה כאן. */
      if (!session.isManager) return res.status(403).json({ error: "הפעולה מותרת למנהל בלבד" });

      const body = req.body ?? (await readJson(req));
      const placementId = String(body?.placementId || "").trim();
      const semester = String(body?.semester || "").trim();
      const studentIds = Array.isArray(body?.studentIds)
        ? [...new Set(body.studentIds.map((s) => String(s).trim()).filter(Boolean))]
        : null;

      if (!placementId) return res.status(400).json({ error: "לא צוין שיבוץ" });
      if (!studentIds) return res.status(400).json({ error: "לא נשלחה רשימת חניכים" });

      const definitions = await loadDefinitions();
      const def = definitions.find((d) => d.id === placementId);
      if (!def) return res.status(404).json({ error: "השיבוץ אינו מוגדר בלוח" });
      if (!semestersFor(def.period).includes(semester)) {
        return res.status(400).json({ error: `"${def.name}" אינו פתוח לשיבוץ ב${semester || "סמסטר שלא צוין"}` });
      }

      const roster = await activeStudents();
      const byId = Object.fromEntries(roster.map((r) => [r.id, r]));
      const unknown = studentIds.filter((s) => !byId[s]);
      if (unknown.length) return res.status(400).json({ error: "ברשימה חניך שאינו פעיל או אינו קיים" });

      /* ⚠ המכסה נאכפת בשרת, לא רק בתצוגה. המכינה קבעה מספר
         מדויק לכל ענף — ענף עם 8 מקומות לא יקבל תשיעי, גם אם
         הבקשה הגיעה מכתובת ישירה. מכסה ריקה = בלי הגבלה. */
      /* ⚠ `Number("שמונה")` הוא NaN, ו-`NaN != null` הוא true —
         אבל `length > NaN` תמיד false, כלומר האכיפה **מתבטלת
         בשקט** והמסך מציג "X/NaN". Number.isFinite ולא != null. */
      if (Number.isFinite(def.capacity) && studentIds.length > def.capacity) {
        return res.status(400).json({
          error: `ל"${def.name}" יש ${def.capacity} מקומות — נשלחו ${studentIds.length}`,
        });
      }

      /* ההפרש מול המצב הקיים: מוחקים את מי שירד, מוסיפים את מי שנוסף.
         מי שנשאר — לא נוגעים בשורה שלו. */
      const current = (await loadAssignments({ force: true }))
        .filter((x) => x.placement === placementId && x.semester === semester);
      const wanted = new Set(studentIds);
      const existing = new Set(current.map((x) => x.student));

      const toDelete = current.filter((x) => !wanted.has(x.student));
      const toCreate = studentIds.filter((s) => !existing.has(s));

      for (const row of toDelete) {
        await gql(`mutation{ delete_item(item_id:${Number(row.id)}){ id } }`);
      }
      for (const sid of toCreate) {
        await gql(
          `mutation($b:ID!,$n:String!,$v:JSON!){
             create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
          {
            b: PLACEMENT_BOARDS.assignments,
            n: `${byId[sid].name} — ${def.name}`,
            v: JSON.stringify({
              [A.student]: sid,
              [A.studentName]: byId[sid].name,
              [A.placement]: placementId,
              [A.placementName]: def.name,
              [A.semester]: { label: semester },
            }),
          }
        );
      }
      invalidatePlacements();

      /* ============================================================
         ⚠ **יו״ר שהוסר מהוועדה מאבד גם את היו״ר.**

         הדיפרנציאל מוחק את שורת השיבוץ ולא נגע ב-`chair`, ולכן
         `chairMap()` המשיכה להעניק אחריות למי שכבר אינו בוועדה.
         עד היום זו הייתה אחריות-רפאים במרכז התפקיד; מרגע שיש
         לוח משימות צוות, זו **הרשאת ניהול ששורדת את ההסרה**.

         ⚠ הבדיקה היא **בכל הסמסטרים** ולא רק בזה שנערך. יו״ר
           שמשובץ בסמסטר א׳ בזמן שעורכים את ב׳ נשאר יו״ר.
         ============================================================ */
      let chairCleared = false;
      if (def.chair) {
        const still = (await loadAssignments({ force: true }))
          .some((x) => x.placement === placementId && x.student === def.chair);
        if (!still) {
          await gql(
            `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
            { b: PLACEMENT_BOARDS.definitions, i: placementId,
              v: JSON.stringify({ [D.chair]: "", [D.chairName]: "" }) });
          invalidatePlacements();
          chairCleared = true;
        }
      }

      return res.status(200).json({
        ok: true, placementId, semester,
        added: toCreate.length, removed: toDelete.length, total: studentIds.length,
        /* ⚠ מוחזר כדי שהמסך יאמר זאת. הסרה שקטה של יו״ר היא
           בדיוק סוג ההפתעה שמתגלה חודש אחר כך. */
        chairCleared,
      });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[placements]", e);
    res.status(502).json({ error: "פעולת השיבוצים נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* חניך נכנס לקריאה של עצמו; ההבחנה מנהל/חניך בתוך ה-handler */
export default withAuth(handler, { student: true });
