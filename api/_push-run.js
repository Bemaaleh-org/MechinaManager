/* ============================================================
   /api/auth?action=push-run — הסבב ששולח את הנקישות

   ⚠⚠ **זו הנקודה היחידה במערכת שרצה בלי משתמש.**

   ההתראות עצמן נגזרות מהמצב בכל שליפה ואין להן תור (4כו) —
   וזה בדיוק מה שהופך דחיפה למסובכת: אין רגע שבו "נוצרה
   התראה". הסבב הזה הוא הרגע: הוא עובר על מי שנרשם, שואל
   **בשמו** מה ההתראות שלו, ודוחף אם יש חדש.

   ------------------------------------------------------------
   ⚠⚠ **מוגן בסוד ולא בסשן.** אין כאן משתמש שאפשר לזהות, ולכן
     ההגנה היא `CRON_SECRET` בכותרת. בלעדיו זו נקודת קצה
     שכל אחד יכול להפעיל — ולגרום למאה קריאות ל-monday.

   ⚠ **ולא מדובר בהרשאה שמרחיבה גישה**: הסבב אינו מחזיר שום
     נתון של אף אחד. הוא מחזיר מספרים בלבד.

   ⚠ **"נדחף לאחרונה" נשמר, כדי לא לדחוף פעמיים על אותו דבר.**
     בלי זה כל סבב היה דוחף שוב על אותה תקלה פתוחה, והמשתמש
     היה מכבה את ההתראות תוך יום. ההשוואה היא מול החותמת של
     ההתראה **החדשה ביותר**, ולא מול מונה.

   ⚠ **וכישלון אצל משתמש אחד אינו עוצר את הסבב.** הוא נרשם
     ונספר.
   ============================================================ */

import { gql } from "./_monday.js";
import { boardColumn } from "./_board-col.js";
import { AUTH_BOARD, AUTH_COLS } from "../shared/auth-board.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";
import { studentRows } from "./_student-rows.js";
import { pushTo, pushReady } from "./_push.js";
import { buildNotes } from "./_notify.js";

const SUBS_COL = "מנויי דחיפה";
const LAST_COL = "דחיפה אחרונה";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

async function rowsOf(board, cols) {
  const d = await gql(
    `query($b:[ID!]){ boards(ids:$b){ items_page(limit:200){ items{ id name
       column_values(ids:${JSON.stringify(cols)}){ id text } } } } }`, { b: [board] });
  return d.boards?.[0]?.items_page?.items || [];
}

export default async function handler(req, res) {
  /* ⚠ סוד בכותרת, ולא סשן — אין כאן משתמש. */
  const secret = process.env.CRON_SECRET;
  const given = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "")
    || String(req.query?.key || "");
  if (!secret || given !== secret) {
    return res.status(401).json({ error: "לא מורשה" });
  }
  if (!pushReady()) {
    return res.status(503).json({ error: "מפתחות VAPID אינם מוגדרים", setupRequired: true });
  }

  const out = { checked: 0, pushed: 0, skipped: 0, failed: 0, dropped: 0 };

  try {
    for (const isStudent of [false, true]) {
      const board = isStudent ? MECHINA_BOARDS.roster : AUTH_BOARD;
      const subsCol = await boardColumn(board, SUBS_COL, "long_text");
      const lastCol = await boardColumn(board, LAST_COL, "text");
      if (!subsCol || !lastCol) continue;

      const items = await rowsOf(board, [subsCol, lastCol]);
      /* ⚠ רק מי שנרשם. אין טעם לחשב התראות למי שלא ביקש. */
      const roster = isStudent ? await studentRows() : null;

      for (const it of items) {
        let subs = [];
        try { const p = JSON.parse(val(it, subsCol) || "[]"); if (Array.isArray(p)) subs = p; }
        catch { /* תוכן פגום נקרא כרשימה ריקה */ }
        if (!subs.length) continue;
        out.checked++;

        /* ⚠ סשן מדומה **מינימלי**: רק מה ש-buildNotes צריך.
           הוא אינו נשמר, אינו נחתם, ואינו יוצא מכאן. */
        const row = isStudent ? (roster || []).find((r) => String(r.id) === String(it.id)) : null;
        if (isStudent && !row) { out.skipped++; continue; }

        const session = isStudent
          ? { kind: "student", itemId: String(it.id), name: row.name, isStudent: true,
              isManager: false, roles: row.roles || [], isScheduler: Boolean(row.isScheduler) }
          : { kind: "manager", itemId: String(it.id), name: it.name, isStudent: false,
              isManager: true };

        let notes = [];
        try { notes = await buildNotes(session); }
        catch (e) { console.error("[push-run:notes]", it.id, e && e.message); out.failed++; continue; }

        const newest = notes.map((n) => n.at || n.when || "").sort().pop() || "";
        const last = val(it, lastCol) || "";
        /* ⚠ **אין חדש — אין דחיפה.** זה כל ההבדל בין התראה
           שאנשים פותחים לבין התראה שמכבים. */
        if (!notes.length || !newest || newest <= last) { out.skipped++; continue; }

        let sent = 0;
        const alive = [];
        for (const s of subs) {
          const r = await pushTo(s);
          if (r === "ok") { sent++; alive.push(s); }
          else if (r !== "gone") alive.push(s);
          else out.dropped++;
        }

        const cols = { [lastCol]: newest };
        if (alive.length !== subs.length) cols[subsCol] = JSON.stringify(alive);
        await gql(
          `mutation($b:ID!,$i:ID!,$v:JSON!){
             change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                           create_labels_if_missing:false){ id } }`,
          { b: board, i: String(it.id), v: JSON.stringify(cols) }).catch(() => {});

        if (sent) out.pushed++; else out.failed++;
      }
    }

    return res.status(200).json({ ok: true, ...out });
  } catch (e) {
    console.error("[push-run]", e);
    return res.status(502).json({ error: "הסבב נכשל", ...out });
  }
}
