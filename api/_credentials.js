/* ============================================================
   שמות משתמש וסיסמאות — צד שרת בלבד
   ------------------------------------------------------------
   ⚠ אין לייבא את הקובץ הזה מ-src/. הוא נוגע בסיסמאות.

   ⚠ **הסיסמה אינה נשמרת בשום מקום.** מה שנשמר בלוח הוא תוצאה
     של scrypt עם מלח אקראי לכל משתמש. מי שיפתח את הלוח — כולל
     מנהל המכינה, כולל אני — רואה מחרוזת חסרת פשר ואינו יכול
     לגזור ממנה את הסיסמה.

     זה שינוי מהותי מהקודים שהיו כאן: קוד הכניסה של הצוות שמור
     כטקסט גלוי, כי הוא קוד תפעולי שמישהו צריך למסור בטלפון.
     סיסמה שאדם בוחר בעצמו היא דבר אחר לגמרי — הוא כמעט בוודאות
     משתמש בה במקום נוסף, ודליפה שלה אינה עניין של המכינה בלבד.

   ⚠ scrypt ולא SHA. גיבוב מהיר נשבר במיליארד ניחושים לשנייה;
     scrypt דורש זיכרון ולכן איטי בכוונה. הוא מובנה ב-Node ואינו
     דורש שום חבילה חיצונית.

   ⚠ ההשוואה ב-timingSafeEqual. השוואת מחרוזות רגילה נעצרת בתו
     הראשון ששונה, וההפרש במיליוניות השנייה מדליף מידע.
   ============================================================ */

import crypto from "crypto";

/* פרמטרים. ⚠ נשמרים בתוך המחרוזת עצמה, כדי שאפשר יהיה לחזק
   אותם בעתיד בלי לפסול סיסמאות שכבר נקבעו. */
const N = 16384, R = 8, P = 1, KEYLEN = 32;

const scrypt = (pw, salt, keylen, opts) =>
  new Promise((res, rej) =>
    crypto.scrypt(pw, salt, keylen, opts, (e, k) => (e ? rej(e) : res(k))));

/** סיסמה → "scrypt$N$r$p$salt$hash" */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(password), salt, KEYLEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

/** סיסמה מול מה ששמור. false לכל תקלה — לעולם לא זריקה. */
export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [, n, r, p, salt, hash] = parts;
    const want = Buffer.from(hash, "base64");
    const got = await scrypt(String(password), Buffer.from(salt, "base64"),
      want.length, { N: Number(n), r: Number(r), p: Number(p) });
    return want.length === got.length && crypto.timingSafeEqual(want, got);
  } catch {
    return false;
  }
}

/* ============================================================
   שם משתמש
   ------------------------------------------------------------
   ⚠ מנורמל לאותיות קטנות ובלי רווחים בקצוות. "Yossi" ו-"yossi"
     הם אותו אדם, ומי שיקליד רווח בסוף בטלפון לא אמור להיתקע.

   ⚠ אותיות עבריות מותרות. זו מכינה, לא בנק.
   ============================================================ */
export const normalizeUser = (raw) =>
  String(raw || "").trim().toLowerCase().replace(/\s+/g, "");

const USER_RE = /^[a-z0-9._\-֐-׿]{3,24}$/;

/** null אם תקין, אחרת סיבה בעברית */
export function userProblem(raw) {
  const u = normalizeUser(raw);
  if (!u) return "לא הוזן שם משתמש";
  if (u.length < 3) return "שם המשתמש קצר מדי — לפחות שלושה תווים";
  if (u.length > 24) return "שם המשתמש ארוך מדי";
  if (!USER_RE.test(u)) return "שם המשתמש יכול להכיל אותיות, ספרות, נקודה וקו תחתון";
  /* ⚠ שם משתמש שנראה כמו תעודת זהות מבלבל בין הזמני לקבוע */
  if (/^\d{9}$/.test(u)) return "שם המשתמש אינו יכול להיות תעודת זהות";
  return null;
}

/* ============================================================
   סיסמה
   ------------------------------------------------------------
   ⚠ שמונה תווים ולא יותר דרישות. כללי מורכבות ("אות גדולה,
     ספרה, תו מיוחד") מייצרים "Aa123456!" אצל כולם ומעודדים
     לכתוב את הסיסמה על פתק. אורך הוא מה שבאמת קובע.

   ⚠ מה שכן נחסם: הסיסמאות שמנחשים ראשונות, ותעודת הזהות של
     המשתמש עצמו — שהיא ברירת המחדל שממנה הוא בא.
   ============================================================ */
const COMMON = new Set([
  "12345678", "123456789", "password", "qwertyui", "11111111", "00000000",
  "abcd1234", "1234abcd", "iloveyou", "87654321", "qwerty123", "123123123",
]);

export function passwordProblem(raw, { tz = "", user = "" } = {}) {
  const p = String(raw || "");
  if (!p) return "לא הוזנה סיסמה";
  if (p.length < 8) return "הסיסמה קצרה מדי — לפחות שמונה תווים";
  if (p.length > 128) return "הסיסמה ארוכה מדי";
  if (COMMON.has(p.toLowerCase())) return "הסיסמה הזו נפוצה מדי. בחרו אחרת";
  if (tz && p.replace(/\D/g, "") === String(tz)) {
    return "אי אפשר להשאיר את תעודת הזהות כסיסמה";
  }
  if (user && p.toLowerCase() === normalizeUser(user)) {
    return "הסיסמה אינה יכולה להיות שם המשתמש";
  }
  return null;
}

/* ============================================================
   אסימון איפוס
   ------------------------------------------------------------
   ⚠ האסימון עצמו נשלח למשתמש; בלוח נשמר **גיבוב שלו** ותאריך
     תפוגה. מי שקורא את הלוח אינו יכול להתחזות למשתמש.

   ⚠ SHA-256 ולא scrypt כאן, וזה בכוונה: האסימון הוא 32 בתים
     אקראיים ואי אפשר לנחש אותו במתקפת מילון, ולכן ההאטה
     המכוונת מיותרת — והיא כן הייתה מאטה כל בדיקה.
   ============================================================ */
export const RESET_MINUTES = 60;

export const newResetToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = (t) =>
  crypto.createHash("sha256").update(String(t)).digest("base64");

/** "hash|expiryISO" — עמודה אחת ולא שתיים */
export const packReset = (token, now = new Date()) =>
  `${hashToken(token)}|${new Date(now.getTime() + RESET_MINUTES * 60_000).toISOString()}`;

/** האם האסימון תואם ובתוקף */
export function resetMatches(token, stored, now = new Date()) {
  const [hash, exp] = String(stored || "").split("|");
  if (!hash || !exp) return false;
  if (new Date(exp) < now) return false;
  const want = Buffer.from(hash, "base64");
  const got = Buffer.from(hashToken(token), "base64");
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

/* ============================================================
   קוד מסירה ידנית
   ------------------------------------------------------------
   ⚠ כשאין שירות דואר מוגדר, האיפוס אינו נעלם — הוא הופך לקוד
     בן שש ספרות שהמנהל מוסר לחניך פנים אל פנים. זה פחות נוח
     ובדיוק באותה מידה בטוח, כי המסירה היא לאדם שמזוהה בעיניים.

   ⚠ הקוד נשמר מגובב בדיוק כמו האסימון.
   ============================================================ */
export const newHandCode = () =>
  String(crypto.randomInt(100000, 1000000));
