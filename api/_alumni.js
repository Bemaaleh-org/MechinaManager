/* ============================================================
   GET  /api/students?action=alumni    בוגרי המכינה
   POST /api/students?action=alumni    בוגר חדש
   PUT  /api/students?action=alumni    עדכון

   ⚠ צוות בלבד. הלוח נושא תאריכי לידה ומקום מגורים של אנשים
     שכבר אינם במכינה, ואין סיבה שחניך נוכחי יקרא אותם.

   ⚠ מה שאין — אין. בוגר שטרם ידוע לאן הוא מתגייס נשאר ריק
     ומסומן "טרם ידוע"; ניחוש היה מייצר סטטיסטיקה שנראית
     מדויקת ואינה. הזרוע נגזרת מהתפקיד בזריעה הראשונית בלבד,
     ומשם היא נתון של הלוח.

   ⚠ רשימת הזרועות נקראת מהלוח ולא מהקוד, ואפשר להוסיף לה
     מהמסך. מכינה לא מגייסת לפי טבלה שכתובה בקוד: כל מחזור
     מביא מסלול שלא היה, ורשימה סגורה הייתה דוחפת את כולם
     ל"אחר" תוך שנתיים. ראו CLAUDE.md סעיף 4טז.

     ⚠ ההרשאה כאן היא isManager, שפירושו **כל כניסת צוות**
       ולא ראש המכינה בלבד (ראו _session.js: kind==="manager").
       חניך אינו מגיע לכאן כלל. בחרנו צוות ולא isHead כי אותה
       החלטה כבר התקבלה במקומות אחרים: רשימה שרק אדם אחד יכול
       להרחיב נתקעת ברגע שהוא בחופשה, ואז כולם נדחפים ל"אחר"
       וזה בדיוק מה שניסינו למנוע. הבדיקה בתוך המסלול היא רשת
       שנייה למקרה שההרשאה תורחב יום אחד.

   ⚠ פיקוד וקצונה נספרים מתוך מי ש**סומן**, לא מתוך כולם.
     בוגר שטרם נשאל אינו "לא יצא לקצונה"; שיוך שלו למכנה
     היה מוריד את האחוז בכל פעם שנוסף בוגר חדש ולא נשאל.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql, allItems } from "./_monday.js";
import { cached, invalidate } from "./_cache.js";
import { setColumns, createItem } from "./_items.js";
import { EXTRA } from "../shared/extras-ids.js";

const YN = ["כן", "לא"];

const A = EXTRA.alumni;
const CYCLES = ["מחזור א׳", "מחזור ב׳", "מחזור ג׳", "מחזור ד׳", "מחזור ה׳"];
const val = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";
const num = (i, c) => { const t = val(i, c); return t === "" ? null : Number(t); };

export async function loadAlumni({ force = false } = {}) {
  return cached("alumni", async () => {
    const items = await allItems(A.board);
    return items
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || "").trim(),
        cycle: val(i, A.cols.cycle) || null,
        unit: val(i, A.cols.unit) || null,
        branch: val(i, A.cols.branch) || null,
        command: val(i, A.cols.command) || null,
        officer: val(i, A.cols.officer) || null,
        enlist: val(i, A.cols.enlist) || null,
        birthday: val(i, A.cols.birthday) || null,
        city: val(i, A.cols.city) || null,
        note: val(i, A.cols.note) || null,
      }))
      .filter((x) => x.name)
      .sort((a, b) => (a.enlist || "9999").localeCompare(b.enlist || "9999"));
  }, { force });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** תוויות הזרוע כפי שהן בלוח עצמו */
async function branchLabels({ force = false } = {}) {
  return cached("alumni-branches", async () => {
    const d = await gql(`{ boards(ids:[${A.board}]){ columns{ id settings_str } } }`);
    const col = (d.boards[0].columns || []).find((c) => c.id === A.cols.branch);
    const labels = col ? Object.values(JSON.parse(col.settings_str || "{}").labels || {}) : [];
    return labels.filter(Boolean).map(String);
  }, { force });
}

function colsFrom(body) {
  const cols = {};
  if (body.cycle) cols[A.cols.cycle] = { label: String(body.cycle) };
  if (body.branch) cols[A.cols.branch] = { label: String(body.branch) };
  for (const [k, c] of [["command", A.cols.command], ["officer", A.cols.officer]]) {
    if (body[k] === undefined) continue;
    const v = String(body[k] || "").trim();
    /* ⚠ ריק הוא ערך: "טרם נשאל" אינו "לא". */
    if (!v) { cols[c] = ""; continue; }
    if (!YN.includes(v)) return null;
    cols[c] = { label: v };
  }
  for (const [k, c, max] of [
    ["unit", A.cols.unit, 120], ["city", A.cols.city, 80], ["note", A.cols.note, 200],
  ]) {
    if (body[k] !== undefined) cols[c] = String(body[k] || "").trim().slice(0, max);
  }
  for (const [k, c] of [["enlist", A.cols.enlist], ["birthday", A.cols.birthday]]) {
    if (body[k] === undefined) continue;
    const v = String(body[k] || "").trim();
    if (!v) { cols[c] = ""; continue; }
    if (!DATE_RE.test(v)) return null;
    cols[c] = { date: v };
  }
  return cols;
}

async function handler(req, res, session) {
  if (!EXTRA.alumni || !EXTRA.alumni.board) {
    return res.status(503).json({ error: "לוח הבוגרים טרם הוקם", setupRequired: true });
  }

  try {
    if (req.method === "GET") {
      const alumni = await loadAlumni();

      /* ---------- סטטיסטיקה ----------
         ⚠ נבנית מהנתונים ולא מרשימה בקוד: זרוע חדשה שתופיע
           בלוח תיכנס לפילוח מעצמה. */
      const count = (key) => {
        const m = {};
        for (const a of alumni) {
          const v = a[key] || "לא ידוע";
          m[v] = (m[v] || 0) + 1;
        }
        return Object.entries(m)
          .map(([k, n]) => ({ key: k, n }))
          .sort((x, y) => y.n - x.n);
      };

      /* ⚠ המכנה הוא מי שסומן, והמונה מי שסומן "כן". שניהם
         מוחזרים כדי שהמסך יוכל להראות "4 מתוך 9 שנשאלו"
         ולא אחוז ערום שאי אפשר לשפוט את מהימנותו. */
      const share = (key) => {
        const asked = alumni.filter((a) => a[key]);
        const yes = asked.filter((a) => a[key] === "כן");
        return {
          yes: yes.length,
          asked: asked.length,
          pending: alumni.length - asked.length,
          pct: asked.length ? Math.round((yes.length / asked.length) * 100) : null,
        };
      };

      const labels = await branchLabels();

      return res.status(200).json({
        alumni,
        count: alumni.length,
        byBranch: count("branch"),
        byCycle: count("cycle"),
        byCity: count("city"),
        command: share("command"),
        officer: share("officer"),
        /* כמה עוד לא ידוע — המספר שאומר כמה מהתמונה חסר */
        unknown: alumni.filter((a) => !a.unit).length,
        noBranch: alumni.filter((a) => !a.branch).length,
        cycles: CYCLES,
        /* ⚠ הרשימה מהלוח ראשונה, ואחריה זרועות שנמצאות
           בשימוש ואינן ברשימה — כדי שערך ישן לא ייעלם מהמסנן. */
        branches: [...new Set([...labels,
          ...alumni.map((a) => a.branch).filter(Boolean)])],
        options: { yn: YN },
        canAddBranch: Boolean(session.isManager),
      });
    }

    const body = req.body ?? (await readJson(req));

    /* ============================================================
       זרוע שאינה ברשימה
       ------------------------------------------------------------
       ⚠ החריג היחיד השני ל-create_labels_if_missing. התווית
         מגיעה מהמנהל דרך שדה שנועד לכך, ולא מקוד — ולכן
         מותר לה להיווצר. כל שאר הכתיבות ללוח נשארות false.

       ⚠ צוות בלבד, ולא חניך. מי שמקליד "סיירת גבעתי" במקום
         לבחור "סיירות חי״ר וקומנדו" מפצל את הסטטיסטיקה לשתי
         שורות שנראות שונות ואינן — ולכן ההוספה היא שדה נפרד
         ומכוון, ולא הקלדה חופשית בשדה הזרוע.
       ============================================================ */
    let newLabel = false;
    if (body.branch) {
      const known = await branchLabels();
      if (!known.includes(String(body.branch))) {
        if (!session.isManager) {
          return res.status(403).json({
            error: `"${body.branch}" אינה ברשימת הזרועות. הוספה של זרוע חדשה היא בידי המנהל.`,
            branches: known,
          });
        }
        newLabel = true;
      }
    }

    if (req.method === "POST") {
      const name = String(body?.name || "").trim().slice(0, 120);
      if (!name) return res.status(400).json({ error: "לא הוזן שם" });
      const cols = colsFrom(body);
      if (!cols) return res.status(400).json({ error: "תאריך לא תקין" });
      const id = await createItem(A.board, name, cols, { labels: newLabel });
      invalidate("alumni");
      if (newLabel) invalidate("alumni-branches");
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const id = String(body?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין בוגר" });
      const cols = colsFrom(body);
      if (!cols) return res.status(400).json({ error: "תאריך לא תקין" });
      if (Object.keys(cols).length) await setColumns(A.board, id, cols, { labels: newLabel });
      if (newLabel) invalidate("alumni-branches");
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return res.status(400).json({ error: "שם ריק" });
        await gql(
          `mutation($i:ID!,$b:ID!,$n:String!){ change_simple_column_value(item_id:$i,board_id:$b,column_id:"name",value:$n){ id } }`,
          { i: id, b: A.board, n: name });
      }
      invalidate("alumni");
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "רק GET, POST ו-PUT נתמכים כאן" });
  } catch (e) {
    console.error("[alumni]", e);
    res.status(502).json({ error: "פעולת הבוגרים נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default withAuth(handler, { manager: true });
