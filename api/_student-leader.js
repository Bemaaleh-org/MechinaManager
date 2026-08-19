/* ============================================================
   POST /api/students?action=leader   { studentId, leader }
   מנהל בלבד

   מסמן או מבטל "מוביל שבוע" לחניך.

   ⚠ העמודה בלוח נשארת מקור האמת. המסך הזה הוא קיצור דרך למנהל,
     לא מנגנון מקביל: מי שיסמן ישירות ב-monday יקבל בדיוק אותה
     תוצאה, והאפליקציה תציג אותה תוך חצי דקה.

   ⚠ אין כאן הגבלת כמות. המכינה בוחרת שניים, אבל החלפה באמצע
     שבוע מחייבת רגע שבו שלושה מסומנים, וכלל נוקשה היה מכריח
     את המנהל לבטל קודם ולהשאיר את היום בלי מסמן. המסך מציג
     כמה מסומנים ומתריע כשהמספר חורג.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { studentRows } from "./_student-rows.js";
import { invalidate } from "./_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const studentId = String(body?.studentId || "").trim();
    const leader = body?.leader;

    if (!studentId) return res.status(400).json({ error: "לא צוין חניך" });
    if (typeof leader !== "boolean") {
      return res.status(400).json({ error: "לא צוין מצב הסימון" });
    }

    /* ⚠ קריאה מהמטמון ולא force. הפעולה הזו נלחצת ברצף — מנהל
       שמחליף שני מובילים לוחץ ארבע פעמים — וכל קריאה טרייה היא
       שליפה של לוח החניכים כולו מ-monday. המטמון בן 30 השניות
       מספיק כאן: הנתון היחיד שנקרא הוא "פעיל", והוא לא משתנה
       בין לחיצה ללחיצה. */
    const rows = await studentRows();
    const student = rows.find((r) => r.id === studentId);
    if (!student) return res.status(404).json({ error: "החניך אינו נמצא" });
    if (!student.active) {
      return res.status(400).json({ error: "אי אפשר למנות חניך שאינו פעיל" });
    }

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      {
        b: MECHINA_BOARDS.roster,
        i: studentId,
        v: JSON.stringify({ [MECHINA_COLS.roster.leader]: { checked: leader ? "true" : "false" } }),
      }
    );

    /* ⚠ המטמון מנוקה כדי שהבקשה הבאה תראה את השינוי — אבל
       הרשימה שמוחזרת מחושבת מקומית ולא נשלפת שוב מ-monday.
       שליפה חוזרת כאן הכפילה את זמן התגובה בלי להוסיף מידע:
       אנחנו יודעים בדיוק מה השתנינו. */
    invalidate("student-rows");

    const leaders = rows
      .map((r) => (r.id === studentId ? { ...r, leader } : r))
      .filter((r) => r.active && r.leader)
      .map((r) => ({ id: r.id, name: r.name }));

    res.status(200).json({ ok: true, id: studentId, name: student.name, leader, leaders });
  } catch (e) {
    console.error("[student-leader]", e);
    res.status(502).json({ error: "עדכון מוביל השבוע נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
