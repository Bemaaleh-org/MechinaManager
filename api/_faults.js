/* ============================================================
   /api/students?action=faults — תקלות ובעיות
     GET    צוות: כל התקלות. חניך: רק אלה שהוא דיווח.
     POST   { title, place, urgency, desc, photo… }   תקלה חדשה
     PUT    { id, ...שדות לעדכון }                    עריכה — צוות
     DELETE { id }                                    מחיקה — צוות

   ⚠ הדיווח פתוח לכל חניך; המעקב שמור לצוות. שתי ההרשאות
     נאכפות כאן, בתוך המודול, ולא ב-withAuth: withAuth מכניס
     את כולם ואנחנו מפרידים לפי המתודה.

   ⚠ חניך רואה סטטוס בלבד — לא עלויות ולא פרטי איש מקצוע.
     המיפוי ב-toStudentFault, בשרת. ראו עיקרון 4.

   ⚠ תקלה שטופלה מסמנים "טופלה" ולא מוחקים — היסטוריית
     התחזוקה שווה כסף בפעם הבאה שאותו דבר מתקלקל.
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { allItems, uploadFile } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { israelToday } from "./_attendance-data.js";
import {
  FAULTS, FAULTS_COLS as C, faultsReady, toStudentFault,
  FAULT_PLACE, FIXES, URGENCIES, STATUSES, FAULT_STATUS, FAULT_URGENCY,
} from "../shared/faults-board.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ============================================================
   ⚠ **`assets` מחזיר את כל הקבצים של השורה, מכל עמודות הקובץ.**

   כל עוד הייתה עמודת תמונה אחת, `assets[0]` היה נכון במקרה.
   מרגע שיש שתיים — תמונת הדיווח ותמונת התיקון — הוא מחזיר
   את מה שקרה להיות ראשון, והמסך היה מציג את תמונת הבעיה
   כתמונת התיקון ולהפך.

   השיוך הנכון עובר דרך `value` של עמודת הקובץ עצמה, שהוא
   JSON ובו `assetId` לכל קובץ.

   ⚠ ו-`value` פסול או ריק אינו מפיל את המסך — הוא מחזיר null,
     בדיוק כמו תקלה בלי תמונה.
   ============================================================ */
function photoOf(item, colId) {
  const col = (item.column_values || []).find((x) => x.id === colId);
  if (!col || !col.value) return null;
  let ids = [];
  try {
    const files = JSON.parse(col.value).files || [];
    ids = files.map((f) => String(f.assetId ?? f.asset_id ?? "")).filter(Boolean);
  } catch { return null; }
  if (!ids.length) return null;
  const hit = (item.assets || []).find((a) => ids.includes(String(a.id)));
  return hit ? hit.public_url : null;
}

const STATUS_ORDER = { [FAULT_STATUS.open]: 0, [FAULT_STATUS.working]: 1, [FAULT_STATUS.done]: 2 };

export async function loadFaults({ force = false } = {}) {
  return cached("faults", async () => {
    /* ⚠ assets נשלף במפורש: לעמודת קובץ יש רק שם הקובץ ב-text,
       וכתובת להצגה מגיעה רק מכאן. */
    const items = await allItems(FAULTS.board, "assets { id public_url }");
    return items
      .map((i) => {
        const cost = val(i, C.cost);
        return {
          id: String(i.id),
          title: String(i.name || "").trim(),
          date: val(i, C.date),
          place: val(i, C.place),
          fix: val(i, C.fix),
          urgency: val(i, C.urgency) || FAULT_URGENCY.normal,
          status: val(i, C.status) || FAULT_STATUS.open,
          desc: val(i, C.desc),
          notes: val(i, C.notes),
          cost: cost === "" ? null : Number(cost),
          pro: val(i, C.pro),
          proPhone: val(i, C.proPhone),
          doneDate: val(i, C.doneDate),
          reporter: val(i, C.reporter),
          reporterId: val(i, C.reporterId),
          photoUrl: photoOf(i, C.photo),
          /* ⚠ תמונת "אחרי" — נפרדת מתמונת הדיווח, ראו photoOf. */
          photoDoneUrl: photoOf(i, C.photoDone),
        };
      })
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
  if (body.doneDate !== undefined) {
    const d = String(body.doneDate).trim();
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return bad("תאריך סיום");
    cols[C.doneDate] = d ? { date: d } : {};
  }
  if (body.cost !== undefined) {
    const raw = String(body.cost).trim();
    if (raw === "") cols[C.cost] = "";
    else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return bad("עלות");
      cols[C.cost] = String(n);
    }
  }
  for (const [key, col, max] of [
    ["desc", C.desc, 4000], ["notes", C.notes, 4000],
    ["pro", C.pro, 120], ["proPhone", C.proPhone, 40],
  ]) {
    if (body[key] !== undefined) cols[col] = String(body[key]).trim().slice(0, max);
  }
  return cols;
}

/* ⚠ חניך הוא הבעלים של תקלה שהוא דיווח בלבד. ההשוואה על
   מזהה השורה בלוח החניכים ולא על השם — שני חניכים יכולים
   לחלוק שם, מזהה הוא ייחודי. */
const isMine = (f, session) => f.reporterId && f.reporterId === String(session.itemId);

async function handler(req, res, session) {
  if (!faultsReady()) {
    return res.status(503).json({ error: "לוח התקלות טרם הוקם ב-monday.", setupRequired: true });
  }

  /* ⚠ הצוות מוגדר כאן ולא ב-withAuth, כי הדיווח פתוח לכולם.
     isHouse = מנהל או אב בית — מי שרשאי לעקוב ולערוך. */
  const staff = Boolean(session.isManager || session.isHouse);

  try {
    if (req.method === "GET") {
      const all = await loadFaults();

      if (!staff) {
        const mine = all.filter((f) => isMine(f, session));
        return res.status(200).json({
          mine: true,
          faults: mine.map(toStudentFault),
          counts: {
            open: mine.filter((x) => x.status !== FAULT_STATUS.done).length,
            done: mine.filter((x) => x.status === FAULT_STATUS.done).length,
          },
        });
      }

      return res.status(200).json({
        mine: false,
        faults: all,
        counts: {
          open: all.filter((x) => x.status === FAULT_STATUS.open).length,
          working: all.filter((x) => x.status === FAULT_STATUS.working).length,
          done: all.filter((x) => x.status === FAULT_STATUS.done).length,
          urgentOpen: all.filter((x) => x.status !== FAULT_STATUS.done
            && x.urgency === FAULT_URGENCY.urgent).length,
          /* סך ההוצאה על תחזוקה — המספר שמעניין את המנהל */
          totalCost: all.reduce((a, x) => a + (x.cost || 0), 0),
        },
      });
    }

    const body = req.body ?? (await readJson(req));

    /* ---------- דיווח — פתוח לכל מי שמחובר ---------- */
    if (req.method === "POST") {
      const title = String(body?.title || "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "לא הוזן סוג הבעיה" });
      if (!body?.place) return res.status(400).json({ error: "יש לבחור מיקום" });

      /* ⚠ שדות הטיפול אינם מתקבלים בדיווח, גם אם נשלחו: תקלה
         נפתחת "פתוחה" ובלי עלות, ומי שממלא אותם הוא הצוות. */
      const { cost, pro, proPhone, doneDate, notes, status, ...clean } = body;
      const cols = colsFrom({
        ...clean,
        date: body.date || israelToday(),
        status: FAULT_STATUS.open,
        urgency: body.urgency || FAULT_URGENCY.normal,
      }, res);
      if (cols === null) return;

      cols[C.reporter] = actorName(session).slice(0, 120);
      cols[C.reporterId] = String(session.itemId || "");

      const id = await createItem(FAULTS.board, title, cols);

      /* ⚠ התמונה עולה אחרי היצירה — עמודת קובץ אינה מקבלת ערך
         ב-create_item. כישלון בהעלאה אינו מבטל את הדיווח:
         עדיף תקלה מדווחת בלי תמונה מאשר דיווח שנעלם. */
      let photoUploaded = null;
      if (body.photoData) {
        photoUploaded = false;
        try {
          const buf = Buffer.from(String(body.photoData), "base64");
          if (buf.length > 0 && buf.length <= 8 * 1024 * 1024) {
            await uploadFile(id, C.photo,
              String(body.photoName || "תמונה.jpg"), buf,
              String(body.photoMime || "image/jpeg"));
            photoUploaded = true;
          }
        } catch (e) {
          console.error("[faults:photo]", e);
        }
      }

      invalidate("faults");
      return res.status(200).json({ ok: true, id, photoUploaded });
    }

    /* ---------- מכאן והלאה: צוות בלבד ---------- */
    if (!staff) {
      return res.status(403).json({ error: "מעקב אחר תקלות שמור לצוות ולאב הבית" });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה תקלה" });
      const faults = await loadFaults();
      if (!faults.some((x) => x.id === id)) return res.status(404).json({ error: "התקלה אינה נמצאת" });

      const cols = colsFrom(body, res);
      if (cols === null) return;
      if (Object.keys(cols).length) await setColumns(FAULTS.board, id, cols);
      if (body.title !== undefined) {
        const title = String(body.title).trim().slice(0, 200);
        if (!title) return res.status(400).json({ error: "כותרת ריקה" });
        await renameItem(FAULTS.board, id, title);
      }

      /* ============================================================
         ⚠ **תמונה של התקלה אחרי שתוקנה.**

         עולה לעמודה **נפרדת** מתמונת הדיווח, כדי ששתיהן יישארו
         זו לצד זו — "כך זה נראה" מול "כך זה נראה עכשיו".

         ⚠ **כישלון בהעלאה אינו מפיל את השמירה.** שאר השדות כבר
           נכתבו, ו-502 כאן היה נראה כאילו כלום לא נשמר. מוחזר
           `photoUploaded: false` והמסך אומר זאת — אותו דפוס
           כמו ביצירה.

         ⚠ **וסימון "טופלה" אינו דורש תמונה.** יש תקלות שאין מה
           לצלם בהן, ודרישה כזו הייתה משאירה אותן פתוחות לנצח —
           או שולחת את אב הבית לסמן ב-monday במקום כאן.
         ============================================================ */
      let photoUploaded = null;
      if (body.photoData) {
        photoUploaded = false;
        try {
          const buf = Buffer.from(String(body.photoData), "base64");
          if (buf.length) {
            await uploadFile(id, C.photoDone,
              String(body.photoName || "אחרי-התיקון.jpg"), buf,
              String(body.photoMime || "image/jpeg"));
            photoUploaded = true;
          }
        } catch (e) {
          console.error("[faults:photo-done]", e);
        }
      }

      invalidate("faults");
      return res.status(200).json({ ok: true, id, photoUploaded });
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

/* ⚠ withAuth ללא אפשרויות = כל מי שמחובר, כולל חניך. ההפרדה
   בין דיווח למעקב נעשית בתוך ה-handler לפי המתודה. */
export default withAuth(handler, { student: true });
