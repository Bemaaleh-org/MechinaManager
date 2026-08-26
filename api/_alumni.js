/* ============================================================
   GET  /api/students?action=alumni    בוגרי המכינה
   POST /api/students?action=alumni    בוגר חדש
   PUT  /api/students?action=alumni    עדכון

   ⚠ צוות בלבד. הלוח נושא תאריכי לידה ומקום מגורים של אנשים
     שכבר אינם במכינה, ואין סיבה שחניך נוכחי יקרא אותם.

   ⚠ מה שאין — אין. בוגר שטרם ידוע לאן הוא מתגייס נשאר ריק
     ומסומן "טרם ידוע"; ניחוש היה מייצר סטטיסטיקה שנראית
     מדויקת ואינה. הזרוע נגזרת מהתפקיד בזריעה הראשונית בלבד,
     ומשם היא נתון של הלוח.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem } from "./_items.js";
import { EXTRA } from "../shared/extras-ids.js";

const A = EXTRA.alumni;
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const num = (i, c) => { const t = val(i, c); return t === "" ? null : Number(t); };

export async function loadAlumni({ force = false } = {}) {
  return cached("alumni", async () => {
    const items = await allItems(A.board);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        cycle: val(i, A.cols.cycle) || null,
        unit: val(i, A.cols.unit) || null,
        branch: val(i, A.cols.branch) || null,
        enlist: val(i, A.cols.enlist) || null,
        birthday: val(i, A.cols.birthday) || null,
        city: val(i, A.cols.city) || null,
        note: val(i, A.cols.note) || null,
      }))
      .filter((x) => x.name)
      .sort((a, b) => (a.enlist || "9999").localeCompare(b.enlist || "9999"));
  }, { force });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function colsFrom(body) {
  const cols = {};
  if (body.cycle) cols[A.cols.cycle] = { label: String(body.cycle) };
  if (body.branch) cols[A.cols.branch] = { label: String(body.branch) };
  for (const [k, c, max] of [
    ["unit", A.cols.unit, 120], ["city", A.cols.city, 80], ["note", A.cols.note, 200],
  ]) {
    if (body[k] !== undefined) cols[c] = String(body[k] || "").trim().slice(0, max);
  }
  for (const [k, c] of [["enlist", A.cols.enlist], ["birthday", A.cols.birthday]]) {
    if (body[k] === undefined) continue;
    const v = String(body[k] || "").trim();
    if (!v) { cols[c] = ""; continue; }
    if (!DATE_RE.test(v)) return null;
    cols[c] = { date: v };
  }
  return cols;
}

async function handler(req, res, session) {
  if (!EXTRA.alumni || !EXTRA.alumni.board) {
    return res.status(503).json({ error: "לוח הבוגרים טרם הוקם", setupRequired: true });
  }

  try {
    if (req.method === "GET") {
      const alumni = await loadAlumni();

      /* ---------- סטטיסטיקה ----------
         ⚠ נבנית מהנתונים ולא מרשימה בקוד: זרוע חדשה שתופיע
           בלוח תיכנס לפילוח מעצמה. */
      const count = (key) => {
        const m = {};
        for (const a of alumni) {
          const v = a[key] || "לא ידוע";
          m[v] = (m[v] || 0) + 1;
        }
        return Object.entries(m)
          .map(([k, n]) => ({ key: k, n }))
          .sort((x, y) => y.n - x.n);
      };

      return res.status(200).json({
        alumni,
        count: alumni.length,
        byBranch: count("branch"),
        byCycle: count("cycle"),
        byCity: count("city"),
        /* כמה עוד לא ידוע — המספר שאומר כמה מהתמונה חסר */
        unknown: alumni.filter((a) => !a.unit).length,
        cycles: [...new Set(alumni.map((a) => a.cycle).filter(Boolean))],
        branches: [...new Set(alumni.map((a) => a.branch).filter(Boolean))].sort(),
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const name = String(body?.name || "").trim().slice(0, 120);
      if (!name) return res.status(400).json({ error: "לא הוזן שם" });
      const cols = colsFrom(body);
      if (!cols) return res.status(400).json({ error: "תאריך לא תקין" });
      const id = await createItem(A.board, name, cols);
      invalidate("alumni");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין בוגר" });
      const cols = colsFrom(body);
      if (!cols) return res.status(400).json({ error: "תאריך לא תקין" });
      if (Object.keys(cols).length) await setColumns(A.board, id, cols);
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return res.status(400).json({ error: "שם ריק" });
        await gql(
          `mutation($i:ID!,$b:ID!,$n:String!){ change_simple_column_value(item_id:$i,board_id:$b,column_id:"name",value:$n){ id } }`,
          { i: id, b: A.board, n: name });
      }
      invalidate("alumni");
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "רק GET, POST ו-PUT נתמכים כאן" });
  } catch (e) {
    console.error("[alumni]", e);
    res.status(502).json({ error: "פעולת הבוגרים נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
