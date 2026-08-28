/* ============================================================
   /api/students?action=chair
     PUT  { placementId, studentId }   קביעת יו״ר לוועדה או לסדרה

   ⚠ **יו״ר הוא חניך; `lead` הוא המדריך המלווה.** שתי עמודות
     נפרדות בלוח ההגדרות, ולא אחת. עמודה אחת לשניהם הייתה
     נגמרת ביום שבו ועדה תרצה גם מדריך וגם יו״ר — וזה בדיוק
     מה ש-src/placement-guides.js כבר מתאר לכל ועדה ולכל סדרה.

   ⚠ **ועדות וסדרות בלבד.** לענף אין יו״ר, ולקבוצה יש מדריך
     צוות שנקרא מ-`lead` על ידי api/_guides.js — יו״ר שם היה
     מבלבל בין שני דברים שונים.

   ⚠ **מזהה ושם, ולא שם בלבד.** המזהה כדי שאפשר יהיה לשאול
     "האם אני היו״ר", והשם כדי שהלוח יהיה קריא לאדם בלי לפתוח
     את המערכת. שם לבדו אינו מתעדכן כשהחניך משנה שם.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { invalidate } from "./_cache.js";
import { activeStudents } from "./_student-rows.js";
import {
  PLACEMENT_BOARDS, PLACEMENT_COLS, CATEGORY, placementsReady,
} from "../shared/placements.js";

const D = PLACEMENT_COLS.definitions;
/** רק אלה נושאים יו״ר */
const CHAIRABLE = [CATEGORY.committee, CATEGORY.series];

async function handler(req, res, session) {
  if (!placementsReady()) {
    return res.status(503).json({
      error: "לוחות השיבוצים טרם הוקמו ב-monday", setupRequired: true,
    });
  }
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "רק PUT נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const placementId = String(body?.placementId || "").trim();
    /* ⚠ מחרוזת ריקה מסירה את היו״ר — זו הדרך היחידה לבטל. */
    const studentId = String(body?.studentId ?? "").trim();
    if (!placementId) return res.status(400).json({ error: "לא צוין שיבוץ" });

    const items = (await gql(
      `query($i:[ID!]){ items(ids:$i){ id name column_values(ids:[$c]){ id text } } }`
        .replace("$c", JSON.stringify(D.category)),
      { i: [placementId] })).items || [];
    const def = items[0];
    if (!def) return res.status(404).json({ error: "השיבוץ אינו נמצא" });
    const category = (def.column_values[0] || {}).text || "";
    if (!CHAIRABLE.includes(category)) {
      return res.status(400).json({
        error: `יו״ר נקבע לוועדה ולסדרה בלבד, ו"${def.name}" הוא ${category || "ללא קטגוריה"}`,
      });
    }

    let name = "";
    if (studentId) {
      const st = (await activeStudents()).find((r) => r.id === studentId);
      if (!st) return res.status(400).json({ error: "החניך אינו פעיל או אינו קיים" });
      name = st.name;
    }

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: PLACEMENT_BOARDS.definitions, i: placementId,
        v: JSON.stringify({ [D.chair]: studentId, [D.chairName]: name }) });
    invalidate("placement-defs");

    return res.status(200).json({
      ok: true, placementId,
      chair: studentId || null, chairName: name || null,
    });
  } catch (e) {
    console.error("[placement-chair]", e);
    res.status(502).json({ error: "קביעת היו״ר נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
