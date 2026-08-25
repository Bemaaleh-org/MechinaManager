/* ============================================================
   POST /api/students?action=safety-setup — הקמה בלחיצה
   ------------------------------------------------------------
   יוצר את לוח "בטיחות ותקלות", מוסיף את התווית "אחראי בטיחות"
   לעמודת התפקידים, וכותב את המזהים ל-shared/safety-ids.js.

   ⚠ פיתוח מקומי בלבד, מנהל בלבד — אותו דפוס בדיוק כמו
     _placements-setup.js, וכמוהו לא קיים בשום דיפלוי.
   ============================================================ */

import fs from "node:fs";
import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { safetyReady, SAFETY_PLACE, SAFETY_SEVERITY, YES_NO } from "../shared/safety-board.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { ROLES_COL, ROLE_SAFETY } from "../shared/lessons-boards.js";

const labels = (...names) =>
  JSON.stringify({ labels: Object.fromEntries(names.map((n, i) => [String(i), n])) });

async function createColumn(board, title, type, defaults = null) {
  const d = await gql(
    `mutation($b:ID!,$t:String!,$c:ColumnType!,$d:JSON){
       create_column(board_id:$b, title:$t, column_type:$c, defaults:$d){ id } }`,
    { b: board, t: title, c: type, d: defaults });
  return String(d.create_column.id);
}

async function handler(req, res) {
  if (process.env.VERCEL) return res.status(404).json({ error: "פעולה לא מוכרת: safety-setup" });
  if (req.method !== "POST") return res.status(405).json({ error: "רק POST נתמך כאן" });
  if (safetyReady()) return res.status(409).json({ error: "הלוח כבר הוקם" });

  try {
    const d = await gql(
      `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`,
      { n: "בטיחות ותקלות" });
    const board = String(d.create_board.id);

    const yn = labels(YES_NO.yes, YES_NO.no);
    const C = {
      date: await createColumn(board, "תאריך", "date"),
      place: await createColumn(board, "מקום", "status", labels(...SAFETY_PLACE)),
      severity: await createColumn(board, "סוג", "status",
        labels(SAFETY_SEVERITY.injury, SAFETY_SEVERITY.nearMiss)),
      bodyHarm: await createColumn(board, "נזק לגוף", "text"),
      propHarm: await createColumn(board, "נזק לרכוש", "text"),
      desc: await createColumn(board, "תיאור המקרה", "long_text"),
      evac: await createColumn(board, "פינוי", "status", yn),
      medical: await createColumn(board, "טיפול רפואי", "status", yn),
      medicalDetail: await createColumn(board, "פירוט הטיפול", "text"),
      lessons: await createColumn(board, "לקחים ומסקנות", "long_text"),
      reportMod: await createColumn(board, "דווח למשרד הביטחון", "status", yn),
      reportCouncil: await createColumn(board, "דווח למועצת המכינות", "status", yn),
    };

    fs.writeFileSync(new URL("../shared/safety-ids.js", import.meta.url),
`/* ============================================================
   מזהי לוח הבטיחות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נוצר מכפתור ההקמה שבמסך בטיחות ותקלות
     (api/_safety-setup.js). חייב להיכנס לקומיט.
   ============================================================ */

export const SAFETY_BOARD = "${board}";

export const SAFETY_COLS = {
  date: "${C.date}", place: "${C.place}", severity: "${C.severity}",
  bodyHarm: "${C.bodyHarm}", propHarm: "${C.propHarm}",
  desc: "${C.desc}", evac: "${C.evac}", medical: "${C.medical}", medicalDetail: "${C.medicalDetail}",
  lessons: "${C.lessons}", reportMod: "${C.reportMod}", reportCouncil: "${C.reportCouncil}",
};
`);

    /* התווית "אחראי בטיחות" — כתיבה לשורה קיימת ושחזור מיידי */
    let roleAdded = false;
    try {
      const r = await gql(`{ boards(ids:[${MECHINA_BOARDS.roster}]) {
        items_page(limit:1) { items { id column_values(ids:["${ROLES_COL}"]) { text } } } } }`);
      const row = r.boards[0].items_page.items[0];
      if (row) {
        const current = (row.column_values[0]?.text || "").split(",").map((s) => s.trim()).filter(Boolean);
        const write = (roles, create) => gql(
          `mutation($b:ID!,$i:ID!,$v:JSON!){
             change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:${create}){ id } }`,
          { b: MECHINA_BOARDS.roster, i: row.id,
            v: JSON.stringify({ [ROLES_COL]: roles.length ? { labels: roles } : null }) });
        await write([...current, ROLE_SAFETY], true);
        await write(current, false);
        roleAdded = true;
      }
    } catch { /* אפשר להוסיף ידנית בלוח */ }

    res.status(200).json({ ok: true, board, roleAdded });
  } catch (e) {
    console.error("[safety-setup]", e);
    res.status(502).json({ error: "ההקמה נכשלה: " + e.message });
  }
}

export default withAuth(handler, { manager: true });
