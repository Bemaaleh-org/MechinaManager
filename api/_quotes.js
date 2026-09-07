/* ============================================================
   /api/students?action=quotes    הציטוט היומי — הבנק, הבחירה והתגובות

   ------------------------------------------------------------
   ⚠ **ציטוט היום הוא שדה על הציטוט, ולא לוח שני.** `shown` הוא
     התאריך שבו הציטוט היה "של היום"; ריק = יושב בבנק. אין לוח
     "היסטוריה": הציטוט שהוצג אתמול נושא את התאריך של אתמול,
     וזו כל ההיסטוריה שצריך.

   ⚠ **ואם איש לא בחר — הבנק בוחר.** גיבוב יציב של התאריך מודולו
     מספר הציטוטים (אותו דפוס כמו `tone()` בשיבוצים): כולם רואים
     אותו ציטוט, והוא מתחלף מעצמו כל יום בלי שאיש יעשה דבר.
     `auto: true` אומר למסך שזו ברירת מחדל ולא בחירה — שני
     המצבים נראים אותו דבר ואינם אותו דבר.

   ⚠ **תגובה היא שורה לכל חניך לכל ציטוט, ותגובה חוזרת מחליפה.**
     אדם אחד, קול אחד — כמו הצבעה בסקר (4נ). ⚠ ותגובה ריקה
     **מוחקת** את השורה: המסך שולח את המצב הרצוי ("אני ❤️" /
     "אני כלום") ולא "הפוך" — שתי לחיצות כמעט יחד שולחות אותה
     כוונה ומקבלות אותה תוצאה (עיקרון 5).

   ⚠ **מי בוחר את ציטוט היום — מובילי השבוע והצוות.** כל מחובר
     מוסיף לבנק ורואה את כולו; הבחירה היא של מי שמוביל את השבוע.
     `canCurate` מוחזר מהשרת כדי שהכפתור יידע מראש, ולא יופיע
     למי שיקבל 403 אחרי שכבר לחץ (4יד).

   ⚠ **ציטוט אינו סוד** — כל מחובר רואה את הבנק — ולכן מי שנחסם
     מקבל 403 שאומר מי כן רשאי, ולא 404 (4נ). זה ההפך מהפרויקטים
     ומההצפות, ששם 404 כי עצם הקיום הוא מידע.
   ============================================================ */
import { withAuth } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, renameItem, createItem, deleteItem } from "./_items.js";
import { todayFor } from "./_attendance-data.js";
import { QUOTE_BOARDS as B, QUOTE_COLS as C, quotesReady } from "../shared/quotes-ids.js";

const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

const notReady = (res) =>
  res.status(503).json({
    error: "לוח הציטוטים טרם הוקם",
    setupRequired: true,
    run: "npm run seed:quotes",
  });

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ---------------- גבולות ---------------- */
const TEXT_MIN = 3;
const TEXT_MAX = 600;
const AUTHOR_MAX = 80;
const NAME_MAX = 120;
const UNKNOWN_AUTHOR = "לא ידוע";

/* ============================================================
   ⚠ **תגובה היא אימוג׳י אחד או מילה אחת.** לא משפט, לא שתי
     מילים — הרעיון הוא קול אחד קליל, לא תגובה בוואטסאפ.

   אימוג׳י: נקודת קוד אחת מ-Extended_Pictographic, ואולי אחת
   נוספת — בורר וריאציה (❤️ הוא ❤ + FE0F) או גוון עור. שתי
   נקודות קוד לכל היותר, ולכן אימוג׳י של משפחה (שבע נקודות
   עם ZWJ) נדחה — וזה בסדר.

   מילה: אותיות עברית או אנגלית, גרש וגרשיים, סימן קריאה אחד
   בסוף — עד 12 תווים ובלי רווח. ⚠ **אותו ביטוי בדיוק במסך**
   (`src/Quotes.jsx`), כדי שמה שהמסך מקבל השרת יקבל.
   ============================================================ */
const REACTION_RE =
  /^(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?|(?=[^\s]{1,12}$)[א-תA-Za-z׳״']+!?)$/u;
const REACTION_HINT = "תגובה היא אימוג׳י אחד או מילה אחת — עד 12 אותיות, בלי רווחים";

const CURATE_HINT = "בחירת ציטוט היום היא של מובילי השבוע ושל הצוות";
const EDIT_HINT = "עריכת ציטוט היא של מי שהוסיף אותו, של מובילי השבוע ושל הצוות";

/** מי רשאי לבחור, לערוך ולמחוק כל ציטוט. */
const mayCurate = (s) => Boolean(s.isManager || s.isLeader || s.leadsAnyWeek);

/** שם השורה — שורה אחת, קצרה, כדי שהלוח ייקרא. */
const nameOf = (text) => text.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);

/* ---------------- טעינה ---------------- */

export async function loadQuotes({ force = false } = {}) {
  if (!quotesReady()) return [];
  return cached("quotes", async () => {
    const items = await allItems(B.quotes);
    return items.map((i) => ({
      id: String(i.id),
      /* ⚠ נופל לשם השורה: ציטוט שמישהו הקליד ישירות בלוח בלי
         למלא את עמודת הטקסט המלא עדיין מוצג, ולא נעלם בשקט. */
      text: String(val(i, C.quotes.text) || i.name || "").trim(),
      author: val(i, C.quotes.author).trim() || UNKNOWN_AUTHOR,
      by: val(i, C.quotes.by) || null,
      byId: val(i, C.quotes.byId) || null,
      added: val(i, C.quotes.added) || null,
      shown: val(i, C.quotes.shown) || null,
      archived: val(i, C.quotes.archived) === "v",
    })).filter((q) => q.text);
  }, { force });
}

export async function loadReactions({ force = false } = {}) {
  if (!quotesReady()) return [];
  return cached("quote-reactions", async () => {
    const items = await allItems(B.reactions);
    return items.map((i) => ({
      id: String(i.id),
      quote: val(i, C.reactions.quote),
      student: val(i, C.reactions.student),
      reaction: String(val(i, C.reactions.reaction) || i.name || "").trim(),
      date: val(i, C.reactions.date) || null,
    })).filter((r) => r.quote && r.student && r.reaction);
  }, { force });
}

const bust = () => { invalidate("quotes"); invalidate("quote-reactions"); };

/* ============================================================
   צורת התשובה
   ------------------------------------------------------------
   ⚠ מיפוי מפורש ולא פריסה — עמודה שתתווסף ללוח לא תדלוף
     מעצמה (עיקרון 4). `mine` ו-`myReaction` נגזרים בשרת מול
     המזהה שבסשן ולא מהשוואת שמות במסך (4ס).
   ============================================================ */
function shape(q, reactions, me) {
  const rs = reactions.filter((r) => r.quote === q.id);
  const counts = new Map();
  for (const r of rs) counts.set(r.reaction, (counts.get(r.reaction) || 0) + 1);
  const mine = rs.find((r) => r.student === me);
  return {
    id: q.id,
    text: q.text,
    author: q.author,
    by: q.by,
    byId: q.byId,
    added: q.added,
    shown: q.shown,
    mine: Boolean(q.byId) && q.byId === me,
    /* ⚠ נגזר ואינו נשמר — מונה שמור מתיישן ברגע שמישהו מוחק
       שורה בלוח (4כו). */
    reactions: [...counts]
      .map(([reaction, n]) => ({ reaction, n }))
      .sort((a, b) => b.n - a.n || a.reaction.localeCompare(b.reaction, "he")),
    myReaction: mine ? mine.reaction : null,
    total: rs.length,
  };
}

/* ============================================================
   הבחירה של היום
   ------------------------------------------------------------
   1. ציטוט ש-`shown` שלו הוא היום — מישהו בחר. `auto: false`.
   2. אחרת — גיבוב של התאריך מודולו מספר הציטוטים. `auto: true`.

   ⚠ **ממוינים לפי מזהה ולא לפי סדר השליפה.** סדר השליפה מ-monday
     אינו מובטח, וגיבוב על רשימה שסדרה משתנה נותן ציטוט אחר
     בכל רענון — כלומר לא "ציטוט היום" אלא "ציטוט הרגע".

   ⚠ ידוע: ציטוט שנוסף באמצע היום משנה את המכנה ועשוי להחליף
     את הבחירה האוטומטית. מי שרוצה שהציטוט יישאר — בוחר אותו.
   ============================================================ */
function hashOf(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickDaily(quotes, today) {
  const live = quotes.filter((q) => !q.archived);
  const explicit = live.find((q) => q.shown === today);
  if (explicit) return { q: explicit, auto: false };
  if (!live.length) return null;
  const sorted = [...live].sort((a, b) => Number(a.id) - Number(b.id));
  return { q: sorted[hashOf(today) % sorted.length], auto: true };
}

/* ---------------- אימות קלט ---------------- */
function cleanText(raw) {
  /* ⚠ שבירות שורה נשמרות — ציטוט של שתי שורות הוא דבר שקיים.
     רק רצפי רווחים בתוך שורה מתכווצים. */
  const text = String(raw || "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  if (text.length < TEXT_MIN) return { error: "ציטוט קצר מדי — לפחות שלושה תווים" };
  if (text.length > TEXT_MAX) return { error: `ציטוט ארוך מדי — עד ${TEXT_MAX} תווים` };
  return { text };
}

function cleanAuthor(raw) {
  const author = String(raw || "").replace(/\s+/g, " ").trim();
  if (author.length > AUTHOR_MAX) return { error: `"מי אמר" ארוך מדי — עד ${AUTHOR_MAX} תווים` };
  return { author: author || UNKNOWN_AUTHOR };
}

/* ============================================================
   ההנדלר
   ============================================================ */
async function handler(req, res, session) {
  if (!quotesReady()) return notReady(res);
  const today = todayFor(req);
  const me = String(session.itemId || "");
  const curate = mayCurate(session);

  try {
    if (req.method === "GET") {
      const [quotes, reactions] = await Promise.all([loadQuotes(), loadReactions()]);
      const pick = pickDaily(quotes, today);
      return res.status(200).json({
        ok: true,
        today,
        daily: pick ? { ...shape(pick.q, reactions, me), auto: pick.auto } : null,
        /* ⚠ הבנק הוא כל מה שאינו בארכיון, גם מה שכבר הוצג פעם —
           ציטוט טוב ראוי ליום נוסף. החדש ראשון. */
        bank: quotes
          .filter((q) => !q.archived)
          .sort((a, b) => (b.added || "").localeCompare(a.added || "") || Number(b.id) - Number(a.id))
          .map((q) => shape(q, reactions, me)),
        canCurate: curate,
        me: { id: me },
      });
    }

    const body = req.body ?? (await readJson(req));

    /* ---------- תגובה ---------- */
    if (req.method === "POST" && body?.quote !== undefined) {
      const quote = (await loadQuotes()).find((q) => q.id === String(body.quote) && !q.archived);
      if (!quote) return res.status(404).json({ error: "הציטוט אינו נמצא" });

      const reaction = String(body?.reaction || "").trim();
      if (reaction && !REACTION_RE.test(reaction)) {
        return res.status(400).json({ error: REACTION_HINT });
      }

      const all = await loadReactions();
      const prev = all.find((r) => r.quote === quote.id && r.student === me);

      if (!reaction) {
        /* ⚠ ריק = "אין לי תגובה", והשורה נמחקת. אין מצב שלישי
           שבו השורה קיימת וריקה. אידמפוטנטי: מחיקה של מה שאין
           אינה שגיאה. */
        if (prev) await deleteItem(prev.id);
      } else if (prev) {
        /* ⚠ תגובה זהה אינה נכתבת שוב — שתי לחיצות כמעט יחד
           מקבלות אותה תוצאה בלי שתי כתיבות. */
        if (prev.reaction !== reaction) {
          await setColumns(B.reactions, prev.id, {
            [C.reactions.reaction]: reaction,
            [C.reactions.date]: { date: today },
          });
          await renameItem(B.reactions, prev.id, reaction);
        }
      } else {
        await createItem(B.reactions, reaction, {
          [C.reactions.quote]: quote.id,
          [C.reactions.student]: me,
          [C.reactions.studentName]: String(session.name || "").slice(0, 120),
          [C.reactions.reaction]: reaction,
          [C.reactions.date]: { date: today },
        });
      }
      bust();

      /* ⚠ **התשובה מחושבת ממה שכבר בידינו ולא בקריאה חוזרת.**
         monday עשויה להחזיר את הרשימה הישנה מיד אחרי כתיבה,
         והמסך היה מקבל "אישור" שמבטל את מה שהוא הרגע הראה. */
      const next = all.filter((r) => !(r.quote === quote.id && r.student === me));
      if (reaction) next.push({ id: prev ? prev.id : "", quote: quote.id, student: me, reaction, date: today });
      const s = shape(quote, next, me);
      return res.status(200).json({
        ok: true, quote: quote.id,
        reactions: s.reactions, myReaction: s.myReaction, total: s.total,
      });
    }

    /* ---------- הוספה לבנק ---------- */
    if (req.method === "POST") {
      const t = cleanText(body?.text);
      if (t.error) return res.status(400).json({ error: t.error });
      const a = cleanAuthor(body?.author);
      if (a.error) return res.status(400).json({ error: a.error });

      /* ⚠ כל מחובר מוסיף — זה כל הכיף. מי שהוסיף רשום לפי
         מזהה (לבעלות) ולפי שם (לתצוגה). */
      const id = await createItem(B.quotes, nameOf(t.text), {
        [C.quotes.text]: t.text,
        [C.quotes.author]: a.author,
        [C.quotes.by]: String(session.name || "").slice(0, 120),
        [C.quotes.byId]: me,
        [C.quotes.added]: { date: today },
      });
      bust();
      return res.status(200).json({ ok: true, id: String(id) });
    }

    const id = String(body?.id || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין ציטוט" });
    const quotes = await loadQuotes();
    const quote = quotes.find((q) => q.id === id);
    if (!quote) return res.status(404).json({ error: "הציטוט אינו נמצא" });
    const own = Boolean(quote.byId) && quote.byId === me;

    /* ---------- עריכה ובחירה ---------- */
    if (req.method === "PUT") {
      const touchesCuration = body.shown !== undefined || body.archived !== undefined;
      /* ⚠ ההודעה אומרת מי כן רשאי, לא "אין הרשאה" (4כב). */
      if (touchesCuration && !curate) return res.status(403).json({ error: CURATE_HINT });
      if (!curate && !own) return res.status(403).json({ error: EDIT_HINT });

      const out = {};
      let rename = null;
      if (body.text !== undefined) {
        const t = cleanText(body.text);
        if (t.error) return res.status(400).json({ error: t.error });
        out[C.quotes.text] = t.text;
        rename = nameOf(t.text);
      }
      if (body.author !== undefined) {
        const a = cleanAuthor(body.author);
        if (a.error) return res.status(400).json({ error: a.error });
        out[C.quotes.author] = a.author;
      }
      if (body.archived !== undefined) {
        out[C.quotes.archived] = { checked: body.archived ? "true" : "false" };
      }

      let cleared = 0;
      if (body.shown !== undefined) {
        if (body.shown === "today") {
          /* ⚠ ציטוט בארכיון אינו ציטוט היום — אלא אם אותה בקשה
             מוציאה אותו מהארכיון. */
          if (quote.archived && body.archived !== false) {
            return res.status(400).json({ error: "הציטוט בארכיון — קודם להחזיר אותו לבנק" });
          }
          /* ⚠⚠ **ציטוט אחד ליום.** כל ציטוט אחר שנושא את התאריך
             של היום מנוקה באותה בקשה — אחרת שני מובילים שבחרו
             בהפרש דקה היו משאירים שניים, והמסך היה מציג את
             הראשון שנשלף. */
          for (const o of quotes.filter((q) => q.id !== id && q.shown === today)) {
            await setColumns(B.quotes, o.id, { [C.quotes.shown]: "" });
            cleared++;
          }
          out[C.quotes.shown] = { date: today };
        } else if (body.shown === null || body.shown === "") {
          /* ⚠ חזרה לבנק. ריק ולא null: כך מנקים תאריך ב-monday
             בכל המאגר (ראו _board.js). */
          out[C.quotes.shown] = "";
        } else {
          return res.status(400).json({ error: "shown הוא \"today\" או ריק" });
        }
      }

      if (Object.keys(out).length) await setColumns(B.quotes, id, out);
      if (rename) await renameItem(B.quotes, id, rename);
      bust();
      return res.status(200).json({
        ok: true, id,
        shown: body.shown === "today" ? today : (body.shown !== undefined ? null : quote.shown),
        cleared,
      });
    }

    /* ---------- מחיקה ---------- */
    if (req.method === "DELETE") {
      if (!curate && !own) return res.status(403).json({ error: EDIT_HINT });
      /* ⚠ **וגם התגובות שלו.** שורות שמצביעות על ציטוט שאינו
         קיים אינן מוצגות בשום מסך, כלומר לא יימחקו לעולם (4ק). */
      const kids = (await loadReactions()).filter((r) => r.quote === id);
      for (const k of kids) { try { await deleteItem(k.id); } catch { /* כבר נמחקה */ } }
      await deleteItem(id);
      bust();
      return res.status(200).json({ ok: true, id, removed: kids.length });
    }

    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[quotes]", e);
    return res.status(502).json({ error: "פעולת הציטוטים נכשלה" });
  }
}

/* ⚠ `student: true` — הציטוט הוא של החניכים לפני הכול. מי רשאי
   לבחור ולמחוק נבדק **בתוך** ההנדלר (`mayCurate`), כי הדגלים של
   withAuth הם AND והשאלה כאן היא "מוביל **או** צוות" (4כב). */
export default withAuth(handler, { student: true });
