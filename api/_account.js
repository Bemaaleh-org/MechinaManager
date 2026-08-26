/* ============================================================
   /api/auth?action=account
     GET   מצב החשבון של מי שמחובר
     POST  { user, password, email? }   קביעת שם וסיסמה

   ------------------------------------------------------------
   ⚠ זו נקודת הקצה **היחידה** שסשן במצב `setup` רשאי לגעת בה.
     ראו withAuth ב-_session.js.

   ⚠ החלפת סיסמה על ידי מי שכבר קבע אחת דורשת את הסיסמה
     הנוכחית. בלי זה, מכשיר שנשאר פתוח לרגע במטבח מספיק כדי
     להשתלט על חשבון.

     ⚠ ובכניסה ראשונה **אין** דרישה כזו: הסיסמה הנוכחית היא
       תעודת הזהות, וכבר הוכחה בכניסה עצמה.

   ⚠ האימייל אופציונלי לחלוטין ונשמר רק אם המשתמש הקליד אותו
     כאן בעצמו. הוא אינו מיובא משום קובץ — בפרט לא מקובץ משרד
     החינוך, שנשאר מחוץ למערכת.
   ============================================================ */

import { withAuth, setSession, fingerprint } from "./_session.js";
import { identities, byUser, userTaken, writeIdentity, isFresh } from "./_identity.js";
import {
  hashPassword, verifyPassword, normalizeUser, userProblem, passwordProblem,
} from "./_credentials.js";
import { mailerReady } from "./_mailer.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function handler(req, res, session) {
  try {
    const all = await identities();
    const me = all.find((r) => r.id === String(session.itemId));
    if (!me) return res.status(404).json({ error: "החשבון אינו נמצא" });

    if (req.method === "GET") {
      return res.status(200).json({
        name: me.name,
        user: me.user || null,
        email: me.email || null,
        /* ⚠ לעולם לא הגיבוב עצמו — רק אם קיים. */
        hasPassword: Boolean(me.hash),
        setup: Boolean(session.setup) || isFresh(me),
        setAt: me.setAt || null,
        /* כדי שהמסך יידע אם להציע "שלחו לי מייל" */
        mailer: mailerReady(),
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "שיטה לא נתמכת" });
    }

    const body = req.body ?? (await readJson(req));
    const first = isFresh(me) || Boolean(session.setup);

    /* ---------- הסיסמה הנוכחית ---------- */
    if (!first) {
      const current = String(body?.current || "");
      if (!current || !(await verifyPassword(current, me.hash))) {
        return res.status(403).json({ error: "הסיסמה הנוכחית שגויה" });
      }
    }

    /* ---------- שם המשתמש ---------- */
    const patch = {};
    if (body?.user !== undefined || first) {
      const problem = userProblem(body?.user);
      if (problem) return res.status(400).json({ error: problem });
      if (userTaken(all, body.user, me.id)) {
        /* ⚠ כאן דווקא כן אומרים "תפוס". בלי זה המשתמש מנסה
           שוב ושוב את אותו שם ולא מבין למה זה נכשל, וממילא
           אפשר לגלות תפיסה בעצם ניסיון ההרשמה. */
        return res.status(409).json({ error: "שם המשתמש הזה כבר תפוס" });
      }
      patch.user = normalizeUser(body.user);
    }

    /* ---------- הסיסמה החדשה ---------- */
    if (body?.password !== undefined || first) {
      const problem = passwordProblem(body?.password, {
        tz: me.kind === "student" ? me.secret : "",
        user: patch.user || me.user,
      });
      if (problem) return res.status(400).json({ error: problem });
      patch.hash = await hashPassword(body.password);
      patch.setAt = new Date().toISOString();
      /* ⚠ קביעת סיסמה מבטלת כל אסימון איפוס פתוח. אחרת קישור
         ישן במייל היה ממשיך לעבוד אחרי שהמשתמש כבר התאושש. */
      patch.reset = "";
    }

    /* ---------- אימייל ---------- */
    if (body?.email !== undefined) {
      const e = String(body.email || "").trim().toLowerCase();
      if (e && !EMAIL_RE.test(e)) return res.status(400).json({ error: "כתובת אימייל לא תקינה" });
      if (e && all.some((r) => r.email === e && r.id !== me.id)) {
        return res.status(409).json({ error: "הכתובת הזו כבר רשומה למשתמש אחר" });
      }
      patch.email = e;
    }

    await writeIdentity(me, patch);

    /* ⚠ הסשן מוחלף בלי דגל setup — מכאן והלאה המשתמש בפנים. */
    if (first) {
      setSession(res, {
        kind: session.kind === "student" ? "student" : "manager",
        itemId: me.id, name: me.name, cfp: fingerprint(me.secret),
      });
    }

    return res.status(200).json({
      ok: true, user: patch.user || me.user,
      email: patch.email !== undefined ? patch.email : me.email,
      setup: false,
    });
  } catch (e) {
    console.error("[account]", e && e.message);
    res.status(502).json({ error: "עדכון החשבון נכשל" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/* ⚠ setup:true — זו הנקודה היחידה שסשן בהקמה רשאי לגעת בה. */
export default withAuth(handler, { student: true, setup: true });
