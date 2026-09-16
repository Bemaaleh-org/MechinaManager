/* ============================================================
   קריאת קובץ להעלאה — והקטנת תמונות לפני השליחה
   ------------------------------------------------------------
   ⚠⚠ **הבאג שזה נולד ממנו (16.9.2026):** דיווח תקלה עם תמונה
     מהטלפון החזיר **"השרת החזיר שגיאה 413"**. הסיבה אינה
     בשרת: base64 מנפח בשליש, ופונקציית Vercel מקבלת גוף של
     **4.5MB** — כלומר צילום טלפון של 5MB הופך ל-6.7MB ונדחה
     עוד לפני שההנדלר רץ. מסך התקלות אישר עד 5MB, כלומר
     **הבטיח בדיוק את מה שייכשל**.

   ⚠ **והתיקון אינו להקטין את הרף.** רף נמוך יותר פשוט דוחה
     את התמונה שהמשתמש צילם — זו אותה חוויה, עם ניסוח אחר.
     תמונה של תקלה היא תיעוד ולא ארכיון: 1600px ואיכות 0.82
     מספיקים לראות חלק שבור, והקובץ יורד מ-5MB לכ-300KB.
     כלומר הגבול מפסיק להיות משהו שהמשתמש פוגש בו.

   ⚠ **ששה מסכים העלו קבצים, בארבעה רפים שונים** (2 · 3 · 3.5
     · 5MB), וכולם מעל הגבול האמיתי אחרי base64 חוץ מאחד.
     זה 4מד: אותה שאלה, ארבע תשובות. כאן היא במקום אחד.

   ⚠ **סיבוב EXIF**: `createImageBitmap(file,{imageOrientation:
     "from-image"})` מסובב לבד. בלעדיו תמונה מהטלפון נשמרת
     שוכבת — נכון טכנית ובלתי קריא.

   ⚠ **מה שאינו תמונה עובר כמו שהוא** (PDF, מסמך), ועליו הרף
     האמיתי חל. ההודעה אומרת **למה** ולא רק "גדול מדי".

   ⚠ **וכישלון בהקטנה אינו מפיל את ההעלאה** — נופלים לקובץ
     המקורי, ואז הרף תופס אותו. עדיף להעלות גדול מאשר לא
     להעלות (עיקרון 6: כישלון נאמר, לא נבלע).
   ============================================================ */

/** הגוף המרבי שפונקציית Vercel מקבלת, פחות הניפוח של base64. */
export const MAX_RAW = 3 * 1024 * 1024;

/** ⚠ מעל זה גם ההקטנה עצמה מסוכנת בזיכרון של טלפון. */
const MAX_SOURCE = 30 * 1024 * 1024;

const MAX_DIM = 1600;
const QUALITY = 0.82;
/** קובץ קטן ממילא אינו עובר קידוד מחדש — אין מה להרוויח. */
const SMALL_ENOUGH = 600 * 1024;

const isImage = (f) => String(f.type || "").startsWith("image/");

const readAsDataUrl = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(new Error("קריאת הקובץ נכשלה"));
  r.readAsDataURL(blob);
});

/** מצייר לקנבס מוקטן ומחזיר Blob של JPEG, או null אם לא הצליח. */
async function shrink(file) {
  let bmp = null;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    /* ⚠ דפדפן ישן, או פורמט שאינו נתמך (HEIC). נופלים לקובץ המקורי. */
    return null;
  }
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
    /* ⚠ תמונה קטנה ממילא — לא מקודדים מחדש, זה רק היה מוסיף רעש. */
    if (scale === 1 && file.size <= SMALL_ENOUGH) return null;
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", QUALITY));
    /* ⚠ אם ההקטנה לא הועילה — שומרים את המקור. קורה ב-PNG של צילום מסך. */
    return blob && blob.size < file.size ? blob : null;
  } finally {
    if (bmp.close) bmp.close();
  }
}

/**
 * @returns {{name,mime,data,preview,shrunk}|null}
 *   `data` הוא base64 **בלי הקידומת**, כפי שהשרת מצפה.
 *   `null` מוחזר אחרי שנאמרה הודעה — הקורא רק מנקה את השדה.
 */
export async function readUpload(file, say) {
  if (!file) return null;
  if (file.size > MAX_SOURCE) {
    say("הקובץ גדול מדי (מעל 30MB)");
    return null;
  }

  let blob = file;
  let shrunk = false;
  if (isImage(file)) {
    try {
      const small = await shrink(file);
      if (small) { blob = small; shrunk = true; }
    } catch {
      /* נופלים למקור — ראו ההערה בראש הקובץ. */
    }
  }

  if (blob.size > MAX_RAW) {
    say(isImage(file)
      ? "לא הצלחנו להקטין את התמונה מספיק. נסו לצלם שוב באיכות נמוכה יותר."
      : "הקובץ גדול מדי — עד 3MB, כי הוא נשלח בתוך הבקשה עצמה.");
    return null;
  }

  const url = await readAsDataUrl(blob).catch(() => null);
  if (!url) { say("קריאת הקובץ נכשלה"); return null; }
  return {
    name: file.name,
    /* ⚠ הסוג הוא של מה שנשלח בפועל — תמונה שהוקטנה היא JPEG
       גם אם המקור היה PNG, ו-monday שומרת לפי מה שנמסר. */
    mime: shrunk ? "image/jpeg" : (file.type || "application/octet-stream"),
    data: url.split(",")[1] || "",
    preview: url,
    shrunk,
  };
}
