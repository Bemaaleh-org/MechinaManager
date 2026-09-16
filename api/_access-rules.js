/* ============================================================
   /api/students?action=access   הרשאות מותאמות

     GET                                       הכול, לראש המכינה
     POST   { subject, screen, level, note? }   קביעה
     DELETE { id }                              הסרה

   ------------------------------------------------------------
   הבקשה: *"דף הרשאות למנהלי המכינה... שלכל אחד יש את כל דפי
   המכינה ומנהל המכינה בוחר איזה הרשאות לתת לו, בכלל לא, צפייה,
   עריכה, אפשר לתת גם לתפקיד ספציפי וגם לכל משתמש."*

   ⚠⚠⚠ **רק מצמצם.** ראו ההסבר המלא ב-shared/access-rules.js.
     "עריכה" כאן פירושה "בלי התאמה", ולא "פותח לו את המסך".

   ⚠ **ראש המכינה בלבד** (`session.isHead`), ולא כל איש צוות:
     מי שיכול לחסום מסכים לאחרים יכול לחסום אותם לראש המכינה.
     אותו רף של פתיחת מחזור (4ל).

   ⚠ **והמסך נבדק מול הרשימה ואינו טקסט חופשי.** מפתח מסך
     שאינו קיים נשמר בשקט, נראה נכון בלוח, ולעולם אינו חוסם
     דבר — אותו כלל של `dutyKey` בהצפות (4ס).
   ============================================================ */

import { withAuth, actorName } from "./_session.js";
import { allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem, deleteItem } from "./_items.js";
import { STAFF_SCREENS, STUDENT_SCREENS, SCREEN_API } from "../shared/screens.js";
import { DUTIES } from "../shared/duties.js";
import { availableRoles } from "./_student-role.js";
import { activeStudents } from "./_student-rows.js";
import {
  LEVELS, LEVEL_HE, LEVEL_NOTE, DEFAULT_LEVEL, parseSubject, SUBJECT,
} from "../shared/access-rules.js";
import {
  ACCESS_BOARDS as B, ACCESS_COLS as C, accessReady,
} from "../shared/access-ids.js";

const val = (i, c) => (c && (i.column_values.find((x) => x.id === c) || {}).text) || "";
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

/* ⚠⚠ `value === null` הוא המבחן לריק ולא `text === ""` — תא
   סטטוס בלי בחירה מחזיר את שם התווית שיושבת על מפתח 5 (5ז).
   כאן זה היה **חוסם מסך** על שורה שאיש לא מילא. */
const statusOf = (i, col) => {
  const cell = (i.column_values || []).find((x) => x.id === col) || {};
  const empty = cell.value === null || cell.value === undefined || cell.value === "null";
  return empty ? "" : (cell.text || "");
};

const HE_TO_LEVEL = Object.fromEntries(LEVELS.map((l) => [LEVEL_HE[l], l]));

/* ============================================================
   כל המסכים שאפשר להתאים — מקור אחד.
   ⚠ **נגזר ואינו נכתב** (4מד): הרשימות הסטטיות + הלשוניות
     שנגזרות מ-`DUTIES`. מסך שיתווסף למגירה מופיע כאן מעצמו.
   ============================================================ */
export function allScreens() {
  const by = new Map();
  const add = (tab, label, side) => {
    if (!tab) return;
    const cur = by.get(tab);
    if (cur) { if (!cur.side.includes(side)) cur.side.push(side); return; }
    by.set(tab, { tab, label, side: [side], api: (SCREEN_API[tab] || []).length });
  };
  for (const s of STAFF_SCREENS) add(s.tab, s.label, "staff");
  for (const s of STUDENT_SCREENS) add(s.tab, s.label, "student");
  for (const d of Object.values(DUTIES)) {
    for (const t of d.tabs || []) add(t.tab, t.label, "role");
  }
  /* ⚠⚠ **שתי לשוניות יכולות לשאת אותה תווית, וזה נכון.**
     "בקשות יציאה" אצל הצוות הוא "מה להכריע" ואצל החניך "מה
     ביקשתי" — אותו שם ושני מסכים (וזה מתועד ב-check-nav
     כהחלטה, 5לב). ברשימה שבה בוחרים מה לחסום, שתי שורות
     זהות הן בדיוק המקום שבו חוסמים את הלא-נכונה, ולכן
     מוסיפים למי היא שייכת. */
  const dupes = new Set();
  const seen = new Set();
  for (const s of by.values()) {
    if (seen.has(s.label)) dupes.add(s.label);
    seen.add(s.label);
  }
  const SIDE_HE = { staff: "צוות", student: "חניך", role: "בעל תפקיד" };
  return [...by.values()]
    .map((s) => (dupes.has(s.label)
      ? { ...s, label: `${s.label} · ${s.side.map((x) => SIDE_HE[x] || x).join(" ")}` }
      : s))
    .sort((a, b) => a.label.localeCompare(b.label, "he"));
}

/* ============================================================
   ⚠⚠⚠ **לעולם אינו זורק, ולעולם אינו מרחיב.**

   כישלון בטעינה מחזיר רשימה ריקה — כלומר המערכת ממשיכה לעבוד
   בדיוק כפי שעבדה עד היום. אותו כלל של `ensureCycle` (4ל):
   הטעות היקרה כאן היא חסימה שגויה, לא היעדר חסימה.

   ⚠ **מטמון של חמש דקות.** הפונקציה נקראת בכל בקשה דרך
     `withAuth`, וקריאת לוח בכל בקשה הייתה מורגשת בכל מסך.
     המשמעות: התאמה שנקבעה עכשיו נכנסת לתוקף תוך חמש דקות —
     והמסך אומר זאת.
   ============================================================ */
export async function loadAccessRules({ force = false } = {}) {
  if (!accessReady()) return [];
  try {
    return await cached("access-rules", async () => {
      const items = await allItems(B.board);
      return items
        .map((i) => ({
          id: String(i.id),
          subject: val(i, C.subject).trim(),
          screen: val(i, C.screen).trim(),
          level: HE_TO_LEVEL[statusOf(i, C.level)] || "",
          note: val(i, C.note),
          by: val(i, C.by),
        }))
        /* ⚠ שורה חלקית **אינה** מצמצמת. שורה שמישהו התחיל
           לכתוב ביד בלוח לא אמורה לחסום מסך באמצע היום. */
        .filter((r) => r.subject && r.screen && r.level && r.level !== DEFAULT_LEVEL);
    }, { force, ttl: 5 * 60_000 });
  } catch (e) {
    console.error("[access-rules]", e);
    return [];
  }
}

export const invalidateAccess = () => invalidate("access-rules");

async function handler(req, res, session) {
  /* ⚠ ראש המכינה בלבד — כולל הסגנית, שהיא תווית בלוח (4מ). */
  if (!session.isHead) {
    return res.status(403).json({ error: "דף ההרשאות הוא של ראש המכינה" });
  }
  if (!accessReady() && req.method !== "GET") {
    return res.status(503).json({
      error: "לוח ההרשאות המותאמות טרם הוקם. הריצו: npm run seed:access",
      setupRequired: true,
    });
  }

  try {
    if (req.method === "GET") {
      /* ⚠⚠ **הבוררים מגיעים מכאן ולא משאילתה שנייה במסך.**
         `?action=list` חסום לחלק מהקוראים, ורשימת התפקידים
         היא עמודה בלוח החניכים — שתי שאילתות נוספות בכל
         פתיחת לשונית, ושתי רשימות שעלולות להיפרד מזו
         שהשרת מאמת מולה (4מד).
         ⚠ וכל מקור נתפס בנפרד: תחום שנופל אינו מפיל את הדף
           (4כו). ⚠ **ושם ומזהה בלבד** — הדף הזה אינו צריך
           נתונים על אף חניך (עיקרון 4). */
      const [rules, roles, people] = await Promise.all([
        loadAccessRules({ force: true }),
        availableRoles().catch((e) => { console.error("[access/roles]", e); return null; }),
        activeStudents().catch((e) => { console.error("[access/people]", e); return null; }),
      ]);
      return res.status(200).json({
        rules,
        roles: roles || [],
        people: (people || []).map((r) => ({ id: String(r.id), name: r.name })),
        /* ⚠ **`partial` מבדיל בין "נכשלה טעינה" ל"אין נתונים"**
           (4מא) — בורר ריק בלי מילה נראה כמו מכינה בלי תפקידים. */
        partial: [roles === null ? "תפקידים" : null,
          people === null ? "חניכים" : null].filter(Boolean),
        screens: allScreens(),
        levels: LEVELS.map((l) => ({ key: l, label: LEVEL_HE[l], note: LEVEL_NOTE[l] })),
        ready: accessReady(),
        setup: accessReady() ? null : "npm run seed:access",
        /* ⚠ המשך ההצהרה של 5ד: מה שאי אפשר לגזור נאמר במפורש. */
        cacheMinutes: 5,
      });
    }

    const body = req.body ?? (await readJson(req));

    if (req.method === "POST") {
      const subject = clip(body.subject, 200);
      const screen = clip(body.screen, 80);
      const level = String(body.level || "");
      const parsed = parseSubject(subject);
      if (!parsed) {
        return res.status(400).json({ error: "נושא ההתאמה אינו תקין" });
      }
      if (!allScreens().some((s) => s.tab === screen)) {
        return res.status(400).json({ error: `אין מסך בשם "${screen}"` });
      }
      if (!LEVELS.includes(level)) {
        return res.status(400).json({ error: "רמה לא מוכרת" });
      }

      const rules = await loadAccessRules({ force: true });
      const existing = rules.find((r) => r.subject === subject && r.screen === screen);

      /* ⚠ **"מלא" הוא הסרה ולא שורה.** שורה שאומרת "בלי
         התאמה" היא רעש בלוח, והיא גם הייתה מופיעה בדף
         כהתאמה שאינה עושה דבר. */
      if (level === DEFAULT_LEVEL) {
        if (existing) { await deleteItem(existing.id); invalidateAccess(); }
        return res.status(200).json({ ok: true, removed: Boolean(existing) });
      }

      const cols = {
        /* ⚠⚠ **הנושא נכתב גם לעמודה וגם כשם השורה, וזו אינה
           כפילות מיותרת.** השם הוא מה שהופך את הלוח לקריא
           ולמיון ב-monday (4יז), והעמודה היא מה שהקוד קורא —
           כך ששינוי שם ביד בלוח אינו מבטל התאמה בשקט.
           ⚠ הגרסה הראשונה כתבה **רק** את השם, ו-`loadAccessRules`
           סינן כל שורה כי `subject` חזר ריק: ההתאמה נשמרה,
           הופיעה בלוח, ולא חסמה דבר. */
        ...(C.subject ? { [C.subject]: subject } : {}),
        ...(C.screen ? { [C.screen]: screen } : {}),
        ...(C.level ? { [C.level]: { label: LEVEL_HE[level] } } : {}),
        ...(C.note ? { [C.note]: clip(body.note, 300) } : {}),
        ...(C.by ? { [C.by]: actorName(session).slice(0, 120) } : {}),
      };

      /* ⚠ עדכון ולא שורה שנייה: שתי שורות לאותו צמד נפתרות
         ל"החזק שבהן" (`narrower`) — נכון, ובלתי ניתן להסבר
         למי שקורא את הלוח. */
      if (existing) {
        await setColumns(B.board, existing.id, cols);
        invalidateAccess();
        return res.status(200).json({ ok: true, id: existing.id, updated: true });
      }

      const id = await createItem(B.board, subject, cols);
      invalidateAccess();
      return res.status(200).json({ ok: true, id: String(id) });
    }

    if (req.method === "DELETE") {
      const id = String(body.id || req.query?.id || "");
      /* ⚠⚠ המזהה מאומת מול **הלוח הזה** לפני `deleteItem`, שהיא
         שולחת `delete_item` בלי `board_id` — מזהה שרירותי היה
         מוחק כל שורה בכל לוח במערכת (4ס). */
      const rules = await loadAccessRules({ force: true });
      if (!rules.some((r) => r.id === id)) {
        return res.status(404).json({ error: "ההתאמה אינה נמצאת" });
      }
      await deleteItem(id);
      invalidateAccess();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "שיטה לא נתמכת" });
  } catch (e) {
    return res.status(502).json({ error: e.message || "פעולת ההרשאות נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export { SUBJECT };
export default withAuth(handler);
