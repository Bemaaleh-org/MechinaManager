/* ============================================================
   /api/students?action=team-admin
     GET    כל מה שדרוש כדי לנהל צוותים ואוצר מילים
     POST   { id?, name, category, period, capacity, ... }
            יצירת ועדה או סדרה חדשה, ועריכת קיימת
     PUT    { id?, name, kind, order, closes, archived, remove }
            אוצר המילים — סטטוסים ושלבים
     DELETE { id }   מחיקת צוות ריק. צוות עם תוכן מארכבים.

   ------------------------------------------------------------
   ⚠ **זה הקובץ שנועד לחיות בלי מפתח.** "קם צוות באמצע שנה,
     נגיד צוות יום הזיכרון" — מנהל המכינה מקים אותו כאן, קובע
     לו יו״ר, משבץ אליו חניכים ומנהל את המשימות. אף שורת קוד
     ואף דיפלוי. זה עיקרון 1 במלוא היקפו.

   ⚠ **פונקציות מוגדרות, לא שדה חופשי.** קטגוריה, תקופה ומכסה
     הן מה שכל שאר המערכת כבר יודעת לקרוא. שדה חופשי היה נראה
     גמיש יותר ולא היה מגיע לאף מסך.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import {
  PLACEMENT_BOARDS, PLACEMENT_COLS, CATEGORY, CATEGORIES,
  PERIOD, PERIODS, SEM, semestersFor, placementsReady,
} from "../shared/placements.js";
import { TEAM_BOARDS, TEAM_COLS } from "../shared/team-ids.js";
import {
  VOCAB_KIND, VOCAB_KINDS, isTeamCategory, TEAM_CATEGORIES,
} from "../shared/team.js";
import {
  loadDefinitions, loadAssignments,
} from "./_placements.js";
import {
  teamsReady, loadVocab, loadTeamTasks, invalidateTeams,
  createItem, setColumns, renameItem,
} from "./_team-data.js";
import { activeStudents } from "./_student-rows.js";
import { invalidate } from "./_cache.js";

const D = PLACEMENT_COLS.definitions;
const V = TEAM_COLS.vocab;
const MAX = { name: 120, text: 4000, hours: 200 };

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const invalidatePlacements = () => {
  invalidate("placement-defs"); invalidate("placement-asgn"); invalidate("mechina-guides");
};

async function handler(req, res, session) {
  if (!placementsReady()) {
    return res.status(503).json({
      error: "לוחות השיבוצים טרם הוקמו ב-monday", setupRequired: true,
    });
  }
  /* ⚠ `isManager` הוא כל כניסת צוות, לא ראש מכינה בלבד — אותו
     רף כמו מסך השיבוצים שממנו מגיעים לכאן. חניך אינו מגיע
     לכאן כלל, גם לא יו״ר: יו״ר מנהל את המשימות של הוועדה שלו
     ולא את מבנה המכינה. */
  if (!session.isManager) {
    return res.status(403).json({ error: "ניהול הצוותים מותר לצוות בלבד" });
  }

  try {
    /* ============ מה יש ============ */
    if (req.method === "GET") {
      const [defs, asg, roster, vocab] = await Promise.all([
        loadDefinitions(), loadAssignments(), activeStudents(),
        teamsReady() ? loadVocab() : Promise.resolve({ statuses: [], stages: [], unknown: [] }),
      ]);
      const tasks = teamsReady() ? await loadTeamTasks() : [];

      const counts = new Map();
      for (const a of asg) counts.set(a.placement, (counts.get(a.placement) || 0) + 1);
      const taskCounts = new Map();
      for (const t of tasks) taskCounts.set(t.team, (taskCounts.get(t.team) || 0) + 1);

      return res.status(200).json({
        /* ⚠ **מארכבים כלולים כאן ומסומנים.** זה המסך היחיד שממנו
           אפשר להחזיר אותם; סינון היה הופך ארכוב למחיקה. */
        definitions: defs.map((d) => ({
          ...d,
          isTeam: isTeamCategory(d.category),
          assigned: counts.get(d.id) || 0,
          tasks: taskCounts.get(d.id) || 0,
          /* ⚠ באילו סמסטרים כבר יש שורות — המסך חוסם שינוי
             תקופה שיותיר אותן יתומות. ראו ההערה ב-POST. */
          semesters: [...new Set(asg.filter((a) => a.placement === d.id)
            .map((a) => a.semester).filter(Boolean))].sort(),
        })),
        roster: roster.map((r) => ({ id: r.id, name: r.name })),
        vocab,
        options: {
          /* ⚠ TEAM_CATEGORIES ולא מערך מקובע: כאן ישבה רשימה
             שסתרה את `isTeam` שלוש שורות מעליה — אותה תשובה
             אמרה ששיבוץ הוא צוות, ובו בזמן שהסוג שלו אינו
             מהסוגים שמנהלים משימות. */
          categories: CATEGORIES, teamCategories: TEAM_CATEGORIES,
          periods: PERIODS, semesters: [SEM.first, SEM.second],
          kinds: VOCAB_KINDS,
        },
        vocabReady: teamsReady(),
      });
    }

    /* ============ ועדה או סדרה ============ */
    if (req.method === "POST") {
      const body = req.body ?? (await readJson(req));
      const id = String(body?.id || "").trim();
      const name = clip(body?.name, MAX.name);
      const category = clip(body?.category, 40);
      const period = clip(body?.period, 40) || PERIOD.yearly;

      if (!name) return res.status(400).json({ error: "אין צוות בלי שם" });
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: `קטגוריה לא מוכרת. האפשרויות: ${CATEGORIES.join(" · ")}`,
        });
      }
      if (!PERIODS.includes(period)) {
        return res.status(400).json({
          error: `תקופה לא מוכרת. האפשרויות: ${PERIODS.join(" · ")}`,
        });
      }

      /* ⚠ **מכסה: מספר או ריק, ולא NaN.** `Number("שמונה")` הוא
         NaN, ו-`NaN != null` הוא true — אבל `length > NaN` תמיד
         false, כלומר האכיפה מתבטלת בשקט והמסך מציג "X/NaN".
         כאן זה נתפס בכתיבה ולא הופך לבאג נדיר. */
      let capacity = "";
      if (body?.capacity !== undefined && String(body.capacity).trim() !== "") {
        const n = Number(body.capacity);
        if (!Number.isFinite(n) || n < 0 || n !== Math.floor(n)) {
          return res.status(400).json({ error: "מכסה היא מספר שלם, או ריק לבלי הגבלה" });
        }
        capacity = n;
      }

      const defs = await loadDefinitions();
      const dup = defs.find((d) => d.name === name && d.id !== id);
      if (dup) {
        return res.status(400).json({ error: `"${name}" כבר קיים בלוח ההגדרות` });
      }

      const cols = {
        [D.category]: { label: category },
        [D.period]: { label: period },
        [D.capacity]: capacity,
        [D.desc]: clip(body?.desc, MAX.text),
        [D.hours]: clip(body?.hours, MAX.hours),
        [D.needs]: clip(body?.needs, MAX.text),
        [D.lead]: clip(body?.lead, MAX.name),
      };
      if (body?.archived !== undefined) {
        cols[D.archived] = { checked: body.archived ? "true" : "false" };
      }

      if (!id) {
        const created = await createItem(PLACEMENT_BOARDS.definitions, name, cols);
        invalidatePlacements();
        return res.status(200).json({ ok: true, id: created, created: true });
      }

      const cur = defs.find((d) => d.id === id);
      if (!cur) return res.status(404).json({ error: "הצוות אינו נמצא" });

      /* ============================================================
         ⚠ **שינוי תקופה שמותיר שורות יתומות — נחסם.**

         מסך השיבוצים מסונן לפי `placement + semester`. ועדה
         שנוצרה בייבוא נכנסה בלי `period`, נחשבה "שנתי", ומרגע
         שהיא תשונה ל"לפי סמסטר" — השורות שיושבות ב"שנתי" לא
         יופיעו עוד באף מסך **ולא יהיה שום מקום למחוק אותן**.

         לכן החסימה כאן, לפני, ועם ההסבר: קודם מרוקנים את
         הסמסטר שייצא מהתוקף.
         ============================================================ */
      if (period !== cur.period) {
        const keep = new Set(semestersFor(period));
        const asg = await loadAssignments();
        const orphan = asg.filter((a) => a.placement === id && !keep.has(a.semester));
        if (orphan.length) {
          const where = [...new Set(orphan.map((a) => a.semester || "(ללא סמסטר)"))].join(" · ");
          return res.status(400).json({
            error: `${orphan.length} שיבוצים יושבים ב${where}, ותקופת "${period}" אינה כוללת אותו. `
              + "צריך להסיר אותם לפני שינוי התקופה, אחרת הם יישארו בלוח בלי מסך שמציג אותם.",
          });
        }
      }

      /* ⚠ מכסה שקטנה מתחת למספר המשובצים בפועל — נחסמת. אחרת
         העורך היה נפתח מיד מעל המכסה ולא ניתן לשמירה. */
      if (Number.isFinite(capacity)) {
        const asg = await loadAssignments();
        const per = new Map();
        for (const a of asg) {
          if (a.placement !== id) continue;
          per.set(a.semester, (per.get(a.semester) || 0) + 1);
        }
        const worst = Math.max(0, ...per.values());
        if (worst > capacity) {
          return res.status(400).json({
            error: `כבר משובצים ${worst} חניכים, ומכסה של ${capacity} תשאיר את השיבוץ חסום`,
          });
        }
      }

      /* ⚠ שלושה ארגומנטים — ראו api/_team-task.js */
      await renameItem(PLACEMENT_BOARDS.definitions, id, name);
      await setColumns(PLACEMENT_BOARDS.definitions, id, cols);

      /* ⚠ קטגוריה שיוצאת מ"ועדה/סדרה" מאבדת את היו״ר: אין יו״ר
         לענף ולקבוצה (ראו api/_placement-chair.js), ויו״ר-רפאים
         היה ממשיך לקבל הרשאת ניהול בלוח המשימות. */
      let chairCleared = false;
      if (cur.chair && !isTeamCategory(category)) {
        await setColumns(PLACEMENT_BOARDS.definitions, id, { [D.chair]: "", [D.chairName]: "" });
        chairCleared = true;
      }
      invalidatePlacements();
      return res.status(200).json({ ok: true, id, chairCleared });
    }

    /* ============================================================
       מחיקת צוות
       ------------------------------------------------------------
       ⚠ **מחיקה אמיתית, ולא ארכוב — אבל רק כשהצוות ריק.**
         ארכוב קיים כבר (`archived`) והוא הדרך הנכונה לצוות
         שהיה ונגמר: הוא שומר את המשימות, את השיבוצים ואת
         ההיסטוריה. מחיקה נועדה לצוות שנוצר בטעות.

       ⚠ **ולכן היא חוסמת כשיש מה לאבד.** צוות עם שיבוצים או
         עם משימות אינו נמחק — הודעת השגיאה אומרת כמה יש ומה
         לעשות במקום. מחיקה שקטה של 40 משימות ועדה היא בדיוק
         סוג הפעולה שאי אפשר לתקן.

       ⚠ **שלושה לוחות נבדקים ולא אחד**: הגדרות, שיבוצים
         ומשימות. `deleteItem` שולחת `delete_item` בלי
         `board_id`, ולכן המזהה מאומת מול לוח ההגדרות לפני
         שנוגעים בו — אותו חור שנסגר בהצפות (4ס).
       ============================================================ */
    if (req.method === "DELETE") {
      const body = req.body ?? (await readJson(req));
      const id = String(body?.id || req.query?.id || "").trim();
      if (!id) return res.status(400).json({ error: "לא צוין צוות" });

      const defs = await loadDefinitions();
      const def = defs.find((d) => d.id === id);
      if (!def) return res.status(404).json({ error: "הצוות אינו נמצא" });

      const [asg, tasks] = await Promise.all([
        loadAssignments(),
        teamsReady() ? loadTeamTasks() : Promise.resolve([]),
      ]);
      const rows = asg.filter((a) => a.placement === id);
      const jobs = tasks.filter((t) => t.team === id);

      if (rows.length || jobs.length) {
        const bits = [];
        if (rows.length) bits.push(`${rows.length} שיבוצים`);
        if (jobs.length) bits.push(`${jobs.length} משימות`);
        return res.status(400).json({
          error: `ל"${def.name}" יש ${bits.join(" ו")}. מחיקה תאבד אותם — `
            + "אפשר לסמן את הצוות כמוארכב במקום, וההיסטוריה תישמר",
          blocked: { assignments: rows.length, tasks: jobs.length },
        });
      }

      await gql(`mutation($i:ID!){ delete_item(item_id:$i){ id } }`, { i: id });
      invalidatePlacements();
      invalidateTeams();
      return res.status(200).json({ ok: true, deleted: def.name });
    }

    /* ============ אוצר המילים ============ */
    if (req.method === "PUT") {
      if (!teamsReady()) {
        return res.status(503).json({
          error: "לוחות ניהול הצוותים טרם הוקמו ב-monday", setupRequired: true,
        });
      }
      const body = req.body ?? (await readJson(req));
      const id = String(body?.id || "").trim();
      const vocab = await loadVocab();
      const all = [...vocab.statuses, ...vocab.stages];

      /* ⚠ **אין מחיקה, יש ארכוב.** משימות נושאות את המזהה,
         ומחיקה הייתה משאירה אותן עם ערך שאינו נפתר לכלום —
         והן היו נספרות כפתוחות בלי שאיש יבין למה. */
      if (body?.remove) {
        return res.status(400).json({
          error: 'שורה באוצר המילים אינה נמחקת אלא מסומנת "מוסתר" — משימות קיימות ממשיכות לשאת אותה',
        });
      }

      const name = clip(body?.name, MAX.name);
      const kind = clip(body?.kind, 20);
      if (!name) return res.status(400).json({ error: "אין שורה בלי שם" });
      if (!VOCAB_KINDS.includes(kind)) {
        return res.status(400).json({
          error: `סוג לא מוכר. האפשרויות: ${VOCAB_KINDS.join(" · ")}`,
        });
      }
      const dup = all.find((v) => v.name === name && v.kind === kind && v.id !== id);
      if (dup) return res.status(400).json({ error: `"${name}" כבר קיים כ${kind}` });

      let order = 0;
      if (body?.order !== undefined && String(body.order).trim() !== "") {
        const n = Number(body.order);
        if (!Number.isFinite(n)) return res.status(400).json({ error: "סדר הוא מספר" });
        order = n;
      }

      /* ⚠ `closes` הוא **הסמנטיקה של סטטוס בלבד**. "לאחר האירוע"
         שמסומן כסוגר היה שקר שקט על אחוז ההתקדמות של כל הצוותים.
         כאן זה נחסם, ולא רק "לא מוצג". */
      const closes = kind === VOCAB_KIND.status ? Boolean(body?.closes) : false;
      if (body?.closes && kind !== VOCAB_KIND.status) {
        return res.status(400).json({ error: '"נחשב סגור" קיים לסטטוס בלבד, לא לשלב' });
      }

      const cols = {
        [V.kind]: { label: kind },
        [V.order]: order,
        [V.closes]: { checked: closes ? "true" : "false" },
        [V.archived]: { checked: body?.archived ? "true" : "false" },
      };

      if (!id) {
        const created = await createItem(TEAM_BOARDS.vocab, name, cols);
        invalidateTeams();
        return res.status(200).json({ ok: true, id: created, created: true });
      }
      if (!all.find((v) => v.id === id) && !vocab.unknown.find((v) => v.id === id)) {
        return res.status(404).json({ error: "השורה אינה נמצאת" });
      }
      await renameItem(TEAM_BOARDS.vocab, id, name);
      await setColumns(TEAM_BOARDS.vocab, id, cols);
      invalidateTeams();

      /* ⚠ אחרי השינוי — האם נשאר סטטוס סוגר בכלל? מסך שיציג
         0% אחרי שמישהו הוריד את הסימון האחרון נראה כמו נתון,
         ולא כמו הגדרה חסרה (עיקרון 6). */
      const after = await loadVocab({ force: true });
      const closing = after.statuses.filter((s) => s.closes).length;
      return res.status(200).json({
        ok: true, id,
        warning: closing === 0
          ? 'אין כרגע אף סטטוס שמסומן "נחשב סגור", ולכן לא תוצג התקדמות באף צוות'
          : null,
      });
    }

    return res.status(405).json({ error: "רק GET, POST, PUT ו-DELETE נתמכים כאן" });
  } catch (e) {
    console.error("[team-admin]", e);
    res.status(502).json({ error: "שמירת ההגדרה נכשלה" });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}

export default withAuth(handler, { manager: true });
