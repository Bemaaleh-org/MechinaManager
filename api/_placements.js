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
import { activeStudents } from "./_student-rows.js";
import {
  PLACEMENT_BOARDS, PLACEMENT_COLS, CATEGORIES, PERIOD, placementsReady, semestersFor,
} from "../shared/placements.js";

const D = PLACEMENT_COLS.definitions;
const A = PLACEMENT_COLS.assignments;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/** ההגדרות: מהם השיבוצים. הסדר — כסדר הלוח. */
async function loadDefinitions({ force = false } = {}) {
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
        };
      })
      .filter((x) => x.name && CATEGORIES.includes(x.category));
  }, { force });
}

/** השיבוצים בפועל */
async function loadAssignments({ force = false } = {}) {
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

const invalidatePlacements = () => { invalidate("placement-defs"); invalidate("placement-asgn"); };

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

      /* חניך מקבל את שלו בלבד. ⚠ הסינון כאן, בשרת — לא בתצוגה. */
      if (!session.isManager) {
        const mine = assignments
          .filter((x) => x.student === String(session.itemId))
          .map(({ id, placement, semester }) => ({ id, placement, semester }));
        return res.status(200).json({ definitions, mine });
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

      return res.status(200).json({
        ok: true, placementId, semester,
        added: toCreate.length, removed: toDelete.length, total: studentIds.length,
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
