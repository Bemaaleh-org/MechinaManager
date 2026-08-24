/* ============================================================
   /api/students?action=safety — אירועי בטיחות
     GET   כל הדיווחים, מהחדש לישן
     POST  { title, date, place, severity, ... }   דיווח חדש
     PUT   { id, ...שדות לעדכון }                   עריכה
     DELETE { id }                                   מחיקה

   ⚠ מנהל או אחראי בטיחות — {safety:true}, נאכף בשרת.
   ⚠ המחיקה בלתי הפיכה. המסך דורש אישור כפול לפניה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import {
  SAFETY_BOARD, SAFETY_COLS as C, safetyReady,
  SAFETY_PLACE, SEVERITIES, SAFETY_SEVERITY, YES_NO,
} from "../shared/safety-board.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const YN = [YES_NO.yes, YES_NO.no];

async function loadIncidents({ force = false } = {}) {
  return cached("safety-incidents", async () => {
    const items = await allItems(SAFETY_BOARD);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        date: val(i, C.date),
        place: val(i, C.place),
        severity: val(i, C.severity),
        bodyHarm: val(i, C.bodyHarm),
        propHarm: val(i, C.propHarm),
        desc: val(i, C.desc),
        evac: val(i, C.evac),
        medical: val(i, C.medical),
        medicalDetail: val(i, C.medicalDetail),
        lessons: val(i, C.lessons),
        reportMod: val(i, C.reportMod),
        reportCouncil: val(i, C.reportCouncil),
      }))
      .filter((x) => x.title)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, { force });
}

/**
 * גוף הבקשה → ערכי עמודות. שדה שלא נשלח אינו נכתב (בעריכה —
 * אינו משתנה). ⚠ תווית לא חוקית נדחית ברעש, לא מותאמת בשקט.
 */
function colsFrom(body, res) {
  const cols = {};
  const badEnum = (field, allowed) => {
    res.status(400).json({ error: `ערך לא חוקי ב${field}` });
    return null;
  };

  if (body.date !== undefined) {
    const d = String(body.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return badEnum("תאריך");
    cols[C.date] = { date: d };
  }
  if (body.place !== undefined) {
    if (!SAFETY_PLACE.includes(body.place)) return badEnum("מקום");
    cols[C.place] = { label: body.place };
  }
  if (body.severity !== undefined) {
    if (!SEVERITIES.includes(body.severity)) return badEnum("סוג האירוע");
    cols[C.severity] = { label: body.severity };
    /* ⚠ "כמעט ונפגע" מנקה את שדות הנזק — הם רלוונטיים לפגיעה בלבד */
    if (body.severity !== SAFETY_SEVERITY.injury) {
      cols[C.bodyHarm] = ""; cols[C.propHarm] = "";
    }
  }
  for (const [key, col, max] of [
    ["bodyHarm", C.bodyHarm, 500], ["propHarm", C.propHarm, 500],
    ["desc", C.desc, 4000], ["medicalDetail", C.medicalDetail, 1000],
    ["lessons", C.lessons, 4000],
  ]) {
    if (body[key] !== undefined) cols[col] = String(body[key]).trim().slice(0, max);
  }
  for (const [key, col] of [
    ["evac", C.evac], ["medical", C.medical],
    ["reportMod", C.reportMod], ["reportCouncil", C.reportCouncil],
  ]) {
    if (body[key] !== undefined) {
      if (!YN.includes(body[key])) return badEnum("שדה כן/לא");
      cols[col] = { label: body[key] };
    }
  }
  return cols;
}

async function handler(req, res, session) {
  if (!safetyReady()) {
    return res.status(503).json({
      error: "לוח הבטיחות טרם הוקם ב-monday.",
      setupRequired: true,
    });
  }

  try {
    if (req.method === "GET") {
      const incidents = await loadIncidents();
      return res.status(200).json({ incidents });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזנה כותרת לאירוע" });
      if (!body?.date) return res.status(400).json({ error: "לא הוזן תאריך" });
      if (!body?.severity) return res.status(400).json({ error: "יש לבחור פגיעה או כמעט ונפגע" });

      const cols = colsFrom(body, res);
      if (cols === null) return; // השגיאה כבר נכתבה
      const id = await createItem(SAFETY_BOARD, title, cols);
      invalidate("safety-incidents");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין דיווח" });
      const incidents = await loadIncidents();
      if (!incidents.some((x) => x.id === id)) return res.status(404).json({ error: "הדיווח אינו נמצא" });

      const cols = colsFrom(body, res);
      if (cols === null) return;
      if (Object.keys(cols).length) await setColumns(SAFETY_BOARD, id, cols);
      if (body.title !== undefined) {
        const title = String(body.title).trim().slice(0, 200);
        if (!title) return res.status(400).json({ error: "כותרת ריקה" });
        await renameItem(SAFETY_BOARD, id, title);
      }
      invalidate("safety-incidents");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין דיווח" });
      const incidents = await loadIncidents();
      if (!incidents.some((x) => x.id === id)) return res.status(404).json({ error: "הדיווח אינו נמצא" });
      await deleteItem(id);
      invalidate("safety-incidents");
      return res.status(200).json({ ok: true, id });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[safety]", e);
    res.status(502).json({ error: "פעולת הבטיחות נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { safety: true });
