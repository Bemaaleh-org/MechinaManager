/* ============================================================
   POST /api/students?action=role   { studentId, roles: [...] }
   מנהל בלבד

   קובע את רשימת התפקידים של חניך. הגוף נושא את המצב המלא
   הרצוי ולא "הוסף"/"הסר" — אותו שיקול שבסימון הנוכחות.

   ⚠ רשימת התפקידים אינה מקובעת בקוד. היא נקראת מהגדרות עמודת
     ה-dropdown שבלוח, ולכן המכינה יכולה להוסיף תפקיד חדש
     ישירות ב-monday והוא יופיע במסך בלי דיפלוי.

   ⚠ תפקיד אחד בלבד פותח הרשאה — אחראי לו״ז, שמקבל גישה לגיליונות
     השיעור. כל תפקיד אחר נשמר ומוצג ואינו פותח דבר. ראו
     shared/lessons-boards.js.

   ⚠ בניגוד למובילי שבוע, התפקידים אינם מתחלפים שבועית והם נשמרים
     כאן לאורך השנה. זו הסיבה שהם יושבים בעמודה נפרדת.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { studentRows } from "./_student-rows.js";
import { invalidate } from "./_cache.js";
import { cached } from "./_cache.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { ROLES_COL } from "../shared/lessons-boards.js";

/** התוויות שמוגדרות בעמודה בלוח — מקור האמת לרשימת התפקידים */
export async function availableRoles({ force = false } = {}) {
  return cached("student-roles", async () => {
    const d = await gql(
      `{ boards(ids:[${MECHINA_BOARDS.roster}]){ columns(ids:["${ROLES_COL}"]){ settings_str } } }`
    );
    const raw = d.boards[0].columns[0]?.settings_str || "{}";
    let s = {};
    try { s = JSON.parse(raw); } catch { s = {}; }
    return (s.labels || []).map((l) => l.name).filter(Boolean);
  }, { force, ttl: 10 * 60_000 });
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "רק POST נתמך כאן" });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const studentId = String(body?.studentId || "").trim();
    const roles = Array.isArray(body?.roles) ? body.roles.map((r) => String(r).trim()) : null;

    if (!studentId) return res.status(400).json({ error: "לא צוין חניך" });
    if (!roles) return res.status(400).json({ error: "לא נשלחה רשימת תפקידים" });

    const rows = await studentRows();
    const student = rows.find((r) => r.id === studentId);
    if (!student) return res.status(404).json({ error: "החניך אינו נמצא" });
    if (!student.active) {
      return res.status(400).json({ error: "אי אפשר להגדיר תפקיד לחניך שאינו פעיל" });
    }

    /* ⚠ אימות מול התוויות שבלוח. תפקיד שאינו קיים שם נדחה במקום
       להיווצר בשקט — כך רשימת התפקידים נשארת מנוהלת במקום אחד. */
    const known = await availableRoles();
    const unknown = roles.filter((r) => !known.includes(r));
    if (unknown.length) {
      return res.status(400).json({
        error: `תפקיד לא מוכר: ${unknown.join(", ")}. יש להוסיף אותו בלוח תחילה`,
      });
    }

    await gql(
      `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
      {
        b: MECHINA_BOARDS.roster,
        i: studentId,
        v: JSON.stringify({ [ROLES_COL]: { labels: roles } }),
      }
    );

    invalidate("student-rows");

    /* חישוב מקומי ולא שליפה חוזרת — אנחנו יודעים בדיוק מה השתנה */
    const after = rows.map((r) => (r.id === studentId ? { ...r, roles } : r));
    const holders = {};
    for (const role of known) {
      holders[role] = after
        .filter((r) => r.active && (r.roles || []).includes(role))
        .map((r) => ({ id: r.id, name: r.name }));
    }

    res.status(200).json({ ok: true, id: studentId, name: student.name, roles, holders });
  } catch (e) {
    console.error("[student-role]", e);
    res.status(502).json({ error: "עדכון התפקיד נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
