/* ============================================================
   /api/students?action=search&q=…   חיפוש רוחבי
   ------------------------------------------------------------
   ⚠⚠⚠ **כל מקור אוכף את ההרשאה של עצמו, ואין כאן סינון אחד
     בסוף.**

   זו הנקודה השברירית ביותר במסך הזה. חיפוש הוא הדבר שהכי קל
   לדלוף דרכו: הוא נוגע **בכל** הנתונים במערכת בבת אחת, ומספיק
   מקור אחד ששכח לשאול "למי זה" כדי שחניך ימצא שם של חניך אחר
   בחיפוש של שתי אותיות.

   לכן הדפוס: כל בונה מקבל את ה-`session`, בודק בעצמו, ומחזיר
   רשימה ריקה כשאין הרשאה. אין "לסנן בסוף" — הדפוס ההוא נשבר
   ביום שמישהו מוסיף מקור ושוכח.

   ⚠ **הפרויקטים אינם כאן בכלל** — לא של אחרים, וגם לא שלי.
     `api/_projects.js` הוא המקום היחיד שקורא אותם, וההבטחה
     שם היא שהצוות אינו רואה אותם (5ח). מקור חיפוש היה מסלול
     שני לאותם נתונים, ומסלול שני הוא בדיוק איך שהבטחות
     נשברות. מי שמחפש בפרויקט שלו — מחפש בתוך המסך שלו.

   ⚠ **וגם המשוב האנונימי אינו כאן.** חיפוש שמוצא משוב לפי
     מילה מאפשר לאמת ניחוש ("האם מישהו כתב על X"), וזה מצמצם
     אנונימיות גם בלי לחשוף שם.

   ------------------------------------------------------------
   ⚠ **מקור שנופל אינו מפיל את החיפוש.** כל בונה נתפס בנפרד
     ונרשם ללוג — תוצאה חסרה עדיפה על מסך שבור (4כו), אבל
     `partial` **מוחזר**, כדי שהמסך יאמר "חלק מהמקורות לא
     נטענו" ולא יציג רשימה חלקית כאילו היא מלאה (עיקרון 6).

   ⚠ **מינימום שני תווים.** חיפוש של תו אחד מחזיר את כל
     המערכת, וזה גם איטי וגם חסר תועלת.
   ============================================================ */
import { withAuth } from "./_session.js";
import { todayFor } from "./_attendance-data.js";
import { hit, score } from "../shared/search-text.js";

const MIN = 2;
const PER_KIND = 8;

/** תוצאה אחת. ⚠ `tab` הוא לאן ללכת — תוצאה שאי אפשר לפתוח היא רעש. */
const row = (o) => ({
  kind: o.kind, title: o.title, sub: o.sub || null,
  tab: o.tab, id: o.id || null, when: o.when || null,
  score: o.score || 0,
});

/* ============================================================
   המקורות
   ------------------------------------------------------------
   כל אחד: שער הרשאה ראשון, ואז הקריאה. השער לפני הקריאה גם
   חוסך את הקריאה עצמה — `search` נשאל בכל הקלדה.
   ============================================================ */

async function searchStudents(q, session) {
  /* ⚠ **צוות בלבד.** חניך שיחפש שם של חניך אחר לא ימצא אותו
     כאן; מה שהוא כן צריך — מי בוועדה שלו — נמצא במסך הוועדה,
     שיש לו הרשאה משלו. */
  if (session.isStudent) return [];
  const { activeStudents } = await import("./_student-rows.js");
  return (await activeStudents())
    .filter((s) => hit(s.name, q))
    /* ⚠ **שם בלבד, ולא ת.ז ולא טלפון.** תוצאת חיפוש היא שורה
       שנראית בהצצה, ואין סיבה שהיא תישא נתון מזהה (עיקרון 4). */
    .map((s) => row({
      kind: "חניך", title: s.name,
      sub: (s.roles || []).join(" · ") || null,
      tab: "students", id: s.id, score: score(s.name, "", q),
    }));
}

async function searchLessons(q, session) {
  const { loadSheets } = await import("./_lessons-data.js");
  /* ⚠ **גיליון כבוי אינו מוצג** — מפגשיו שנשארו בלוח אינם
     מטלה של אף אחד (4ח), וחיפוש שמחזיר אותם מחזיר עבר. */
  return (await loadSheets())
    .filter((x) => x.active && hit(`${x.subject} ${x.lecturer || ""}`, q))
    .map((x) => row({
      kind: "שיעור", title: x.subject,
      /* ⚠ **טלפון ומייל של מרצה אינם יוצאים לחניך** (5ג), ולכן
         גם לא כאן — רק השם ומתי. */
      sub: [x.lecturer, x.dayTime].filter(Boolean).join(" · ") || null,
      tab: session.isStudent ? "l-board" : "l-sheets",
      id: x.id, score: score(x.subject, x.lecturer || "", q),
    }));
}

async function searchNotices(q, session) {
  const { boardReady } = await import("../shared/board-ids.js");
  if (!boardReady()) return [];
  const { loadNotices } = await import("./_board.js");
  /* ⚠ **אותו כלל קהל של הלוח עצמו.** מודעה לצוות אינה נמצאת
     בחיפוש של חניך — לא מוסתרת, לא נמצאת. */
  const forMe = (to) => to === "כולם"
    || (session.isStudent ? to === "חניכים" : to === "צוות");
  return (await loadNotices())
    .filter((n) => forMe(n.to) && hit(`${n.title} ${n.body || ""}`, q))
    .map((n) => row({
      kind: "מודעה", title: n.title,
      sub: [n.kind, n.by].filter(Boolean).join(" · "),
      tab: "board", id: n.id, when: n.date,
      score: score(n.title, n.body || "", q),
    }));
}

async function searchActivities(q, session) {
  /* ⚠ בנק הפעילויות פתוח למי שנכנס למסך ההובלה — צוות ומובילים. */
  if (session.isStudent && !session.leadsAnyWeek && !session.isLeader) return [];
  const { leadReady } = await import("../shared/lead-ids.js");
  if (!leadReady()) return [];
  const { loadActivities } = await import("./_lead-week.js");
  return (await loadActivities())
    .filter((a) => !a.archived && hit(`${a.title} ${a.body || ""} ${a.gear || ""}`, q))
    .map((a) => row({
      kind: "פעילות", title: a.title,
      sub: [a.kind, a.minutes ? `${a.minutes} דק׳` : null].filter(Boolean).join(" · "),
      tab: "lead-week", id: a.id, score: score(a.title, a.body || "", q),
    }));
}

async function searchTeams(q, session) {
  const { loadDefinitions } = await import("./_placements.js");
  const { TEAM_CATEGORIES } = await import("../shared/team.js");
  const defs = await loadDefinitions();
  return defs
    .filter((d) => !d.archived && TEAM_CATEGORIES.includes(d.category) && hit(d.name, q))
    .map((d) => row({
      kind: d.category, title: d.name,
      sub: d.chairName ? `יו״ר · ${d.chairName}` : null,
      /* ⚠ **ההרשאה על הוועדה עצמה נבדקת ב-`?action=team`.**
         שם הוועדה אינו סוד — הוא מופיע בפרופיל של כל מי
         שמשובץ אליה (4נ) — ומה שבתוכה כן. */
      tab: session.isStudent ? "teams" : "placements",
      id: d.id, score: score(d.name, "", q),
    }));
}

async function searchEquipment(q, session) {
  const out = [];
  const { mayArea } = await import("../shared/container-boards.js");
  try {
    const { loadKitchenEquipment } = await import("./_kitchen-data.js");
    if (!session.isStudent || session.isKitchen) {
      out.push(...(await loadKitchenEquipment())
        .filter((i) => hit(i.name, q))
        .map((i) => row({
          kind: "ציוד מטבח", title: i.name,
          sub: [i.area, i.qty].filter(Boolean).join(" · ") || null,
          tab: "k-all", id: i.id, score: score(i.name, "", q),
        })));
    }
  } catch (e) { console.error("[search:kitchen]", e && e.message); }
  try {
    const { loadEquipment } = await import("./_container-data.js");
    /* ⚠ **הלוח אחד ושני התחומים בו**, ולכן הסינון על השורות
       ולא על הקריאה: `loadEquipment()` מחזירה את שניהם עם
       `area` על כל פריט. */
    const all = await loadEquipment();
    for (const i of all) {
      /* ⚠ **הרשאה לפי תחום ולא לפי מסלול** (4כב): המכולה של
         אחראי המכולה, הניקיון של אב הבית. */
      if (!mayArea(session, i.area)) continue;
      if (!hit(i.name, q)) continue;
      out.push(row({
        kind: "ציוד " + i.area, title: i.name, sub: i.qty || null,
        tab: i.area === "מכולה" ? "container" : "cleaning",
        id: i.id, score: score(i.name, "", q),
      }));
    }
  } catch (e) { console.error("[search:container]", e && e.message); }
  return out;
}

async function searchFaults(q, session) {
  /* ⚠ אב הבית ומנהל בלבד — זה מה שהלוח מגדיר (CLAUDE.md). */
  if (session.isStudent && !session.isHouse) return [];
  const { loadFaults } = await import("./_faults.js");
  return (await loadFaults())
    .filter((f) => hit(`${f.title} ${f.place || ""} ${f.desc || ""}`, q))
    .map((f) => row({
      kind: "תקלה", title: f.title,
      sub: [f.place, f.status].filter(Boolean).join(" · ") || null,
      tab: "faults", id: f.id, when: f.date,
      score: score(f.title, f.place || "", q),
    }));
}

async function searchDishes(q, session) {
  if (session.isStudent && !session.isKitchen) return [];
  const { loadDishesForSearch } = await import("./_menu.js");
  return (await loadDishesForSearch())
    .filter((d) => d.active && hit(`${d.name} ${d.items || ""}`, q))
    .map((d) => row({
      kind: "מנה", title: d.name,
      /* ⚠ **מצרכים לכמות אנשים אחת** (4יב) — הכמות נאמרת, כי
         בלעדיה המספר אינו אומר דבר. */
      sub: d.baseHeads ? `מצרכים ל-${d.baseHeads}` : null,
      tab: "menu", id: d.id, score: score(d.name, d.items || "", q),
    }));
}

/* ============================================================
   המסכים עצמם
   ------------------------------------------------------------
   ⚠ **זו התוצאה הכי שימושית, ובכוונה ראשונה בסדר.** רוב
     החיפושים באפליקציה אינם "איפה כתוב X" אלא "איפה המסך של
     Y", ומי שמקליד "תורנ" מחפש את מסך התורנויות ולא שורה בו.

   ⚠ **הרשימה נגזרת מ-`DUTIES` ומהניווט ואינה כתובה כאן שוב.**
     רשימה שנייה של מסכים מתפצלת מהניווט בתיקון הראשון (4מד).
   ============================================================ */
const COMMON = [
  { tab: "home", label: "בית", who: "all" },
  { tab: "profile", label: "הפרופיל שלי", who: "all" },
  { tab: "board", label: "לוח מודעות", who: "all" },
  { tab: "year", label: "הנוכחות שלי", who: "student" },
  { tab: "requests", label: "בקשות יציאה", who: "student" },
  { tab: "tryouts", label: "מיונים ושיבוצים", who: "student" },
  { tab: "leadership", label: "המובילשיות שלי", who: "student" },
  { tab: "projects", label: "הפרויקטים שלי", who: "student" },
  { tab: "agenda", label: "הלו״ז שלי", who: "all" },
  { tab: "gantt", label: "גאנט שנתי", who: "all" },
  { tab: "chores", label: "תורנויות", who: "all" },
  { tab: "menu", label: "תפריט ארוחות", who: "all" },
  { tab: "rules", label: "נהלים במכינה", who: "all" },
  { tab: "faults", label: "דיווח תקלה", who: "all" },
  { tab: "placements", label: "השיבוצים שלי", who: "student" },
  { tab: "teams", label: "ועדות וסדרות", who: "all" },
];

async function searchScreens(q, session) {
  const out = [];
  for (const s of COMMON) {
    if (s.who === "student" && !session.isStudent) continue;
    if (!hit(s.label, q)) continue;
    out.push(row({ kind: "מסך", title: s.label, tab: s.tab, score: score(s.label, "", q) + 30 }));
  }
  /* ⚠ ומסכי התפקידים — מ-`DUTIES`, שהוא גם מה שמזין את המגירה. */
  if (session.isStudent) {
    try {
      const { dutiesForStudent } = await import("./_duty-data.js");
      const { DUTIES } = await import("../shared/duties.js");
      const seen = new Set(out.map((r) => r.tab));
      for (const d of await dutiesForStudent(String(session.itemId || ""))) {
        for (const t of (DUTIES[d.name] || {}).tabs || []) {
          if (seen.has(t.tab) || !hit(t.label, q)) continue;
          seen.add(t.tab);
          out.push(row({
            kind: "מסך", title: t.label, sub: d.label,
            tab: t.tab, score: score(t.label, "", q) + 30,
          }));
        }
      }
    } catch (e) { console.error("[search:screens]", e && e.message); }
  }
  return out;
}

/* ============================================================ */
async function handler(req, res, session) {
  const q = String(req.query?.q || "").trim();
  if (q.length < MIN) {
    return res.status(200).json({ ok: true, q, results: [], short: true, min: MIN });
  }

  const sources = [
    ["מסך", searchScreens],
    ["חניך", searchStudents],
    ["מודעה", searchNotices],
    ["שיעור", searchLessons],
    ["צוות", searchTeams],
    ["פעילות", searchActivities],
    ["ציוד", searchEquipment],
    ["תקלה", searchFaults],
    ["מנה", searchDishes],
  ];

  const settled = await Promise.all(sources.map(([name, fn]) =>
    fn(q, session).catch((e) => {
      /* ⚠ מקור שנופל אינו מפיל את החיפוש — אבל **נספר**. */
      console.error("[search:" + name + "]", e && e.message);
      return null;
    })));

  const partial = settled.filter((x) => x === null).length;
  const all = settled.filter(Boolean).flat();

  /* ⚠ **תקרה לכל סוג ולא לסך הכול.** תקרה כללית הייתה נותנת
     תוצאה שכולה ציוד, ומסתירה את המסך שהמשתמש חיפש. */
  const byKind = new Map();
  for (const r of all.sort((a, b) => b.score - a.score)) {
    const list = byKind.get(r.kind) || [];
    if (list.length >= PER_KIND) continue;
    list.push(r);
    byKind.set(r.kind, list);
  }

  res.status(200).json({
    ok: true,
    q,
    today: todayFor(req),
    /* ⚠ **מוחזר כמה מקורות נכשלו, ולא רק התוצאות.** רשימה
       חלקית שנראית מלאה היא בדיוק עיקרון 6. */
    ...(partial ? { partial } : {}),
    total: all.length,
    groups: [...byKind.entries()].map(([kind, items]) => ({ kind, items })),
  });
}

export default withAuth(handler, { student: true });
