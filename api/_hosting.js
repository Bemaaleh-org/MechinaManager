/* ============================================================
   GET/POST/PUT/DELETE  /api/students?action=hosting
   ניהול אירוח קבוצות במבני המכינה

   ⚠ מנהל או אחראי בטיחות — התפקיד נקרא "בטיחות ותיאום
     אירוחים", ושני החלקים שלו הם אותו אדם.

   ⚠ "תודרך" ו"המבנים הוחזרו" הם שתי מטלות נפרדות בשני קצות
     האירוח, ולכן שני שדות ולא אחד. אירוח שהסתיים והמבנים לא
     נמסרו בחזרה הוא מצב פתוח, גם אם התאריך עבר.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem, renameItem } from "./_items.js";
import { EXTRA } from "../shared/extras-ids.js";

const H = EXTRA.hosting;
const C = H.cols;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const num = (i, c) => { const t = val(i, c); return t === "" ? null : Number(t); };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const STATUS = ["בתיאום", "מאושר", "התקיים", "בוטל"];
const SLEEP = ["לנים", "לא לנים"];
const YN = ["כן", "לא"];

export async function loadHosting({ force = false } = {}) {
  return cached("hosting", async () => {
    const items = await allItems(H.board);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        org: val(i, C.org) || null,
        contact: val(i, C.contact) || null,
        phone: val(i, C.phone) || null,
        from: val(i, C.from) || null,
        to: val(i, C.to) || null,
        people: num(i, C.people),
        sleeping: val(i, C.sleeping) || null,
        buildings: val(i, C.buildings) || null,
        meals: val(i, C.meals) || null,
        status: val(i, C.status) || null,
        briefed: val(i, C.briefed) || null,
        handback: val(i, C.handback) || null,
        note: val(i, C.note) || null,
        by: val(i, C.by) || null,
      }))
      .filter((x) => x.title)
      .sort((a, b) => (b.from || "").localeCompare(a.from || ""));
  }, { force });
}

function colsFrom(body, res) {
  const cols = {};
  for (const [k, c, max] of [
    ["org", C.org, 120], ["contact", C.contact, 80], ["phone", C.phone, 40],
    ["buildings", C.buildings, 200], ["meals", C.meals, 200], ["note", C.note, 2000],
  ]) {
    if (body[k] !== undefined) cols[c] = String(body[k] || "").trim().slice(0, max);
  }
  for (const [k, c] of [["from", C.from], ["to", C.to]]) {
    if (body[k] === undefined) continue;
    const v = String(body[k] || "").trim();
    if (!v) { cols[c] = ""; continue; }
    if (!DATE_RE.test(v)) { res.status(400).json({ error: "תאריך לא תקין" }); return null; }
    cols[c] = { date: v };
  }
  if (body.people !== undefined) {
    const v = String(body.people || "").trim();
    if (v === "") cols[C.people] = "";
    else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) { res.status(400).json({ error: "מספר משתתפים לא תקין" }); return null; }
      cols[C.people] = String(n);
    }
  }
  for (const [k, c, allowed] of [
    ["status", C.status, STATUS], ["sleeping", C.sleeping, SLEEP],
  ]) {
    if (body[k] === undefined || body[k] === "") continue;
    if (!allowed.includes(String(body[k]))) { res.status(400).json({ error: "ערך לא מוכר" }); return null; }
    cols[c] = { label: String(body[k]) };
  }
  return cols;
}

async function handler(req, res, session) {
  if (!H || !H.board) {
    return res.status(503).json({ error: "לוח האירוח טרם הוקם", setupRequired: true });
  }
  /* ⚠ ההרשאה כאן ולא בנתב. ראו CLAUDE.md. */
  if (!session.isManager && !session.isSafety) {
    return res.status(403).json({ error: "האירוחים מנוהלים על ידי אחראי הבטיחות" });
  }

  try {
    if (req.method === "GET") {
      const list = await loadHosting();
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date());

      return res.status(200).json({
        hosting: list,
        count: list.length,
        today,
        counts: {
          /* ⚠ "פתוח" = טרם התקיים ולא בוטל. תאריך שעבר אינו
             סוגר אירוח — סגירה היא דיווח, לא לוח שנה. */
          open: list.filter((x) => x.status !== "התקיים" && x.status !== "בוטל").length,
          upcoming: list.filter((x) => x.from && x.from >= today && x.status !== "בוטל").length,
          sleeping: list.filter((x) => x.sleeping === "לנים" && x.status !== "בוטל").length,
          /* ⚠ "בתיאום" הוא המצב שדורש עבודה — אירוח שסוכם
             אבל טרם אושר. הוא מחליף את שתי המטלות שהיו כאן
             ולא נעשה בהן שימוש. */
          pending: list.filter((x) => x.status === "בתיאום").length,
        },
        options: { status: STATUS, sleeping: SLEEP },
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה כותרת לאירוח" });
      const cols = colsFrom(body, res);
      if (!cols) return;
      cols[C.by] = actorName(session).slice(0, 120);
      if (!cols[C.status]) cols[C.status] = { label: "בתיאום" };
      const id = await createItem(H.board, title, cols);
      invalidate("hosting");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין אירוח" });
      const cols = colsFrom(body, res);
      if (!cols) return;
      if (Object.keys(cols).length) await setColumns(H.board, id, cols);
      if (body.title !== undefined) {
        const t = String(body.title).trim();
        if (!t) return res.status(400).json({ error: "כותרת ריקה" });
        await renameItem(H.board, id, t);
      }
      invalidate("hosting");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין אירוח" });
      await deleteItem(id);
      invalidate("hosting");
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "שיטה לא נתמכת" });
  } catch (e) {
    console.error("[hosting]", e);
    res.status(502).json({ error: "פעולת האירוח נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { safety: true });
