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
  start: "", due: "", budget: "", partners: [],
};

export default function ProjectsPage({ say }) {
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
  return (
    <div className="band">
      <div><b className="num">{open}</b><span>פרויקטים פעילים</span></div>
      <div><b className="num">{tasks}</b><span>משימות פתוחות</span></div>
      <div className={"band-n" + (late ? " warn" : "")}>
        <b className="num">{late}</b><span>עבר היעד</span>
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
        <button className={tab === "money" ? "on" : ""} onClick={() => setTab("money")}>תקציב</button>
        <button className={tab === "about" ? "on" : ""} onClick={() => setTab("about")}>הגדרות</button>
      </ScrollTabs>

      {tab === "tasks" && <Tasks p={p} data={data} say={say} reload={reload} />}
      {tab === "money" && <Money p={p} say={say} reload={reload} />}

      {tab === "about" && (
        <>
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
                <div className="e2">
                  פרויקט שיש בו משימות או תנועות תקציב אינו נמחק — הוא עובר
                  לארכיון, והכול נשמר.
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
  const [f, setF] = useState({ title: "", due: "", owner: "", note: "" });
  const [busy, setBusy] = useState(null);

  const people = [{ id: p.owner, name: "אני" },
    ...p.partners.map((id, i) => ({ id, name: p.partnerNames[i] }))];

  const add = () => {
    if (!f.title.trim()) return;
    setBusy("new");
    api.addProjectTask({ project: p.id, ...f, title: f.title.trim() })
      .then(() => { say("נוספה"); setF({ title: "", due: "", owner: "", note: "" }); setAdding(false); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  const toggle = (t) => {
    setBusy(t.id);
    api.editProjectTask({ id: t.id, done: !t.done })
      .then(reload).catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  const del = (t) => {
    setBusy(t.id);
    api.deleteProjectTask(t.id)
      .then(() => { say("נמחקה"); reload(); })
      .catch((e) => say(e.message)).finally(() => setBusy(null));
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      {p.tasks.length === 0 && !adding && (
        <div className="empty"><div className="e1">אין עדיין משימות</div>
          <div className="e2">משימה בשורה משלה — כך רואים מה נשאר.</div></div>
      )}

      <div className="rows">
        {p.tasks.map((t) => (
          <div className={"pr-task" + (t.done ? " done" : "")} key={t.id}>
            <button className="pr-chk" disabled={busy === t.id} onClick={() => toggle(t)}
              aria-label={t.done ? "לבטל סימון" : "סימון כבוצע"}>
              {t.done ? "✓" : ""}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pr-task-t">{t.title}</div>
              <div className="pr-meta">
                {/* ⚠ "עבר היעד" נצבע רק על משימה פתוחה. */}
                {t.due && (
                  <span className={!t.done && t.due < today ? "pay-miss" : ""}>{dmy(t.due)}</span>
                )}
                {t.ownerName && <span>· {t.ownerName}</span>}
              </div>
              {t.note && <div className="pr-note">{t.note}</div>}
            </div>
            <button className="btn btn-ghost btn-sm ev-del" disabled={busy === t.id}
              onClick={() => del(t)}>מחיקה</button>
          </div>
        ))}
      </div>

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
function Money({ p, say, reload }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", kind: "הוצאה", amount: "", date: "", note: "" });
  const [busy, setBusy] = useState(null);

  const add = () => {
    if (!f.title.trim()) return;
    setBusy("new");
    api.addProjectMoney({ project: p.id, ...f, title: f.title.trim() })
      .then(() => { say("נרשם"); setF({ title: "", kind: "הוצאה", amount: "", date: "", note: "" }); setAdding(false); reload(); })
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
        <div><b className="num">{shekel(p.sum.spent)} ₪</b><span>הוצאות</span></div>
        <div><b className="num">{shekel(p.sum.income)} ₪</b><span>הכנסות</span></div>
        {/* ⚠ **ריק אינו אפס.** תקציב שלא נקבע מוצג כ-"—" ולא
            כאפס, ואז "נותר" חסר משמעות ולכן אינו מוצג. */}
        <div className={"band-n" + (p.sum.over ? " warn" : "")}>
          <b className="num">{p.sum.left == null ? "—" : shekel(p.sum.left) + " ₪"}</b>
          <span>{p.budget == null ? "לא נקבע תקציב" : "נותר מהתקציב"}</span>
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
          <div className="fld">
            <label>תאריך (לא חובה)</label>
            <input type="date" dir="ltr" value={f.date} disabled={busy === "new"}
              onChange={(e) => setF({ ...f, date: e.target.value })} />
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
