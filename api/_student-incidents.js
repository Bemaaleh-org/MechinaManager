/* ============================================================
   GET  /api/students?action=incident&student=<id>   רשימה
   POST /api/students?action=incident                הוספה

   אירועים חריגים — השעיה, שיחת משמעת וכדומה.

   ⚠ מנהל בלבד, קריאה וכתיבה. אין שום מסלול שמחזיר מכאן משהו
     לחניך: ה-withAuth על הקובץ כולו הוא {manager:true}, וזו
     הסיבה שהאירועים אינם חלק מנקודת הקצה של הפרופיל — טעות
     עתידית בקוד התצוגה לא תוכל להדליף אותם.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { studentRows } from "./_student-rows.js";
import { israelToday } from "./_attendance-data.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";

const I = MECHINA_COLS.incidents;
const KINDS = ["שיחת משמעת", "השעיה", "אחר"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const linked = (i, c) => {
  const x = i.column_values.find((y) => y.id === c);
  return x && x.linked_item_ids && x.linked_item_ids[0] ? String(x.linked_item_ids[0]) : null;
};

async function loadIncidents({ force = false } = {}) {
  return cached("mechina-incidents", async () => {
    const items = await allItems(MECHINA_BOARDS.incidents);
    return items
      .map((i) => ({
        id: String(i.id),
        studentId: linked(i, I.student),
        date: val(i, I.date),
        kind: val(i, I.kind) || "אחר",
        detail: val(i, I.detail) || "",
        by: val(i, I.by) || "",
      }))
      .filter((x) => x.studentId)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, { force });
}

async function handler(req, res, session) {
  if (req.method === "GET") return list(req, res);
  if (req.method === "POST") return add(req, res, session);
  return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
}

async function list(req, res) {
  try {
    const studentId = req.query?.student ? String(req.query.student) : null;
    const all = await loadIncidents();
    const shown = studentId ? all.filter((x) => x.studentId === studentId) : all;
    res.status(200).json({ incidents: shown, count: shown.length, kinds: KINDS });
  } catch (e) {
    console.error("[incidents:list]", e);
    res.status(502).json({ error: "שליפת האירועים נכשלה" });
  }
}

async function add(req, res, session) {
  try {
    const body = req.body ?? (await readJson(req));
    const studentId = String(body?.studentId || "").trim();
    const kind = String(body?.kind || "");
    const detail = String(body?.detail || "").trim().slice(0, 2000);
    const date = String(body?.date || israelToday()).trim();

    if (!studentId) return res.status(400).json({ error: "לא צוין חניך" });
    if (!KINDS.includes(kind)) return res.status(400).json({ error: "סוג אירוע לא מוכר" });
    if (!detail) return res.status(400).json({ error: "אירוע חריג מחייב פירוט" });
    if (!DATE_RE.test(date)) return res.status(400).json({ error: "תאריך לא תקין" });

    const student = (await studentRows()).find((r) => r.id === studentId);
    if (!student) return res.status(404).json({ error: "החניך אינו נמצא" });

    const cols = {
      [I.student]: { item_ids: [Number(studentId)] },
      [I.date]: { date },
      [I.kind]: { label: kind },
      [I.detail]: detail,
      [I.by]: actorName(session).slice(0, 120),
    };
    const d = await gql(
      `mutation($b:ID!,$n:String!,$v:JSON!){ create_item(board_id:$b,item_name:$n,column_values:$v,create_labels_if_missing:false){ id } }`,
      { b: MECHINA_BOARDS.incidents, n: `${student.name} · ${kind} · ${date}`, v: JSON.stringify(cols) }
    );
    invalidate("mechina-incidents");
    res.status(200).json({ ok: true, id: String(d.create_item.id) });
  } catch (e) {
    console.error("[incidents:add]", e);
    res.status(502).json({ error: "רישום האירוע נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
