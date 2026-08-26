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
const PAID = ["בתשלום", "ללא תשלום"];
const YN = ["כן", "לא"];

/* ============================================================
   סיכום כספי לפי תקופה
   ------------------------------------------------------------
   ⚠ הסכימה לפי **תאריך תחילת האירוח** ולא לפי תאריך הרישום.
     אירוח שנרשם בינואר והתקיים במרץ שייך למרץ — זה מה
     שמנהל שואל כשהוא שואל "כמה הכנסנו ברבעון".

   ⚠ אירוח שבוטל אינו נספר כלל, לא בכסף ולא בראשים. אירוח
     "בתיאום" כן נספר — ומסומן בנפרד כצפוי, כדי שההפרש בין
     מה שכבר נכנס למה שאמור להיכנס יישאר גלוי.
   ============================================================ */
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

function periodKey(date, span) {
  const y = date.slice(0, 4);
  const m = Number(date.slice(5, 7));
  if (span === "year") return { key: y, label: y, sort: y };
  if (span === "quarter") {
    const q = Math.floor((m - 1) / 3) + 1;
    return { key: `${y}-Q${q}`, label: `רבעון ${q} · ${y}`, sort: `${y}-${q}` };
  }
  return { key: date.slice(0, 7), label: `${MONTHS[m - 1]} ${y}`, sort: date.slice(0, 7) };
}

function summarise(list, span) {
  const map = new Map();
  for (const h of list) {
    if (!h.from || h.status === "בוטל") continue;
    const { key, label, sort } = periodKey(h.from, span);
    let row = map.get(key);
    if (!row) {
      row = { key, label, sort, groups: 0, people: 0, paidGroups: 0, freeGroups: 0,
        amount: 0, earned: 0, expected: 0, nights: 0 };
      map.set(key, row);
    }
    row.groups += 1;
    row.people += Number(h.people) || 0;
    if (h.sleeping === "לנים") row.nights += 1;
    const paid = h.paid === "בתשלום";
    if (paid) row.paidGroups += 1; else if (h.paid) row.freeGroups += 1;
    const amt = paid ? Number(h.amount) || 0 : 0;
    row.amount += amt;
    /* ⚠ "התקבל" מול "צפוי": אירוח שהתקיים הוא כסף שנכנס,
       אירוח עתידי הוא הבטחה. ערבוב שלהם היה מנפח את התמונה. */
    if (h.status === "התקיים") row.earned += amt; else row.expected += amt;
  }
  return [...map.values()].sort((a, b) => b.sort.localeCompare(a.sort));
}

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
        paid: val(i, C.paid) || null,
        amount: num(i, C.amount),
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
  for (const [k, c, label] of [
    ["people", C.people, "מספר משתתפים"], ["amount", C.amount, "סכום"],
  ]) {
    if (body[k] === undefined) continue;
    const v = String(body[k] ?? "").trim();
    if (v === "") { cols[c] = ""; continue; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) { res.status(400).json({ error: `${label} לא תקין` }); return null; }
    cols[c] = String(n);
  }
  for (const [k, c, allowed] of [
    ["status", C.status, STATUS], ["sleeping", C.sleeping, SLEEP],
    ["paid", C.paid, PAID],
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

      const live = list.filter((x) => x.status !== "בוטל");

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
        totals: {
          /* ⚠ סך הכול על פני כל השנים — לא כפילות של הסיכום
             התקופתי אלא השורה התחתונה שלו. */
          earned: live.reduce((a, h) => a + (h.status === "התקיים" && h.paid === "בתשלום" ? Number(h.amount) || 0 : 0), 0),
          expected: live.reduce((a, h) => a + (h.status !== "התקיים" && h.paid === "בתשלום" ? Number(h.amount) || 0 : 0), 0),
          people: live.reduce((a, h) => a + (Number(h.people) || 0), 0),
          paidGroups: live.filter((h) => h.paid === "בתשלום").length,
          freeGroups: live.filter((h) => h.paid === "ללא תשלום").length,
          /* כמה עוד לא סומן — המספר שאומר כמה מהתמונה חסר */
          unmarked: live.filter((h) => !h.paid).length,
        },
        periods: {
          month: summarise(list, "month"),
          quarter: summarise(list, "quarter"),
          year: summarise(list, "year"),
        },
        options: { status: STATUS, sleeping: SLEEP, paid: PAID },
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
