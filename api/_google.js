/* ============================================================
   חיבור ל-Google Sheets — חשבון שירות, בלי ספרייה חיצונית
   ------------------------------------------------------------
   ⚠ **בלי `googleapis`.** הספרייה הרשמית שוקלת עשרות מגה-בייט
     ומושכת עשרות תלויות, וכל מה שצריך ממנה כאן הוא לחתום JWT
     ולקרוא ל-REST. החתימה נעשית עם `node:crypto` המובנה.
     nodemailer נשארת התלות החיצונית היחידה בפרויקט.

   ⚠ **שני מסלולי אימות, ולא במקרה.**

     1. **חשבון שירות** — זהות שלא פגה, קוראת **וכותבת** לגיליון
        ששותף איתה ספציפית. זה המסלול המועדף.

     2. **מפתח API** — קורא **בלבד**, ורק גיליונות שהוגדרו
        "כל מי שיש לו קישור". נוסף אחרי ש-Google חסמה יצירת
        מפתחות חשבון שירות ברמת הארגון
        (`iam.disableServiceAccountKeyCreation`), חסימה שהיא
        מפעילה כברירת מחדל בחשבונות Workspace חדשים.
        **המדיניות הזו אינה חלה על מפתחות API.**

     ⚠ המחיר של מסלול 2 הוא אמיתי ומוצהר: גיליון "כל מי שיש
       לו קישור" נגיש לכל מי שהקישור הגיע אליו, גם אם איש לא
       הפיץ אותו. המכינה בחרה בזה במודע.

   ⚠ חשבון שירות **גובר** כששניהם מוגדרים — הוא צר יותר.

   ⚠ **המפתח הפרטי הוא סוד מלא.** מי שמחזיק אותו מתחזה לחשבון
     השירות בכל גיליון ששותף איתו. הוא חי ב-GOOGLE_SA_KEY
     שבסביבה בלבד — לא בקוד, לא בקומיט, ולא בתשובת API.

   ⚠ **צד שרת בלבד.** אין לייבא מ-src/, בדיוק כמו _monday.js.
   ============================================================ */

import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

/* ⚠ ההרשאה הצרה ביותר שמאפשרת קריאה **וכתיבה** לגיליונות
   ששותפו. אין כאן drive.readonly ואין drive מלא — חשבון
   השירות אינו אמור לראות את הדרייב, רק את מה ששיתפו איתו. */
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const b64url = (buf) =>
  Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * פרטי חשבון השירות מהסביבה.
 * ⚠ מחזירה null ולא זורקת: מערכת בלי חיבור לגוגל היא מצב
 *   תקין, ולא תקלה. מי שקורא בודק ומדווח "טרם חובר".
 */
export function serviceAccount() {
  const raw = process.env.GOOGLE_SA_KEY;
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j.client_email || !j.private_key) return null;
    /* ⚠ משתני סביבה ב-Vercel נשמרים לעיתים עם \n כשני תווים.
       בלי ההמרה הזו החתימה נכשלת בהודעה בלתי קריאה. */
    return { email: j.client_email, key: String(j.private_key).replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

/**
 * מפתח API — קריאה בלבד, לגיליונות ציבוריים.
 * ⚠ הוא אינו סוד ברמת המפתח הפרטי, אבל הוא כן צורך מכסה
 *   ומאפשר קריאה של כל גיליון ציבורי. מקומו בסביבה.
 */
export const apiKey = () => process.env.GOOGLE_API_KEY || null;

/** "service" (קריאה וכתיבה) · "key" (קריאה בלבד) · null */
export function authMode() {
  if (serviceAccount()) return "service";
  if (apiKey()) return "key";
  return null;
}

/** האם החיבור מוגדר בכלל */
export const googleReady = () => authMode() !== null;

/** ⚠ כתיבה אפשרית רק עם חשבון שירות. */
export const canWrite = () => authMode() === "service";

/* ============================================================
   האסימון
   ------------------------------------------------------------
   ⚠ נשמר במטמון עד דקה לפני שהוא פג. אסימון חדש לכל קריאה
     היה מוסיף סיבוב רשת שלם לכל פעולה, ואסימון שנשמר עד
     לרגע הפקיעה נכשל בדיוק כשהשעונים אינם מסונכרנים.
   ============================================================ */
let cached = { token: null, exp: 0 };

export async function accessToken() {
  const sa = serviceAccount();
  if (!sa) throw new Error("החיבור ל-Google Sheets טרם הוגדר");

  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.exp > now + 60) return cached.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(sa.key))}`;

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) {
    /* ⚠ שגיאת גוגל כלשונה. "החיבור נכשל" לבדו הוא בדיוק סוג
       ההודעה שמשאירה אותנו לנחש שעה. */
    throw new Error(`Google לא הנפיקה אסימון: ${d.error_description || d.error || r.status}`);
  }
  cached = { token: d.access_token, exp: now + (Number(d.expires_in) || 3600) };
  return cached.token;
}

/* ============================================================
   קריאה וכתיבה
   ============================================================ */

async function call(path, { method = "GET", body, params } = {}) {
  const mode = authMode();
  if (!mode) throw new Error("החיבור ל-Google Sheets טרם הוגדר");

  /* ⚠ כתיבה עם מפתח API נכשלת אצל גוגל בשגיאה שאינה מסבירה
     דבר. עדיף להיעצר כאן ולומר למה. */
  if (mode === "key" && method !== "GET") {
    throw new Error(
      "מפתח API מאפשר קריאה בלבד. כתיבה לגיליון דורשת חשבון שירות");
  }

  const p = { ...(params || {}) };
  let auth = {};
  if (mode === "service") {
    auth = { Authorization: `Bearer ${await accessToken()}` };
  } else {
    p.key = apiKey();
  }

  const qs = Object.keys(p).length ? "?" + new URLSearchParams(p) : "";
  const r = await fetch(`${SHEETS}/${path}${qs}`, {
    method,
    headers: { ...auth, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = d.error?.message || `שגיאה ${r.status}`;
    /* ⚠ 403 כאן פירושו כמעט תמיד "הגיליון לא שותף עם חשבון
       השירות", וזו הטעות הראשונה של כל מי שמחבר גיליון. */
    if (r.status === 403 || r.status === 404) {
      /* ⚠ אותה שגיאה מגוגל, שתי סיבות שונות לגמרי — ולכן שתי
         הודעות שונות. במסלול המפתח הבעיה כמעט תמיד היא שהגיליון
         אינו ציבורי; במסלול חשבון השירות — שלא שותף איתו. */
      const sa = serviceAccount();
      throw new Error(sa
        ? `${msg} — ודאו שהגיליון שותף עם ${sa.email} בהרשאת עריכה`
        : `${msg} — ודאו שהגיליון מוגדר "כל מי שיש לו הקישור" (צפייה)`);
    }
    throw new Error(msg);
  }
  return d;
}

/**
 * מזהה הגיליון מתוך כתובת מלאה או מזהה חשוף.
 * ⚠ אנשים מדביקים את הכתובת מהדפדפן, לא את המזהה. דרישה
 *   למזהה בלבד הייתה שולחת אותם לחפש איפה הוא נמצא.
 */
export function sheetId(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(s) ? s : null;
}

/** שמות הלשוניות בגיליון, וכותרתו */
export async function sheetMeta(id) {
  const d = await call(id, { params: { fields: "properties.title,sheets.properties" } });
  return {
    title: d.properties?.title || "",
    tabs: (d.sheets || []).map((s) => ({
      title: s.properties?.title || "",
      rows: s.properties?.gridProperties?.rowCount ?? null,
      cols: s.properties?.gridProperties?.columnCount ?? null,
    })),
  };
}

/**
 * קריאת טווח → מערך שורות של מחרוזות.
 * ⚠ גוגל **מקצרת שורות**: שורה שנגמרת בתאים ריקים מוחזרת
 *   קצרה יותר מהאחרות. בלי הריפוד כאן, כל קורא היה נופל על
 *   `undefined` בעמודה האחרונה — וזה באג שמופיע רק כשהתא ריק.
 */
export async function readRange(id, range) {
  const d = await call(`${id}/values/${encodeURIComponent(range)}`, {
    params: { majorDimension: "ROWS", valueRenderOption: "UNFORMATTED_VALUE" },
  });
  const rows = d.values || [];
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return rows.map((r) => {
    const out = r.map((c) => (c == null ? "" : String(c)));
    while (out.length < width) out.push("");
    return out;
  });
}

/* ============================================================
   קריאת לשונית **עם המבנה והצבעים**
   ------------------------------------------------------------
   ⚠ `readRange` מחזירה ערכים בלבד, וזה לא מספיק לגאנט: שם
     **המשמעות יושבת בצבע ובמיזוג**. אירוע רב-יומי הוא תא
     ממוזג, וסוג האירוע (חג, שבת, סמינר) נבדל בצבע הרקע בלבד.
     בלי הקריאה הזו כל אירוע היה נראה כיום בודד חסר סוג.

   ⚠ `includeGridData` מחזירה הרבה, ולכן מבקשים **רק** את
     השדות הדרושים. בלי המסנן התשובה על גיליון של 998 שורות
     היא מגה-בייטים.
   ============================================================ */
export async function readGrid(id, tabTitle) {
  const d = await call(id, {
    params: {
      ranges: tabTitle,
      includeGridData: "true",
      fields: "sheets(properties(title,sheetId),merges,"
        + "data(rowData(values(formattedValue,effectiveFormat(backgroundColor)))))",
    },
  });
  const sh = (d.sheets || [])[0];
  if (!sh) throw new Error(`הלשונית "${tabTitle}" אינה קיימת בגיליון`);

  const rowData = sh.data?.[0]?.rowData || [];
  const rows = rowData.map((r) => (r.values || []).map((c) => c.formattedValue ?? ""));
  const colors = rowData.map((r) => (r.values || []).map((c) => {
    const bg = c.effectiveFormat?.backgroundColor;
    if (!bg) return null;
    const to = (x) => Math.round((x || 0) * 255);
    /* ⚠ לבן הוא "בלי צבע" ולא צבע. גוגל מחזירה לבן לכל תא. */
    const hex = `#${[to(bg.red), to(bg.green), to(bg.blue)]
      .map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    return hex === "#FFFFFF" ? null : hex;
  }));
  /* ⚠ A1 ולא אינדקסים — אותה צורה שהפרסר מקבל מקובץ מומר. */
  const merges = (sh.merges || []).map((m) => ({
    r1: m.startRowIndex, c1: m.startColumnIndex,
    r2: m.endRowIndex - 1, c2: m.endColumnIndex - 1,
  }));
  return { title: sh.properties?.title || tabTitle, rows, colors, merges };
}

/**
 * כתיבת טווח.
 * ⚠ `RAW` ולא `USER_ENTERED`: טקסט שמתחיל ב-= היה הופך
 *   לנוסחה, ומחרוזת כמו "1/9" הייתה הופכת לתאריך בפורמט
 *   אמריקאי. אנחנו כותבים נתונים, לא קלט מקלדת.
 */
export async function writeRange(id, range, rows) {
  return call(`${id}/values/${encodeURIComponent(range)}`, {
    method: "PUT",
    params: { valueInputOption: "RAW" },
    body: { range, majorDimension: "ROWS", values: rows },
  });
}

/** הוספת שורות בסוף הלשונית */
export async function appendRows(id, range, rows) {
  return call(`${id}/values/${encodeURIComponent(range)}:append`, {
    method: "POST",
    params: { valueInputOption: "RAW", insertDataOption: "INSERT_ROWS" },
    body: { majorDimension: "ROWS", values: rows },
  });
}

/**
 * `batchUpdate` — כל שינוי מבני או עיצובי בגיליון.
 * ⚠ **הבקשות מתבצעות לפי סדרן ובאטומיות**: או שכולן עברו או
 *   שאף אחת לא. זו הסיבה שכל החוברת נשלחת בקריאה אחת ולא
 *   גיליון-גיליון — כשל באמצע היה משאיר חוברת חצי בנויה.
 *
 * ⚠ גוגל מגבילה גודל בקשה. חוברת גדולה מפוצלת על ידי הקורא
 *   לקבוצות, וכל קבוצה עדיין אטומית בפני עצמה.
 */
export async function batchUpdate(id, requests) {
  if (!requests.length) return { replies: [] };
  return call(`${id}:batchUpdate`, { method: "POST", body: { requests } });
}

/**
 * מוודא שקיימות לשוניות בשמות המבוקשים, ומחזיר שם → מזהה.
 * ⚠ **לשונית שאינה ברשימה אינה נמחקת.** מי שהוסיף לעצמו
 *   לשונית בחוברת לא אמור לגלות שהיא נעלמה כי הריצה הבאה לא
 *   הכירה אותה. עודפות מדווחות ולא נוגעים בהן.
 */
export async function ensureTabs(id, titles) {
  const meta = await sheetMeta(id);
  const have = new Map();
  const full = await call(id, { params: { fields: "sheets.properties(sheetId,title)" } });
  for (const s of full.sheets || []) {
    have.set(s.properties.title, s.properties.sheetId);
  }
  const missing = titles.filter((t) => !have.has(t));
  if (missing.length) {
    const r = await batchUpdate(id, missing.map((title) => ({ addSheet: { properties: { title } } })));
    (r.replies || []).forEach((rep, i) => {
      if (rep.addSheet) have.set(missing[i], rep.addSheet.properties.sheetId);
    });
  }
  return {
    ids: Object.fromEntries(titles.map((t) => [t, have.get(t)])),
    extra: [...have.keys()].filter((t) => !titles.includes(t)),
    title: meta.title,
  };
}

/** ניקוי טווח — לכתיבה מחדש של דוח שלם */
export async function clearRange(id, range) {
  return call(`${id}/values/${encodeURIComponent(range)}:clear`, { method: "POST" });
}

/**
 * מצב החיבור, לאבחון במסך.
 * ⚠ **אינו מחזיר את המפתח ואף לא חלק ממנו** — רק את כתובת
 *   חשבון השירות, שאותה ממילא צריך כדי לשתף גיליון.
 */
export function googleStatus() {
  const mode = authMode();
  if (mode === "service") {
    return { ready: true, mode, account: serviceAccount().email, canWrite: true };
  }
  if (mode === "key") {
    /* ⚠ המפתח עצמו **אינו** מוחזר, גם לא חלקית. */
    return {
      ready: true, mode, account: null, canWrite: false,
      note: "מפתח API — קריאה בלבד, מגיליונות המוגדרים \"כל מי שיש לו הקישור\"",
    };
  }
  return {
    ready: false, mode: null, account: null, canWrite: false,
    hint: "חסר GOOGLE_SA_KEY או GOOGLE_API_KEY במשתני הסביבה",
  };
}
