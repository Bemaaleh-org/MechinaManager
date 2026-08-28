/* ============================================================
   /api/lessons?action=export
     GET   מצב החיבור וכתובת חשבון השירות
     POST  { kind, url }   בונה את החוברת לתוך הגיליון שנשלח

   ⚠ **הגיליון נוצר על ידי המשתמש ולא על ידינו.** חשבון שירות
     אינו אדם ואין לו דרייב שאפשר לפתוח; קובץ שהוא ייצור לא
     יופיע לאיש. לכן: המנהל פותח גיליון ריק, משתף אותו עם
     כתובת חשבון השירות, ומדביק את הקישור.

     יש לזה יתרון שלא תוכנן מראש: הקישור **יציב**. הדוח מתרענן
     לתוך אותו קובץ, ומי ששמר אותו במועדפים או שלח אותו
     בוואטסאפ ממשיך לראות נתונים עדכניים.

   ⚠ **הכתיבה דורסת את הלשוניות של הדוח בלבד.** לשונית שהמנהל
     הוסיף בעצמו נשארת נוגעת — היא מדווחת כ"עודפת" ולא נמחקת.

   ⚠ **צוות בלבד.** הדוחות נושאים נוכחות חניכים ושמות מרצים.
   ============================================================ */

import { withAuth } from "./_session.js";
import { googleStatus, googleReady, sheetId, ensureTabs, batchUpdate, sheetMeta } from "./_google.js";
import { WORKBOOKS, emit } from "./_reports.js";

/* ⚠ גוגל מגבילה את גודל הבקשה. חוברת השיעורים מייצרת בקשה
   לכל שורה בכל גיליון — כ-700 שורות — וכולן בבקשה אחת חוצות
   את הגבול ונדחות בשגיאה שאינה מסבירה כלום. */
const CHUNK = 400;

async function handler(req, res, session) {
  try {
    if (req.method === "GET") {
      const base = {
        ...googleStatus(),
        kinds: Object.entries(WORKBOOKS).map(([k, v]) => ({ kind: k, title: v.title })),
      };
      /* ============================================================
         בדיקת גיליון — ?url=...
         ------------------------------------------------------------
         ⚠ **הכלי הזה קיים כדי שלא צריך יהיה לנחש.** בהתחברות
           לגיליון יש בדיוק ארבע דרכים להיכשל, ולכל אחת מהן
           גוגל מחזירה שגיאה שאינה אומרת מה לעשות:

             1. המפתח אינו של חשבון שירות
             2. Google Sheets API לא הופעל בפרויקט
             3. הקובץ הוא אקסל שהועלה, ולא Google Sheets
             4. הגיליון לא שותף עם חשבון השירות

           כאן כל אחת מהן מקבלת משפט שאומר מה עושים.
         ============================================================ */
      const probe = String(req.query?.url || "").trim();
      if (!probe) return res.status(200).json(base);

      if (!base.ready) {
        return res.status(200).json({ ...base, check: {
          ok: false, why: "המפתח טרם הוגדר", fix: base.hint } });
      }
      const id = sheetId(probe);
      if (!id) {
        return res.status(200).json({ ...base, check: {
          ok: false, why: "לא זוהה מזהה גיליון בכתובת",
          fix: "העתיקו את הכתובת המלאה מסרגל הכתובות של הגיליון" } });
      }
      try {
        const meta = await sheetMeta(id);
        return res.status(200).json({ ...base, check: {
          ok: true, id, title: meta.title,
          tabs: meta.tabs.map((t) => ({ title: t.title, rows: t.rows })),
        } });
      } catch (e) {
        const msg = String(e.message || "");
        /* ⚠ **קובץ אקסל שהועלה לדרייב אינו גיליון**, וה-API
           מחזיר עליו בדיוק את אותה שגיאה כמו על קובץ שלא שותף.
           המזהה מבדיל: גיליון מקורי הוא 44 תווים, קובץ שהועלה
           הוא כ-33. בלי ההבחנה הזו המנהל היה משתף שוב ושוב
           קובץ שלעולם לא ייקרא. */
        const looksUploaded = id.length < 40;
        return res.status(200).json({ ...base, check: {
          ok: false, id, raw: msg,
          why: looksUploaded
            ? "נראה שזה קובץ אקסל שהועלה לדרייב, ולא Google Sheets"
            : "לא הצלחתי לפתוח את הגיליון",
          fix: looksUploaded
            ? "בדרייב: פותחים את הקובץ → קובץ → שמור כ-Google Sheets, ושולחים את הקישור החדש"
            : `לשתף את הגיליון עם ${base.account} בהרשאת עורך`,
        } });
      }
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "רק GET ו-POST נתמכים כאן" });
    }

    if (!googleReady()) {
      /* ⚠ 503 עם דגל, כמו לוחות שטרם הוקמו — זו הקמה חסרה
         ולא תקלה. המסך מציג הסבר רגוע. */
      return res.status(503).json({
        error: "החיבור ל-Google Sheets טרם הוגדר",
        setupRequired: true,
      });
    }

    const body = req.body ?? (await readJson(req));
    const kind = String(body?.kind || "").trim();
    const spec = WORKBOOKS[kind];
    if (!spec) return res.status(400).json({ error: "סוג דוח לא מוכר" });

    const id = sheetId(body?.url);
    if (!id) {
      return res.status(400).json({
        error: "לא זוהה גיליון. הדביקו את הכתובת המלאה מסרגל הכתובות של הגיליון",
      });
    }

    /* ---------- בונים ---------- */
    const wb = await spec.build();
    const titles = wb.sheets.map((s) => s.title);

    /* ⚠ הלשוניות מוודאות **לפני** הכתיבה, כי המזהים שלהן
       נכנסים לתוך הבקשות. */
    const tabs = await ensureTabs(id, titles);
    const missing = titles.filter((t) => tabs.ids[t] === undefined);
    if (missing.length) {
      return res.status(502).json({ error: `לא נוצרו לשוניות: ${missing.join(", ")}` });
    }
    for (const s of wb.sheets) s.sheetId = tabs.ids[s.title];

    const requests = emit(wb.sheets);
    for (let i = 0; i < requests.length; i += CHUNK) {
      await batchUpdate(id, requests.slice(i, i + CHUNK));
    }

    return res.status(200).json({
      ok: true,
      url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      file: tabs.title || null,
      tabs: titles.length,
      /* ⚠ מדווח מה **לא** נגענו בו. לשונית ישנה של נושא שהוסר
         נשארת בקובץ, ומי שלא יידע עליה יקרא נתונים מתים. */
      extra: tabs.extra.length ? tabs.extra : null,
      requests: requests.length,
    });
  } catch (e) {
    console.error("[sheet-export]", e);
    /* ⚠ שגיאת גוגל כלשונה — היא כמעט תמיד אומרת בדיוק מה חסר
       ("הגיליון לא שותף", "ה-API לא הופעל"). "הייצוא נכשל"
       לבדו היה משאיר את המנהל בלי שום כיוון. */
    return res.status(502).json({ error: e.message || "הייצוא נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
