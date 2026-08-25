/* ============================================================
   /api/students?action=faults — תקלות ובעיות
     GET    כל התקלות: פתוחות ודחופות קודם, ואז לפי תאריך
     POST   { title, place, fix, urgency, desc }     תקלה חדשה
     PUT    { id, ...שדות לעדכון }                    עריכה
     DELETE { id }                                    מחיקה

   ⚠ מנהל או אב בית — {house:true}, נאכף בשרת.
   ⚠ תקלה שטופלה מסמנים "טופלה" ולא מוחקים — היסטוריית
     התחזוקה שווה כסף בפעם הבאה שאותו דבר מתקלקל.
   ============================================================ */

import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { israelToday } from "./_attendance-data.js";
import {
  FAULTS_BOARD, FAULTS_COLS as C, faultsReady,
  FAULT_PLACE, FIXES, URGENCIES, STATUSES, FAULT_STATUS, FAULT_URGENCY,
} from "../shared/faults-board.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const STATUS_ORDER = { [FAULT_STATUS.open]: 0, [FAULT_STATUS.working]: 1, [FAULT_STATUS.done]: 2 };

async function loadFaults({ force = false } = {}) {
  return cached("faults", async () => {
    const items = await allItems(FAULTS_BOARD);
    return items
      .map((i) => ({
        id: String(i.id),
        title: String(i.name || "").trim(),
        date: val(i, C.date),
        place: val(i, C.place),
        fix: val(i, C.fix),
        urgency: val(i, C.urgency) || FAULT_URGENCY.normal,
        status: val(i, C.status) || FAULT_STATUS.open,
        desc: val(i, C.desc),
        notes: val(i, C.notes),
      }))
      .filter((x) => x.title)
      .sort((a, b) =>
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
        (a.urgency === FAULT_URGENCY.urgent ? 0 : 1) - (b.urgency === FAULT_URGENCY.urgent ? 0 : 1) ||
        (b.date || "").localeCompare(a.date || ""));
  }, { force });
}

/** גוף → עמודות. שדה שלא נשלח אינו משתנה; תווית לא חוקית נדחית. */
function colsFrom(body, res) {
  const cols = {};
  const bad = (f) => { res.status(400).json({ error: `ערך לא חוקי ב${f}` }); return null; };

  if (body.date !== undefined) {
    const d = String(body.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return bad("תאריך");
    cols[C.date] = { date: d };
  }
  const enums = [
    ["place", C.place, FAULT_PLACE, "מיקום"],
    ["fix", C.fix, FIXES, "אופן התיקון"],
    ["urgency", C.urgency, URGENCIES, "דחיפות"],
    ["status", C.status, STATUSES, "סטטוס"],
  ];
  for (const [key, col, allowed, label] of enums) {
    if (body[key] !== undefined) {
      if (!allowed.includes(body[key])) return bad(label);
      cols[col] = { label: body[key] };
    }
  }
  for (const [key, col, max] of [["desc", C.desc, 4000], ["notes", C.notes, 4000]]) {
    if (body[key] !== undefined) cols[col] = String(body[key]).trim().slice(0, max);
  }
  return cols;
}

async function handler(req, res, session) {
  if (!faultsReady()) {
    return res.status(503).json({ error: "לוח התקלות טרם הוקם ב-monday.", setupRequired: true });
  }

  try {
    if (req.method === "GET") {
      const faults = await loadFaults();
      return res.status(200).json({
        faults,
        counts: {
          open: faults.filter((x) => x.status === FAULT_STATUS.open).length,
          working: faults.filter((x) => x.status === FAULT_STATUS.working).length,
          done: faults.filter((x) => x.status === FAULT_STATUS.done).length,
        },
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזן סוג הבעיה" });
      if (!body?.place) return res.status(400).json({ error: "יש לבחור מיקום" });

      const cols = colsFrom({
        date: body.date || israelToday(),
        status: FAULT_STATUS.open,
        urgency: body.urgency || FAULT_URGENCY.normal,
        ...body,
      }, res);
      if (cols === null) return;
      const id = await createItem(FAULTS_BOARD, title, cols);
      invalidate("faults");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה תקלה" });
      const faults = await loadFaults();
      if (!faults.some((x) => x.id === id)) return res.status(404).json({ error: "התקלה אינה נמצאת" });

      const cols = colsFrom(body, res);
      if (cols === null) return;
      if (Object.keys(cols).length) await setColumns(FAULTS_BOARD, id, cols);
      if (body.title !== undefined) {
        const title = String(body.title).trim().slice(0, 200);
        if (!title) return res.status(400).json({ error: "כותרת ריקה" });
        await renameItem(FAULTS_BOARD, id, title);
      }
      invalidate("faults");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה תקלה" });
      await deleteItem(id);
      invalidate("faults");
      return res.status(200).json({ ok: true, id });
    }

    res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[faults]", e);
    res.status(502).json({ error: "פעולת התקלות נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { house: true });
