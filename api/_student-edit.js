/* ============================================================
   /api/students?action=edit
     PUT { studentId, ...fields }   עריכת נתוני חניך על ידי הצוות

   ------------------------------------------------------------
   ⚠⚠ **מה שהצוות מנהל, ולא מה שהחניך הזין.**

     `army` ו-`tryouts` ממולאים על ידי החניך עצמו ו**אינם כאן**
     — הם התשובה שלו על עצמו, ועריכה שלהם מהמסך של הצוות הופכת
     את השדה למשהו אחר לגמרי. `user`, `hash` ו-`email` הם
     חשבון הכניסה שלו ואינם כאן מאותו טעם, ובנוסף כי סיסמה
     לעולם אינה נערכת מבחוץ (4כח).

     מה שכן: שם, ת.ז, תאריך לידה, מגדר, טלפון, אימייל אישי,
     עיר, אלרגיה, הגדרה דתית ומידת חולצה — כולם הגיעו מהרשימה
     שהמכינה קיבלה, וכולם יכולים להשתנות.

   ⚠ **ראש המכינה בלבד.** לא כל איש צוות: ת.ז היא סוד הכניסה,
     ושינוי שלה מנתק את החניך. זו החלטה של מי שאחראי על
     המצבה.

   ⚠ **מיפוי מפורש ולא פריסה.** שדה שאינו ברשימה כאן פשוט
     אינו נכתב — כדי שעמודה חדשה בלוח לא תיפתח לכתיבה מעצמה
     ברגע שמישהו יוסיף אותה.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../shared/mechina-boards.js";
import { studentRows } from "./_student-rows.js";
import { invalidate } from "./_cache.js";
import { renameItem } from "./_items.js";

const C = MECHINA_COLS.roster;
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

/* ============================================================
   השדות, וכיצד כל אחד נכתב
   ------------------------------------------------------------
   ⚠ **`kind` אינו קישוט.** `status` דורש `{label}` ותווית
     שקיימת בלוח; `text` דורש מחרוזת. שליחת מחרוזת לעמודת
     status נדחית **בשקט** על ידי monday ואינה כותבת דבר.
   ============================================================ */
const FIELDS = {
  phone: { col: C.phone, kind: "phone", label: "טלפון", max: 30 },
  mail: { col: C.mail, kind: "email", label: "אימייל אישי", max: 120 },
  city: { col: C.city, kind: "text", label: "עיר מגורים", max: 80 },
  allergy: { col: C.allergy, kind: "text", label: "אלרגיה או רגישות", max: 300 },
  religion: { col: C.religion, kind: "status", label: "הגדרה דתית", max: 40 },
  shirt: { col: C.shirt, kind: "status", label: "מידת חולצה", max: 20 },
  gender: { col: C.gender, kind: "status", label: "מין", max: 20 },
  dob: { col: C.dob, kind: "date", label: "תאריך לידה" },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function handler(req, res, session) {
  if (req.method !== "PUT") return res.status(405).json({ error: "רק PUT נתמך כאן" });
  if (!session.isHead) {
    return res.status(403).json({
      error: "עריכת נתוני חניך נעשית על ידי ראש המכינה",
    });
  }

  try {
    const body = req.body ?? (await readJson(req));
    const id = String(body?.studentId || "").trim();
    if (!id) return res.status(400).json({ error: "לא צוין חניך" });

    const rows = await studentRows({ force: true });
    const me = rows.find((r) => r.id === id);
    if (!me) return res.status(404).json({ error: "החניך אינו נמצא" });

    const cols = {};
    const touched = [];

    /* ---------- השם ---------- */
    if (body?.name !== undefined) {
      const name = clip(body.name, 120);
      if (!name) return res.status(400).json({ error: "אין חניך בלי שם" });
      if (name !== me.name) {
        const dup = rows.find((r) => r.name === name && r.id !== id);
        /* ⚠ שם כפול נחסם: כל המסכים מציגים שמות, וההבחנה בין
           שני חניכים באותו שם נעשית בעין ולא במזהה. */
        if (dup) return res.status(400).json({ error: `"${name}" כבר קיים במצבה` });
        await renameItem(MECHINA_BOARDS.roster, id, name);
        touched.push("שם");
      }
    }

    /* ============================================================
       ⚠⚠ **תעודת הזהות היא סוד הכניסה.**

       `requireAuth` משווה בכל בקשה את טביעת האצבע שבעוגייה מול
       הת.ז שבלוח (4כח). שינוי שלה **מנתק את החניך מיד** מכל
       מכשיר, והוא ייכנס מחדש עם שם המשתמש והסיסמה שלו.

       זה נכון וזו התנהגות רצויה — אבל היא חייבת להיאמר, ולכן
       התשובה מחזירה `signedOut` והמסך מזהיר לפני.
       ============================================================ */
    let signedOut = false;
    if (body?.tz !== undefined) {
      const tz = String(body.tz).replace(/\D/g, "");
      if (!/^\d{9}$/.test(tz)) {
        return res.status(400).json({ error: "תעודת זהות היא תשע ספרות" });
      }
      if (tz !== String(me.tz || "")) {
        const dup = rows.find((r) => String(r.tz || "") === tz && r.id !== id);
        /* ⚠ ת.ז כפולה היא **שני אנשים שנכנסים לאותו חשבון**.
           נחסמת, וההודעה אינה אומרת של מי — זו רשימת החניכים,
           והשם היה מגלה מידע על אדם אחר בהודעת שגיאה. */
        if (dup) return res.status(400).json({ error: "תעודת הזהות הזו כבר רשומה לחניך אחר" });
        cols[C.tz] = tz;
        touched.push("תעודת זהות");
        signedOut = true;
      }
    }

    /* ---------- שאר השדות ---------- */
    for (const [key, f] of Object.entries(FIELDS)) {
      if (body?.[key] === undefined) continue;
      const raw = clip(body[key], f.max || 200);
      if (raw === String(me[key] || "")) continue;

      if (f.kind === "date") {
        if (raw && !DATE_RE.test(raw)) {
          return res.status(400).json({ error: `${f.label}: תאריך בפורמט YYYY-MM-DD` });
        }
        cols[f.col] = raw ? { date: raw } : {};
      } else if (f.kind === "status") {
        /* ⚠ ריק מנקה, וערך כותב תווית. `create_labels_if_missing`
           נשאר false — תווית שאינה בלוח תפיל את הקריאה ברעש
           ולא תיצור כפילות בשקט. */
        cols[f.col] = raw ? { label: raw } : {};
      } else if (f.kind === "phone") {
        /* ⚠ עמודת phone של monday מצפה ל-{phone, countryShortName}.
           מחרוזת לבדה נדחית בשקט ואינה כותבת דבר. */
        const digits = raw.replace(/\D/g, "");
        cols[f.col] = digits
          ? { phone: digits.startsWith("972") ? digits : "972" + digits.replace(/^0/, ""),
              countryShortName: "IL" }
          : { phone: "", countryShortName: "IL" };
      } else if (f.kind === "email") {
        cols[f.col] = raw ? { email: raw, text: raw } : { email: "", text: "" };
      } else {
        cols[f.col] = raw;
      }
      touched.push(f.label);
    }

    if (Object.keys(cols).length) {
      await gql(
        `mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){ id } }`,
        { b: MECHINA_BOARDS.roster, i: id, v: JSON.stringify(cols) });
    }
    invalidate("student-rows");

    /* ⚠ מחזיר **מה השתנה בפועל** ולא "נשמר". שדה שנשלח זהה
       לקיים אינו נספר, והמסך אומר אמת. */
    return res.status(200).json({ ok: true, changed: touched, signedOut });
  } catch (e) {
    console.error("[student-edit]", e);
    /* ⚠ תווית שאינה בלוח מגיעה לכאן. ההודעה אומרת מה לבדוק,
       כי "העריכה נכשלה" לבדה אינה ניתנת לפעולה. */
    const msg = String(e && e.message || "");
    if (/label/i.test(msg)) {
      return res.status(400).json({
        error: "אחד הערכים אינו קיים ברשימה שבלוח — בדקו הגדרה דתית, מין או מידת חולצה",
      });
    }
    res.status(502).json({ error: "עריכת החניך נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}

export default withAuth(handler, { manager: true });
