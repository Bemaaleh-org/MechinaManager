/* ============================================================
   התראות דחיפה לטלפון

     POST   ?action=push { subscription }   הרשמה למכשיר הזה
     DELETE ?action=push { endpoint }       ביטול
     GET    ?action=push                    המפתח הציבורי והמצב

   ------------------------------------------------------------
   ⚠⚠ **דחיפה בלי תוכן — "נקישה" ולא הודעה.**

   זו ההחלטה המרכזית כאן, והיא גם הפשוטה וגם הבטוחה יותר:

   הדחיפה שנשלחת **ריקה**. ה-Service Worker מקבל אותה, פונה
   בעצמו ל-`?action=notify` עם העוגייה של המשתמש, ומציג את מה
   שמצא. המשמעות:

     · **שום נתון של חניך אינו עובר דרך גוגל או אפל.** בדחיפה
       עם תוכן, גוף ההודעה עובר בשרתי שירות הדחיפה — מוצפן,
       אבל עובר. כאן לא עובר דבר מלבד "יש משהו חדש".
     · **ואין הצפנת מטען.** דחיפה עם תוכן דורשת ECDH + HKDF +
       aes128gcm — כמאה וחמישים שורות של קריפטוגרפיה עדינה
       שכל טעות בה נכשלת בשקט. בלי מטען צריך רק את חתימת
       ה-VAPID.

   ⚠ **ואין ספק חיצוני.** זה ההבדל מהמייל: אין חשבון, אין
     תשלום, ואין דומיין לאמת. זוג מפתחות שנוצר מקומית
     (`tools/seed-push.mjs`) הוא כל מה שצריך.

   ⚠ **iOS דורש שהאפליקציה תותקן למסך הבית.** אפל אינה מאפשרת
     דחיפה לאתר בלשונית סאפרי — רק ל-PWA מותקן, מ-iOS 16.4.
     המניפסט כבר קיים, ולכן ההתקנה עובדת; המסך אומר את זה
     במפורש, כי משתמש שיאשר ולא יקבל דבר יסיק שהמערכת שבורה.

   ⚠ **מנוי הוא של מכשיר ולא של אדם.** אותו חניך בטלפון
     ובמחשב הם שני מנויים, ולכן זו רשימה ולא ערך.

   ⚠ **מנוי שפג נמחק מעצמו.** שירות הדחיפה מחזיר 404 או 410
     על מנוי שכבר אינו תקף, וזו התשובה היחידה שאפשר לפעול
     לפיה: המכשיר נמחק את האפליקציה או ניקה נתונים.
   ============================================================ */

import crypto from "node:crypto";
import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { boardColumn } from "./_board-col.js";
import { AUTH_BOARD } from "../shared/auth-board.js";
import { MECHINA_BOARDS } from "../shared/mechina-boards.js";

const COL_TITLE = "מנויי דחיפה";
const b64url = (b) => Buffer.from(b).toString("base64url");

export const pushReady = () =>
  Boolean(process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE);

/* ============================================================
   חתימת VAPID
   ------------------------------------------------------------
   ⚠ **חתימת ES256 של node היא DER, ו-JWT דורש r|s גולמי.**
     שליחת ה-DER כמות שהוא מתקבלת בשקט על ידי חלק משירותי
     הדחיפה ונדחית על ידי אחרים — כלומר תקלה שמופיעה רק אצל
     חלק מהמשתמשים. `dsaEncoding: "ieee-p1363"` מבקש את הפורמט
     הנכון מלכתחילה.
   ============================================================ */
function vapidHeader(endpoint) {
  const aud = new URL(endpoint).origin;
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const body = b64url(JSON.stringify({
    aud,
    /* ⚠ תוקף קצר. אסימון ארוך שדולף הוא אסימון שאפשר לדחוף
       איתו התראות בשמנו במשך שבוע. */
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: process.env.VAPID_SUBJECT || "mailto:achim@bemaaleh.com",
  }));

  const key = crypto.createPrivateKey({
    key: Buffer.from(process.env.VAPID_PRIVATE, "base64url"),
    format: "der", type: "pkcs8",
  });
  const sig = crypto.sign("sha256", Buffer.from(`${header}.${body}`),
    { key, dsaEncoding: "ieee-p1363" });

  return {
    Authorization: `vapid t=${header}.${body}.${b64url(sig)}, k=${process.env.VAPID_PUBLIC}`,
  };
}

/**
 * שולח נקישה למנוי אחד.
 * @returns {Promise<"ok"|"gone"|"fail">}
 *   ⚠ "gone" הוא תשובה שאפשר לפעול לפיה — המנוי נמחק.
 */
export async function pushTo(sub) {
  if (!pushReady() || !sub || !sub.endpoint) return "fail";
  try {
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        ...vapidHeader(sub.endpoint),
        TTL: "3600",
        /* ⚠ בלי גוף — ולכן גם בלי Content-Encoding. */
        "Content-Length": "0",
        Urgency: "normal",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404 || r.status === 410) return "gone";
    return r.ok ? "ok" : "fail";
  } catch (e) {
    console.error("[push:send]", e && e.message);
    return "fail";
  }
}

/* ---------- אחסון המנויים ---------- */

const boardFor = (session) => session.isStudent ? MECHINA_BOARDS.roster : AUTH_BOARD;

async function readSubs(session) {
  const board = boardFor(session);
  const col = await boardColumn(board, COL_TITLE, "long_text");
  if (!col) return { board, col: null, list: [] };
  const d = await gql(
    `query($b:[ID!],$i:[ID!]){ boards(ids:$b){ items_page(query_params:{ids:$i}, limit:1){
       items{ id column_values(ids:[${JSON.stringify(col)}]){ id text } } } } }`,
    { b: [board], i: [String(session.itemId)] });
  const item = d.boards?.[0]?.items_page?.items?.[0];
  const raw = item?.column_values?.[0]?.text || "";
  let list = [];
  /* ⚠ תוכן פגום אינו מפיל — הוא נקרא כרשימה ריקה. שורה שמישהו
     ערך ביד ב-monday לא אמורה לשבור התראות. */
  try { const p = JSON.parse(raw); if (Array.isArray(p)) list = p; } catch { /* ריק */ }
  return { board, col, list };
}

async function writeSubs(board, col, itemId, list) {
  await gql(
    `mutation($b:ID!,$i:ID!,$v:JSON!){
       change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,
                                     create_labels_if_missing:false){ id } }`,
    { b: board, i: String(itemId), v: JSON.stringify({ [col]: JSON.stringify(list) }) });
}

/** כל המנויים של משתמש, לשליחה. מנוי שפג נמחק. */
export async function pushToUser(session) {
  const { board, col, list } = await readSubs(session);
  if (!col || !list.length) return { sent: 0, dropped: 0 };
  let sent = 0;
  const alive = [];
  for (const s of list) {
    const res = await pushTo(s);
    if (res === "ok") { sent++; alive.push(s); }
    else if (res !== "gone") alive.push(s);
  }
  const dropped = list.length - alive.length;
  if (dropped) await writeSubs(board, col, session.itemId, alive);
  return { sent, dropped };
}

async function handler(req, res, session) {
  try {
    if (req.method === "GET") {
      const { list } = pushReady() ? await readSubs(session) : { list: [] };
      return res.status(200).json({
        /* ⚠ עיקרון 6: "לא הוגדר" שונה מ"לא נרשמת". */
        ready: pushReady(),
        publicKey: pushReady() ? process.env.VAPID_PUBLIC : null,
        devices: list.length,
      });
    }

    if (!pushReady()) {
      return res.status(503).json({
        error: "התראות לטלפון טרם הופעלו במערכת — חסרים מפתחות VAPID",
        setupRequired: true,
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const sub = body?.subscription;
      if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint)) {
        return res.status(400).json({ error: "מנוי לא תקין" });
      }
      const { board, col, list } = await readSubs(session);
      if (!col) return res.status(502).json({ error: "לא נמצאה עמודה לשמירת המנוי" });

      /* ⚠ אותו מכשיר פעמיים אינו שני מנויים — ההרשמה
         אידמפוטנטית, כמו כל פעולה משותפת (עיקרון 5). */
      const clean = { endpoint: sub.endpoint, at: new Date().toISOString() };
      const next = [...list.filter((x) => x.endpoint !== sub.endpoint), clean].slice(-8);
      await writeSubs(board, col, session.itemId, next);
      return res.status(200).json({ ok: true, devices: next.length });
    }

    if (req.method === "DELETE") {
      const endpoint = String(body?.endpoint || "");
      const { board, col, list } = await readSubs(session);
      if (!col) return res.status(200).json({ ok: true, devices: 0 });
      const next = list.filter((x) => x.endpoint !== endpoint);
      await writeSubs(board, col, session.itemId, next);
      return res.status(200).json({ ok: true, devices: next.length });
    }

    return res.status(405).json({ error: "מתודה לא נתמכת" });
  } catch (e) {
    console.error("[push]", e);
    res.status(502).json({ error: "פעולת ההתראות נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ `{ student: true }` — חניך הוא בדיוק מי שצריך את זה. */
export default withAuth(handler, { student: true });
