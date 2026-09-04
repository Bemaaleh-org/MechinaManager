/* ============================================================
   ניהול צוותים — ועדות וסדרות

   ⚠⚠ **הטענה החשובה כאן היא זוגית, ובאותה הרצה:**
     הצוות **כן** קורא וכותב בלוח הצוותים החדש, והצוות
     **עדיין מקבל 403** על `?action=duty-tasks`. כל אחת לבדה
     נראית כמו באג למי שיקרא אותה בעוד שנה, ורק שתיהן יחד
     מתארות את הגבול (CLAUDE 4מה + 4נ).

   ⚠ הבדיקה יוצרת ועדה משלה, משבצת אליה את חשבון הבדיקה,
     כותבת משימות ומוחקת **הכול לפי מזהה** — בשלושה לוחות:
     הגדרות, שיבוצים ומשימות הצוות. `quota-test` השאיר בעבר
     שלושה ימים מסומנים בלוח האמיתי כי ספר לוח אחד מתוך שניים.
   ============================================================ */
import { gql, allItems } from "../../api/_monday.js";
import { tempRegister } from "./_auth.mjs";
import { AUTH_BOARD, AUTH_COLS } from "../../shared/auth-board.js";
import { studentRows } from "../../api/_student-rows.js";
import { invalidate } from "../../api/_cache.js";
import { MECHINA_BOARDS, MECHINA_COLS } from "../../shared/mechina-boards.js";
import {
  PLACEMENT_BOARDS, PLACEMENT_COLS, CATEGORY, PERIOD, SEM,
} from "../../shared/placements.js";
import { TEAM_BOARDS, TEAM_COLS } from "../../shared/team-ids.js";

const B = "http://localhost:5173";
/* WARN חשבון הבדיקה של החניכים. הסיסמה כאן היא של חשבון
   שאינו נספר בשום מקום ואינו של אדם — ראו 4לא. */
const DEMO_USER = "bdika";
const DEMO_PASS = process.env.DEMO_PASS || "mechina2026";
let pass = 0, fail = 0;
const ok = (l, c, x = "") => {
  console.log((c ? "  V " : "  X ") + l + (x ? "  -> " + x : ""));
  c ? pass++ : fail++;
};
const jar = () => {
  let c = "";
  return { get: () => c, set: (r) => { const s = r.headers.get("set-cookie"); if (s) c = s.split(";")[0]; } };
};
const call = async (j, m, p, b) => {
  const r = await fetch(B + p, {
    method: m,
    headers: { "Content-Type": "application/json", ...(j.get() ? { cookie: j.get() } : {}) },
    ...(b ? { body: JSON.stringify(b) } : {}),
  });
  j.set(r);
  const t = await r.text();
  try { return { s: r.status, b: JSON.parse(t) }; } catch { return { s: r.status, b: t.slice(0, 300) }; }
};
const cv = (i, c) => (i.column_values.find((x) => x.id === c) || {}).text || "";

/* ⚠ ממתינים **על תנאי** ולא על זמן: מטמון השרת יושב בתהליך
   אחר, ו-invalidate() כאן אינו נוגע בו. שתי בדיקות בסשן קודם
   עברו מסיבה שגויה בדיוק בגלל שינה קבועה. */
async function until(what, fn, tries = 30) {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("  ! פג הזמן בהמתנה ל: " + what);
  return false;
}

const D = PLACEMENT_COLS.definitions;
const A = PLACEMENT_COLS.assignments;
const T = TEAM_COLS.tasks;
const V = TEAM_COLS.vocab;

const demo = (await studentRows()).find((r) => r.demo);
if (!demo) { console.log("אין חשבון בדיקה"); process.exit(1); }
const other = (await studentRows()).find((r) => r.active && !r.demo && r.id !== demo.id);
if (!other) { console.log("אין חניך שני"); process.exit(1); }
console.log("נבדק: " + demo.name + " · חניך אחר: " + other.name);

const us = (await gql("{ boards(ids:[" + AUTH_BOARD + "]){ items_page(limit:100){items{id name column_values(ids:[\"" + AUTH_COLS.code + "\"]){id text}}} } }"))
  .boards[0].items_page.items;
const code = (t) => cv(us.find((x) => x.name.includes(t)), AUTH_COLS.code);

const reg = await tempRegister("דני לויט");
const MGR = jar();
await call(MGR, "POST", "/api/auth?action=login", { code: code("דני לויט") });

const setRoster = async (cols) => {
  await gql("mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }",
    { b: MECHINA_BOARDS.roster, i: demo.id, v: JSON.stringify(cols) });
  invalidate("student-rows");
};

/* מה שהבדיקה יצרה — נמחק לפי מזהה, בכל לוח */
const made = { defs: [], asg: [], tasks: [], vocab: [], lect: [] };
const NAME = "בדיקה — ועדת בדיקה אוטומטית";
const ADHOC_NAME = "בדיקה — צוות מזדמן אוטומטי";

try {
  /* ============ הכנה ============ */
  await setRoster({ [MECHINA_COLS.roster.demo]: { checked: "false" } });
  await until("החשבון נספר כפעיל", async () => {
    const r = await call(MGR, "GET", "/api/students?action=team-admin");
    return r.s === 200 && r.b.roster.some((x) => x.id === demo.id);
  });

  /* ============ 1 · דני מקים ועדה מהאפליקציה ============ */
  console.log("\n1 · הקמת צוות באמצע שנה, מתוך האפליקציה");
  let r = await call(MGR, "POST", "/api/students?action=team-admin", {
    name: NAME, category: CATEGORY.committee, period: PERIOD.yearly, capacity: 4,
    desc: "נוצרה על ידי team-test", lead: "מדריך בדיקה",
  });
  ok("מנהל מקים ועדה חדשה", r.s === 200 && r.b.created, r.b.error || "");
  const TEAM = r.b.id;
  if (TEAM) made.defs.push(TEAM);
  if (!TEAM) throw new Error("לא נוצרה ועדה — אין מה להמשיך");

  r = await call(MGR, "POST", "/api/students?action=team-admin", {
    name: NAME, category: CATEGORY.committee, period: PERIOD.yearly,
  });
  ok("שם כפול נדחה", r.s === 400 && /כבר קיים/.test(r.b.error || ""), r.b.error || "");

  /* ⚠ הטענה על **תוכן ההודעה** ולא רק על הסטטוס: 400 יכול
     להגיע מעשר סיבות, ובסשן קודם בדיקה עברה על 400 שהגיע
     ממקום אחר לגמרי. */
  r = await call(MGR, "POST", "/api/students?action=team-admin", {
    id: TEAM, name: NAME, category: CATEGORY.committee, period: PERIOD.yearly,
    capacity: "שמונה",
  });
  ok("מכסה לא-מספרית נדחית ואינה הופכת ל-NaN",
    r.s === 400 && /מספר שלם/.test(r.b.error || ""), r.b.error || "");

  /* ============ 2 · שיבוץ ויו״ר ============ */
  console.log("\n2 · שיבוץ החניך וקביעתו ליו״ר");
  r = await call(MGR, "POST", "/api/students?action=placements", {
    placementId: TEAM, semester: SEM.yearly, studentIds: [demo.id],
  });
  ok("החניך משובץ לוועדה", r.s === 200, r.b.error || "");
  await until("השיבוץ נראה בשרת", async () => {
    const x = await call(MGR, "GET", "/api/students?action=team&id=" + TEAM);
    return x.s === 200 && x.b.members.some((m) => m.id === demo.id);
  });

  r = await call(MGR, "PUT", "/api/students?action=chair", {
    placementId: TEAM, studentId: demo.id,
  });
  ok("החניך נקבע ליו״ר", r.s === 200, r.b.error || "");

  const ST = jar();
  /* ⚠ **סיסמה ולא תעודת זהות.** חשבון הבדיקה **רשום**, ולכן
     ?action=login מחזיר לו 409 — זו העקיפה שנסגרה. */
  await call(ST, "POST", "/api/auth?action=signin", { user: DEMO_USER, password: DEMO_PASS });

  /* ============ 3 · הצוות כן קורא וכותב כאן ============ */
  console.log("\n3 · הלוח המשותף — הצוות רשאי");
  r = await call(MGR, "GET", "/api/students?action=team&id=" + TEAM);
  ok("מנהל קורא את הצוות", r.s === 200 && r.b.team.id === TEAM, r.b.error || "");
  ok("ההרשאה שלו manage", r.s === 200 && r.b.me.manage === true && r.b.me.role === "staff");

  const st1 = (r.b.vocab.statuses.find((x) => !x.closes) || {}).id;
  const stDone = (r.b.vocab.statuses.find((x) => x.closes) || {}).id;
  const stage1 = (r.b.vocab.stages[0] || {}).id;
  ok("אוצר המילים נטען עם סטטוס סוגר", Boolean(st1 && stDone));

  r = await call(MGR, "POST", "/api/students?action=team-task", {
    teamId: TEAM, title: "בדיקה — משימה של הצוות",
    owner: demo.id, status: st1, stage: stage1, due: "2027-01-01", note: "הערה",
  });
  ok("איש צוות כותב משימה בלוח הצוותים", r.s === 200, r.b.error || "");
  const TASK = r.b.id;
  if (TASK) made.tasks.push(TASK);

  /* ⚠⚠ **הצד השני של אותה טענה, ובאותה הרצה.** */
  r = await call(MGR, "GET", "/api/students?action=duty-tasks");
  ok("ובאותה הרצה: duty-tasks עדיין 403 למנהל",
    r.s === 403 && /בעלי התפקידים/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  /* ============ 4 · שני הלוחות אינם מתערבבים ============ */
  console.log("\n4 · אין דליפה בין הלוחות");
  r = await call(ST, "GET", "/api/students?action=duty-tasks");
  const inDuty = r.s === 200 && (r.b.tasks || []).some((t) => t.id === TASK);
  ok("משימת צוות אינה מופיעה במשימות האישיות", r.s === 200 && !inDuty, r.b.error || "");

  r = await call(ST, "POST", "/api/students?action=duty-tasks", {
    duty: "יו״ר#" + TEAM, title: "בדיקה — משימה אישית",
  });
  const PERSONAL = r.s === 200 ? r.b.id : null;
  ok("החניך כותב משימה אישית", r.s === 200, r.b.error || "");

  r = await call(MGR, "GET", "/api/students?action=team&id=" + TEAM);
  ok("ומשימה אישית אינה מופיעה בלוח הצוות",
    r.s === 200 && !r.b.tasks.some((t) => t.id === PERSONAL));

  if (PERSONAL) await call(ST, "DELETE", "/api/students?action=duty-tasks", { id: PERSONAL });

  /* ============ 5 · חבר צוות מול יו״ר ============ */
  console.log("\n5 · מי משייך למי");
  r = await call(ST, "GET", "/api/students?action=team&id=" + TEAM);
  ok("היו״ר קורא את הצוות", r.s === 200 && r.b.me.role === "chair", r.b.error || "");
  ok("וההרשאה שלו manage", r.s === 200 && r.b.me.manage === true);

  r = await call(MGR, "PUT", "/api/students?action=chair", { placementId: TEAM, studentId: "" });
  ok("היו״ר הוסר", r.s === 200, r.b.error || "");
  await until("ההסרה נראית בשרת", async () => {
    const x = await call(ST, "GET", "/api/students?action=team&id=" + TEAM);
    return x.s === 200 && x.b.me.role === "member";
  });

  r = await call(ST, "GET", "/api/students?action=team&id=" + TEAM);
  ok("חבר צוות רגיל קורא את **כל** המשימות",
    r.s === 200 && r.b.me.role === "member" && r.b.tasks.length >= 1, r.b.error || "");
  ok("ואינו manage", r.s === 200 && r.b.me.manage === false && r.b.me.write === true);

  r = await call(ST, "PUT", "/api/students?action=team-task", {
    id: TASK, owner: other.id,
  });
  ok("חבר צוות אינו משייך משימה לחניך אחר",
    r.s === 403 && /היו״ר או המדריך/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  r = await call(ST, "PUT", "/api/students?action=team-task", { id: TASK, status: stDone });
  ok("אבל כן משנה סטטוס במשימה שלו", r.s === 200, r.b.error || "");

  r = await call(MGR, "POST", "/api/students?action=team-task", {
    teamId: TEAM, title: "בדיקה — שיוך לזר", owner: other.id,
  });
  ok("שיוך למי שאינו משובץ לצוות נדחה",
    r.s === 400 && /משובץ לצוות/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));
  if (r.s === 200) made.tasks.push(r.b.id);

  /* ============ 6 · מי שאינו בצוות ============ */
  console.log("\n6 · מי שאינו בצוות");
  r = await call(MGR, "POST", "/api/students?action=placements", {
    placementId: TEAM, semester: SEM.yearly, studentIds: [],
  });
  ok("החניך הוסר מהוועדה", r.s === 200, r.b.error || "");
  await until("ההסרה נראית בשרת", async () => {
    const x = await call(ST, "GET", "/api/students?action=team&id=" + TEAM);
    return x.s === 403;
  });

  r = await call(ST, "GET", "/api/students?action=team&id=" + TEAM);
  ok("403 על הצוות", r.s === 403, r.s + " " + (r.b.error || ""));
  r = await call(ST, "PUT", "/api/students?action=team-task", { id: TASK, status: st1 });
  ok("ו-404 על מזהה משימה — לא 403, ש**מאשר שהשורה קיימת**",
    r.s === 404, r.s + " " + (r.b.error || ""));

  /* ============ 7 · ההתקדמות והאזהרות ============ */
  console.log("\n7 · התקדמות שאינה משקרת");
  r = await call(MGR, "GET", "/api/students?action=team&id=" + TEAM);
  const c = r.b.counts;
  ok("מונה נגזר: " + c.done + "/" + c.total + " = " + c.pct + "%",
    r.s === 200 && c.total >= 1 && c.pct !== null);

  /* סטטוס שאינו נפתר — נספר כפתוח ומדווח
     ⚠ מותנה ב-TASK: בלעדיו הבדיקה נופלת ב-gql ומסתירה
       את כל מה שאחריה. */
  if (!TASK) throw new Error("לא נוצרה משימה — אין מה לבדוק בשלב 7");
  await gql("mutation($b:ID!,$i:ID!,$v:JSON!){ change_multiple_column_values(board_id:$b,item_id:$i,column_values:$v,create_labels_if_missing:false){id} }",
    { b: TEAM_BOARDS.tasks, i: TASK, v: JSON.stringify({ [T.status]: "9999999999" }) });
  await until("המטמון התרענן", async () => {
    const x = await call(MGR, "GET", "/api/students?action=team&id=" + TEAM);
    return x.s === 200 && x.b.warnings.some((w) => /אינו קיים/.test(w));
  });
  r = await call(MGR, "GET", "/api/students?action=team&id=" + TEAM);
  const orphanTask = r.b.tasks.find((t) => t.id === TASK);
  ok("סטטוס שאינו נפתר מדווח ב-warnings",
    r.b.warnings.some((w) => /אינו קיים/.test(w)), JSON.stringify(r.b.warnings));
  ok("ונספר כפתוח ולא כסגור",
    orphanTask && orphanTask.done === false && r.b.counts.done === 0,
    "done=" + (orphanTask || {}).done + " counts.done=" + r.b.counts.done);

  /* ============ 8 · אוצר המילים ============ */
  console.log("\n8 · אוצר המילים נערך מהאפליקציה");
  r = await call(MGR, "PUT", "/api/students?action=team-admin", {
    name: "בדיקה — ממתין לאישור", kind: "סטטוס", order: 9, closes: false,
  });
  ok("מנהל מוסיף סטטוס בלי דיפלוי", r.s === 200 && r.b.created, r.b.error || "");
  if (r.b.id) made.vocab.push(r.b.id);

  r = await call(MGR, "PUT", "/api/students?action=team-admin", {
    name: "בדיקה — שלב סוגר", kind: "שלב", closes: true,
  });
  ok('"נחשב סגור" נדחה על שלב',
    r.s === 400 && /לסטטוס בלבד/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));
  if (r.s === 200 && r.b.id) made.vocab.push(r.b.id);

  r = await call(MGR, "PUT", "/api/students?action=team-admin", {
    id: made.vocab[0], name: "בדיקה — ממתין לאישור", kind: "סוג שלישי",
  });
  ok("kind לא מוכר נדחה במפורש",
    r.s === 400 && /סוג לא מוכר/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  r = await call(MGR, "PUT", "/api/students?action=team-admin", {
    id: made.vocab[0], name: "בדיקה — ממתין לאישור", kind: "סטטוס", remove: true,
  });
  ok("מחיקה נדחית לטובת ארכוב",
    r.s === 400 && /מסומנת/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  /* ============ 9 · ההרשאה על ניהול המבנה ============ */
  console.log("\n9 · מבנה המכינה אינו של החניך");
  r = await call(ST, "GET", "/api/students?action=team-admin");
  ok("חניך אינו מגיע לניהול הצוותים, גם יו״ר",
    r.s === 403, r.s + " " + (r.b.error || ""));

  /* ============ 11 · צוות מזדמן — הקטגוריה החדשה ============
     ⚠ **הטענה הראשונה כאן נופלת ב-502 אם התווית "צוות מזדמן"
       אינה בעמודת הסטטוס בלוח ההגדרות.** createItem שולח
       create_labels_if_missing:false בכוונה (עיקרון 4טז),
       ולכן תווית חסרה היא כישלון רועש — וזו בדיוק הסיבה
       שהטענה הזו קיימת. */
  console.log("\n11 · צוות מזדמן");
  r = await call(MGR, "POST", "/api/students?action=team-admin", {
    name: ADHOC_NAME, category: CATEGORY.adhoc, period: PERIOD.yearly,
  });
  ok("מקימים צוות מזדמן", r.s === 200 && r.b.created,
    r.s + " " + (r.b.error || ""));
  const ADHOC = r.b.id;
  if (ADHOC) made.defs.push(ADHOC);

  if (ADHOC) {
    await until("הצוות המזדמן נראה בשרת", async () => {
      const x = await call(MGR, "GET", "/api/students?action=team");
      return x.s === 200 && x.b.teams.some((t) => t.id === ADHOC);
    });
    r = await call(MGR, "GET", "/api/students?action=team");
    const hit = (r.b.teams || []).find((t) => t.id === ADHOC);
    /* ⚠ נופלת אם TEAM_CATEGORIES תאבד את adhoc — api/_team.js
       מסנן ב-isTeamCategory, והצוות היה נעלם מכל מסך בשקט. */
    ok("והוא ברשימת הצוותים, בקטגוריה שלו",
      Boolean(hit) && hit.category === CATEGORY.adhoc,
      hit ? hit.category : "לא נמצא");

    await call(MGR, "POST", "/api/students?action=placements", {
      placementId: ADHOC, semester: SEM.yearly, studentIds: [demo.id],
    });
    r = await call(MGR, "PUT", "/api/students?action=chair", {
      placementId: ADHOC, studentId: demo.id,
    });
    /* ⚠ נופלת אם CHAIRABLE ייפרד מ-TEAM_CATEGORIES — היו שתי
       רשימות שאמורות היו להיות זהות. */
    ok("ואפשר לקבוע לו יו״ר", r.s === 200, r.s + " " + (r.b.error || ""));
  }

  /* ============ 12 · שינוי שם צוות קיים ============
     ⚠ **הטענה הזו תופסת את renameItem בשני ארגומנטים.** החתימה
       היא renameItem(board, itemId, name), וקריאה בשניים משאירה
       name undefined — $n:String! מגיע חסר וכל שינוי שם נופל
       ב-502 גנרי.

     ⚠ ובלי capacity ובלי שינוי תקופה: כל POST-עם-id אחר בקובץ
       נחסם ב-400 **לפני** שורת ה-rename, ולכן הוא לא היה בודק
       אותה בכלל. */
  console.log("\n12 · שינוי שם");
  const RENAMED = NAME + " (שם חדש)";
  r = await call(MGR, "POST", "/api/students?action=team-admin", {
    id: TEAM, name: RENAMED, category: CATEGORY.committee, period: PERIOD.yearly,
  });
  ok("שינוי שם נשמר ואינו נופל", r.s === 200, r.s + " " + (r.b.error || ""));
  if (r.s === 200) {
    await until("השם החדש נראה בשרת", async () => {
      const x = await call(MGR, "GET", "/api/students?action=team&id=" + TEAM);
      return x.s === 200 && x.b.team.name === RENAMED;
    });
    r = await call(MGR, "GET", "/api/students?action=team&id=" + TEAM);
    ok("והשם באמת התחלף", r.b.team.name === RENAMED, r.b.team.name);
  }

  /* ============ 10 · שינוי תקופה שמותיר שורות יתומות ============ */
  console.log("\n10 · שינוי תקופה שמותיר שורות יתומות");
  await call(MGR, "POST", "/api/students?action=placements", {
    placementId: TEAM, semester: SEM.yearly, studentIds: [demo.id],
  });
  r = await call(MGR, "POST", "/api/students?action=team-admin", {
    id: TEAM, name: NAME, category: CATEGORY.committee, period: PERIOD.secondOnly,
  });
  ok("נחסם ומסביר איפה יושבות השורות",
    r.s === 400 && /שיבוצים יושבים/.test(r.b.error || ""), r.s + " " + (r.b.error || ""));

  /* ============ מרצים של הצוות, וסיכום ============ */
  console.log("\n=== מרצים וסיכום ===");
  {
    /* ⚠ הבדיקה כותבת על הצוות שהיא יצרה, ומוחקת לפי מזהה.
       `ST` הוא חשבון הבדיקה, שהוא **חבר הצוות והיו״ר** שלו. */
    let r3 = await call(ST, "POST", "/api/students?action=team-lecturer",
      { team: TEAM, name: "בדיקה — מרצה סדרה", topic: "נושא בדיקה",
        opinion: "היה טוב", lessonDate: "2026-10-01" });
    ok("חבר הצוות מוסיף מרצה", r3.s === 200 && r3.b.id, `${r3.s} ${r3.b.error || ""}`);
    const lid = r3.b.id;
    if (lid) made.lect.push(lid);

    r3 = await call(ST, "POST", "/api/students?action=team-lecturer",
      { team: TEAM, name: "בדיקה — תאריך שגוי", lessonDate: "1.10.2026" });
    ok("תאריך בפורמט שגוי נדחה", r3.s === 400, `${r3.s} ${r3.b.error || ""}`);
    if (r3.s === 200 && r3.b.id) made.lect.push(r3.b.id);

    r3 = await call(ST, "GET", "/api/students?action=team&id=" + TEAM);
    const lect = (r3.b.lecturers || []).find((x) => x.id === lid);
    ok("והוא חוזר בצוות", Boolean(lect), String((r3.b.lecturers || []).length));
    ok("עם התאריך והטקסט",
      lect && lect.lessonDate === "2026-10-01" && lect.opinion === "היה טוב",
      JSON.stringify(lect && [lect.lessonDate, lect.opinion]));
    /* ⚠ `mine` נגזר בשרת ולא מהשוואת שמות בלקוח (4ס). */
    ok("ומסומן כשלי", lect && lect.mine === true, String(lect && lect.mine));

    /* ⚠⚠ **אותו לוח, ולא לוח שני.** חוות הדעת מופיעה גם ברשימה
       הכללית של המרצים — שני לוחות היו מייצרים שתי היסטוריות
       על אותו אדם, ואז "האם כבר עבדנו איתו" מקבלת שתי תשובות. */
    r3 = await call(MGR, "GET", "/api/lessons?action=evals");
    ok("ומופיע גם ברשימת חוות הדעת הכללית",
      (r3.b.evals || []).some((e) => e.id === lid),
      String((r3.b.evals || []).length));

    /* ⚠ 404 ולא 403 על מזהה שאינו של סדרה — 403 מאשר קיום. */
    const other = (await call(MGR, "GET", "/api/lessons?action=evals")).b.evals
      .find((e) => !e.placement);
    if (other) {
      r3 = await call(ST, "PUT", "/api/students?action=team-lecturer",
        { id: other.id, opinion: "בדיקה" });
      ok("חוות דעת כללית אינה נגישה מכאן — 404", r3.s === 404,
        `${r3.s} ${r3.b.error || ""}`);
    }

    /* ---- הסיכום ---- */
    r3 = await call(ST, "PUT", "/api/students?action=team-lecturer",
      { team: TEAM, summary: "בדיקה — סיכום הסדרה" });
    ok("חבר הצוות כותב סיכום", r3.s === 200, `${r3.s} ${r3.b.error || ""}`);

    await until("הסיכום נראה", async () => {
      const x = await call(ST, "GET", "/api/students?action=team&id=" + TEAM);
      return x.b.summary === "בדיקה — סיכום הסדרה";
    });
    r3 = await call(ST, "GET", "/api/students?action=team&id=" + TEAM);
    ok("והוא חוזר", r3.b.summary === "בדיקה — סיכום הסדרה", String(r3.b.summary));
    ok("ונרשם מי כתב", Boolean(r3.b.summaryBy), String(r3.b.summaryBy));

    /* ⚠ צוות שאינו קיים — 404, ולא 500. */
    r3 = await call(ST, "PUT", "/api/students?action=team-lecturer",
      { team: "999999999", summary: "בדיקה" });
    ok("צוות שאינו קיים מחזיר 404", r3.s === 404, `${r3.s} ${r3.b.error || ""}`);

    /* ⚠ ומחיקה עובדת למי שכתב. */
    if (lid) {
      r3 = await call(ST, "DELETE", "/api/students?action=team-lecturer", { id: lid });
      ok("ומי שכתב מוחק", r3.s === 200, `${r3.s} ${r3.b.error || ""}`);
    }
  }

} catch (e) {
  console.error("\nנפילה:", e.message);
  fail++;

} finally {
  /* ============================================================
     ניקוי — לפי מזהה, ובכל לוח שנגענו בו
     ------------------------------------------------------------
     ⚠ שלושה לוחות ולא אחד. `quota-test` השאיר בעבר ימים
       מסומנים בלוח האמיתי כי ספר לוח אחד מתוך שניים.
     ============================================================ */
  console.log("\nניקוי…");
  const asg = (await allItems(PLACEMENT_BOARDS.assignments))
    .filter((i) => made.defs.includes(cv(i, A.placement)));
  const tasks = (await allItems(TEAM_BOARDS.tasks))
    .filter((i) => made.defs.includes(cv(i, T.team)));
  /* ⚠ **וגם לוח חוות הדעת.** מרצה של סדרה יושב שם ולא בלוח
     הצוותים, ובלי השורה הזו כל הרצה הייתה משאירה שם שורה. */
  const ids = [
    ...made.vocab,
    ...made.lect,
    ...tasks.map((i) => String(i.id)),
    ...asg.map((i) => String(i.id)),
    ...made.defs,
  ];
  for (const id of ids) {
    await gql("mutation($i:ID!){ delete_item(item_id:$i){id} }", { i: id })
      .catch((e) => console.log("  ! לא נמחק " + id + ": " + e.message));
  }
  console.log("  נמחקו " + ids.length + " שורות");

  await setRoster({ [MECHINA_COLS.roster.demo]: { checked: "true" } });
  await reg.restore();

  /* ⚠ אימות שלא נשאר כלום — בשלושת הלוחות */
  const leftDefs = (await allItems(PLACEMENT_BOARDS.definitions))
    .filter((i) => String(i.name || "").startsWith("בדיקה — "));
  const leftTasks = (await allItems(TEAM_BOARDS.tasks))
    .filter((i) => String(i.name || "").startsWith("בדיקה — "));
  const leftVocab = (await allItems(TEAM_BOARDS.vocab))
    .filter((i) => String(i.name || "").startsWith("בדיקה — "));
  ok("לא נשארו שאריות בשלושת הלוחות",
    !leftDefs.length && !leftTasks.length && !leftVocab.length,
    "defs=" + leftDefs.length + " tasks=" + leftTasks.length + " vocab=" + leftVocab.length);
}

console.log("\n" + pass + " עברו · " + fail + " נכשלו");
process.exit(fail ? 1 : 0);
