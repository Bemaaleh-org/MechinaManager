/* ============================================================
   /api/students?action=team
     GET  ?id=<placementId>   כל מסך הצוות בקריאה אחת
     GET  (בלי id)            הצוותים שאני רשאי להיכנס אליהם

   ⚠ **קריאה אחת ולא ארבע.** מסך שנפתח בארבע בקשות מציג ארבעה
     שלבי טעינה ונשבר בארבע דרכים; זה גם מה שנעשה ב-`?action=duty`.

   ⚠ **המונים נגזרים בכל קריאה** ואינם נשמרים. סטטוס שמישהו
     יסמן בלוח כ"סוגר" משנה את אחוז ההתקדמות של כל הצוותים
     מיד ולמפרע — עיקרון 1 ו-4כו.

   ⚠ **`warnings` הוא חלק מהתשובה ולא לוג.** אוצר מילים בלי
     אף סטטוס סוגר, `kind` לא-מוכר, סטטוס שאינו נפתר — כולם
     דברים שהמסך חייב לומר. עיקרון 6: מצב שבור נראה אחרת
     ממצב ריק.
   ============================================================ */

import { withAuth } from "./_session.js";
import { placementsReady } from "../shared/placements.js";
import {
  teamsReady, loadVocab, loadTeamTasks, teamContext, teamsForStudent,
  closingIds, israelToday,
} from "./_team-data.js";
import { loadDefinitions } from "./_placements.js";
import { loadEvals } from "./_lessons-data.js";
import { mayTeam, mayEditTask, progressOf, isLate, isTeamCategory } from "../shared/team.js";
import {
  loadTeamEntries, loadTeamFeedback, loadTeamPolls,
} from "./_team-extras.js";
import { teamExtrasReady } from "../shared/team-ids.js";

/* ⚠ מיפוי מפורש ולא השמטה: עמודה חדשה בלוח לא תדלוף מעצמה */
const toTask = (t, closing, today) => ({
  id: t.id, title: t.title,
  owner: t.owner, ownerName: t.ownerName,
  status: t.status, statusName: t.statusName,
  stage: t.stage, stageName: t.stageName,
  due: t.due, note: t.note, link: t.link,
  by: t.by, byId: t.byId, at: t.at, upBy: t.upBy, upAt: t.upAt,
  done: closing.has(String(t.status)),
  late: isLate(t, closing, today),
});

async function handler(req, res, session) {
  if (req.method !== "GET") return res.status(405).json({ error: "רק GET נתמך כאן" });
  if (!placementsReady()) {
    return res.status(503).json({ error: "לוחות השיבוצים טרם הוקמו ב-monday", setupRequired: true });
  }
  if (!teamsReady()) {
    return res.status(503).json({ error: "לוחות ניהול הצוותים טרם הוקמו ב-monday", setupRequired: true });
  }

  try {
    const id = String(req.query?.id || "").trim();

    /* ---------- הרשימה: לאן מותר לי להיכנס ---------- */
    if (!id) {
      const defs = (await loadDefinitions()).filter((d) => isTeamCategory(d.category));
      const tasks = await loadTeamTasks();
      const vocab = await loadVocab();
      const closing = closingIds(vocab);
      const today = israelToday();

      const mine = session.isStudent
        ? new Set((await teamsForStudent(session.itemId)).map((t) => t.id))
        : null;

      const out = [];
      for (const d of defs) {
        /* ⚠ מוארכב מוסתר מהרשימה ונשאר נגיש בכניסה ישירה —
           קישור שנשלח בוואטסאפ לא אמור להישבר בגלל ארכוב. */
        if (d.archived) continue;
        if (mine && !mine.has(d.id)) continue;
        const mineTasks = tasks.filter((t) => t.team === d.id);
        out.push({
          id: d.id, name: d.name, category: d.category,
          chair: d.chair, chairName: d.chairName, lead: d.lead,
          progress: progressOf(mineTasks, closing),
          late: mineTasks.filter((t) => isLate(t, closing, today)).length,
          isChair: session.isStudent && d.chair === String(session.itemId),
        });
      }
      return res.status(200).json({
        teams: out.sort((a, b) => a.name.localeCompare(b.name, "he")),
        canManage: !session.isStudent,
      });
    }

    /* ---------- צוות אחד ---------- */
    const ctx = await teamContext(id);
    if (!ctx) return res.status(404).json({ error: "הצוות אינו נמצא" });
    if (ctx.unsupported) {
      return res.status(400).json({
        error: `ניהול משימות קיים לוועדה ולסדרה, ו"${ctx.def.name}" הוא ${ctx.def.category}`,
      });
    }

    const perm = mayTeam(session, ctx);
    if (!perm.read) {
      /* ⚠ 403 ולא 404: הוועדה עצמה אינה סוד — היא מופיעה
         בפרופיל של כל מי שמשובץ אליה. מה שסודי הוא התוכן. */
      return res.status(403).json({ error: "הצוות הזה אינו שלך" });
    }

    const [entriesAll, feedbackAll, pollsAll] = teamExtrasReady()
      ? await Promise.all([loadTeamEntries(), loadTeamFeedback(), loadTeamPolls()])
      : [[], [], { polls: [], votes: [] }];

    const [vocab, all, evals] = await Promise.all([
      loadVocab(), loadTeamTasks(), loadEvals().catch(() => []),
    ]);
    const closing = closingIds(vocab);
    const today = israelToday();
    const rows = all.filter((t) => t.team === ctx.def.id);

    /* ⚠ סטטוס שאינו נפתר — מדווח ולא נעלם, ונספר כפתוח */
    const known = new Set([...vocab.statuses, ...vocab.stages].map((v) => v.id));
    const orphan = rows.filter((t) => t.status && !known.has(String(t.status)));

    const warnings = [];
    if (closing.size === 0) {
      warnings.push('אין אף סטטוס שמסומן "נחשב סגור" בלוח אוצר המילים, ולכן אי אפשר לחשב התקדמות');
    }
    if (vocab.unknown.length) {
      warnings.push(`${vocab.unknown.length} שורות באוצר המילים בלי סוג מוכר: ${vocab.unknown.map((u) => u.name).join(" · ")}`);
    }
    if (orphan.length) {
      warnings.push(`${orphan.length} משימות נושאות סטטוס שכבר אינו קיים, והן נספרות כפתוחות`);
    }
    const dead = ctx.members.filter((m) => !m.active);
    if (dead.length && perm.manage) {
      warnings.push(`בצוות ${dead.length} משובצים שאינם פעילים: ${dead.map((m) => m.name).join(" · ")}`);
    }
    /* ⚠ ועדה בלי משובצים — הבורר "באחריות" ריק, וזה נראה כמו
       תקלה. האמירה המפורשת שולחת למסך שבו מתקנים את זה, ולא
       משאירה את המנהל להסיק. */
    if (!ctx.members.length) {
      warnings.push(perm.manage
        ? 'אין חניכים משובצים לצוות הזה, ולכן אי אפשר עדיין לשייך משימות. השיבוץ נעשה במסך "שיבוצי חניכים"'
        : "אין חניכים משובצים לצוות הזה");
    }

    const tasks = rows.map((t) => ({
      ...toTask(t, closing, today),
      mayEdit: mayEditTask(perm, t, session.itemId),
    }));

    /* פירוט לפי אדם — התכלית של הלוח הזה */
    const byOwner = ctx.members.map((m) => {
      const his = rows.filter((t) => t.owner === m.id);
      return { ...m, ...progressOf(his, closing), late: his.filter((t) => isLate(t, closing, today)).length };
    });
    const unassigned = rows.filter((t) => !t.owner);

    return res.status(200).json({
      team: {
        id: ctx.def.id, name: ctx.def.name, category: ctx.def.category,
        period: ctx.def.period, capacity: ctx.def.capacity,
        desc: ctx.def.desc, hours: ctx.def.hours,
        lead: ctx.def.lead, chair: ctx.def.chair, chairName: ctx.def.chairName,
        archived: ctx.def.archived,
      },
      me: { id: String(session.itemId || ""), ...perm },
      members: ctx.members,
      vocab: {
        /* מארכב מוסתר מהבורר ונשאר נפתר לתצוגה */
        statuses: vocab.statuses.map((s) => ({ id: s.id, name: s.name, closes: s.closes, archived: s.archived })),
        stages: vocab.stages.map((s) => ({ id: s.id, name: s.name, archived: s.archived })),
        closing: [...closing],
      },
      tasks: tasks.sort((a, b) =>
        (a.done === b.done ? 0 : a.done ? 1 : -1)
        || (a.due || "9999").localeCompare(b.due || "9999")
        /* ⚠ `at` כאן הוא ISO מלא ולא תאריך בלבד — הוא שובר
           השוויון, ולכן אסור למיין איתו רשימה מעורבת עם הלוח
           האישי, ששם `at` הוא תאריך בלבד. */
        || String(a.at || "").localeCompare(String(b.at || ""))),
      counts: {
        ...progressOf(rows, closing),
        late: rows.filter((t) => isLate(t, closing, today)).length,
        unassigned: unassigned.length,
      },
      byOwner,

      /* ============================================================
         הרשומות של הצוות — פרוטוקול, אירועים, קישורים, ציוד, כסף
         ------------------------------------------------------------
         ⚠ **מפוצלות לפי סוג כאן ולא במסך.** לוח אחד מחזיק את
           כולן ונבדל ב-`kind`; מסך שיפצל בעצמו היה מפצל אחרת
           בכל לשונית.

         ⚠ **הכסף נגזר ואינו נשמר** — אותו כלל כמו בפרויקטים:
           שני מספרים ששמורים בנפרד נפרדים ביום הראשון (4יז).

         ⚠ **ריק אינו אפס:** רשומה בלי סכום נספרת ומדווחת
           (`noAmount`) ואינה מושמטת בשקט (4ט).
         ============================================================ */
      extras: extrasFor(entriesAll, ctx.def.id, today),

      /* ⚠ הסקרים עם הספירה, ועם מי כבר הצביע — הסקר אינו חשאי
         ולדעת מי חסר זו כל התועלת. משוב אנונימי הוא מסלול אחר. */
      polls: pollsFor(pollsAll, ctx.def.id, String(session.itemId || ""), ctx.members),

      /* ⚠⚠ **המשוב האנונימי — טקסט ותאריך, וזה הכול.** אין בלוח
         עמודת כותב, ולכן אין מה להחזיר. ראו api/_team-extras.js. */
      feedback: feedbackAll
        .filter((f) => f.team === ctx.def.id)
        .map((f) => ({ id: f.id, text: f.text, date: f.date }))
        .sort((a, b) => (b.date || "").localeCompare(a.date || "")),

      extrasReady: teamExtrasReady(),
      /* ============================================================
         ⚠ **המרצים של הסדרה — אותו לוח חוות דעת, עם שיוך.**

         מרצה שהגיע לסדרה הוא אותו מרצה שיכול להגיע לשיעור רגיל;
         שני לוחות היו מייצרים שתי היסטוריות על אותו אדם.

         ⚠ **כשלון בטעינת חוות הדעת אינו מפיל את המסך** — הוא
           מחזיר רשימה ריקה, והמשימות עדיין עובדות. אותו כלל
           כמו `partial` בתיק החניך (4מא).
       ============================================================ */
      lecturers: evals
        .filter((e) => String(e.placement || "") === String(ctx.def.id))
        .map((e) => ({
          id: e.id, name: e.name, topic: e.topic, field: e.field,
          phone: e.phone, opinion: e.opinion,
          lessonDate: e.lessonDate, by: e.by, at: e.at,
          /* ⚠ נגזר בשרת ולא מהשוואת שמות בלקוח — היא נשברת
             ביום שמישהו משנה את שמו (4ס). */
          mine: String(e.by || "") === String(session.name || ""),
        }))
        .sort((a, b) => (b.lessonDate || "").localeCompare(a.lessonDate || "")
          || a.name.localeCompare(b.name, "he")),
      /* ⚠ הסיכום נכתב על ידי **כל** חברי הסדרה, לא רק היו״ר. */
      summary: ctx.def.summary || null,
      summaryBy: ctx.def.summaryBy || null,
      warnings,
    });
  } catch (e) {
    console.error("[team]", e);
    res.status(502).json({ error: "טעינת הצוות נכשלה" });
  }
}

export default withAuth(handler, { student: true });

/* ============================================================
   הרשומות, מפוצלות ונגזרות
   ------------------------------------------------------------
   ⚠ **הספירה לאחור נגזרת מהאירוע הקרוב שטרם עבר.** אירוע שעבר
     אינו "בעוד מינוס שלושה ימים" — הוא פשוט אינו הספירה.

   ⚠ **ומה שנספר הוא המשימות הפתוחות**, לא כל המשימות: מי
     שמסתכל על ספירה לאחור שואל "מה נשאר", לא "כמה עשינו".
   ============================================================ */
function extrasFor(all, teamId, today) {
  const mine = all.filter((e) => e.team === teamId);
  const of = (k) => mine.filter((e) => e.kind === k);

  const events = of("אירוע")
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const next = events.find((e) => e.date && e.date >= today) || null;

  const spent = of("הוצאה").reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const income = of("הכנסה").reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const noAmount = [...of("הוצאה"), ...of("הכנסה")].filter((x) => x.amount == null).length;

  return {
    minutes: of("פרוטוקול").sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    events,
    links: of("קישור"),
    gear: of("ציוד"),
    handover: of("חפיפה"),
    money: [...of("הוצאה"), ...of("הכנסה")]
      .sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    sum: {
      spent: Math.round(spent * 100) / 100,
      income: Math.round(income * 100) / 100,
      noAmount,
      /* ⚠ null ולא 0 כשאין אירוע קרוב — "בעוד 0 ימים" נקרא
         כ"היום", וזה שקר (4ג). */
      nextEvent: next ? { title: next.title, date: next.date, extra: next.extra } : null,
      daysToEvent: next ? daysBetween(today, next.date) : null,
    },
  };
}

function daysBetween(a, b) {
  const t = (x) => new Date(x + "T12:00:00Z").getTime();
  return Math.round((t(b) - t(a)) / 86400000);
}

/* ============================================================
   הסקרים
   ------------------------------------------------------------
   ⚠ **הספירה נגזרת מההצבעות ואינה נשמרת על הסקר.** מונה שמור
     מתיישן ברגע שמישהו מוחק הצבעה בלוח.

   ⚠ **ומי טרם הצביע מוחזר בשמו** — זו שאלת תיאום, ולדעת את מי
     צריך להזכיר זו כל התועלת. הסקר אינו חשאי, וזה נאמר במסך.
   ============================================================ */
function pollsFor(data, teamId, me, members) {
  return data.polls
    .filter((p) => p.team === teamId)
    .map((p) => {
      const votes = data.votes.filter((v) => v.poll === p.id);
      const byChoice = p.options.map((o) => ({
        option: o,
        n: votes.filter((v) => v.choice === o).length,
        who: votes.filter((v) => v.choice === o)
          .map((v) => (members.find((m) => String(m.id) === String(v.voter)) || {}).name)
          .filter(Boolean),
      }));
      const votedIds = new Set(votes.map((v) => String(v.voter)));
      return {
        id: p.id, question: p.question, options: p.options,
        closes: p.closes, closed: p.closed, by: p.by,
        results: byChoice,
        total: votes.length,
        mine: (votes.find((v) => String(v.voter) === me) || {}).choice || null,
        missing: members.filter((m) => !votedIds.has(String(m.id))).map((m) => m.name),
      };
    })
    .sort((a, b) => Number(a.closed) - Number(b.closed)
      || (a.closes || "9999").localeCompare(b.closes || "9999"));
}
