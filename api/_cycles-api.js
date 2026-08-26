/* ============================================================
   /api/students?action=cycles
     GET                      רשימת המחזורים ומצבם
     POST { name, from, to }  פתיחת מחזור חדש — משכפל את הלוחות
     PUT  { id, ... }         עדכון, סימון שלב, הפעלה
     DELETE { id }            מחיקת רישום מחזור בהקמה

   ------------------------------------------------------------
   ⚠ **ראש המכינה בלבד.** פתיחת מחזור יוצרת תשעה־עשר לוחות
     ב-monday והחלפת מחזור מזיזה את כל המערכת. זו לא פעולה
     שאיש צוות עושה בטעות בדרך למסך אחר.

   ⚠ השכפול הוא `duplicate_board_with_structure` — **מבנה בלי
     שורות**. מחזור חדש מתחיל ריק: אותן עמודות, אותן תוויות,
     אותם סוגים, ואף חניך, מפגש או תקלה מהמחזור הקודם.

     זה גם מה שפותר את הבעיה האמיתית: מזהי העמודות בלוח
     המשוכפל **שונים** מהמקור, אבל שמות העמודות זהים — ולכן
     המיפוי נבנה לפי שם ולא לפי מזהה.

   ⚠ **המחזור החדש אינו נכנס לתוקף בפתיחתו.** הוא נשאר "בהקמה"
     עד שראש המכינה מפעיל אותו במפורש, ואז — ורק אז — המערכת
     עוברת אליו. פתיחה והפעלה הן שתי החלטות נפרדות, כי בין
     השתיים יש חודשיים של הזנת נתונים.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { gql } from "./_monday.js";
import { CYCLES_BOARD, CYCLES_COLS as C } from "../shared/cycles-ids.js";
import {
  CYCLE_BOARDS, CYCLE_STATUS, CYCLE_STEPS,
} from "../shared/cycles.js";
import {
  loadCycles, checkCycle, formatBoards, bumpCycle, ensureCycle,
} from "./_cycle.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STEP_KEYS = new Set(CYCLE_STEPS.map((s) => s.key));

const write = (id, cols) => gql(
  `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
  { b: CYCLES_BOARD, i: String(id), v: JSON.stringify(cols) });

/* ============================================================
   שכפול הלוחות
   ------------------------------------------------------------
   ⚠ אחד־אחד ולא במקביל. monday מגבילה קצב, ושכפול לוח הוא
     פעולה כבדה — עשרים בקשות במקביל נחסמות באמצע ומשאירות
     מחזור חצי בנוי, שהוא המצב הגרוע ביותר.

   ⚠ לוח שנכשל אינו מפיל את השאר. הוא נרשם ב-failed, והמנהל
     רואה בדיוק מה חסר ויכול לנסות שוב.
   ============================================================ */
async function cloneBoards(source, cycleName, onStep) {
  const made = {};
  const failed = [];

  for (const b of CYCLE_BOARDS) {
    const from = source[b.path];
    if (!from) { failed.push({ ...b, why: "אין לוח מקור" }); continue; }
    try {
      const d = await gql(
        `mutation($b:ID!,$n:String!){
           duplicate_board(board_id:$b, board_name:$n,
             duplicate_type: duplicate_board_with_structure){ board{ id } } }`,
        { b: String(from), n: `${b.title} · ${cycleName}` });
      const id = d?.duplicate_board?.board?.id;
      if (!id) throw new Error("לא הוחזר מזהה");
      made[b.path] = String(id);
      if (onStep) onStep(b.title, String(id));
    } catch (e) {
      console.error("[cycles] שכפול נכשל:", b.title, e && e.message);
      failed.push({ ...b, why: String(e && e.message || "").slice(0, 120) });
    }
  }
  return { made, failed };
}

async function handler(req, res, session) {
  /* ⚠ ראש המכינה בלבד. ראו ההערה בראש הקובץ. */
  if (!session.isHead) {
    return res.status(403).json({
      error: "פתיחת מחזור וניהולו שמורים לראש המכינה",
    });
  }

  try {
    const list = await loadCycles();

    if (req.method === "GET") {
      const active = list.find((c) => c.status === CYCLE_STATUS.active) || null;
      return res.status(200).json({
        cycles: list.map((c) => ({ ...c, check: checkCycle(c) })),
        activeId: active ? active.id : null,
        steps: CYCLE_STEPS,
        boards: CYCLE_BOARDS,
      });
    }

    const body = req.body ?? (await readJson(req));

    /* ============================================================
       פתיחת מחזור
       ============================================================ */
    if (req.method === "POST") {
      const name = String(body?.name || "").trim().slice(0, 60);
      if (!name) return res.status(400).json({ error: "לא הוזן שם למחזור" });
      if (list.some((c) => c.name === name)) {
        return res.status(409).json({ error: "כבר קיים מחזור בשם הזה" });
      }
      for (const k of ["from", "to"]) {
        const v = String(body?.[k] || "").trim();
        if (v && !DATE_RE.test(v)) return res.status(400).json({ error: "תאריך לא תקין" });
      }

      /* ⚠ המקור הוא המחזור הפעיל. אם אין — המזהים שנטענו. */
      const active = list.find((c) => c.status === CYCLE_STATUS.active);
      const source = active && Object.keys(active.boards).length
        ? active.boards
        : Object.fromEntries(CYCLE_BOARDS.map((b) => [b.path, null]));
      if (!Object.values(source).some(Boolean)) {
        return res.status(409).json({ error: "אין מחזור מקור לשכפל ממנו" });
      }

      const { made, failed } = await cloneBoards(source, name);

      const cols = {
        [C.status]: { label: CYCLE_STATUS.building },
        [C.boards]: formatBoards(made),
        [C.done]: failed.length ? "" : "boards",
        [C.by]: actorName(session).slice(0, 120),
      };
      if (body.from) cols[C.from] = { date: String(body.from) };
      if (body.to) cols[C.to] = { date: String(body.to) };

      const d = await gql(
        `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
        { b: CYCLES_BOARD, n: name, v: JSON.stringify(cols) });

      bumpCycle();
      return res.status(200).json({
        ok: true, id: String(d.create_item.id),
        created: Object.keys(made).length,
        failed,
      });
    }

    /* ============================================================
       עדכון · סימון שלב · הפעלה
       ============================================================ */
    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      const cycle = list.find((c) => c.id === id);
      if (!cycle) return res.status(404).json({ error: "המחזור אינו נמצא" });

      const cols = {};

      /* ---------- סימון שלב ---------- */
      if (body.step) {
        const step = String(body.step);
        if (!STEP_KEYS.has(step)) return res.status(400).json({ error: "שלב לא מוכר" });
        const done = new Set(cycle.done);
        if (body.undo) done.delete(step); else done.add(step);
        cols[C.done] = [...done].join(",");
      }

      for (const [k, col] of [["from", C.from], ["to", C.to]]) {
        if (body[k] === undefined) continue;
        const v = String(body[k] || "").trim();
        if (!v) { cols[col] = ""; continue; }
        if (!DATE_RE.test(v)) return res.status(400).json({ error: "תאריך לא תקין" });
        cols[col] = { date: v };
      }
      if (body.note !== undefined) cols[C.note] = String(body.note || "").slice(0, 200);

      /* ---------- הפעלה ---------- */
      if (body.activate) {
        const check = checkCycle({ ...cycle, done: cols[C.done]
          ? cols[C.done].split(",") : cycle.done });
        if (!check.ready) {
          return res.status(409).json({
            error: `לא ניתן להפעיל — חסר: ${check.missing.join(", ")}`,
            missing: check.missing,
          });
        }
        if (!Object.keys(cycle.boards).length) {
          return res.status(409).json({ error: "למחזור אין לוחות" });
        }

        /* ⚠ המחזור היוצא עובר לארכיון ולא נמחק. הוא ממשיך
           להתקיים ב-monday, וכל מה שהיה בו נשאר שם. */
        const out = list.find((c) => c.status === CYCLE_STATUS.active && c.id !== id);
        if (out) {
          await write(out.id, { [C.status]: { label: CYCLE_STATUS.archived } });
        }
        cols[C.status] = { label: CYCLE_STATUS.active };
      }

      if (Object.keys(cols).length) await write(id, cols);

      /* ⚠ המטמון מתאפס מיד — ולא בעוד חמש דקות. */
      bumpCycle();
      await ensureCycle();

      return res.status(200).json({ ok: true, id, activated: Boolean(body.activate) });
    }

    /* ============================================================
       מחיקה
       ⚠ רק רישום של מחזור **בהקמה**, ורק הרישום. הלוחות
         שנוצרו ב-monday נשארים — מחיקת לוחות היא פעולה הרסנית
         שאיש לא ביקש, וארכיון ריק אינו מזיק.
       ============================================================ */
    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      const cycle = list.find((c) => c.id === id);
      if (!cycle) return res.status(404).json({ error: "המחזור אינו נמצא" });
      if (cycle.status === CYCLE_STATUS.active) {
        return res.status(409).json({ error: "אי אפשר למחוק את המחזור הפעיל" });
      }
      await gql(`mutation{ delete_item(item_id:${Number(id)}){ id } }`);
      bumpCycle();
      return res.status(200).json({
        ok: true, id,
        note: "הרישום נמחק. הלוחות ב-monday נשארו ולא נגענו בהם.",
      });
    }

    return res.status(405).json({ error: "שיטה לא נתמכת" });
  } catch (e) {
    console.error("[cycles]", e);
    res.status(502).json({ error: "פעולת המחזורים נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
