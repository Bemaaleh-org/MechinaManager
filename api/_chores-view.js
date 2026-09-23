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
import { mayEdit } from "../shared/edit-rights.js";
import {
  choresReady, loadSectors, loadRoster, loadAdjusts, loadChecklist, loadDone,
  loadTexts, choreStudents, loadLeaderWeeks, eveningSectors, dailySector,
} from "./_chores-data.js";
import {
  mayChores, mayAssign, tallySector, suggestFor, KIND, SAME_SECTOR_WARN,
  countedRows,
  onDay, WHEN,
} from "../shared/chores.js";
import { weekPublic, weekWarnings } from "./_leader-weeks.js";
import { weekIndexFor } from "../shared/week-span.js";
import { todayFor } from "./_attendance-data.js";
import { maySeeLeaders, leadSecretNote, LEAD_SECRET_STAFF }
  from "../shared/lead-secret.js";

/** יום בשבוע בעברית מתאריך ISO */
const DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const dowOf = (iso) => DOW[new Date(iso + "T00:00:00Z").getUTCDay()];

/**
 * התורנות הבאה של חניך אחד — היומית והערבית.
 * ⚠ **מהיום והלאה**, כולל היום עצמו: תורן מטבח שנכנס בבוקר
 *   צריך לראות "היום", ולא את השבוע הבא.
 * ⚠ ומחזיר `null` כשאין — ולא תאריך ריק שנראה כמו תקלה.
 */
function myNext(rows, sectors, me, today, weeks) {
  if (!me) return { nextDaily: null, nextEvening: null };
  const byId = new Map(sectors.list.map((s) => [s.id, s]));
  const mine = rows.filter((r) => r.student === me);

  const daily = mine
    .filter((r) => r.date && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;

  const wById = new Map(weeks.map((w) => [w.id, w]));
  const evening = mine
    .filter((r) => r.week && wById.has(r.week) && wById.get(r.week).end >= today)
    .sort((a, b) => wById.get(a.week).start.localeCompare(wById.get(b.week).start))[0] || null;

  return {
    nextDaily: daily ? { date: daily.date, sector: (byId.get(daily.sector) || {}).name || null } : null,
    nextEvening: evening ? {
      sector: (byId.get(evening.sector) || {}).name || null,
      start: wById.get(evening.week).start,
      end: wById.get(evening.week).end,
      num: wById.get(evening.week).num,
      /* ⚠ התווית מהשרת — שבועות חופפים הם "שבוע 3-4" (22.9.2026). */
      label: wById.get(evening.week).spanLabel || null,
    } : null,
  };
}

async function handler(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "רק GET נתמך כאן" });
  if (!choresReady()) {
    return res.status(503).json({
      error: "לוחות התורניות טרם הוקמו ב-monday", setupRequired: true,
    });
  }

  try {
    const perm = mayChores(session);
    /* ⚠ **`todayFor` ולא `israelToday`.** מרגע שחשיפת המובילים
       תלויה בתאריך, אי אפשר לבדוק את הגבול בלי להזיז את "היום" —
       והשער חסום בכל דיפלוי ממילא (api/_test-date.js). */
    const today = todayFor(req);

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

    /* ============================================================
       ⚠ **שני שבועות בכל פעם, אבל אפשר לדפדף לכל השנה.**

       ברירת המחדל היא השבוע הנוכחי והבא — זה מה שאב הבית עושה
       ביום שני בבוקר. אבל תכנון לטווח ארוך ובדיקה של מה שהיה
       דורשים גישה לכל השבועות, ולכן `?week=<id>` פותח כל אחד
       מהם.

       ⚠ **מזהה שאינו קיים נופל חזרה להווה ואינו זורק.** קישור
         ישן, שבוע שנמחק, או הקלדה — כולם צריכים להחזיר מסך
         עובד ולא שגיאה. ו-`weekAt` מוחזר כדי שהמסך יידע איפה
         הוא באמת נמצא, ולא יסמן שבוע שלא נטען.
       ============================================================ */
    const askedId = String(req.query?.week || "").trim();
    const askedIdx = askedId ? weeks.findIndex((w) => w.id === askedId) : -1;
    /* ⚠⚠ **נפילה לאחור היא "הבא" ולא "הראשון"** (22.9.2026).
       בין שבוע לשבוע יש פערים בלוח, ובימים האלה `nowIdx` הוא
       -1 — ואינדקס 0 החזיר את המשתמש לספטמבר בכל פתיחה.
       ראו `weekIndexFor` ב-shared/week-span.js. */
    /* ============================================================
       ⚠⚠⚠ **אשכול אחד = תקופה אחת** (22.9.2026).

       שתי שורות חופפות בלוח הופיעו כאן כשתי תקופות עם **אותה
       תווית ואותם ימים**: "שבוע 3-4 (22.9–5.10)" ו"שבוע 3-4
       (27.9–1.10)", והימים 27.9–1.10 הוצגו פעמיים. זה בדיוק
       מה שראש המכינה תיאר כ"מבלבל בין התאריכים".

       ⚠ **הנציג הוא השורה הרחבה ביותר** (המוקדמת ביותר
         באשכול, שהיא זו שבולעת) — יציב, ולא תלוי במי שובץ.
       ⚠⚠ **והשיבוצים נאספים מכל שורות האשכול**, כדי ששיבוץ
         שנרשם על השורה השנייה יישאר גלוי ויהיה אפשר לנקות
         אותו. שורה שאין לה מסך היא שורה שלא תימחק לעולם (4צ).
       ============================================================ */
    const spanRows = new Map();
    for (const w of weeks) {
      const k = w.spanKey || w.id;
      if (!spanRows.has(k)) spanRows.set(k, []);
      spanRows.get(k).push(w);
    }
    /* נציג לכל אשכול, בסדר הכרונולוגי של `weeks`. */
    const spanList = [];
    const seenSpan = new Set();
    for (const w of weeks) {
      const k = w.spanKey || w.id;
      if (seenSpan.has(k)) continue;
      seenSpan.add(k);
      spanList.push(w);
    }
    /* ⚠ מזהה שנשלח עשוי להיות של השורה המשנית — נופלים לאשכול
       שלה ולא ל"לא נמצא" (4ר). */
    const askedKey = askedIdx >= 0 ? (weeks[askedIdx].spanKey || askedId) : "";
    const askedSpan = askedKey ? spanList.findIndex((w) => (w.spanKey || w.id) === askedKey) : -1;
    /* ⚠⚠ **נפילה לאחור היא "הבא" ולא "הראשון"** (22.9.2026).
       בין שבוע לשבוע יש פערים בלוח, ובימים האלה `nowIdx` הוא
       -1 — ואינדקס 0 החזיר את המשתמש לספטמבר בכל פתיחה.
       ראו `weekIndexFor` ב-shared/week-span.js. */
    const from = askedSpan >= 0 ? askedSpan
      : Math.max(0, weekIndexFor(spanList.map((w) => ({
        start: w.spanStart || w.start, end: w.spanEnd || w.end,
      })), today));
    const near = spanList.slice(from, from + 2);

    /* ---------- טבלת המעקב ---------- */
    const byLeader = new Map(weeks.map((w) => [w.id, new Set(w.leaderIds.map(String))]));
    const tallies = {};
    for (const s of sectors.list) {
      tallies[s.id] = tallySector(
        students,
        /* ⚠ יום ג׳ ויום ו׳ הם תורנות אחת — ראו `countedRows`
           ב-shared/chores.js. הספירה בלבד; השורות נשארות. */
        countedRows(roster.list.filter((r) => r.sector === s.id)),
        adjusts.filter((a) => a.sector === s.id));
    }

    /* ---------- מי משובץ לאן, בתקופות הקרובות ---------- */
    /* ⚠ מכל שורות האשכול ולא מהנציג בלבד — ראו ההערה מעל. */
    const idsOf = (w) => (spanRows.get(w.spanKey || w.id) || [w]).map((x) => x.id);
    const weekRows = (w) => {
      const ids = new Set(idsOf(w));
      return roster.list.filter((r) => ids.has(r.week));
    };
    const periods = near.map((w) => {
      const leaders = new Set();
      for (const id of idsOf(w)) for (const x of (byLeader.get(id) || [])) leaders.add(x);
      /* ============================================================
         ⚠⚠ **החשיפה בתחילת השבוע** (ראש המכינה, 23.9.2026)

         עד 0:00 של היום שאחרי תחילת התקופה, השמות אינם יוצאים
         לשאר החניכים — לא כרשימה ולא כמזהים. ⚠ **ומזהים גם
         הם שמות כאן**: אותה תשובה נושאת את כל המצבה עם
         `{id, name}`, ולכן החזרת מזהים "בלי שמות" אינה מסתירה
         דבר.

         שלושה שרואים גם לפני:
           · צוות — ההרשאה שלו רחבה ממילא.
           · המובילים עצמם — הם מי שהוכן איתו מראש (5יא).
           · **מי שמשבץ תורנויות** — מוביל פטור מתורנות והשרת
             חוסם שיבוץ שלו; אב בית שלא יראה מי הם היה בוחר
             אחד מהם ומקבל 403 **עם השם בהודעה**. ההסתרה שם לא
             מסתירה, רק מחליפה חיווי מראש בשגיאה בדיעבד (4יד).

         ⚠ **התקופה ולא השורה**: שבועות חופפים הם תקופה אחת
           במסך ("שבוע 3-4"), ולתקופה אחת יש חשיפה אחת.
         ============================================================ */
      const myId = String(session.itemId || "");
      const iLead = leaders.has(myId);
      const assigns = Boolean(perm.assign || perm.assignDaily || perm.daily);
      const start = w.spanStart || w.start;
      const see = maySeeLeaders({
        start, today, staff: !session.isStudent, isLeader: iLead, assigns,
      });
      const revealed = !start || today > start;
      return {
        ...weekPublic(w),
        /* ⚠ **כל מזהי האשכול**, כדי שקורא שביקש שורה מסוימת
           יזהה שהתקופה שחזרה היא שלה. בלעדיו `?week=<משני>`
           מחזיר תקופה עם מזהה אחר, וזה נראה כמו "לא נמצא". */
        ids: idsOf(w),
        /* ⚠ מובילי השבוע מסומנים ואינם מוסתרים — חניך שלא יראה
           את עצמו ברשימה יחשוב שנשכח, ולא שהוא פטור. */
        leaders: see ? [...leaders] : [],
        leaderNames: see
          ? students.filter((s) => leaders.has(s.id)).map((s) => s.name) : [],
        /* ⚠ **נאמר ולא מושמט.** רשימה ריקה נקראת כמו "טרם
           שובצו" ושולחת לשאול את אב הבית (עיקרון 6). */
        leadersHidden: !see && leaders.size > 0,
        leadersNote: !see && leaders.size > 0 ? leadSecretNote(start) : null,
        /* ⚠ ולמי שכן רואה — שזה עדיין אינו פומבי. */
        leadersPrivate: see && !revealed && leaders.size > 0 ? LEAD_SECRET_STAFF : null,
        sectors: evening.map((s) => ({
          id: s.id, name: s.name, cap: s.cap,
          members: weekRows(w).filter((r) => r.sector === s.id)
            .map((r) => ({ id: r.student, name: r.studentName })),
        })),
        /* ---------- התורנות היומית של השבוע ---------- */
        /* ⚠ ימי **האשכול** ולא של השורה — אחרת חצי מהשבוע
           המאוחד לא היה מופיע בכלל. */
        days: eachDay(w.spanStart || w.start, w.spanEnd || w.end).map((iso) => {
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
    /* ⚠ **הסדר הוא סדר היום.** תורן שרואה 33 מטלות ברשימה אחת
       אינו יודע מה לעשות עכשיו; תורן שרואה "אחרי ארוחת בוקר —
       ארבע מטלות" יודע. */
    const whenRank = (c) => {
      const i = WHEN.indexOf(c.when || WHEN[0]);
      return i < 0 ? WHEN.length : i;
    };
    /* ⚠ **`onDay` ולא השוואת מחרוזת.** מטלה יכולה לשאת רשימת
       ימים ("א,ד") ולא יום אחד, וההשוואה הישנה הייתה מעלימה
       אותה מכל יום. הכלל יושב ב-shared כדי שהמסך יסנן בדיוק
       כמו השרת. */
    const todayItems = live.filter((c) => onDay(c, dowOf(today)))
      .sort((a, b) => whenRank(a) - whenRank(b) || (a.order - b.order)
        || a.task.localeCompare(b.task, "he"));
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
        /* ⚠ **עריכת נוסח היא ראש המכינה בלבד**, וזה שונה
           מ-assign שכולל גם את אב הבית. אלה נהלים של המכינה,
           לא הגדרות של מסך — ולכן דגל נפרד ולא שימוש חוזר. */
        headText: Boolean(session.isHead),
        /* ⚠ **התפריט השבועי אינו נוהל, ולכן דגל נפרד שלישי.**
           `headText` הוא לנהלים של המכינה ו-`assign` הוא
           לשיבוץ תורנויות; התפריט הוא תוכן תפעולי של המטבח,
           ומי שכותב אותו הוא אחראי המטבח (וראש המכינה).
           שימוש חוזר באחד מהשניים היה פותח נהלים לאחראי
           המטבח או סוגר לו את התפריט (5יז). */
        menuText: mayEdit(session, "kitchen"),
        /* ============================================================
           ⚠ **התורנות הבאה שלי — נגזרת מכל הלוח ולא משבועיים.**
             `periods` מחזיק שבועיים קדימה בלבד, כי זה מה שאב
             הבית משבץ. השאלה של החניך היא אחרת לגמרי — "מתי
             אני במטבח" — והתשובה עשויה להיות בעוד שלושה שבועות.
           ⚠ ומיפוי מפורש: תאריך ושם הגזרה, בלי שמות של אחרים.
           ============================================================ */
        ...myNext(roster.list, sectors, String(session.itemId || ""), today, weeks),
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
        /* ⚠ מיפוי מפורש: `days` ו-`when` נשלחים כדי שהעורך
           יציג את מה שנשמר, והמסך יקבץ לפי סדר היום. */
        items: todayItems.map((c) => ({
          id: c.id, task: c.task, area: c.area, day: c.day,
          days: c.days || "", when: c.when || WHEN[0],
          done: doneToday.has(c.id),
        })),
        /* ⚠ אוצר המילים מגיע מהשרת ואינו מוקלד במסך — תווית
           שתשתנה בלוח לא תשבור את העורך. */
        whenOptions: WHEN,
        onDuty: onDutyToday.map((r) => ({ id: r.student, name: r.studentName })),
      },
      texts: [...texts.values()].map((t) => ({
        key: t.key, title: t.title, body: t.body, by: t.by, at: t.at,
      })),
      /* ============================================================
         ⚠ **רשימת כל השבועות מוחזרת לכולם ולא רק לאב הבית.**
           היא כבר גלויה בלוח מובילי השבוע, והחניך צריך אותה
           כדי לדפדף אחורה ולראות מתי הוא כבר עשה תורנות. מיפוי
           מפורש: תאריכים ומספר בלבד, בלי המובילים ובלי ההערות.
         ============================================================ */
      /* ⚠ אשכול אחד = שורה אחת ברשימת הניווט. שתי שורות עם
         אותה תווית ואותם תאריכים נראות כמו תקלה. */
      weeks: spanList.map((w) => weekPublic(w, {
        now: nowIdx >= 0 && (weeks[nowIdx].spanKey || weeks[nowIdx].id) === (w.spanKey || w.id),
      })),
      /* ⚠ חפיפות בלוח — מדווחות ואינן נבלעות (4ט). המסך אומר
         לראש המכינה מה לתקן, והתווית חוזרת מעצמה. */
      weekWarnings: await weekWarnings(),
      /* איפה אנחנו באמת — ולא איפה ביקשו */
      weekAt: near[0] ? near[0].id : null,
      atNow: from === nowIdx,
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

    /* ============================================================
       מה שדרוש כדי לשבץ
       ------------------------------------------------------------
       ⚠ **לא "אב הבית" אלא "מי שמשבץ משהו".** אחראי המטבח משבץ
         את התורנות היומית (ולא את גזרות הערב), ולכן הוא צריך
         את רשימת החניכים ואת השבועות בדיוק כמוהו.

       ⚠ **וההצעות וההתאמות מסוננות לגזרות שהקורא באמת משבץ.**
         מיפוי מפורש ולא השמטה — אחרת גזרה שתיווצר מחר תיפתח
         מעצמה למי שאינו משבץ אותה.
       ============================================================ */
    const mine = sectors.list.filter((s) => mayAssign(perm, s.kind));
    if (req.query?.admin && mine.length) {
      const wid = near[0] ? near[0].id : null;
      const leaders = wid ? (byLeader.get(wid) || new Set()) : new Set();
      const mineIds = new Set(mine.map((s) => s.id));
      body.admin = {
        students,
        weeks: weeks.map((w) => weekPublic(w, {
          leaders: w.leaderIds.map(String),
        })),
        /* ⚠ ההמלצה מחושבת **בלי מובילי השבוע** — הצעה לשבץ את מי
           שאי אפשר לשבץ היא רעש שמלמד להתעלם מההמלצות. */
        suggest: Object.fromEntries(mine.map((s) =>
          [s.id, suggestFor(tallies[s.id], { exclude: [...leaders] })])),
        /* הגזרות שמותר לי לתקן בהן ספירה — הבורר במסך נבנה מהן */
        sectors: mine.map((s) => ({ id: s.id, name: s.name, kind: s.kind })),
        adjusts: adjusts.filter((a) => mineIds.has(a.sector)).map((a) => ({
          id: a.id, student: a.student, studentName: a.studentName,
          sector: a.sector, sectorName: a.sectorName,
          delta: a.delta, reason: a.reason, by: a.by, at: a.at,
        })),
      };
    }

    /* ---------- הצ׳ק ליסט המלא, למי שעורך אותו ---------- */
    if (req.query?.admin && perm.daily) {
      /* ⚠ מיפוי מפורש: `days` ו-`when` נשלחים כדי שהעורך יציג
         את מה שנשמר. עמודה חדשה בלוח לא תדלוף מעצמה (עיקרון 4). */
      body.template = live.map((c) => ({
        id: c.id, task: c.task, day: c.day, days: c.days || "",
        when: c.when || WHEN[0], area: c.area, order: c.order,
      }));
      body.archivedTemplate = checklist.filter((c) => c.archived)
        .map((c) => ({ id: c.id, task: c.task, day: c.day, area: c.area }));
    }

    return res.status(200).json(body);
  } catch (e) {
    if (/תאריך בדיקה/.test(e.message)) return res.status(400).json({ error: e.message });
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
