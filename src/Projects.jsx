/* ============================================================
   הפרויקטים שלי
   ------------------------------------------------------------
   ⚠⚠⚠ **המסך הזה שייך לחניך, והצוות אינו רואה אותו.** השרת
     מחזיר 403 לכל כניסת צוות (api/_projects.js), וזו נקודת
     הקצה השנייה במערכת שבה `isManager` אינו מרחיב גישה אלא
     מבטל אותה — אחרי משימות בעלי התפקידים (4מה).

     ההבטחה **כתובה במסך** ולא רק בקוד: חניך שאינו יודע שאיש
     אינו קורא ינהל את הפרויקט כאילו מישהו מסתכל, וזה בדיוק מה
     שהופך כלי עבודה לדוח.

   ⚠ **שלוש שכבות, ולא רשימה אחת:** הפרויקט (מה, למה, מתי),
     המשימות (מה צריך לעשות), והתקציב (מה זה עולה ומה נכנס).
     כל אחת עונה על שאלה אחרת, ומסך שמאחד אותן מכריח לקרוא את
     כולן כדי לענות על אחת.

   ⚠ **מה שנגזר אינו נשמר:** אחוז ההתקדמות, הסכומים והיתרה
     מחושבים בשרת מהשורות עצמן. שני מספרים ששמורים בנפרד
     נפרדים זה מזה ביום הראשון (4יז).
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScrollTabs from "./Tabs.jsx";
import { useExcel, downloadTable } from "./excel.js";

const PI = {
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  lock: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>,
  flag: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 21V4"/><path d="M5 4.5h11l-2 3.5 2 3.5H5"/></svg>,
};

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};
const shekel = (n) => (Math.round((n || 0) * 100) / 100).toLocaleString("he-IL");

/* ⚠ גוון לפי משמעות הסטטוס. סטטוס שאינו מוכר מקבל ברירת מחדל
   ואינו נעלם (4יא) — המכינה יכולה להוסיף תווית בלוח. */
const TONE = {
  "רעיון": "p-idle", "בתכנון": "p-cool", "בביצוע": "p-new",
  "מושהה": "p-low", "הושלם": "p-ok", "בוטל": "p-idle",
};
const toneOf = (s) => TONE[s] || "p-idle";

const EMPTY = {
  name: "", kind: "אישי", status: "רעיון", about: "", goal: "",
  start: "", due: "", budget: "", partners: [], template: "",
};

export default function ProjectsPage({ say }) {
  useExcel();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(() => api.getProjects()
    .then((r) => { setData(r); setErr(""); })
    .catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  if (err) {
    return (
      <>
        <div className="screen-title">הפרויקטים שלי</div>
        {/^לוחות הפרויקטים טרם הוקמו/.test(err) ? (
          <div className="empty">
            <div className="e1">לוחות הפרויקטים טרם הוקמו</div>
            <div className="e2">מריצים <code>npm run seed:projects</code> פעם אחת.</div>
          </div>
        ) : <div className="login-err">{err}</div>}
      </>
    );
  }
  if (!data) {
    return <><div className="screen-title">הפרויקטים שלי</div>
      <div className="skel" style={{ height: 200 }} /></>;
  }

  if (form) {
    return <ProjectForm data={data} form={form} say={say}
      onCancel={() => setForm(null)}
      onDone={(id) => { setForm(null); load(); if (id) setOpenId(id); }} />;
  }

  const open = openId ? data.projects.find((p) => p.id === openId) : null;
  if (open) {
    return <ProjectDetail p={open} data={data} say={say} reload={load}
      onBack={() => setOpenId(null)}
      onEdit={() => setForm({ ...open, budget: open.budget ?? "", partners: open.partners })} />;
  }

  const live = data.projects.filter((p) => !p.archived);
  const archived = data.projects.filter((p) => p.archived);

  return (
    <>
      <div className="screen-title">הפרויקטים שלי</div>

      {/* ⚠ ההבטחה כתובה במסך, ולא רק בקוד. */}
      <div className="pr-private">
        <PI.lock />
        <div>
          <b>הפרויקטים כאן שלך בלבד.</b> הצוות אינו רואה אותם — גם לא ראש
          המכינה. מה שמשותף הוא רק מה שתשתפו עם חניכים אחרים.
        </div>
      </div>

      {data.projects.length === 0 ? (
        <div className="empty">
          <div className="e-ico"><PI.flag /></div>
          <div className="e1">עוד אין לך פרויקטים</div>
          <div className="e2">
            פרויקט הוא כל דבר שאתם רוצים לקדם — יוזמה בקהילה, עסק קטן,
            אירוע. אפשר לנהל בו משימות ותקציב, ולשתף חברים.
          </div>
        </div>
      ) : (
        <>
          <Band projects={live} />
          {live.map((p) => <Card key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}
          {archived.length > 0 && (
            <>
              <div className="grp-h"><span>בארכיון · {archived.length}</span></div>
              {archived.map((p) => <Card key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}
            </>
          )}
        </>
      )}

      {/* ============================================================
          ⚠ **הארכיון — מה שחניכים בחרו להשאיר לדורות הבאים.**
            רק שם, סוג ותיאור. בלי היומן, בלי התקציב ובלי שם
            הבעלים — אלה נכתבו מתוך הנחה שאיש אינו קורא.
          ⚠ ומוצג רק כשיש בו משהו (4מא).
          ============================================================ */}
      {(data.legacy || []).length > 0 && (
        <>
          <div className="grp-h"><span>מה עשו לפנינו · {data.legacy.length}</span></div>
          <div className="e2" style={{ marginBottom: 8 }}>
            פרויקטים שחניכים בחרו להשאיר כדי ללמוד מהם. לקריאה בלבד.
          </div>
          <div className="rows">
            {data.legacy.map((l) => (
              <div className="ty-row" key={l.id}>
                <div className="ty-row-n">
                  {l.name}
                  {l.status && <span className={"pill " + toneOf(l.status)}>{l.status}</span>}
                </div>
                {l.kind && <div className="pr-meta">{l.kind}</div>}
                {l.about && <div className="pr-note">{l.about}</div>}
                {l.goal && <div className="pr-note"><b>המטרה:</b> {l.goal}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY })}>
          <PI.plus />פרויקט חדש
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

/* ⚠ שלושה מספרים שמסכמים את המסך, לפני הרשימה. */
function Band({ projects }) {
  const open = projects.filter((p) => !p.sum.closed).length;
  const tasks = projects.reduce((a, p) => a + p.sum.open, 0);
  const late = projects.reduce((a, p) => a + p.sum.late, 0);
  /* ⚠ מבנה `.band` הוא חוזה — ראו ההערה ב-LessonPay.jsx. */
  return (
    <div className="band">
      <div className="band-grid">
        <div className="band-c">
          <div className="band-n">{open}</div>
          <div className="band-l">פרויקטים פעילים</div>
        </div>
        <div className="band-c">
          <div className="band-n">{tasks}</div>
          <div className="band-l">משימות פתוחות</div>
        </div>
        <div className="band-c">
          <div className={"band-n" + (late ? " warn" : "")}>{late}</div>
          <div className="band-l">עבר היעד</div>
        </div>
      </div>
    </div>
  );
}

function Card({ p, onOpen }) {
  return (
    <button className="card pr-card" onClick={onOpen}>
      <div className="pr-top">
        <b>{p.name}</b>
        <span className={"pill " + toneOf(p.status)}>{p.status || "—"}</span>
      </div>
      <div className="pr-meta">
        {p.kind && <span>{p.kind}</span>}
        {p.due && <span>· יעד {dmy(p.due)}</span>}
        {p.partnerNames.length > 0 && <span>· עם {p.partnerNames.join(", ")}</span>}
      </div>

      {/* ⚠ **`pct === null` אינו 0.** בלי משימות אין מה למדוד,
          והפס אינו מוצג כלל — 0% נראה כמו "לא התקדמתי" (4נ). */}
      {p.sum.pct !== null && (
        <div className="mini-bar" style={{ marginTop: 8 }}>
          <i style={{ width: p.sum.pct + "%" }} />
        </div>
      )}
      <div className="pr-nums">
        {p.sum.pct !== null && <span>{p.sum.pct}% · {p.sum.tasksDone}/{p.sum.tasks} משימות</span>}
        {p.sum.late > 0 && <span className="pay-pend">{p.sum.late} עבר היעד</span>}
        {p.budget != null && (
          <span className={p.sum.over ? "pay-miss" : ""}>
            {shekel(p.sum.spent)} מתוך {shekel(p.budget)} ₪
          </span>
        )}
      </div>
    </button>
  );
}

/* ============================================================
   הפרויקט הפתוח — שלוש לשוניות
   ============================================================ */
function ProjectDetail({ p, data, say, reload, onBack, onEdit }) {
  const [tab, setTab] = useState("tasks");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = () => {
    setBusy(true);
    api.deleteProject(p.id)
      .then(() => { say("הפרויקט נמחק"); onBack(); reload(); })
      .catch((e) => say(e.message))
      .finally(() => { setBusy(false); setAsking(false); });
  };

  const archive = (on) => {
    setBusy(true);
    api.editProject({ id: p.id, archived: on })
      .then(() => { say(on ? "הועבר לארכיון" : "הוחזר מהארכיון"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
        <PI.chev style={{ transform: "rotate(180deg)" }} />לכל הפרויקטים
      </button>

      <div className="screen-title">{p.name}</div>
      <div className="pr-meta" style={{ marginBottom: 12 }}>
        <span className={"pill " + toneOf(p.status)}>{p.status || "—"}</span>
        {p.kind && <span>{p.kind}</span>}
        {p.start && <span>· מ-{dmy(p.start)}</span>}
        {p.due && <span>· עד {dmy(p.due)}</span>}
      </div>

      {p.about && <div className="card pr-text">{p.about}</div>}
      {p.goal && (
        <>
          <div className="sec-label">המטרה</div>
          <div className="card pr-text">{p.goal}</div>
        </>
      )}

      {p.partnerNames.length > 0 && (
        <div className="pr-meta" style={{ marginBottom: 10 }}>
          שותפים: <b>{p.partnerNames.join(" · ")}</b>
        </div>
      )}

      <ScrollTabs className="seg">
        <button className={tab === "tasks" ? "on" : ""} onClick={() => setTab("tasks")}>
          משימות{p.sum.tasks ? ` (${p.sum.open})` : ""}
        </button>
        <button className={tab === "stages" ? "on" : ""} onClick={() => setTab("stages")}>
          שלבים{p.sum.stages ? ` (${p.sum.stagesDone}/${p.sum.stages})` : ""}
        </button>
        <button className={tab === "money" ? "on" : ""} onClick={() => setTab("money")}>תקציב</button>
        <button className={tab === "log" ? "on" : ""} onClick={() => setTab("log")}>יומן</button>
        <button className={tab === "about" ? "on" : ""} onClick={() => setTab("about")}>הגדרות</button>
      </ScrollTabs>

      {tab === "tasks" && <Tasks p={p} data={data} say={say} reload={reload} />}
      {tab === "stages" && <Stages p={p} say={say} reload={reload} />}
      {tab === "money" && <Money p={p} data={data} say={say} reload={reload} />}
      {tab === "log" && <Journal p={p} say={say} reload={reload} />}

      {tab === "about" && (
        <>
          <Share p={p} data={data} say={say} reload={reload} />
          <button className="btn btn-ghost" style={{ width: "100%", marginBottom: 8 }}
            onClick={() => exportProject(p)}>ייצוא הפרויקט לאקסל</button>
          <button className="btn btn-ghost" style={{ width: "100%", marginBottom: 8 }}
            onClick={onEdit}>עריכת פרטי הפרויקט</button>
          <button className="btn btn-ghost" style={{ width: "100%", marginBottom: 8 }}
            disabled={busy} onClick={() => archive(!p.archived)}>
            {p.archived ? "החזרה מהארכיון" : "העברה לארכיון"}
          </button>
          {/* ⚠ מחיקה לבעלים בלבד, והשרת אוכף. הכפתור יודע מראש
              כדי שלא יקבל 403 אחרי הלחיצה (4יד). */}
          {p.isOwner && (
            <button className="btn btn-ghost ev-del" style={{ width: "100%" }}
              disabled={busy} onClick={() => setAsking(true)}>מחיקת הפרויקט</button>
          )}
          {asking && (
            <div className="alert a-clay" style={{ marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <div className="ttl">למחוק את "{p.name}"?</div>
                {/* ⚠ **אומרים כמה ייעלם לפני ששואלים.** "בטוח?" על
                    פעולה שמוחקת עשרים שורות אינה שאלה שאפשר
                    לענות עליה. */}
                <div className="e2">
                  {(() => {
                    const n = [
                      p.sum.tasks ? `${p.sum.tasks} משימות` : null,
                      (p.money || []).length ? `${p.money.length} תנועות תקציב` : null,
                      (p.stages || []).length ? `${p.stages.length} שלבים` : null,
                      (p.journal || []).length ? `${p.journal.length} רשומות יומן` : null,
                    ].filter(Boolean);
                    return n.length
                      ? `יימחקו גם ${n.join(", ")}. אי אפשר לשחזר.`
                      : "הפרויקט ריק. אי אפשר לשחזר.";
                  })()}
                  <br />
                  אם רק רוצים להוריד אותו מהרשימה — עדיף "העברה לארכיון",
                  והכול נשמר.
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="btn btn-clay btn-sm" style={{ flex: 1 }}
                    disabled={busy} onClick={remove}>כן, למחוק</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                    disabled={busy} onClick={() => setAsking(false)}>ביטול</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div style={{ height: 50 }} />
    </>
  );
}

/* ---------------- משימות ---------------- */
function Tasks({ p, data, say, reload }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", due: "", owner: "", note: "", stage: "", parent: "" });
  const [busy, setBusy] = useState(null);
  const [view, setView] = useState("list");

  const people = [{ id: p.owner, name: "אני" },
    ...p.partners.map((id, i) => ({ id, name: p.partnerNames[i] }))];

  const add = () => {
    if (!f.title.trim()) return;
    setBusy("new");
    api.addProjectTask({ project: p.id, ...f, title: f.title.trim() })
      .then(() => { say("נוספה"); setF({ title: "", due: "", owner: "", note: "", stage: "", parent: "" }); setAdding(false); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  /* ============================================================
     ⚠⚠ **הסימון אופטימי, ואינו טוען מחדש את המסך.**

     הגרסה הראשונה חיכתה לתשובת monday **ואז** טענה מחדש את כל
     הפרויקטים — שתי הליכות רשת לכל ✓, ובערך שנייה וחצי שבה
     הריבוע לא זז. למשתמש זה נראה כאילו הלחיצה לא נקלטה, והוא
     לוחץ שוב.

     עכשיו: הריבוע מתמלא מיד, הבקשה יוצאת ברקע, והמסך אינו
     נטען מחדש בהצלחה — הסכומים והאחוזים מחושבים כאן מאותה
     שכבת ה-override.

     ⚠ **ובכישלון חוזרים אחורה ואומרים** (4י). סימון שנשאר על
       המסך אחרי שהשרת דחה אותו הוא שקר, לא נוחות.

     ⚠ **ואין `busy` על הריבוע.** נעילה של רבע שנייה בזמן
       שהבקשה בדרך היא בדיוק העיכוב שהסרנו.
     ============================================================ */
  const [flip, setFlip] = useState({});
  const isDone = (t) => (flip[t.id] !== undefined ? flip[t.id] : t.done);

  const toggle = (t) => {
    const next = !isDone(t);
    setFlip((x) => ({ ...x, [t.id]: next }));
    api.editProjectTask({ id: t.id, done: next })
      .catch((e) => {
        setFlip((x) => { const c = { ...x }; delete c[t.id]; return c; });
        say(e.message);
      });
  };

  const del = (t) => {
    setBusy(t.id);
    api.deleteProjectTask(t.id)
      .then(() => { say("נמחקה"); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  const today = new Date().toISOString().slice(0, 10);

  /* ============================================================
     ⚠ **תת-משימות מוצגות תחת האב, וברמה אחת בלבד.**
       עץ בלי גבול הופך רשימת מטלות למבוך. משימה שהאב שלה נמחק
       מוצגת ברמה הראשונה ואינה נעלמת — יתומה שנעלמת היא עבודה
       שאבדה.

     ⚠ **והמיון לפי מה שנשאר לעשות**: פתוחות למעלה, ובתוכן לפי
       יעד. רשימה שממוינת לפי מתי נוצרה עונה על שאלה שאיש לא
       שאל.
     ============================================================ */
  const byId = new Map(p.tasks.map((t) => [t.id, t]));
  const roots = p.tasks.filter((t) => !t.parent || !byId.has(t.parent));
  const kidsOf = (id) => p.tasks.filter((t) => t.parent === id);

  const stageName = (id) => (p.stages || []).find((x) => x.id === id)?.title || null;

  return (
    <>
      {p.tasks.length === 0 && !adding && (
        <div className="empty"><div className="e1">אין עדיין משימות</div>
          <div className="e2">משימה בשורה משלה — כך רואים מה נשאר.</div></div>
      )}

      {/* ⚠ ציר הזמן מוצג רק כשיש למה — משימות עם יעד. תצוגה
          ריקה שמתחלפת היא כפתור שלא עושה כלום. */}
      {p.tasks.some((t) => t.due) && (
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>רשימה</button>
          <button className={view === "time" ? "on" : ""} onClick={() => setView("time")}>ציר זמן</button>
        </div>
      )}

      {view === "time" ? <Timeline p={p} today={today} /> : (
      <div className="rows">
        {roots.map((t) => (
          <div className={"pr-task" + (isDone(t) ? " done" : "")} key={t.id}>
            <button className="pr-chk" onClick={() => toggle(t)}
              aria-label={isDone(t) ? "לבטל סימון" : "סימון כבוצע"}>
              {isDone(t) ? "✓" : ""}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pr-task-t">{t.title}</div>
              <div className="pr-meta">
                {/* ⚠ "עבר היעד" נצבע רק על משימה פתוחה. */}
                {t.due && (
                  <span className={!isDone(t) && t.due < today ? "pay-miss" : ""}>{dmy(t.due)}</span>
                )}
                {t.ownerName && <span>· {t.ownerName}</span>}
                {stageName(t.stage) && <span className="pill p-cool">{stageName(t.stage)}</span>}
                {kidsOf(t.id).length > 0 && (
                  <span>· {kidsOf(t.id).filter(isDone).length}/{kidsOf(t.id).length} תת-משימות</span>
                )}
              </div>
              {t.note && <div className="pr-note">{t.note}</div>}
            </div>
            <button className="btn btn-ghost btn-sm ev-del" disabled={busy === t.id}
              onClick={() => del(t)}>מחיקה</button>
          </div>
        )).concat(
          /* תת-המשימות, מיד אחרי האב ובהזחה */
          roots.flatMap((t) => kidsOf(t.id).map((k) => (
            <div className={"pr-task pr-sub" + (isDone(k) ? " done" : "")} key={k.id}>
              <button className="pr-chk" onClick={() => toggle(k)}
                aria-label={isDone(k) ? "לבטל סימון" : "סימון כבוצע"}>
                {isDone(k) ? "✓" : ""}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pr-task-t">{k.title}</div>
                <div className="pr-meta">
                  <span>מתוך: {t.title}</span>
                  {k.due && (
                    <span className={!isDone(k) && k.due < today ? "pay-miss" : ""}>· {dmy(k.due)}</span>
                  )}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm ev-del" disabled={busy === k.id}
                onClick={() => del(k)}>מחיקה</button>
            </div>
          ))))}
      </div>
      )}

      {adding ? (
        <div className="card lift" style={{ marginTop: 10 }}>
          <div className="fld">
            <label>מה צריך לעשות</label>
            <input value={f.title} autoFocus disabled={busy === "new"}
              onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div className="two">
            <div className="fld">
              <label>עד מתי (לא חובה)</label>
              <input type="date" dir="ltr" value={f.due} disabled={busy === "new"}
                onChange={(e) => setF({ ...f, due: e.target.value })} />
            </div>
            <div className="fld">
              <label>באחריות</label>
              <select value={f.owner} disabled={busy === "new"}
                onChange={(e) => setF({ ...f, owner: e.target.value })}>
                <option value="">— לא משויך —</option>
                {people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
          </div>
          <div className="two">
            {(p.stages || []).length > 0 && (
              <div className="fld">
                <label>שלב</label>
                <select value={f.stage} disabled={busy === "new"}
                  onChange={(e) => setF({ ...f, stage: e.target.value })}>
                  <option value="">— בלי שלב —</option>
                  {p.stages.map((st) => <option key={st.id} value={st.id}>{st.title}</option>)}
                </select>
              </div>
            )}
            {/* ⚠ רק משימות שאינן כבר תת-משימה — עומק אחד. */}
            {roots.length > 0 && (
              <div className="fld">
                <label>תת-משימה של</label>
                <select value={f.parent} disabled={busy === "new"}
                  onChange={(e) => setF({ ...f, parent: e.target.value })}>
                  <option value="">— משימה עצמאית —</option>
                  {roots.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="fld">
            <label>הערות</label>
            <textarea rows={2} value={f.note} disabled={busy === "new"}
              onChange={(e) => setF({ ...f, note: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary" style={{ flex: 1 }}
              disabled={busy === "new" || !f.title.trim()} onClick={add}>הוספה</button>
            <button className="btn btn-ghost" style={{ flex: 1 }}
              disabled={busy === "new"} onClick={() => setAdding(false)}>ביטול</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><PI.plus />משימה חדשה</button>
      )}
    </>
  );
}

/* ---------------- תקציב ---------------- */
function Money({ p, data, say, reload }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", kind: "הוצאה", amount: "", date: "", note: "", category: "" });
  const [busy, setBusy] = useState(null);

  const add = () => {
    if (!f.title.trim()) return;
    setBusy("new");
    api.addProjectMoney({ project: p.id, ...f, title: f.title.trim() })
      .then(() => { say("נרשם"); setF({ title: "", kind: "הוצאה", amount: "", date: "", note: "", category: "" }); setAdding(false); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  const del = (m) => {
    setBusy(m.id);
    api.deleteProjectMoney(m.id)
      .then(() => { say("נמחק"); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  return (
    <>
      <div className="band">
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{shekel(p.sum.spent)} ₪</div>
            <div className="band-l">הוצאות</div>
          </div>
          <div className="band-c">
            <div className="band-n">{shekel(p.sum.income)} ₪</div>
            <div className="band-l">הכנסות</div>
          </div>
          {/* ⚠ **ריק אינו אפס.** תקציב שלא נקבע מוצג כ-"—" ולא
              כאפס, ואז "נותר" חסר משמעות ולכן אינו מוצג. */}
          <div className="band-c">
            <div className={"band-n" + (p.sum.over ? " warn" : "")}>
              {p.sum.left == null ? "—" : shekel(p.sum.left) + " ₪"}
            </div>
            <div className="band-l">{p.budget == null ? "לא נקבע תקציב" : "נותר מהתקציב"}</div>
          </div>
        </div>
      </div>

      {/* ⚠ המספר שאומר כמה מהתמונה חסר — במילים ולא רק בצבע. */}
      {p.sum.noAmount > 0 && (
        <div className="pay-warn">
          ל-{p.sum.noAmount} תנועות לא הוזן סכום, ולכן הן אינן בחשבון.
        </div>
      )}
      {p.sum.over && (
        <div className="pay-warn">ההוצאות עברו את התקציב שנקבע.</div>
      )}

      {/* ⚠ **רק להוצאות.** "כמה עלו החומרים" היא שאלה; "כמה
          נכנס מחומרים" אינה. ומוצג רק כשיש — כותרת מעל ריק
          נראית כמו תקלה (4מא). */}
      {(p.sum.byCategory || []).length > 0 && (
        <>
          <div className="grp-h"><span>לאן הלך הכסף</span></div>
          <div className="pr-cats">
            {p.sum.byCategory.map((c) => {
              const pct = p.sum.spent ? Math.round((c.amount / p.sum.spent) * 100) : 0;
              return (
                <div className="pr-cat" key={c.category}>
                  <div className="pr-cat-t">
                    <span>{c.category}</span>
                    <b className="num">{shekel(c.amount)} ₪</b>
                  </div>
                  <div className="mini-bar"><i style={{ width: pct + "%" }} /></div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="rows">
        {p.money.length === 0 && !adding && (
          <div className="empty"><div className="e1">אין עדיין תנועות</div></div>
        )}
        {p.money.map((m) => (
          <div className="pr-money" key={m.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pr-task-t">{m.title}</div>
              <div className="pr-meta">
                <span>{m.kind}</span>
                {m.category && <span>· {m.category}</span>}
                {m.date && <span>· {dmy(m.date)}</span>}
              </div>
              {m.note && <div className="pr-note">{m.note}</div>}
            </div>
            <b className={"num " + (m.kind === "הכנסה" ? "pr-in" : "pr-out")}>
              {m.amount == null ? "—" : (m.kind === "הכנסה" ? "+" : "−") + shekel(m.amount) + " ₪"}
            </b>
            <button className="btn btn-ghost btn-sm ev-del" disabled={busy === m.id}
              onClick={() => del(m)}>מחיקה</button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="card lift" style={{ marginTop: 10 }}>
          <div className="fld">
            <label>על מה</label>
            <input value={f.title} autoFocus disabled={busy === "new"}
              placeholder="למשל: חומרים · דמי רישום"
              onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div className="two">
            <div className="fld">
              <label>סוג</label>
              <select value={f.kind} disabled={busy === "new"}
                onChange={(e) => setF({ ...f, kind: e.target.value })}>
                <option value="הוצאה">הוצאה</option>
                <option value="הכנסה">הכנסה</option>
              </select>
            </div>
            <div className="fld">
              <label>סכום</label>
              {/* ⚠ decimal ולא numeric — זה כסף. */}
              <input inputMode="decimal" value={f.amount} disabled={busy === "new"}
                onChange={(e) => setF({ ...f, amount: e.target.value })} />
            </div>
          </div>
          <div className="two">
            <div className="fld">
              <label>תאריך (לא חובה)</label>
              <input type="date" dir="ltr" value={f.date} disabled={busy === "new"}
                onChange={(e) => setF({ ...f, date: e.target.value })} />
            </div>
            {/* ⚠ קטגוריה רק להוצאה — "קטגוריית הכנסה" אינה שאלה
                שמישהו שואל, ובורר שאין לו משמעות הוא רעש. */}
            {f.kind === "הוצאה" && (
              <div className="fld">
                <label>קטגוריה</label>
                <select value={f.category} disabled={busy === "new"}
                  onChange={(e) => setF({ ...f, category: e.target.value })}>
                  <option value="">— בלי —</option>
                  {(data.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary" style={{ flex: 1 }}
              disabled={busy === "new" || !f.title.trim()} onClick={add}>הוספה</button>
            <button className="btn btn-ghost" style={{ flex: 1 }}
              disabled={busy === "new"} onClick={() => setAdding(false)}>ביטול</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><PI.plus />תנועה חדשה</button>
      )}
    </>
  );
}

/* ---------------- טופס הפרויקט ---------------- */
function ProjectForm({ data, form, say, onCancel, onDone }) {
  const [f, setF] = useState(form);
  const [busy, setBusy] = useState(false);
  const editing = Boolean(f.id);
  /* ⚠ רשימת השותפים נקבעת על ידי מי שפתח בלבד — והשרת אוכף.
     הבורר מוסתר לשותף כדי שלא יקבל 403 אחרי שכבר בחר. */
  const mayPartners = !editing || f.isOwner;

  const save = () => {
    if (!f.name.trim() || busy) return;
    setBusy(true);
    const body = {
      name: f.name.trim(), kind: f.kind, status: f.status,
      about: f.about, goal: f.goal, start: f.start, due: f.due,
      budget: f.budget, ...(mayPartners ? { partners: f.partners } : {}),
      /* ⚠ תבנית נשלחת **ביצירה בלבד** — בעריכה היא הייתה
         מוסיפה שוב את אותם שלבים ומשימות. */
      ...(editing ? {} : { template: f.template }),
    };
    (editing ? api.editProject({ ...body, id: f.id }) : api.addProject(body))
      .then((r) => { say(editing ? "נשמר" : "הפרויקט נוצר"); onDone(editing ? f.id : r.id); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const togglePartner = (id) => setF((x) => ({
    ...x,
    partners: x.partners.includes(id) ? x.partners.filter((y) => y !== id) : [...x.partners, id],
  }));

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}
        disabled={busy} onClick={onCancel}>ביטול</button>
      <div className="screen-title">{editing ? "עריכת פרויקט" : "פרויקט חדש"}</div>

      <div className="card lift">
        <div className="fld">
          <label>שם הפרויקט</label>
          <input value={f.name} autoFocus disabled={busy}
            onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>

        {/* ============================================================
            ⚠ **תבנית — נקודת פתיחה, ולא מסלול.**
              חניך שמתחיל מדף ריק לרוב לא מתחיל. התבנית פותחת
              שלושה-ארבעה שלבים וכמה משימות ראשונות, שאפשר למחוק
              בשנייה. ומוצגת **ביצירה בלבד**: בעריכה היא הייתה
              מוסיפה שוב את מה שכבר יש.
            ============================================================ */}
        {!editing && (
          <div className="fld">
            <label>להתחיל מתבנית (לא חובה)</label>
            <div className="pr-tpl">
              <button type="button" className={!f.template ? "on" : ""} disabled={busy}
                onClick={() => setF({ ...f, template: "" })}>מאפס</button>
              {(data.templates || []).map((t) => (
                <button type="button" key={t.key} disabled={busy}
                  className={f.template === t.key ? "on" : ""}
                  onClick={() => setF({ ...f, template: t.key })}>{t.name}</button>
              ))}
            </div>
            {f.template && (
              <div className="e2" style={{ marginTop: 6 }}>
                {(data.templates.find((t) => t.key === f.template) || {}).about}
              </div>
            )}
          </div>
        )}
        <div className="two">
          <div className="fld">
            <label>סוג</label>
            <select value={f.kind} disabled={busy}
              onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {data.kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>סטטוס</label>
            <select value={f.status} disabled={busy}
              onChange={(e) => setF({ ...f, status: e.target.value })}>
              {data.statuses.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
        <div className="fld">
          <label>על מה הפרויקט</label>
          <textarea rows={3} value={f.about} disabled={busy}
            onChange={(e) => setF({ ...f, about: e.target.value })} />
        </div>
        <div className="fld">
          <label>המטרה — איך נדע שהצלחנו</label>
          <textarea rows={2} value={f.goal} disabled={busy}
            onChange={(e) => setF({ ...f, goal: e.target.value })} />
        </div>
        <div className="two">
          <div className="fld">
            <label>התחלה</label>
            <input type="date" dir="ltr" value={f.start} disabled={busy}
              onChange={(e) => setF({ ...f, start: e.target.value })} />
          </div>
          <div className="fld">
            <label>יעד</label>
            <input type="date" dir="ltr" value={f.due} disabled={busy}
              onChange={(e) => setF({ ...f, due: e.target.value })} />
          </div>
        </div>
        <div className="fld">
          <label>תקציב מתוכנן (לא חובה)</label>
          <input inputMode="decimal" value={f.budget} disabled={busy}
            placeholder="ריק = לא נקבע" onChange={(e) => setF({ ...f, budget: e.target.value })} />
        </div>

        {mayPartners && (
          <>
            <div className="sec-label" style={{ marginTop: 4 }}>שותפים</div>
            <div className="e2" style={{ marginBottom: 8 }}>
              מי שתבחרו יראה את הפרויקט ויוכל לערוך אותו. הצוות עדיין לא רואה.
            </div>
            {/* ⚠ `.scroll-y` הקיימת ולא max-height חדש: כלל
                חדש בתוך .rows נבלע על ידי .kx .rows{"{"}overflow:hidden{"}"} (4ק). */}
            <div className="rows scroll-y pr-pick">
              {data.students.map((s) => (
                <label className="pr-pick-r" key={s.id}>
                  <input type="checkbox" disabled={busy}
                    checked={f.partners.includes(s.id)}
                    onChange={() => togglePartner(s.id)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <button className="btn btn-primary" style={{ marginTop: 12 }}
          disabled={busy || !f.name.trim()} onClick={save}>
          {busy ? "שומר…" : editing ? "שמירה" : "יצירת הפרויקט"}
        </button>
      </div>
      <div style={{ height: 50 }} />
    </>
  );
}

/* ============================================================
   שלבים — אבני דרך בדרך
   ------------------------------------------------------------
   ⚠ **הסדר ידני ולא לפי תאריך.** שני שלבים יכולים ליפול באותו
     שבוע, והסדר ביניהם הוא החלטה של החניך. תאריך הוא מידע נוסף
     ולא המפתח.

   ⚠ **שלב שהושלם נשאר ומסומן.** "הגענו לשם" הוא חלק מהסיפור,
     ומחיקה הופכת פרויקט לרשימת מה שנשאר.

   ⚠ **מחיקת שלב אינה מוחקת את המשימות שלו** — הן חוזרות
     ל"בלי שלב". מחיקת עבודה של מישהו כתופעת לוואי היא בדיוק
     מה שאין לעשות.
   ============================================================ */
function Stages({ p, say, reload }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", date: "", body: "" });
  const [busy, setBusy] = useState(null);

  const add = () => {
    if (!f.title.trim()) return;
    setBusy("new");
    api.addProjectEntry({
      project: p.id, kind: "שלב", title: f.title.trim(),
      date: f.date, body: f.body, order: (p.stages || []).length + 1,
    })
      .then(() => { say("השלב נוסף"); setF({ title: "", date: "", body: "" }); setAdding(false); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  /* ⚠ אופטימי ובלי טעינה מחדש — ראו ההערה ב-Tasks. */
  const [flip, setFlip] = useState({});
  const isDone = (st) => (flip[st.id] !== undefined ? flip[st.id] : st.done);

  const toggle = (st) => {
    const next = !isDone(st);
    setFlip((x) => ({ ...x, [st.id]: next }));
    api.editProjectEntry({ id: st.id, done: next })
      .catch((e) => {
        setFlip((x) => { const c = { ...x }; delete c[st.id]; return c; });
        say(e.message);
      });
  };

  const del = (st) => {
    setBusy(st.id);
    api.deleteProjectEntry(st.id)
      .then(() => { say("נמחק"); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  const stages = p.stages || [];
  const tasksOf = (id) => (p.tasks || []).filter((t) => t.stage === id);

  return (
    <>
      {stages.length === 0 && !adding && (
        <div className="empty">
          <div className="e1">אין עדיין שלבים</div>
          <div className="e2">
            שלב הוא נקודה בדרך — "לגייס שותפים", "ההרצה הראשונה". המשימות
            מתחלקות ביניהם, ואז רואים איפה הפרויקט עומד ולא רק כמה נשאר.
          </div>
        </div>
      )}

      {/* ⚠ ציר אנכי ולא רשת: שלבים הם רצף, והקו אומר את זה
          בלי מילה. */}
      <div className="pr-track">
        {stages.map((st) => {
          const t = tasksOf(st.id);
          /* ⚠ נספר מהמצב המוצג ולא מהשרת, אחרת המונה מפגר
             אחרי הריבוע שכבר התמלא. */
          const done = t.filter((x) => x.done).length;
          return (
            <div className={"pr-step" + (isDone(st) ? " done" : "")} key={st.id}>
              <button className="pr-dot" onClick={() => toggle(st)}
                aria-label={isDone(st) ? "לבטל סימון" : "סימון כהושלם"}>
                {isDone(st) ? "✓" : ""}
              </button>
              <div className="pr-step-b">
                <div className="pr-step-t">{st.title}</div>
                <div className="pr-meta">
                  {st.date && <span>{dmy(st.date)}</span>}
                  {/* ⚠ מוצג רק כשיש משימות בשלב — "0/0" אינו נתון. */}
                  {t.length > 0 && <span>· {done}/{t.length} משימות</span>}
                </div>
                {st.body && <div className="pr-note">{st.body}</div>}
              </div>
              <button className="btn btn-ghost btn-sm ev-del" disabled={busy === st.id}
                onClick={() => del(st)}>מחיקה</button>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="card lift" style={{ marginTop: 10 }}>
          <div className="fld">
            <label>שם השלב</label>
            <input value={f.title} autoFocus disabled={busy === "new"}
              placeholder="למשל: לגייס שותפים"
              onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div className="fld">
            <label>יעד (לא חובה)</label>
            <input type="date" dir="ltr" value={f.date} disabled={busy === "new"}
              onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div className="fld">
            <label>מה צריך לקרות בו</label>
            <textarea rows={2} value={f.body} disabled={busy === "new"}
              onChange={(e) => setF({ ...f, body: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary" style={{ flex: 1 }}
              disabled={busy === "new" || !f.title.trim()} onClick={add}>הוספה</button>
            <button className="btn btn-ghost" style={{ flex: 1 }}
              disabled={busy === "new"} onClick={() => setAdding(false)}>ביטול</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><PI.plus />שלב חדש</button>
      )}
    </>
  );
}

/* ============================================================
   יומן הפרויקט
   ------------------------------------------------------------
   ⚠ **זה מה שהופך פרויקט לסיפור.** רשימת משימות סגורות אומרת
     מה נעשה; היומן אומר מה קרה — מה נתקע, מה הפתיע, מה למדנו.
     בסוף השנה זה מה שאפשר לספר עליו.

   ⚠ **האחרון למעלה.** יומן שנקרא מלמטה למעלה מכריח לגלול כדי
     להגיע לעכשיו.
   ============================================================ */
function Journal({ p, say, reload }) {
  const today = new Date().toISOString().slice(0, 10);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", date: today, body: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(null);

  const add = () => {
    if (!f.body.trim()) return;
    setBusy("new");
    api.addProjectEntry({
      project: p.id, kind: "יומן",
      ...(file || {}),
      /* ⚠ כותרת ריקה נופלת לתאריך: השדה חובה בשרת (שם הפריט
         בלוח), וכפייה על החניך להמציא כותרת לכל רשומה היא
         בדיוק מה שגורם לא לכתוב. */
      title: f.title.trim() || dmy(f.date || today),
      date: f.date, body: f.body.trim(),
    })
      .then((r) => {
        say(r && r.fileUploaded ? "נרשם, והקובץ הועלה" : "נרשם");
        setF({ title: "", date: today, body: "" });
        setFile(null); setAdding(false); reload();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  /* ============================================================
     ⚠ **הקובץ נקרא ל-base64 בדפדפן.** אין שירות אחסון חיצוני,
       וזו הייתה החלטה — לא פער. הגבול נאכף בשרת (2MB), וגם כאן
       כדי שהמשתמש יידע לפני שהוא ממתין להעלאה שתידחה.
     ============================================================ */
  const pick = (e) => {
    const fl = e.target.files && e.target.files[0];
    if (!fl) { setFile(null); return; }
    if (fl.size > 2 * 1024 * 1024) {
      say("הקובץ גדול מ-2MB. אפשר לצלם באיכות נמוכה יותר.");
      e.target.value = "";
      return;
    }
    const rd = new FileReader();
    rd.onload = () => setFile({
      fileData: String(rd.result).split(",")[1],
      fileName: fl.name, fileMime: fl.type || "application/octet-stream",
    });
    rd.readAsDataURL(fl);
  };

  const del = (e2) => {
    setBusy(e2.id);
    api.deleteProjectEntry(e2.id)
      .then(() => { say("נמחק"); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  const log = p.journal || [];

  return (
    <>
      {log.length === 0 && !adding && (
        <div className="empty">
          <div className="e1">היומן ריק</div>
          <div className="e2">
            שורה בשבוע — מה קרה, מה נתקע, מה הפתיע. זה מה שהופך רשימת
            משימות לסיפור שאפשר לספר.
          </div>
        </div>
      )}

      <div className="rows">
        {log.map((e2) => (
          <div className="pr-log" key={e2.id}>
            <div className="pr-log-d num">{e2.date ? dmy(e2.date) : "—"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {e2.title && e2.title !== dmy(e2.date) && (
                <div className="pr-task-t">{e2.title}</div>
              )}
              {e2.body && <div className="pr-log-b">{e2.body}</div>}
              {/* ⚠ קישור ולא תצוגה מוטמעת: הקובץ יכול להיות
                  PDF, מסמך או תמונה, ותצוגה שמנחשת נשברת. */}
              {(e2.files || []).length > 0 && (
                <div className="pr-files">
                  {e2.files.map((fl) => (
                    fl.url
                      ? <a key={fl.id} href={fl.url} target="_blank" rel="noreferrer"
                        className="pill p-cool">{fl.name}</a>
                      : <span key={fl.id} className="pill p-idle">{fl.name}</span>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm ev-del" disabled={busy === e2.id}
              onClick={() => del(e2)}>מחיקה</button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="card lift" style={{ marginTop: 10 }}>
          <div className="two">
            <div className="fld">
              <label>תאריך</label>
              <input type="date" dir="ltr" value={f.date} disabled={busy === "new"}
                onChange={(e) => setF({ ...f, date: e.target.value })} />
            </div>
            <div className="fld">
              <label>כותרת (לא חובה)</label>
              <input value={f.title} disabled={busy === "new"}
                onChange={(e) => setF({ ...f, title: e.target.value })} />
            </div>
          </div>
          <div className="fld">
            <label>מה קרה</label>
            <textarea rows={4} value={f.body} autoFocus disabled={busy === "new"}
              placeholder="מה התקדם, מה נתקע, מה הפתיע"
              onChange={(e) => setF({ ...f, body: e.target.value })} />
          </div>
          <div className="fld">
            <label>לצרף קובץ או תמונה (עד 2MB)</label>
            <input type="file" disabled={busy === "new"} onChange={pick}
              accept="image/*,application/pdf" />
            {file && <div className="e2" style={{ marginTop: 4 }}>{file.fileName}</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-primary" style={{ flex: 1 }}
              disabled={busy === "new" || !f.body.trim()} onClick={add}>שמירה</button>
            <button className="btn btn-ghost" style={{ flex: 1 }}
              disabled={busy === "new"} onClick={() => setAdding(false)}>ביטול</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}><PI.plus />רשומה חדשה</button>
      )}
    </>
  );
}

/* ============================================================
   שיתוף — שתי החלטות נפרדות
   ------------------------------------------------------------
   ⚠⚠ **"הצוות יראה עכשיו" ו"המחזור הבא יראה" הן שתי שאלות.**
     חניך יכול לרצות עזרה בתקציב ולא לרצות שהפרויקט יישאר
     לתמיד, ולהפך. תיבה אחת לשתיהן הייתה מכריחה אותו לוותר
     על אחת.

   ⚠ **שתיהן כבויות כברירת מחדל, ושתיהן שלו.** אין מסלול שבו
     הצוות מדליק אותן — זו כל ההבטחה שהמסך נשען עליה.
   ============================================================ */
function Share({ p, data, say, reload }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(p.shareNote || "");
  const [open, setOpen] = useState(false);

  const set = (fields) => {
    setBusy(true);
    api.editProject({ id: p.id, ...fields })
      .then(() => { say("נשמר"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="sec-label" style={{ margin: "0 0 8px" }}>שיתוף</div>

      <label className="pr-toggle">
        <input type="checkbox" checked={Boolean(p.shared)} disabled={busy}
          onChange={(e) => { if (e.target.checked) setOpen(true); else set({ shared: false }); }} />
        <span>
          <b>לשתף עם הצוות</b>
          <i>כדי לבקש תקציב, ליווי או עזרה. הם יראו את הפרויקט הזה בלבד.</i>
        </span>
      </label>

      {(open || p.shared) && (
        <div className="fld" style={{ marginTop: 8 }}>
          <label>מה אתם מבקשים</label>
          <textarea rows={2} value={note} disabled={busy}
            placeholder="למשל: 400 ₪ לחומרים, ואישור להשתמש בחדר האוכל"
            onChange={(e) => setNote(e.target.value)} />
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}
            disabled={busy || !note.trim()}
            onClick={() => { set({ shared: true, shareNote: note }); setOpen(false); }}>
            {p.shared ? "עדכון הבקשה" : "שיתוף ובקשה"}
          </button>
        </div>
      )}

      <label className="pr-toggle" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={Boolean(p.legacy)} disabled={busy}
          onChange={(e) => set({ legacy: e.target.checked })} />
        <span>
          <b>לשמור לדורות הבאים</b>
          <i>המחזור הבא יוכל לקרוא על הפרויקט כדי ללמוד ממנו. בלי היומן
            ובלי התקציב — רק מה הוא היה ומה יצא ממנו.</i>
        </span>
      </label>
    </div>
  );
}

/* ============================================================
   ייצוא
   ------------------------------------------------------------
   ⚠ **גיליון אחד ולא שלושה.** הפרויקט, המשימות והתקציב זה מתחת
     לזה — מי שפותח את הקובץ רוצה לקרוא אותו, לא לנווט בו.

   ⚠ **ריק יוצא כ-"—" ולא כאפס.** תקציב שלא נקבע אינו אפס
     שקלים, וזה נכון גם מחוץ למסך.
   ============================================================ */
function exportProject(p) {
  const rows = [];
  const add = (...cells) => rows.push(cells);

  add("פרויקט", p.name);
  add("סטטוס", p.status || "—");
  add("סוג", p.kind || "—");
  if (p.about) add("על מה", p.about);
  if (p.goal) add("מטרה", p.goal);
  add("תאריכים", [p.start ? dmy(p.start) : "", p.due ? "עד " + dmy(p.due) : ""]
    .filter(Boolean).join(" ") || "—");
  if (p.partnerNames.length) add("שותפים", p.partnerNames.join(", "));
  add("תקציב מתוכנן", p.budget == null ? "—" : p.budget);
  add("הוצאות בפועל", p.sum.spent);
  add("הכנסות", p.sum.income);
  add("נותר", p.sum.left == null ? "—" : p.sum.left);
  add("");

  if ((p.stages || []).length) {
    add("שלבים"); add("שלב", "יעד", "הושלם");
    for (const st of p.stages) add(st.title, st.date ? dmy(st.date) : "", st.done ? "כן" : "לא");
    add("");
  }

  add("משימות"); add("משימה", "יעד", "באחריות", "בוצע");
  for (const t of p.tasks) {
    add(t.title, t.due ? dmy(t.due) : "", t.ownerName || "", t.done ? "כן" : "לא");
  }
  add("");

  add("תקציב"); add("על מה", "סוג", "קטגוריה", "סכום", "תאריך");
  for (const m of p.money) {
    add(m.title, m.kind, m.category || "", m.amount == null ? "—" : m.amount,
      m.date ? dmy(m.date) : "");
  }

  if ((p.journal || []).length) {
    add(""); add("יומן"); add("תאריך", "מה קרה");
    for (const e of p.journal) add(e.date ? dmy(e.date) : "", e.body || e.title);
  }

  downloadTable({
    file: "פרויקט-" + p.name.replace(/[\\/:*?"<>|]/g, "-"),
    sheet: "פרויקט", title: p.name,
    header: null, widths: [30, 16, 16, 12, 12], rows,
  });
}

/* ============================================================
   ציר זמן
   ------------------------------------------------------------
   ⚠ **סולם אחד, ולכל תווית יש ערך שהציר באמת מגיע אליו.**
     הציר נמתח מהמשימה המוקדמת ביותר עד המאוחרת, ו"היום" מסומן
     עליו רק אם הוא בתוך הטווח — קו "אנחנו כאן" מחוץ לתמונה
     משקר על המרחק.

   ⚠ **משימות בלי יעד אינן על הציר, ונאמר כמה הן.** ציר שמעמיד
     אותן על תאריך שרירותי גרוע מציר שמצהיר שהן חסרות.

   ⚠ **צבע לעולם לא לבדו** (4ו): לכל מצב יש גם מילה בשורה
     שמעליו, וסימן על מה שעבר את היעד.
   ============================================================ */
function Timeline({ p, today }) {
  const dated = p.tasks.filter((t) => t.due).sort((a, b) => a.due.localeCompare(b.due));
  const none = p.tasks.length - dated.length;
  if (!dated.length) return <div className="empty"><div className="e1">אין משימות עם יעד</div></div>;

  const first = dated[0].due;
  const last = dated[dated.length - 1].due;
  const t0 = new Date(first + "T12:00:00Z").getTime();
  const t1 = new Date(last + "T12:00:00Z").getTime();
  const span = Math.max(1, t1 - t0);
  const at = (iso) => ((new Date(iso + "T12:00:00Z").getTime() - t0) / span) * 100;
  const nowIn = today >= first && today <= last;

  return (
    <>
      <div className="pr-tl">
        <div className="pr-tl-line">
          {nowIn && <span className="pr-tl-now" style={{ insetInlineStart: at(today) + "%" }} />}
        </div>
        <div className="pr-tl-ends">
          <span className="num">{dmy(first)}</span>
          <span className="num">{dmy(last)}</span>
        </div>
      </div>

      <div className="rows">
        {dated.map((t) => {
          const late = !t.done && t.due < today;
          return (
            <div className="pr-tl-row" key={t.id}>
              <div className="pr-tl-bar">
                <i className={t.done ? "done" : late ? "late" : ""}
                  style={{ insetInlineStart: at(t.due) + "%" }} />
              </div>
              <div className="pr-tl-t">
                <span className={t.done ? "pr-tl-done" : ""}>{t.title}</span>
                <b className="num">{dmy(t.due)}</b>
              </div>
              <div className="pr-meta">
                {t.done ? <span>בוצע</span> : late ? <span className="pay-miss">עבר היעד</span>
                  : <span>ממתין</span>}
                {t.ownerName && <span>· {t.ownerName}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {none > 0 && (
        <div className="pay-warn">
          {none} משימות בלי יעד אינן על הציר.
        </div>
      )}
    </>
  );
}
