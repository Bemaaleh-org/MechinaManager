/* ============================================================
   /api/students?action=import
     POST { cycleId, step, text }              תצוגה מקדימה
     POST { cycleId, step, text, commit:true } כתיבה בפועל
     GET  ?cycleId=&step=                      מה כבר נכנס
     PUT  { cycleId, step, id, ...שדות }       תיקון שורה
     DELETE { cycleId, step, id }              מחיקת שורה

   ------------------------------------------------------------
   ⚠ **תמיד תצוגה מקדימה לפני כתיבה.** הקלט הוא הדבקה מ-Excel
     של אדם, ופרסור שגוי שנכתב ישר ללוח הוא 33 שורות שצריך
     למחוק ביד. המנהל רואה בדיוק מה ייווצר, ומה לא נקלט ולמה,
     ואז מאשר.

   ⚠ **נכתב ללוחות של המחזור שנבחר, לא לפעילים.** זו כל
     התכלית: להכין מחזור שעדיין אינו בתוקף. המזהים נלקחים
     מהרישום שלו ולא מהמצב הגלובלי.

   ⚠ **המנהל יכול לתקן ולמחוק כל שורה שנכנסה.** הנתונים מגיעים
     מגיליונות אמיתיים ותמיד יש בהם טעות קטנה — שם עם רווח
     כפול, ת"ז שחסרה בה ספרה, אירוע בתאריך שגוי. בלי תיקון
     מהמסך, כל טעות כזו שולחת אותו ל-monday, וזה בדיוק מה
     שהאפליקציה נועדה למנוע.

   ⚠ ראש המכינה בלבד — כמו כל ניהול המחזורים.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { loadCycles, bumpCycle } from "./_cycle.js";
import { CYCLE_STATUS } from "../shared/cycles.js";
import { PARSERS } from "../shared/import-parse.js";
import { MECHINA_COLS } from "../shared/mechina-boards.js";
import { LESSON_COLS } from "../shared/lessons-boards.js";
import { PLACEMENT_COLS } from "../shared/placements-ids.js";

const R = MECHINA_COLS.roster;
const G = LESSON_COLS.gantt;
const S = LESSON_COLS.sheets;
const P = PLACEMENT_COLS.definitions;

/* ============================================================
   מה כל שלב כותב, ולאן
   ------------------------------------------------------------
   ⚠ `board` הוא **הנתיב** במפת המחזור ולא מזהה. המזהה נשלף
     מהרישום של המחזור שנבחר, ולכן אותו קוד עובד על כל מחזור.
   ============================================================ */
const STEPS = {
  students: {
    board: "mechina.roster",
    title: "חניכים",
    name: (r) => r.name,
    /* ⚠ נכנס פעיל. חניך שנרשם ואינו פעיל אינו מופיע בשום
       מסך, והמנהל היה מחפש למה. */
    cols: (r) => ({
      [R.tz]: r.tz,
      [R.active]: { checked: "true" },
      ...(r.gender ? { [R.gender]: { label: r.gender } } : {}),
    }),
    /* איך מזהים שהשורה כבר קיימת */
    keyOf: (r) => String(r.tz || "").replace(/\D/g, ""),
    readKey: (i, val) => String(val(i, R.tz) || "").replace(/\D/g, ""),
    /* אילו שדות המנהל יכול לתקן */
    editable: { name: "name", tz: R.tz, gender: R.gender, active: R.active },
  },
  gantt: {
    board: "lessons.gantt",
    title: "אירועי הגאנט",
    /* ⚠ השם בלוח נושא " · תאריך" לזיהוי כפילויות — כך נהוג
       בלוח הזה כבר, ראו loadGantt. */
    name: (r) => `${r.name} · ${r.start}`,
    cols: (r) => ({
      [G.start]: { date: r.start },
      [G.end]: { date: r.end },
      [G.type]: { label: r.type },
    }),
    keyOf: (r) => `${r.name}|${r.start}`,
    readKey: (i, val) => `${String(i.name || "").replace(/\s*·\s*\d{4}-\d{2}-\d{2}\s*$/, "").trim()}|${val(i, G.start)}`,
    editable: { name: "name", start: G.start, end: G.end, type: G.type },
  },
  sheets: {
    board: "lessons.sheets",
    title: "גיליונות המרצים",
    name: (r) => r.subject,
    cols: (r) => ({
      [S.active]: { checked: "true" },
      ...(r.lecturer ? { [S.lecturer]: r.lecturer } : {}),
      ...(r.dayTime ? { [S.dayTime]: r.dayTime } : {}),
      ...(r.guest ? { [S.guestLecturer]: { checked: "true" } } : {}),
    }),
    keyOf: (r) => r.subject,
    readKey: (i) => String(i.name || "").trim(),
    editable: { name: "name", lecturer: S.lecturer, dayTime: S.dayTime,
      guest: S.guestLecturer, active: S.active },
  },
  groups: {
    board: "placements.definitions",
    title: "ענפים, ועדות וסדרות",
    name: (r) => r.name,
    /* ⚠ אין כאן עמודת "פעיל" — לוח ההגדרות מחזיק הכול, וסינון
       נעשה לפי קטגוריה. ראו shared/placements-ids.js. */
    cols: (r) => ({
      [P.category]: { label: r.category },
      ...(r.cap != null ? { [P.capacity]: String(r.cap) } : {}),
      ...(r.leader ? { [P.lead]: r.leader } : {}),
    }),
    keyOf: (r) => `${r.category}|${r.name}`,
    readKey: (i, val) => `${val(i, P.category)}|${String(i.name || "").trim()}`,
    editable: { name: "name", category: P.category, capacity: P.capacity,
      lead: P.lead, period: P.period, hours: P.hours },
  },
};

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/** מזהה הלוח של השלב במחזור הזה */
function boardOf(cycle, step) {
  const def = STEPS[step];
  return def ? cycle.boards[def.board] || null : null;
}

async function readRows(board, def) {
  const ids = [...new Set(Object.values(def.editable).filter((x) => x !== "name"))];
  const d = await gql(`{ boards(ids:[${board}]){ items_page(limit:500){ items{
    id name column_values(ids:[${ids.map((x) => `"${x}"`).join(",")}]){ id text } } } } }`);
  return (d.boards[0]?.items_page?.items || []);
}

async function handler(req, res, session) {
  if (!session.isHead) {
    return res.status(403).json({ error: "הקמת מחזור שמורה לראש המכינה" });
  }

  try {
    const body = req.method === "GET" ? req.query : (req.body ?? (await readJson(req)));
    const step = String(body?.step || "");
    const def = STEPS[step];
    if (!def) return res.status(400).json({ error: "שלב לא מוכר" });

    const cycles = await loadCycles();
    const cycle = cycles.find((c) => c.id === String(body?.cycleId || ""));
    if (!cycle) return res.status(404).json({ error: "המחזור אינו נמצא" });

    const board = boardOf(cycle, step);
    if (!board) {
      return res.status(409).json({
        error: `למחזור אין לוח ל${def.title}. יש לפתוח את הלוחות קודם.`,
      });
    }

    /* ============================================================
       מה כבר נכנס
       ============================================================ */
    if (req.method === "GET") {
      const items = await readRows(board, def);
      return res.status(200).json({
        step, title: def.title, board,
        count: items.length,
        rows: items.map((i) => ({
          id: String(i.id), name: String(i.name || "").trim(),
          fields: Object.fromEntries(Object.entries(def.editable)
            .filter(([, c]) => c !== "name")
            .map(([k, c]) => [k, val(i, c)])),
        })),
        /* ⚠ מחזור פעיל — התיקונים נוגעים בנתונים חיים. המסך
           אמור לומר את זה, ולכן זה מוחזר. */
        live: cycle.status === CYCLE_STATUS.active,
      });
    }

    /* ============================================================
       תצוגה מקדימה · כתיבה
       ============================================================ */
    if (req.method === "POST") {
      const year = cycle.from ? Number(cycle.from.slice(0, 4)) : null;
      const parsed = PARSERS[step].fn(String(body?.text || ""), year);

      const existing = await readRows(board, def);
      const have = new Set(existing.map((i) => def.readKey(i, val)));

      /* ⚠ שורה שכבר קיימת אינה נכתבת שוב ואינה נחשבת שגיאה.
         מנהל שידביק את אותה רשימה פעמיים לא אמור לקבל 33
         כפילויות — הוא אמור לקבל "0 חדשים". */
      const fresh = parsed.rows.filter((r) => !have.has(def.keyOf(r)));
      const dup = parsed.rows.length - fresh.length;

      if (!body?.commit) {
        return res.status(200).json({
          step, title: def.title, preview: true,
          rows: fresh, duplicates: dup, bad: parsed.bad,
          existing: existing.length,
        });
      }

      /* ⚠ אחד־אחד ולא במקביל: monday מגבילה קצב, ו-33 בקשות
         במקביל נחסמות באמצע ומשאירות ייבוא חלקי. */
      const made = [], failed = [];
      for (const r of fresh) {
        try {
          const d = await gql(
            `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
            { b: board, n: def.name(r), v: JSON.stringify(def.cols(r)) });
          made.push(String(d.create_item.id));
        } catch (e) {
          failed.push({ row: r, why: String(e && e.message || "").slice(0, 140) });
        }
      }

      bumpCycle();
      return res.status(200).json({
        step, title: def.title, created: made.length,
        duplicates: dup, bad: parsed.bad, failed,
      });
    }

    /* ============================================================
       תיקון שורה
       ⚠ הסיבה שהמסך הזה קיים. ראו ההערה בראש הקובץ.
       ============================================================ */
    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה שורה" });

      const cols = {};
      for (const [key, col] of Object.entries(def.editable)) {
        if (body[key] === undefined) continue;
        if (col === "name") continue;
        const v = body[key];
        /* ⚠ סוג העמודה נגזר מהמזהה שלה. monday דורשת מבנה שונה
           לכל סוג, ושליחת מחרוזת לעמודת תאריך נכשלת בשקט. */
        if (/^date/.test(col)) {
          const s = String(v || "").trim();
          if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            return res.status(400).json({ error: "תאריך לא תקין" });
          }
          cols[col] = s ? { date: s } : "";
        } else if (/^color/.test(col) || /^single_select/.test(col)) {
          cols[col] = v ? { label: String(v) } : "";
        } else if (/^boolean/.test(col)) {
          cols[col] = v ? { checked: "true" } : { checked: "false" };
        } else {
          cols[col] = String(v ?? "").trim().slice(0, 200);
        }
      }
      if (Object.keys(cols).length) {
        await gql(
          `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
          { b: board, i: id, v: JSON.stringify(cols) });
      }
      if (body.name !== undefined) {
        const n = String(body.name).trim();
        if (!n) return res.status(400).json({ error: "שם ריק" });
        await gql(
          `mutation($i:ID!,$b:ID!,$n:String!){ change_simple_column_value(item_id:$i,board_id:$b,column_id:"name",value:$n){ id } }`,
          { i: id, b: board, n });
      }
      bumpCycle();
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה שורה" });
      await gql(`mutation{ delete_item(item_id:${Number(id)}){ id } }`);
      bumpCycle();
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "שיטה לא נתמכת" });
  } catch (e) {
    console.error("[cycle-import]", e);
    res.status(502).json({ error: "פעולת הייבוא נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
