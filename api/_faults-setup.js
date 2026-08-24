/* ============================================================
   POST /api/students?action=faults-setup — הקמה בלחיצה
   ------------------------------------------------------------
   יוצר את לוח "תקלות ובעיות", מוודא שהתווית "אב בית" קיימת
   בעמודת התפקידים, וכותב את המזהים ל-shared/faults-ids.js.

   ⚠ פיתוח מקומי בלבד, מנהל בלבד — כמו שאר כפתורי ההקמה.
   ============================================================ */

import fs from "node:fs";
import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { faultsReady, FAULT_PLACE, FIXES, URGENCIES, STATUSES } from "../shared/faults-board.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { ROLES_COL, ROLE_HOUSE } from "../shared/lessons-boards.js";

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
  if (process.env.VERCEL) return res.status(404).json({ error: "פעולה לא מוכרת: faults-setup" });
  if (req.method !== "POST") return res.status(405).json({ error: "רק POST נתמך כאן" });
  if (faultsReady()) return res.status(409).json({ error: "הלוח כבר הוקם" });

  try {
    const d = await gql(
      `mutation($n:String!){ create_board(board_name:$n, board_kind:public){ id } }`,
      { n: "תקלות ובעיות" });
    const board = String(d.create_board.id);

    const C = {
      date: await createColumn(board, "תאריך דיווח", "date"),
      place: await createColumn(board, "מיקום", "status", labels(...FAULT_PLACE)),
      fix: await createColumn(board, "אופן התיקון", "status", labels(...FIXES)),
      urgency: await createColumn(board, "דחיפות", "status", labels(...URGENCIES)),
      status: await createColumn(board, "סטטוס", "status", labels(...STATUSES)),
      desc: await createColumn(board, "תיאור הבעיה", "long_text"),
      notes: await createColumn(board, "הערות טיפול", "long_text"),
    };

    fs.writeFileSync(new URL("../shared/faults-ids.js", import.meta.url),
`/* ============================================================
   מזהי לוח התקלות — קובץ מחולל
   ------------------------------------------------------------
   ⚠ אין לערוך ידנית. נוצר מכפתור ההקמה שבמסך תקלות ובעיות
     (api/_faults-setup.js). חייב להיכנס לקומיט.
   ============================================================ */

export const FAULTS_BOARD = "${board}";

export const FAULTS_COLS = {
  date: "${C.date}", place: "${C.place}", fix: "${C.fix}", urgency: "${C.urgency}", status: "${C.status}",
  desc: "${C.desc}", notes: "${C.notes}",
};
`);

    /* מוודאים שהתווית "אב בית" קיימת — כתיבה ושחזור, כמו בשאר */
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
        await write([...new Set([...current, ROLE_HOUSE])], true);
        await write(current, false);
        roleAdded = true;
      }
    } catch { /* אפשר להוסיף ידנית בלוח */ }

    res.status(200).json({ ok: true, board, roleAdded });
  } catch (e) {
    console.error("[faults-setup]", e);
    res.status(502).json({ error: "ההקמה נכשלה: " + e.message });
  }
}

export default withAuth(handler, { manager: true });
