/* ============================================================
   מסלולי הכתיבה של התורניות
     ?action=assign     POST   שיבוץ גזרה לשבוע, או יום לתורנות
     ?action=sector     POST   הגדרת גזרה — יצירה ועריכה
     ?action=adjust     POST   +1 / -1 ידני על הספירה
     ?action=task       POST/PUT/DELETE   תבנית הצ׳ק ליסט
     ?action=tick       POST   סימון מטלה כבוצעה, וביטול
     ?action=text       PUT    עריכת בלוק טקסט

   ⚠ **שישה מסלולים בקובץ אחד, ולא שישה קבצים.** כולם נוגעים
     באותם חמישה לוחות ובאותו `mayChores`, ופיצול היה מפזר את
     ההרשאה לשישה מקומות שמתפצלים בתיקון הראשון.
   ============================================================ */

import { withAuth } from "./_session.js";
import { gql } from "./_monday.js";
import { CHORE_BOARDS, CHORE_COLS } from "../shared/chores-ids.js";
import {
  mayChores, choreHint, KIND, KINDS, SAME_SECTOR_WARN,
  fridayAfterTuesday,
  WHEN, DOW_LETTERS,
} from "../shared/chores.js";
import {
  choresReady, loadSectors, loadRoster, loadAdjusts, loadChecklist, loadDone,
  loadTexts, choreStudents, loadLeaderWeeks, invalidateChores,
  createItem, setColumns, deleteItem, renameItem, eveningSectors, dailySector,
} from "./_chores-data.js";
import { assignableStudents } from "./_student-rows.js";
import { israelToday } from "./_attendance-data.js";

const S = CHORE_COLS.sectors;
const R = CHORE_COLS.roster;
const A = CHORE_COLS.adjust;
const C = CHORE_COLS.checklist;
const D = CHORE_COLS.done;
const T = CHORE_COLS.texts;

const DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const DAYS = ["כל יום", ...DOW];
const dowOf = (iso) => DOW[new Date(iso + "T00:00:00Z").getUTCDay()];
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

/* ============================================================
   שיבוץ
   ============================================================ */
export const assign = withAuth(async (req, res, session) => {
  if (req.method !== "POST") return res.status(405).json({ error: "רק POST נתמך כאן" });
  const perm = mayChores(session);
  if (!perm.assign) return res.status(403).json({ error: choreHint("assign") });
  if (!choresReady()) return res.status(503).json({ error: "לוחות התורניות טרם הוקמו", setupRequired: true });

  const body = req.body ?? (await readJson(req));
  const sectorId = String(body?.sector || "").trim();
  const weekId = String(body?.week || "").trim();
  const date = String(body?.date || "").trim();
  const ids = Array.isArray(body?.students)
    ? [...new Set(body.students.map((x) => String(x).trim()).filter(Boolean))]
    : null;
  if (!ids) return res.status(400).json({ error: "לא נשלחה רשימת חניכים" });

  const sectors = await loadSectors();
  const sector = sectors.list.find((s) => s.id === sectorId);
  if (!sector) return res.status(404).json({ error: "הגזרה אינה נמצאת" });

  /* ⚠ **שבוע לגזרת ערב, תאריך לגזרה יומית.** לא "אחד מהם" —
     כל סוג והשדה שלו, ושליחה הפוכה נדחית במפורש. שורה עם
     השדה הלא-נכון פשוט לא הייתה מופיעה בשום מסך. */
  if (sector.kind === KIND.evening) {
    if (!weekId || date) {
      return res.status(400).json({ error: `"${sector.name}" היא גזרת סוף יום — משבצים אליה שבוע ולא תאריך` });
    }
  } else if (sector.kind === KIND.daily) {
    if (!date || weekId) {
      return res.status(400).json({ error: `"${sector.name}" היא תורנות יומית — משבצים אליה תאריך ולא שבוע` });
    }
    if (!isDate(date)) return res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" });
  } else {
    return res.status(400).json({ error: `לגזרה "${sector.name}" אין סוג מוכר, ואי אפשר לשבץ אליה` });
  }

  const weeks = await loadLeaderWeeks();
  const week = weekId ? weeks.find((w) => w.id === weekId) : await weekFor(weeks, date);
  if (weekId && !week) return res.status(404).json({ error: "השבוע אינו נמצא" });

  /* ---------- מי מותר ---------- */
  const roster = await assignableStudents();
  const byId = new Map(roster.map((r) => [r.id, r]));
  const unknown = ids.filter((i) => !byId.has(i));
  if (unknown.length) {
    return res.status(400).json({ error: "ברשימה חניך שאינו פעיל או אינו קיים" });
  }

  /* ⚠ **מובילי השבוע פטורים, וזו חסימה ולא אזהרה.** המכינה
     קבעה שמוביל אינו עושה תורנות בשבוע שהוא מוביל — וזה נכון
     גם לגזרת הערב וגם לתורנות היומית שנופלת בתוך אותו שבוע. */
  if (week) {
    const leaders = new Set(week.leaderIds.map(String));
    const clash = ids.filter((i) => leaders.has(i));
    if (clash.length) {
      /* ⚠ **חסימה, ולא אזהרה, ולשני סוגי התורנות.** המכינה
         קבעה שמוביל שבוע פטור מתורנות בשבוע שהוא מוביל — וזה
         כולל במפורש את תורנות המטבח, שהיא יום שלם ומפקיעה
         אותו מהלו״ז בדיוק כשהוא אמור להוביל אותו.

         ⚠ והשבוע נגזר **מהתאריך** בתורנות היומית, לא נשלח
           מהדפדפן — אחרת אפשר היה לעקוף בשליחת שבוע אחר. */
      const what = sector.kind === KIND.daily ? "תורנות מטבח" : "תורנות";
      return res.status(400).json({
        error: `${clash.map((i) => byId.get(i).name).join(" · ")} `
          + `מוביל/ים את השבוע הזה, ומובילי שבוע פטורים מ${what} בשבוע שלהם`,
      });
    }
  }

  /* ⚠ מכסה: נאכפת בשרת ולא רק בתצוגה. `Number.isFinite` ולא
     `!= null` — ערך לא-מספרי בלוח נותן NaN, וההשוואה מולו
     תמיד false, כלומר האכיפה מתבטלת בשקט. */
  if (Number.isFinite(sector.cap) && ids.length > sector.cap) {
    return res.status(400).json({
      error: `ל"${sector.name}" ${sector.cap} מקומות — נשלחו ${ids.length}`,
    });
  }

  /* ---------- אזהרות שאינן חוסמות ---------- */
  const warnings = [];
  const all = await loadRoster({ force: true });
  if (sector.kind === KIND.daily && week) {
    const evening = eveningSectors(sectors);
    const from = new Map();
    for (const id of ids) {
      const ev = all.list.find((r) => r.week === week.id && r.student === id
        && evening.some((s) => s.id === r.sector));
      const k = ev ? ev.sectorName : "ללא גזרה";
      from.set(k, (from.get(k) || 0) + 1);
    }
    for (const [name, n] of from) {
      if (n > SAME_SECTOR_WARN) {
        /* ⚠ **מתריע ואינו חוסם.** יום שבו אין ברירה הוא מצב
           אמיתי, ואב הבית רואה את התמונה. חסימה כאן הייתה
           שולחת אותו לעקוף את המערכת. */
        warnings.push(`${n} תורנים מ"${name}" באותו יום — הגזרה תישאר חסרה`);
      }
    }
  }

  /* ---------- ההפרש ---------- */
  const scope = (r) => sector.kind === KIND.evening ? r.week === week.id : r.date === date;
  const current = all.list.filter((r) => r.sector === sector.id && scope(r));
  const want = new Set(ids);
  const drop = current.filter((r) => !want.has(r.student));
  const add = ids.filter((i) => !current.some((r) => r.student === i));

  for (const r of drop) await deleteItem(r.id);
  const stamp = new Date().toISOString();
  const who = String(session.name || "");
  for (const id of add) {
    const st = byId.get(id);
    const label = sector.kind === KIND.evening ? (week.name || `שבוע ${week.num}`) : date;
    await createItem(CHORE_BOARDS.roster, `${st.name} · ${sector.name} · ${label}`, {
      [R.student]: id, [R.studentName]: st.name,
      [R.sector]: sector.id, [R.sectorName]: sector.name,
      ...(sector.kind === KIND.evening
        ? { [R.week]: week.id, [R.weekName]: label }
        : { [R.date]: { date } }),
      [R.by]: who, [R.at]: stamp,
    });
  }
  /* ============================================================
     ⚠ יום ג׳ גורר את יום ו׳ — ברירת מחדל, לא כלל
     ------------------------------------------------------------
     בקשת המכינה: מי שמשובץ לתורנות המטבח ביום שלישי משובץ
     אוטומטית גם ביום שישי, והאחראי משנה אחר כך כרצונו.

     ⚠⚠ **רק כשיום שישי ריק לגמרי.** אחרת עריכה חוזרת של יום
       שלישי הייתה **מוחקת בשקט** שיבוץ שמישהו עשה ביד ביום
       שישי. פעולה שמוחקת עבודה של אדם אחר בלי לומר מילה היא
       בדיוק מה שאי אפשר לתקן — איש לא רואה שהיא קרתה.

     ⚠ **וכל בדיקה נעשית שוב על יום שישי, ולא מועתקת.** יום
       שישי עשוי ליפול בשבוע הובלה אחר (שבועות ההובלה הם טווחים
       של המכינה ואינם בהכרח ראשון–שבת), ומוביל שבוע שם פטור
       גם הוא. העתקה עיוורת הייתה שוברת בדיוק את הכלל שהמסלול
       הראשי אוכף.

     ⚠ **וכישלון במראה אינו מפיל את השיבוץ שהצליח.** יום שלישי
       כבר נשמר; אם שישי לא הסתדר, זה מדווח ב-`mirror` והמסך
       אומר זאת. 500 כאן היה נראה כאילו כלום לא נשמר.

     ⚠ `mirror: false` מכבה — כדי שעריכה של יום שישי עצמו, או
       אחראי שאינו רוצה את ההתנהגות, לא ייאלצו להילחם בה.
     ============================================================ */
  let mirror = null;
  const friday = sector.kind === KIND.daily && body?.mirror !== false
    ? fridayAfterTuesday(date) : null;

  if (friday) {
    try {
      const taken = all.list.filter((r) => r.sector === sector.id && r.date === friday);
      if (taken.length) {
        mirror = { date: friday, done: false, why: "כבר משובץ" };
      } else {
        const fWeek = await weekFor(weeks, friday);
        const fLeaders = new Set((fWeek ? fWeek.leaderIds : []).map(String));
        const keep = ids.filter((i) => !fLeaders.has(i));
        const skipped = ids.filter((i) => fLeaders.has(i)).map((i) => byId.get(i).name);

        for (const id of keep) {
          const st = byId.get(id);
          await createItem(CHORE_BOARDS.roster, `${st.name} · ${sector.name} · ${friday}`, {
            [R.student]: id, [R.studentName]: st.name,
            [R.sector]: sector.id, [R.sectorName]: sector.name,
            [R.date]: { date: friday },
            [R.by]: who, [R.at]: stamp,
          });
        }
        mirror = {
          date: friday, done: true, added: keep.length,
          skipped: skipped.length ? skipped : undefined,
        };
        if (skipped.length) {
          warnings.push(`${skipped.join(" · ")} מוביל/ים את השבוע של ${friday} `
            + "ולכן לא שובצו ליום שישי");
        }
      }
    } catch (e) {
      console.error("[chores:mirror-friday]", e);
      mirror = { date: friday, done: false, why: "השיבוץ ליום שישי נכשל" };
    }
  }

  invalidateChores();
  return res.status(200).json({
    ok: true, added: add.length, removed: drop.length, total: ids.length,
    warnings, mirror,
  });
}, { student: true });

/* ============================================================
   הגזרות — האוטונומיה של אב הבית
   ============================================================ */
export const sector = withAuth(async (req, res, session) => {
  const perm = mayChores(session);
  if (!choresReady()) return res.status(503).json({ error: "לוחות התורניות טרם הוקמו", setupRequired: true });
  const body = req.body ?? (await readJson(req));
  const id = String(body?.id || "").trim();
  const sectors = await loadSectors();
  const cur = id ? sectors.list.find((s) => s.id === id) : null;

  /* ⚠ **אחראי המטבח עורך את הגזרה היומית בלבד.** היא המטבח
     שלו — הפירוט והצ׳ק ליסט שלה. הגזרות של אב הבית אינן שלו. */
  const mayTouch = perm.sectors
    || (perm.daily && cur && cur.kind === KIND.daily);
  if (!mayTouch) return res.status(403).json({ error: choreHint("sectors") });

  if (req.method !== "POST") return res.status(405).json({ error: "רק POST נתמך כאן" });

  const name = clip(body?.name, 80);
  if (!name) return res.status(400).json({ error: "אין גזרה בלי שם" });
  const kind = clip(body?.kind, 20) || (cur ? cur.kind : KIND.evening);
  if (!KINDS.includes(kind)) {
    return res.status(400).json({ error: `סוג לא מוכר. האפשרויות: ${KINDS.join(" · ")}` });
  }
  const dup = sectors.list.find((s) => s.name === name && s.id !== id);
  if (dup) return res.status(400).json({ error: `"${name}" כבר קיימת` });

  /* ⚠ מכסה: מספר שלם או ריק. `Number("שלושה")` הוא NaN, ו-NaN
     מבטל את האכיפה בשקט — נתפס כאן ולא הופך לבאג נדיר. */
  let cap = "";
  if (body?.cap !== undefined && String(body.cap).trim() !== "") {
    const n = Number(body.cap);
    if (!Number.isFinite(n) || n < 0 || n !== Math.floor(n)) {
      return res.status(400).json({ error: "כמות החניכים היא מספר שלם, או ריק לבלי הגבלה" });
    }
    cap = n;
  }

  const cols = {
    [S.kind]: { label: kind },
    [S.cap]: cap,
    [S.detail]: clip(body?.detail, 4000),
  };
  if (body?.order !== undefined && String(body.order).trim() !== "") {
    const n = Number(body.order);
    if (Number.isFinite(n)) cols[S.order] = n;
  }
  if (body?.archived !== undefined) {
    cols[S.archived] = { checked: body.archived ? "true" : "false" };
  }

  if (!id) {
    if (!perm.sectors) return res.status(403).json({ error: choreHint("sectors") });
    /* ⚠ **גזרה יומית שנייה נחסמת.** `dailySector()` מחזירה את
       הראשונה, וגזרה יומית שנייה הייתה קיימת בלוח ובלתי נראית
       בכל מסך — בלי שגיאה. */
    if (kind === KIND.daily && dailySector(sectors)) {
      return res.status(400).json({
        error: `כבר קיימת תורנות יומית ("${dailySector(sectors).name}"). אפשר לשנות אותה במקום ליצור שנייה`,
      });
    }
    const made = await createItem(CHORE_BOARDS.sectors, name, cols);
    invalidateChores();
    return res.status(200).json({ ok: true, id: made, created: true });
  }

  if (!cur) return res.status(404).json({ error: "הגזרה אינה נמצאת" });
  /* ⚠ **שינוי סוג נחסם כשיש כבר שיבוצים.** שורות ערב נושאות
     `week` ושורות יומיות נושאות `date`; החלפת הסוג הופכת את
     כולן לשורות "שבורות" שאף מסך לא יציג — והן לא יימחקו
     לעולם כי אין להן מסך. */
  if (kind !== cur.kind) {
    const rows = (await loadRoster()).list.filter((r) => r.sector === id);
    if (rows.length) {
      return res.status(400).json({
        error: `ל"${cur.name}" יש ${rows.length} שיבוצים מסוג "${cur.kind}". שינוי הסוג יותיר אותם בלי מסך שמציג אותם — צריך למחוק אותם קודם`,
      });
    }
  }
  await renameItem(CHORE_BOARDS.sectors, id, name);
  await setColumns(CHORE_BOARDS.sectors, id, cols);
  invalidateChores();
  return res.status(200).json({ ok: true, id });
}, { student: true });

/* ============================================================
   התאמה ידנית
   ------------------------------------------------------------
   ⚠ **שורה חדשה ולא עדכון מספר.** "היה כצופר" ו"התחלף עם מישהו"
     הם שני אירועים, וכל אחד ראוי לסיבה משלו. מספר אחד שנדרס
     מוחק את ההיסטוריה של מה שקרה.
   ============================================================ */
export const adjust = withAuth(async (req, res, session) => {
  const perm = mayChores(session);
  if (!perm.assign) return res.status(403).json({ error: choreHint("assign") });
  if (!CHORE_BOARDS.adjust) return res.status(503).json({ error: "לוחות התורניות טרם הוקמו", setupRequired: true });
  const body = req.body ?? (await readJson(req));

  if (req.method === "DELETE") {
    const id = String(body?.id || "").trim();
    const hit = (await loadAdjusts()).find((a) => a.id === id);
    /* ⚠ מאומת מול הלוח ולא נמחק לפי מזהה שנשלח — `deleteItem`
       שולחת delete_item בלי board_id, וזה בדיוק החור שנסגר
       בהצפות (4ס). */
    if (!hit) return res.status(404).json({ error: "ההתאמה אינה נמצאת" });
    await deleteItem(id);
    invalidateChores();
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "רק POST ו-DELETE נתמכים כאן" });

  const studentId = String(body?.student || "").trim();
  const sectorId = String(body?.sector || "").trim();
  const delta = Number(body?.delta);
  if (!Number.isFinite(delta) || delta === 0 || delta !== Math.floor(delta)) {
    return res.status(400).json({ error: "השינוי הוא מספר שלם שאינו אפס — למשל 1 או 1-" });
  }
  const st = (await assignableStudents()).find((s) => s.id === studentId);
  if (!st) return res.status(400).json({ error: "החניך אינו פעיל או אינו קיים" });
  const sec = (await loadSectors()).list.find((s) => s.id === sectorId);
  if (!sec) return res.status(404).json({ error: "הגזרה אינה נמצאת" });

  const made = await createItem(CHORE_BOARDS.adjust,
    `${st.name} · ${sec.name} · ${delta > 0 ? "+" : ""}${delta}`, {
      [A.student]: st.id, [A.studentName]: st.name,
      [A.sector]: sec.id, [A.sectorName]: sec.name,
      [A.delta]: delta,
      [A.reason]: clip(body?.reason, 300),
      [A.by]: String(session.name || ""), [A.at]: new Date().toISOString(),
    });
  invalidateChores();
  return res.status(200).json({ ok: true, id: made });
}, { student: true });

/* ============================================================
   תבנית הצ׳ק ליסט — אחראי המטבח
   ============================================================ */
export const task = withAuth(async (req, res, session) => {
  const perm = mayChores(session);
  if (!perm.daily) return res.status(403).json({ error: choreHint("daily") });
  if (!CHORE_BOARDS.checklist) return res.status(503).json({ error: "לוחות התורניות טרם הוקמו", setupRequired: true });
  const body = req.body ?? (await readJson(req));

  if (req.method === "DELETE") {
    const id = String(body?.id || "").trim();
    const hit = (await loadChecklist()).find((c) => c.id === id);
    if (!hit) return res.status(404).json({ error: "המטלה אינה נמצאת" });
    /* ⚠ **מארכב ולא מוחק.** שורות ביצוע נושאות את המזהה, ומחיקה
       הייתה משאירה אותן מצביעות על כלום — והמעקב ההיסטורי היה
       מציג שורות בלי שם. אותו כלל כמו אוצר המילים של הצוותים. */
    await setColumns(CHORE_BOARDS.checklist, id, { [C.archived]: { checked: "true" } });
    invalidateChores();
    return res.status(200).json({ ok: true, archived: true });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "רק POST ו-DELETE נתמכים כאן" });

  const id = String(body?.id || "").trim();
  const taskName = clip(body?.task, 300);
  if (!taskName) return res.status(400).json({ error: "אין מטלה בלי טקסט" });
  /* ============================================================
     ⚠ **ימים מרובים, ולא יום אחד.**

     `day` הישן יכול לשאת "כל יום" או יום בודד, ומטלה שמתקיימת
     בימים א׳ ו-ד׳ בלבד לא הייתה ניתנת לביטוי בו — היה צריך
     לשכפל אותה לשתי שורות, ואז שינוי ניסוח דורש לזכור את
     שתיהן.

     ⚠ **הישן נכתב לצד החדש ולא נזנח**, כדי ששורה שנוצרת כאן
       תיראה נכון גם למי שפותח את הלוח ב-monday.
     ============================================================ */
  const rawDays = Array.isArray(body?.days) ? body.days : null;
  const days = rawDays
    ? [...new Set(rawDays.map((x) => String(x).trim()))].filter((x) => DOW_LETTERS.includes(x))
    : null;

  /* ⚠ רשימה ריקה **מפורשת** פירושה "כל יום", ולא "אף יום" —
     מטלה בלי אף יום אינה מצב שקיים, והיא הייתה נעלמת מכל מסך. */
  const everyDay = !days || days.length === 0 || days.length === DOW_LETTERS.length;

  const day = clip(body?.day, 10) || (everyDay ? "כל יום" : days[0]);
  if (!DAYS.includes(day)) {
    return res.status(400).json({ error: `יום לא מוכר. האפשרויות: ${DAYS.join(" · ")}` });
  }

  /* ⚠ תווית שאינה בלוח נדחית ברעש ואינה נוצרת בשקט. */
  const when = clip(body?.when, 40);
  if (when && !WHEN.includes(when)) {
    return res.status(400).json({ error: `"${when}" אינו זמן מוכר. האפשרויות: ${WHEN.join(" · ")}` });
  }

  const cols = {
    [C.day]: { label: day },
    [C.days]: everyDay ? "" : days.join(","),
    [C.when]: when ? { label: when } : { label: WHEN[0] },
    [C.area]: clip(body?.area, 120),
    [C.archived]: { checked: body?.archived ? "true" : "false" },
  };
  if (body?.order !== undefined && String(body.order).trim() !== "") {
    const n = Number(body.order);
    if (Number.isFinite(n)) cols[C.order] = n;
  }
  if (!id) {
    const made = await createItem(CHORE_BOARDS.checklist, taskName, cols);
    invalidateChores();
    return res.status(200).json({ ok: true, id: made, created: true });
  }
  if (!(await loadChecklist()).some((c) => c.id === id)) {
    return res.status(404).json({ error: "המטלה אינה נמצאת" });
  }
  await renameItem(CHORE_BOARDS.checklist, id, taskName);
  await setColumns(CHORE_BOARDS.checklist, id, cols);
  invalidateChores();
  return res.status(200).json({ ok: true, id });
}, { student: true });

/* ============================================================
   סימון ביצוע — תורני היום בלבד
   ------------------------------------------------------------
   ⚠⚠ **רק מי שמשובץ לתורנות באותו תאריך.** לא אב הבית, לא
     אחראי המטבח ולא ראש המכינה — הם **עוקבים** ואינם מסמנים.
     זו הבחנה שהמכינה ביקשה במפורש, והיא נכונה: סימון שמישהו
     אחר עשה במקום התורן הופך את הצ׳ק ליסט לרישום ולא לכלי.

   ⚠ **קיום שורה = בוצע**, וביטול הוא מחיקה. אין עמודת "בוצע"
     ולכן אין מצב שלישי שקוף שבו השורה קיימת ומסומנת "לא".
   ============================================================ */
export const tick = withAuth(async (req, res, session) => {
  if (req.method !== "POST") return res.status(405).json({ error: "רק POST נתמך כאן" });
  if (!CHORE_BOARDS.done) return res.status(503).json({ error: "לוחות התורניות טרם הוקמו", setupRequired: true });
  const body = req.body ?? (await readJson(req));
  const itemId = String(body?.item || "").trim();
  const want = body?.done !== false;
  const date = String(body?.date || "").trim() || israelToday();
  if (!isDate(date)) return res.status(400).json({ error: "תאריך בפורמט YYYY-MM-DD" });

  const sectors = await loadSectors();
  const daily = dailySector(sectors);
  if (!daily) return res.status(400).json({ error: 'אין גזרה מסוג "יומי"' });

  const me = String(session.itemId || "");
  const onDuty = (await loadRoster()).list.some(
    (r) => r.date === date && r.sector === daily.id && r.student === me);
  if (!onDuty) {
    return res.status(403).json({
      error: "סימון הצ׳ק ליסט נעשה על ידי תורני המטבח של אותו יום. לצפייה ולמעקב הגישה פתוחה",
    });
  }

  const item = (await loadChecklist()).find((c) => c.id === itemId);
  if (!item) return res.status(404).json({ error: "המטלה אינה נמצאת" });

  const rows = (await loadDone()).filter((d) => d.date === date && d.item === itemId);
  if (want) {
    /* ⚠ **אידמפוטנטי.** שני תורנים שלוחצים כמעט יחד שולחים אותה
       כוונה ומקבלים אותה תוצאה — עיקרון 5. שורה שכבר קיימת
       אינה מוכפלת ואינה שגיאה. */
    if (!rows.length) {
      await createItem(CHORE_BOARDS.done, `${item.task} · ${date}`, {
        [D.date]: { date }, [D.item]: item.id, [D.itemName]: item.task,
        [D.by]: String(session.name || ""), [D.byId]: me,
        [D.at]: new Date().toISOString(),
      });
    }
  } else {
    for (const r of rows) await deleteItem(r.id);
  }
  invalidateChores();
  return res.status(200).json({ ok: true, done: want });
}, { student: true });

/* ============================================================
   בלוקי הטקסט
   ------------------------------------------------------------
   ⚠ **ראש המכינה בלבד.** אלה נהלים שהמכינה כתבה, והם מופיעים
     בכמה מסכים — עריכה שלהם היא שינוי של מה שכתוב במכינה,
     ולא של מסך.
   ============================================================ */
export const text = withAuth(async (req, res, session) => {
  if (req.method !== "PUT") return res.status(405).json({ error: "רק PUT נתמך כאן" });
  if (!session.isHead) {
    return res.status(403).json({ error: "עריכת נוסח נעשית על ידי ראש המכינה" });
  }
  if (!CHORE_BOARDS.texts) return res.status(503).json({ error: "לוח הטקסטים טרם הוקם", setupRequired: true });

  const body = req.body ?? (await readJson(req));
  const key = clip(body?.key, 80);
  if (!key) return res.status(400).json({ error: "לא צוין מפתח" });
  const title = clip(body?.title, 200);
  const content = clip(body?.body, 20000);

  const texts = await loadTexts();
  const cols = {
    [T.title]: title, [T.body]: content,
    [T.by]: String(session.name || ""), [T.at]: new Date().toISOString(),
  };
  const cur = texts.get(key);
  if (cur) {
    await setColumns(CHORE_BOARDS.texts, cur.id, cols);
  } else {
    /* ⚠ **בלוק שנמחק נוצר מחדש עם אותו מפתח.** המפתח הוא שם
       הפריט ולא מזהה, ולכן אין מה לתקן בקוד. */
    await createItem(CHORE_BOARDS.texts, key, cols);
  }
  invalidateChores();
  return res.status(200).json({ ok: true, key });
}, { student: true });

async function weekFor(weeks, iso) {
  return weeks.find((w) => w.start <= iso && iso <= w.end) || null;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }
}
