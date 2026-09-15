/* ============================================================
   מאגר אנשי המקצוע — ?action=pros
   ------------------------------------------------------------
     GET                      הרשימה
     POST  { name, profession, phone, notes, photo… }
     PUT   { id, … }          עריכה
     DELETE { id }            כיבוי "פעיל" — ולא מחיקה

   הבקשה: *"לאב בית יהיה מאגר של אנשי מקצוע — טלפון, פרטים,
   תמונה, ורשימת מקצועות — ושאפשר לבחור מהם כשתקלה הולכת
   לטיפול עם איש מקצוע."*

   ⚠⚠ **צוות ואב הבית, ולא חניך.** אלה פרטי קשר של אדם מחוץ
     למכינה — בדיוק כמו המרצים (4כ) והפונים בגיוס (5כו), ולכן
     `{ student: true }` הוא השער וההכרעה כאן: `withAuth` אינו
     יכול לבטא "צוות **או** אב הבית" (דגליו AND), וזה אותו דפוס
     של `mayArea` (4כב) ו-`mayChores` (5כז).

   ⚠ **המחיקה היא כיבוי.** מי שלא עובד איתנו יורד מהבורר ונשאר
     בהיסטוריה: טלפון של מי שתיקן את המזגן לפני שנתיים הוא
     בדיוק מה שמחפשים כשהוא מתקלקל שוב. מחיקה אמיתית הייתה
     מוחקת את זה בשקט (4ק).
   ============================================================ */
import { withAuth } from "./_session.js";
import { gql, allItems, uploadFile } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, renameItem } from "./_items.js";
import { PRO_BOARDS as B, PRO_COLS as C, PROFESSIONS, prosReady, toPro }
  from "../shared/pros-board.js";

/* ⚠ העתק של העוזר שב-`_faults.js` — אין מודול משותף
   לזה במאגר, וכמעט כל מודול מחזיק אחד משלו.
   ⚠ **ובלעדיו כל POST מקבל "לא הוזן שם"** על גוף
   בקשה תקין לחלוטין — `req.body` אינו מנותח מעצמו. */
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
/* ⚠ **`value === null` הוא המבחן לריק ולא `text === ""`** —
   המשבצת הריקה של monday (5ז). */
const status = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || cell.value === null || cell.value === undefined) return "";
  return cell.text || "";
};
const fileUrl = (i, c) => {
  const cell = i.column_values.find((x) => x.id === c);
  if (!cell || !cell.value) return null;
  try {
    const v = JSON.parse(cell.value);
    const f = (v.files || [])[0];
    return f ? (f.public_url || f.url || null) : null;
  } catch { return null; }
};

export function invalidatePros() { invalidate("pros"); }

export async function loadPros({ force = false } = {}) {
  if (!prosReady()) return [];
  return cached("pros", async () => {
    const items = await allItems(B.board);
    return items.map((i) => ({
      id: String(i.id),
      name: String(i.name || "").trim(),
      profession: status(i, C.profession) || null,
      phone: val(i, C.phone) || null,
      notes: val(i, C.notes) || null,
      photoUrl: fileUrl(i, C.photo),
      /* ⚠⚠ **העמודה היא "לא בשימוש", ולכן ריק = פעיל.**
         תיבת סימון מחזירה `""` גם כשמעולם לא סומנה וגם
         כשבוטלה — שני מצבים שאי אפשר להבדיל ביניהם, ועם
         עמודת "פעיל" הוצאה מהרשימה לא היתה נקראת כלל.
         ראו shared/pros-ids.js. */
      active: val(i, C.archived) !== "v",
    })).sort((a, b) =>
      (a.active === b.active ? 0 : a.active ? -1 : 1)
      || String(a.profession || "").localeCompare(String(b.profession || ""), "he")
      || a.name.localeCompare(b.name, "he"));
  }, { force });
}

/** ⚠ צוות **או** אב הבית. איחוד, ולכן כאן ולא בדגל (4כב). */
export const mayPros = (s) => Boolean(s?.isManager || s?.isHouse);

const setup = (res) => res.status(503).json({
  error: "מאגר אנשי המקצוע טרם הוקם ב-monday. הריצו: npm run seed:pros",
  setupRequired: true,
});

function colsFrom(body, res) {
  const cols = {};
  if (body.profession !== undefined) {
    const p = String(body.profession || "").trim();
    /* ⚠ ריק מנקה, ו-`null` ולא `{label:""}` — האחרון **קובע**
       את התווית שיושבת במשבצת הריקה במקום לנקות (5ז). */
    if (!p) cols[C.profession] = null;
    else if (!PROFESSIONS.includes(p)) {
      res.status(400).json({ error: `מקצוע לא מוכר: ${p}` });
      return null;
    } else cols[C.profession] = { label: p };
  }
  if (body.phone !== undefined) cols[C.phone] = String(body.phone || "").trim().slice(0, 60);
  if (body.notes !== undefined) cols[C.notes] = String(body.notes || "").trim().slice(0, 2000);
  /* ⚠ הפוך: `active:true` מנקה את תיבת "לא בשימוש". */
  if (body.active !== undefined) {
    cols[C.archived] = { checked: body.active ? "false" : "true" };
  }
  return cols;
}

/** ⚠ כישלון בהעלאה אינו מבטל את השמירה — אותו כלל של התקלות. */
async function attach(id, body) {
  if (!body.photoData || !C.photo) return null;
  try {
    await uploadFile({
      boardId: B.board, itemId: id, columnId: C.photo,
      name: body.photoName || "photo.jpg",
      mime: body.photoMime || "image/jpeg",
      data: body.photoData,
    });
    return true;
  } catch (e) { console.error("[pros:photo]", e && e.message); return false; }
}

async function handler(req, res, session) {
  if (!mayPros(session)) {
    /* ⚠ ההודעה אומרת **מי כן רשאי** ולא "אין הרשאה" (4כב). */
    return res.status(403).json({ error: "מאגר אנשי המקצוע מנוהל על ידי אב הבית והצוות" });
  }
  if (!prosReady()) return setup(res);

  try {
    if (req.method === "GET") {
      const rows = await loadPros();
      return res.status(200).json({
        /* ⚠ מיפוי מפורש — שדה שיתווסף ללוח לא ידלוף מעצמו. */
        pros: rows.map(toPro),
        professions: PROFESSIONS,
        canEdit: true,
      });
    }

    /* ⚠ **`req.body` אינו מנותח מעצמו** — אותו דפוס של
       כל שאר המודולים. בלעדיו כל POST מקבל "לא הוזן שם"
       על גוף בקשה תקין לחלוטין. */
    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const name = String(body.name || "").trim();
      if (!name) return res.status(400).json({ error: "לא הוזן שם" });
      /* ⚠ שם כפול נחסם — שתי שורות לאותו אדם מפצלות את
         ההיסטוריה שלו (5לג). ⚠ וההודעה אינה אומרת של מי. */
      const rows = await loadPros({ force: true });
      if (rows.some((p) => p.name === name)) {
        return res.status(409).json({ error: "כבר קיים איש מקצוע בשם הזה" });
      }
      /* ⚠ שורה חדשה נולדת פעילה, והתיבה נשארת ריקה. */
      const cols = colsFrom(body, res);
      if (cols === null) return;
      const id = await createItem(B.board, name.slice(0, 200), cols);
      const photoUploaded = await attach(id, body);
      invalidatePros();
      return res.status(200).json({ ok: true, id, photoUploaded });
    }

    if (req.method === "PUT") {
      const id = String(body.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה שורה" });
      const rows = await loadPros();
      const row = rows.find((p) => p.id === id);
      if (!row) return res.status(404).json({ error: "איש המקצוע אינו נמצא" });

      const cols = colsFrom(body, res);
      if (cols === null) return;
      const name = body.name === undefined ? null : String(body.name).trim();
      if (name !== null && !name) return res.status(400).json({ error: "השם אינו יכול להיות ריק" });

      if (Object.keys(cols).length) await setColumns(B.board, id, cols);
      if (name && name !== row.name) await renameItem(B.board, id, name.slice(0, 200));
      const photoUploaded = await attach(id, body);
      invalidatePros();
      return res.status(200).json({ ok: true, id, photoUploaded });
    }

    if (req.method === "DELETE") {
      const id = String(body.id || req.query?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוינה שורה" });
      const row = (await loadPros()).find((p) => p.id === id);
      if (!row) return res.status(404).json({ error: "איש המקצוע אינו נמצא" });
      /* ⚠ **כיבוי ולא מחיקה** — ראו ההערה בראש הקובץ. */
      await setColumns(B.board, id, { [C.archived]: { checked: "true" } });
      invalidatePros();
      return res.status(200).json({ ok: true, id, archived: true });
    }

    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[pros]", e);
    res.status(502).json({ error: "פעולת מאגר אנשי המקצוע נכשלה" });
  }
}

/* ⚠ `{ student: true }` הוא השער, וההכרעה ב-`mayPros` שבתוך
   ההנדלר: דגלי `withAuth` הם AND והשאלה כאן איחוד (4כב, 4נ). */
export default withAuth(handler, { student: true });
