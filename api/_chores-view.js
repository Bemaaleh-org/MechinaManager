/* ============================================================
   /api/chores?action=view
     GET                  מה שכולם רואים
     GET ?admin=1         בתוספת מה שאב הבית צריך כדי לשבץ

   ⚠ **קריאה אחת ולא חמש.** המסך מציג גזרות, שיבוצים, מונים,
     ממוצעים, המלצות וצ׳ק ליסט — ומסך שנוחת בחמישה שלבים גורם
     לתוכן לקפוץ מתחת לאצבע.

   ⚠ **הכול נגזר בכל קריאה.** אין מונה שמור בשום מקום, ולכן
     מחיקת שורת שיבוץ ב-monday מתקנת את הטבלה מיד ולמפרע.
   ============================================================ */

import { withAuth } from "./_session.js";
import {
  choresReady, loadSectors, loadRoster, loadAdjusts, loadChecklist, loadDone,
  loadTexts, choreStudents, loadLeaderWeeks, eveningSectors, dailySector,
} from "./_chores-data.js";
import {
  mayChores, tallySector, suggestFor, KIND, SAME_SECTOR_WARN,
} from "../shared/chores.js";
import { israelToday } from "./_attendance-data.js";

/** יום בשבוע בעברית מתאריך ISO */
const DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const dowOf = (iso) => DOW[new Date(iso + "T00:00:00Z").getUTCDay()];

async function handler(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "רק GET נתמך כאן" });
  if (!choresReady()) {
    return res.status(503).json({
      error: "לוחות התורניות טרם הוקמו ב-monday", setupRequired: true,
    });
  }

  try {
    const perm = mayChores(session);
    const today = israelToday();

    const [sectors, roster, adjusts, students, weeks, checklist, doneRows, texts] =
      await Promise.all([
        loadSectors(), loadRoster(), loadAdjusts(), choreStudents(),
        loadLeaderWeeks(), loadChecklist(), loadDone(), loadTexts(),
      ]);

    const evening = eveningSectors(sectors);
    const daily = dailySector(sectors);

    /* ============================================================
       השבוע הנוכחי והבא
       ------------------------------------------------------------
       ⚠ **התקופה נגזרת משבועות ההובלה ואינה נספרת מאפס.** אב
         הבית מסובב תורניות כשקדנציית מוביל מסתיימת, ושתי מערכות
         שבועות מקבילות היו נפרדות זו מזו כבר בחג הראשון.
       ============================================================ */
    const nowIdx = weeks.findIndex((w) => w.start <= today && today <= w.end);
    const near = nowIdx >= 0 ? weeks.slice(nowIdx, nowIdx + 2) : weeks.slice(0, 2);

    /* ---------- טבלת המעקב ---------- */
    const byLeader = new Map(weeks.map((w) => [w.id, new Set(w.leaderIds.map(String))]));
    const tallies = {};
    for (const s of sectors.list) {
      tallies[s.id] = tallySector(
        students,
        roster.list.filter((r) => r.sector === s.id),
        adjusts.filter((a) => a.sector === s.id));
    }

    /* ---------- מי משובץ לאן, בתקופות הקרובות ---------- */
    const weekRows = (weekId) => roster.list.filter((r) => r.week === weekId);
    const periods = near.map((w) => {
      const leaders = byLeader.get(w.id) || new Set();
      return {
        id: w.id, num: w.num, name: w.name, start: w.start, end: w.end,
        /* ⚠ מובילי השבוע מסומנים ואינם מוסתרים — חניך שלא יראה
           את עצמו ברשימה יחשוב שנשכח, ולא שהוא פטור. */
        leaders: [...leaders],
        leaderNames: students.filter((s) => leaders.has(s.id)).map((s) => s.name),
        sectors: evening.map((s) => ({
          id: s.id, name: s.name, cap: s.cap,
          members: weekRows(w.id).filter((r) => r.sector === s.id)
            .map((r) => ({ id: r.student, name: r.studentName })),
        })),
        /* ---------- התורנות היומית של השבוע ---------- */
        days: eachDay(w.start, w.end).map((iso) => {
          const on = roster.list.filter((r) => r.date === iso && daily && r.sector === daily.id);
          /* ⚠ מאיזו גזרת ערב נלקח כל תורן — זו השאלה שאב הבית
             שואל כשהוא בוחר, ולכן היא מחושבת כאן ולא במסך. */
          const from = new Map();
          for (const r of on) {
            const ev = weekRows(w.id).find((x) => x.student === r.student
              && evening.some((s) => s.id === x.sector));
            const k = ev ? ev.sectorName : "ללא גזרה";
            from.set(k, (from.get(k) || 0) + 1);
          }
          return {
            date: iso, dow: dowOf(iso),
            on: on.map((r) => ({ id: r.student, name: r.studentName })),
            from: [...from.entries()].map(([name, n]) => ({ name, n })),
            /* ⚠ מתריע ואינו חוסם — אב הבית יודע דברים שהמערכת
               אינה יודעת, ויום שבו אין ברירה הוא מצב אמיתי. */
            crowded: [...from.entries()].filter(([, n]) => n > SAME_SECTOR_WARN)
              .map(([name, n]) => `${n} מ${name}`),
          };
        }),
      };
    });

    /* ---------- הצ׳ק ליסט של היום ---------- */
    const live = checklist.filter((c) => !c.archived);
    const todayItems = live.filter((c) => c.day === "כל יום" || c.day === dowOf(today));
    const doneToday = new Set(doneRows.filter((d) => d.date === today).map((d) => d.item));
    const onDutyToday = daily
      ? roster.list.filter((r) => r.date === today && r.sector === daily.id)
      : [];

    const body = {
      me: {
        id: String(session.itemId || ""),
        ...perm,
        /* ⚠ הכפתור יודע מראש: רק תורן היום מסמן (4יד). */
        onDutyToday: onDutyToday.some((r) => r.student === String(session.itemId)),
      },
      today,
      sectors: sectors.list.map((s) => ({
        id: s.id, name: s.name, kind: s.kind, cap: s.cap,
        detail: s.detail, archived: s.archived,
        ...tallies[s.id] ? { total: tallies[s.id].total, avg: round(tallies[s.id].avg) } : {},
      })),
      periods,
      /* ============================================================
         ⚠ **טבלת המעקב גלויה לכולם, במכוון.** המכינה ביקשה זאת
           במפורש, וזו גם התשובה ל"תמיד אני": מי שרואה את המספרים
           של כולם יכול לבדוק בעצמו.

         ⚠ ואין כאן שום שדה שאומר **מי ביצע מה בפועל** — רק כמה
           פעמים כל אחד **שובץ**. זה עיקרון 5, והוא לא זז.
         ============================================================ */
      tally: sectors.list.map((s) => ({
        sector: s.id, name: s.name, kind: s.kind,
        avg: round(tallies[s.id].avg),
        hasData: tallies[s.id].hasData,
        per: tallies[s.id].per,
      })),
      checklist: {
        dow: dowOf(today),
        items: todayItems.map((c) => ({
          id: c.id, task: c.task, area: c.area, day: c.day,
          done: doneToday.has(c.id),
        })),
        onDuty: onDutyToday.map((r) => ({ id: r.student, name: r.studentName })),
      },
      texts: [...texts.values()].map((t) => ({
        key: t.key, title: t.title, body: t.body, by: t.by, at: t.at,
      })),
      warnings: [],
    };

    /* ---------- מה שבור ומה חסר ---------- */
    if (sectors.unknown.length) {
      body.warnings.push(`${sectors.unknown.length} גזרות בלי סוג מוכר: ${sectors.unknown.map((u) => u.name).join(" · ")}`);
    }
    if (roster.broken.length) {
      body.warnings.push(`${roster.broken.length} שורות שיבוץ בלי שבוע או בלי תאריך — הן אינן מוצגות בשום מסך`);
    }
    if (!daily) {
      body.warnings.push('אין גזרה מסוג "יומי", ולכן אי אפשר לשבץ תורני מטבח');
    }
    if (!evening.length) {
      body.warnings.push('אין אף גזרת "סוף יום"');
    }
    if (!weeks.length) {
      body.warnings.push("לוח מובילי השבוע ריק, ולכן אין תקופות לשבץ אליהן");
    }

    /* ---------- מה שרק אב הבית צריך ---------- */
    if (req.query?.admin && perm.assign) {
      const wid = near[0] ? near[0].id : null;
      const leaders = wid ? (byLeader.get(wid) || new Set()) : new Set();
      body.admin = {
        students,
        weeks: weeks.map((w) => ({
          id: w.id, num: w.num, name: w.name, start: w.start, end: w.end,
          leaders: w.leaderIds.map(String),
        })),
        /* ⚠ ההמלצה מחושבת **בלי מובילי השבוע** — הצעה לשבץ את מי
           שאי אפשר לשבץ היא רעש שמלמד להתעלם מההמלצות. */
        suggest: Object.fromEntries(sectors.list.map((s) =>
          [s.id, suggestFor(tallies[s.id], { exclude: [...leaders] })])),
        adjusts: adjusts.map((a) => ({
          id: a.id, student: a.student, studentName: a.studentName,
          sector: a.sector, sectorName: a.sectorName,
          delta: a.delta, reason: a.reason, by: a.by, at: a.at,
        })),
      };
    }

    /* ---------- הצ׳ק ליסט המלא, למי שעורך אותו ---------- */
    if (req.query?.admin && perm.daily) {
      body.template = live.map((c) => ({
        id: c.id, task: c.task, day: c.day, area: c.area, order: c.order,
      }));
      body.archivedTemplate = checklist.filter((c) => c.archived)
        .map((c) => ({ id: c.id, task: c.task, day: c.day, area: c.area }));
    }

    return res.status(200).json(body);
  } catch (e) {
    console.error("[chores:view]", e);
    res.status(502).json({ error: "טעינת התורניות נכשלה" });
  }
}

const round = (n) => Math.round(n * 10) / 10;

/** כל התאריכים בין שני ISO, כולל. ⚠ שבוע סגור מחזיר ריק ולא נופל. */
function eachDay(from, to) {
  const out = [];
  if (!from || !to || from > to) return out;
  let d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  /* ⚠ תקרה של 31 — שבוע עם תאריכים שגויים בלוח לא ייצור לולאה
     אינסופית שמפילה את הבקשה. */
  for (let i = 0; d <= end && i < 31; i++) {
    out.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 86400000);
  }
  return out;
}

export default withAuth(handler, { student: true });
