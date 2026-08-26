/* ============================================================
   GET/POST/PUT/DELETE  /api/container?action=loans
   מעקב אחר ציוד שהושאל והוחזר

   ⚠ שני כיוונים ולא אחד: ציוד שהושאל מאיתנו, וציוד ששאלנו
     מגוף אחר. שניהם מעקב, ולשניהם אותה שאלה — חזר או לא —
     אבל הם הפוכים באחריות, ומי שמסתכל צריך לדעת מיד את מי
     לרדוף.

   ⚠ "חזר" הוא תאריך ולא סימון. תיבת סימון עונה על "האם", אבל
     השאלה שנשאלת חודש אחר כך היא "מתי" — והיא כבר לא הייתה
     ניתנת לשחזור.

   ⚠ מנהל או אחראי מכולה — הציוד הוא באחריותו.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { EXTRA } from "../shared/extras-ids.js";

const L = EXTRA.loans;
const C = L.cols;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DIRECTIONS = ["הושאל מאיתנו", "שאלנו מהם"];

export async function loadLoans({ force = false } = {}) {
  return cached("loans", async () => {
    const items = await allItems(L.board);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        party: val(i, C.party) || null,
        direction: val(i, C.direction) || null,
        items: val(i, C.items) || null,
        out: val(i, C.out) || null,
        due: val(i, C.due) || null,
        back: val(i, C.back) || null,
        contact: val(i, C.contact) || null,
        note: val(i, C.note) || null,
        by: val(i, C.by) || null,
      }))
      .filter((x) => x.title)
      .sort((a, b) => (b.out || "").localeCompare(a.out || ""));
  }, { force });
}

function colsFrom(body, res) {
  const cols = {};
  for (const [k, c, max] of [
    ["party", C.party, 120], ["items", C.items, 2000],
    ["contact", C.contact, 80], ["note", C.note, 200],
  ]) {
    if (body[k] !== undefined) cols[c] = String(body[k] || "").trim().slice(0, max);
  }
  for (const [k, c] of [["out", C.out], ["due", C.due], ["back", C.back]]) {
    if (body[k] === undefined) continue;
    const v = String(body[k] || "").trim();
    if (!v) { cols[c] = ""; continue; }
    if (!DATE_RE.test(v)) { res.status(400).json({ error: "תאריך לא תקין" }); return null; }
    cols[c] = { date: v };
  }
  if (body.direction !== undefined && body.direction !== "") {
    if (!DIRECTIONS.includes(String(body.direction))) {
      res.status(400).json({ error: "כיוון לא מוכר" }); return null;
    }
    cols[C.direction] = { label: String(body.direction) };
  }
  return cols;
}

async function handler(req, res, session) {
  if (!L || !L.board) {
    return res.status(503).json({ error: "לוח ההשאלות טרם הוקם", setupRequired: true });
  }
  if (!session.isManager && !session.isContainer) {
    return res.status(403).json({ error: "ההשאלות מנוהלות על ידי אחראי המכולה" });
  }

  try {
    if (req.method === "GET") {
      const list = await loadLoans();
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date());

      const open = list.filter((x) => !x.back);
      return res.status(200).json({
        loans: list.map((x) => ({
          ...x,
          /* ⚠ "באיחור" נגזר ואינו נשמר: הוא משתנה בכל יום
             שעובר, ושדה שמור היה מתיישן בשקט. */
          late: Boolean(!x.back && x.due && x.due < today),
        })),
        count: list.length,
        today,
        counts: {
          open: open.length,
          late: open.filter((x) => x.due && x.due < today).length,
          ours: open.filter((x) => x.direction === "הושאל מאיתנו").length,
          theirs: open.filter((x) => x.direction === "שאלנו מהם").length,
        },
        directions: DIRECTIONS,
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה כותרת" });
      const cols = colsFrom(body, res);
      if (!cols) return;
      cols[C.by] = actorName(session).slice(0, 120);
      if (!cols[C.direction]) cols[C.direction] = { label: DIRECTIONS[0] };
      const id = await createItem(L.board, title, cols);
      invalidate("loans");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה השאלה" });
      const cols = colsFrom(body, res);
      if (!cols) return;
      if (Object.keys(cols).length) await setColumns(L.board, id, cols);
      if (body.title !== undefined) {
        const t = String(body.title).trim();
        if (!t) return res.status(400).json({ error: "כותרת ריקה" });
        await renameItem(L.board, id, t);
      }
      invalidate("loans");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה השאלה" });
      await deleteItem(id);
      invalidate("loans");
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "שיטה לא נתמכת" });
  } catch (e) {
    console.error("[loans]", e);
    res.status(502).json({ error: "פעולת ההשאלה נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { container: true });
