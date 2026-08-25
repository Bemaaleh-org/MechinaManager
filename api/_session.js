/* ============================================================
   אימות וסשן — צד שרת בלבד
   ------------------------------------------------------------
   הסשן הוא עוגייה חתומה, בלי מאגר בצד השרת: פונקציות ב-Vercel
   חסרות זיכרון בין בקשות ואין בסיס נתונים. מאגר sessions היה
   מחייב כתיבה ל-monday בכל התחברות וקריאה בכל בקשה.

   ⚠ הקוד עצמו לעולם לא נכנס לעוגייה. נשמרת בה רק טביעת אצבע
     (HMAC) — ממנה אי אפשר לשחזר קוד.

   ⚠ סיבוב קוד מנתק מיד: בכל בקשה משווים את טביעת האצבע שבעוגייה
     לקוד הנוכחי באותה שורה בלוח. הוחלף הקוד, השורה כובתה או
     נמחקה — הסשן נפסל.

   המטמון: 30 שניות. כלומר "מיד" בפועל הוא "עד חצי דקה", וזו
   פשרה מודעת מול תוספת של 200–400ms לכל בקשה.
   ============================================================ */

import crypto from "node:crypto";
import { gql } from "./_monday.js";
import { AUTH_BOARD, AUTH_COLS, KIND } from "../shared/auth-board.js";
import { cached } from "./_cache.js";
import { studentRows } from "./_student-rows.js";
import { ROLE_CONTAINER, ROLE_KITCHEN, ROLE_SAFETY, ROLE_HOUSE } from "../shared/lessons-boards.js";
import { leadersForDate } from "./_leader-weeks.js";
import { parseTestDate } from "./_test-date.js";

const COOKIE = "mk_session";
const TTL_DAYS = 7;
const REFRESH_WHEN_LEFT_MS = 6 * 24 * 60 * 60 * 1000; // מרעננים כשנשאר פחות מ-6 ימים

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET חסר או קצר מדי");
  return s;
}

const b64 = (buf) => Buffer.from(buf).toString("base64url");
const hmac = (data) => crypto.createHmac("sha256", secret()).update(data).digest();

/** טביעת אצבע של קוד — קצרה, חד־כיוונית */
export const fingerprint = (code) => b64(hmac("code:" + code)).slice(0, 22);

/* ---------- מטמון לוח המשתמשים ---------- */
export async function authRows({ force = false } = {}) {
  return cached("auth-rows", async () => {
    const cols = JSON.stringify([AUTH_COLS.kind, AUTH_COLS.code, AUTH_COLS.active]);
    const d = await gql(
      `{ boards(ids:[${AUTH_BOARD}]){ items_page(limit:500){ items {
           id name column_values(ids:${cols}){ id text } } } } }`
    );
    const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
    return d.boards[0].items_page.items.map((i) => ({
      id: String(i.id),
      name: i.name,
      kind: val(i, AUTH_COLS.kind),
      code: val(i, AUTH_COLS.code),
      active: val(i, AUTH_COLS.active) === "v",
    }));
  }, { force });
}

/** רשימת החניכים הפעילים — שמות בלבד, בלי קודים */
export async function traineeRoster() {
  const rows = await authRows();
  return rows
    .filter((r) => r.kind === KIND.trainee && r.active)
    .map((r) => ({ id: r.id, name: r.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "he", { numeric: true }));
}

/* ---------- עוגייה חתומה ---------- */
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  return body + "." + b64(hmac(body));
}

function unsign(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expect = b64(hmac(body));
  // השוואה בזמן קבוע, כדי לא לדלוף מידע דרך זמן התגובה
  if (sig.length !== expect.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const readCookie = (req) => {
  const raw = req.headers?.cookie || "";
  const hit = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE + "="));
  return hit ? decodeURIComponent(hit.slice(COOKIE.length + 1)) : null;
};

export function setSession(res, payload) {
  const exp = Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000;
  const token = sign({ ...payload, v: 1, exp });
  const secure = process.env.VERCEL ? "; Secure" : ""; // בפיתוח מקומי אין https
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_DAYS * 86400}${secure}`
  );
  return exp;
}

export function clearSession(res) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

/* ---------- אימות בקשה ---------- */
export class AuthError extends Error {
  constructor(message, code = 401) {
    super(message);
    this.status = code;
  }
}

/**
 * מחזיר את הסשן המאומת, או זורק AuthError.
 * ⚠ זו הפונקציה שכל נקודות הקצה נשענות עליה. השרת קובע כאן
 *   מי המשתמש — לא מה שהדפדפן שולח בגוף הבקשה.
 */
export async function requireAuth(req, res) {
  const payload = unsign(readCookie(req));
  if (!payload) throw new AuthError("נדרשת כניסה מחדש");
  if (!payload.exp || payload.exp < Date.now()) throw new AuthError("תוקף הכניסה פג");

  /* ---------- חניך: לוח אחר, אותם כללים ----------
     ⚠ החניך אינו יושב בלוח ההרשאות אלא בלוח החניכים של המכינה,
       ולכן הענף הזה מקדים את השליפה מ-authRows. שכבת הקודים של
       המטבח לא נוגעת בו ולא מושפעת ממנו.

     ⚠ אותה התחייבות כמו במטבח: שינוי בלוח מנתק מיד. כובה
       "פעיל", השורה נמחקה או שהת"ז תוקנה — הסשן נפסל. */
  if (payload.kind === "student") {
    const row = (await studentRows()).find((r) => r.id === payload.itemId);
    if (!row) throw new AuthError("ההרשאה בוטלה");
    if (!row.active) throw new AuthError("החניך אינו רשום כפעיל");
    if (!row.tz || fingerprint(row.tz) !== payload.cfp) {
      throw new AuthError("פרטי הכניסה השתנו – נדרשת כניסה מחדש");
    }

    if (res && payload.exp - Date.now() < REFRESH_WHEN_LEFT_MS) {
      setSession(res, { kind: "student", itemId: row.id, name: row.name, cfp: payload.cfp });
    }

    /* ⚠ "מוביל שבוע" נגזר משיבוץ השבועות: חניך משובץ לשבוע
       שהיום בטווחו הוא מוביל — השבוע הזה בלבד. הסימון הידני
       בלוח החניכים נשאר כעוקף חירום (OR). ‎?today=‎ עובר דרך
       parseTestDate ולכן חסום בכל דיפלוי, כמו בכל המערכת. */
    const testAt = parseTestDate(req?.query?.today);
    const todayIso = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(testAt || new Date());
    let scheduled = false;
    try { scheduled = (await leadersForDate(todayIso)).includes(row.id); }
    catch { /* כשל בשליפת השיבוץ לא מפיל את הכניסה — נשאר העוקף הידני */ }

    return {
      kind: "student",
      itemId: row.id,
      name: row.name, // ⚠ מאומת מול הלוח, לא מוצהר כמו אצל תורן
      isManager: false,
      isStudent: true,
      isLeader: scheduled || row.leader,
      roles: row.roles || [],
      /* ⚠ אחראי לו״ז — התפקיד היחיד שפותח מסך. נקרא טרי מהלוח
         בכל בקשה, ולכן הסרת התפקיד סוגרת את הגישה מיד. */
      isScheduler: Boolean(row.isScheduler),
      isContainer: (row.roles || []).includes(ROLE_CONTAINER),
      isKitchen: (row.roles || []).includes(ROLE_KITCHEN),
      isSafety: (row.roles || []).includes(ROLE_SAFETY),
      isHouse: (row.roles || []).includes(ROLE_HOUSE),
    };
  }

  const rows = await authRows();
  const row = rows.find((r) => r.id === payload.itemId);

  if (!row) throw new AuthError("ההרשאה בוטלה");
  if (!row.active) throw new AuthError("ההרשאה כובתה");
  if (!row.code || fingerprint(row.code) !== payload.cfp) throw new AuthError("הקוד הוחלף – נדרשת כניסה מחדש");

  // חידוש מתגלגל: מאריכים כשנשאר פחות מ-6 ימים, לא בכל בקשה
  if (res && payload.exp - Date.now() < REFRESH_WHEN_LEFT_MS) {
    setSession(res, { kind: payload.kind, itemId: payload.itemId, name: payload.name, cfp: payload.cfp });
  }

  return {
    kind: payload.kind, // "manager" | "trainee"
    itemId: payload.itemId,
    name: payload.name || null, // אצל תורן: השם שבחר. מוצהר, לא מאומת.
    isManager: payload.kind === "manager",
    isStudent: false,
    isLeader: false,
    roles: [],
    isScheduler: false,
    isContainer: false,
    isKitchen: false,
    isSafety: false,
    isHouse: false,
  };
}

/**
 * השם שיירשם ב"דווח על ידי" / "אושר על ידי".
 * מנהל — שמו לפי הקוד האישי, מאומת.
 * חניך — השם שבחר מהרשימה. מוצהר ולא מאומת, ומשמש לתפעול בלבד.
 */
export const actorName = (session) => session?.name || "תורן";

/** פעולה שמותרת למנהל בלבד */
export async function requireManager(req, res) {
  const s = await requireAuth(req, res);
  if (!s.isManager) throw new AuthError("הפעולה מותרת למנהל בלבד", 403);
  return s;
}

/**
 * עוטף handler: מאמת, ומחזיר 401/403 מסודר במקום להתפוצץ.
 *
 *   withAuth(h)                    מטבח — תורן או מנהל. ⚠ חניך נדחה.
 *   withAuth(h, {manager:true})    מנהל בלבד.
 *   withAuth(h, {student:true})    כל מי שמחובר, כולל חניך.
 *   withAuth(h, {marker:true})     מנהל או מוביל שבוע.
 *   withAuth(h, {scheduler:true})  מנהל, אחראי לו״ז או מוביל שבוע.
 *   withAuth(h, {container:true})  מנהל או אחראי מכולה.
 *   withAuth(h, {safety:true})     מנהל או אחראי בטיחות.
 *   withAuth(h, {house:true})      מנהל או אב בית.
 *
 * ⚠ ברירת המחדל דוחה חניכים, ולא במקרה. 19 נקודות הקצה של המטבח
 *   נכתבו כשהמחוברים היחידים היו תורנים ומנהלים. אילו ברירת
 *   המחדל הייתה מתירה, הוספת החניכים הייתה פותחת להם את המלאי,
 *   הרשימות והדיווחים בבת אחת — בלי ששורה אחת בקבצים ההם השתנתה.
 *   פתיחה לחניך היא החלטה מפורשת לכל נקודת קצה בנפרד.
 */
export function withAuth(
  handler,
  { manager = false, marker = false, student = false, scheduler = false, container = false, safety = false, house = false, kitchen = false } = {}
) {
  return async (req, res) => {
    let session;
    try {
      session = await requireAuth(req, res);

      if (manager && !session.isManager) {
        throw new AuthError("הפעולה מותרת למנהל בלבד", 403);
      }
      if (marker && !session.isManager && !session.isLeader) {
        throw new AuthError("הפעולה מותרת למנהל או למוביל שבוע בלבד", 403);
      }
      /* ⚠ מובילי השבוע נוספו להרשאת השיעורים בהחלטת המכינה:
         דיווח קיום מפגשים והעלאת חוות דעת מוטלים עליהם. */
      if (scheduler && !session.isManager && !session.isScheduler && !session.isLeader) {
        throw new AuthError("הפעולה מותרת לצוות, לאחראי הלו״ז או למוביל שבוע", 403);
      }
      if (container && !session.isManager && !session.isContainer) {
        throw new AuthError("הפעולה מותרת למנהל או לאחראי המכולה בלבד", 403);
      }
      if (safety && !session.isManager && !session.isSafety) {
        throw new AuthError("הפעולה מותרת למנהל או לאחראי הבטיחות בלבד", 403);
      }
      if (house && !session.isManager && !session.isHouse) {
        throw new AuthError("הפעולה מותרת למנהל או לאב הבית בלבד", 403);
      }
      if (kitchen && !session.isManager && !session.isKitchen) {
        throw new AuthError("הפעולה מותרת למנהל או לאחראי המטבח בלבד", 403);
      }
      if (!manager && !marker && !student && !scheduler && !container && !safety && !house && !kitchen && session.isStudent) {
        throw new AuthError("הפעולה אינה זמינה לחניכים", 403);
      }
    } catch (e) {
      const status = e instanceof AuthError ? e.status : 500;
      return res.status(status).json({ error: e.message, authRequired: status === 401 });
    }
    return handler(req, res, session);
  };
}

/* ---------- השהיה גוברת ---------- */
/* ⚠ המונה יושב בזיכרון של מופע השרת. Vercel עשויה להריץ כמה
   מופעים, ותוקף שמפזר ניסיונות ביניהם נהנה מהגנה חלשה יותר.
   הגנה מלאה דורשת מאגר משותף שאין לנו. */
const attempts = new Map();
const MAX_FAILS = 10;
const LOCK_MS = 10 * 60 * 1000;

export function attemptKey(req) {
  const fwd = req.headers?.["x-forwarded-for"];
  return (Array.isArray(fwd) ? fwd[0] : fwd || "").split(",")[0].trim() ||
         req.socket?.remoteAddress || "unknown";
}

export function checkThrottle(key) {
  const rec = attempts.get(key);
  if (rec?.lockedUntil && rec.lockedUntil > Date.now()) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    throw new AuthError(`יותר מדי ניסיונות. נסו שוב בעוד ${mins} דקות`, 429);
  }
  return rec?.fails || 0;
}

export async function penalize(key) {
  const rec = attempts.get(key) || { fails: 0 };
  rec.fails++;
  if (rec.fails >= MAX_FAILS) rec.lockedUntil = Date.now() + LOCK_MS;
  attempts.set(key, rec);
  // 250ms, 500ms, 1s… עד 8 שניות
  await new Promise((r) => setTimeout(r, Math.min(250 * 2 ** (rec.fails - 1), 8000)));
}

export function clearAttempts(key) {
  attempts.delete(key);
}

/** השוואת קודים בזמן קבוע */
export function codeMatches(given, actual) {
  if (!given || !actual) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(actual));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export { KIND };
