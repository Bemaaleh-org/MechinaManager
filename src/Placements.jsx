/* ============================================================
   שיבוצי חניכים — מסך המנהל
   ------------------------------------------------------------
   ענפים, סדרות, ועדות וקבוצות — כל אחד בלשונית, ולצידם
   בעלי התפקידים הכלליים (אחראי מכולה, מטבח, לו״ז, אב בית).

   ⚠ אילו שיבוצים קיימים, מה המכסה ומה התקופה — נקבע בלוח
     ההגדרות ב-monday, לא כאן. המסך הזה רק משבץ חניכים.

   שיבוץ "לפי סמסטר" מציג שתי לשוניות סמסטר; החלוקה היא אותה
   חלוקה של הנוכחות, שנקטעת בשבוע האמצע.
   ============================================================ */

import React, { useState, useMemo } from "react";
import { api } from "./api.js";
import { GUIDES } from "./placement-guides.js";
import { RoleHolders } from "./Mechina.jsx";
import { CATEGORIES, semestersFor, plural } from "../shared/placements.js";
import { isTeamCategory } from "../shared/team.js";
import ScrollTabs from "./Tabs.jsx";

const PI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  users: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.4-1-4.1-2.6-5"/></svg>,
  leaf: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>,
  flag: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 22V4M5 4h11l-1.5 4L16 12H5"/></svg>,
  gavel: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20h10M6 15l6-6M9 4l7 7M12 3.5 15.5 7M8.5 10.5 12 14"/></svg>,
};

/* ⚠ אייקון לכל קטגוריה. ברשימה ארוכה העין תופסת צורה לפני
   שהיא קוראת מילה. */
const CAT_ICON = { "ענף": PI.leaf, "סדרה": PI.flag, "ועדה": PI.gavel, "קבוצה": PI.users };

/* ⚠ הגוון נגזר משם הפריט ולא נשמר בשום מקום: ענף חדש שיתווסף
   בלוח מקבל צבע מעצמו, בלי דיפלוי ובלי עמודת צבע לתחזק. אותו
   שם מקבל תמיד אותו צבע — הרשימה לא מתחלפת בכל טעינה.

   ⚠ שמונה גוונים. פחות מזה וענפים שכנים יוצאים זהים, יותר
     מזה והם מתחילים להידמות זה לזה ממילא. */
function tone(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return "tone-" + (h % 8 + 1);
}

function useLoad(fn, deps = []) {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(true);
  const run = React.useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
        .catch((e) => { if (live) setErr(e); })
        .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

/* ---------- הקמה בלחיצה ----------
   בפיתוח מקומי שרת ה-vite מחובר ל-monday דרך .env, ולכן הוא
   יכול ליצור את הלוחות ולכתוב את המזהים בעצמו. בדיפלוי
   הפעולה אינה קיימת (ראו _placements-setup.js) — שם יופיע
   הכרטיס בלי הכפתור, עם השגיאה שהשרת מחזיר. */
function SetupCard({ say, onDone }) {
  const [busy, setBusy] = useState(false);
  const [failMsg, setFailMsg] = useState(null);

  const run = () => {
    if (busy) return;
    setBusy(true); setFailMsg(null);
    api.setupPlacements()
      .then((r) => {
        say(`הלוחות נוצרו — נזרעו ${r.seeded} שיבוצים`);
        onDone();
      })
      .catch((e) => setFailMsg(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}><PI.users /></div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
        שיבוצי החניכים עדיין לא חוברו ל-monday
      </div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, marginBottom: 16, lineHeight: 1.6 }}>
        לחיצה אחת תיצור את הלוחות ותזרע את הענפים, הסדרות,
        הוועדות והקבוצות. לוקח כחצי דקה.
      </div>
      {failMsg && <div className="login-err" style={{ marginBottom: 12 }}>{failMsg}</div>}
      <button className="btn btn-primary" disabled={busy} onClick={run}>
        {busy ? "יוצר לוחות וזורע… נא לא לסגור" : "יצירת הלוחות עכשיו"}
      </button>
    </div>
  );
}

/* ---------- עריכת המשובצים בשיבוץ+סמסטר אחד ---------- */
function AssignEditor({ def, semester, assigned, roster, say, onDone, onCancel }) {
  /* ============================================================
     ⚠ **חניך שכובה לא יקפיא את העורך.**

     `picked` אותחל מכל המשובצים, בעוד `roster` מכיל פעילים
     בלבד — ולכן חניך שכובה נשאר **מסומן בלי תיבה לבטל**,
     והשמירה נכשלה ב-400 "ברשימה חניך שאינו פעיל" לנצח, עד
     שמוחקים את השורה ב-monday. באמצע שנה זה קורה בוודאות.

     ⚠ והוא **מדווח ולא נשמט בשקט** — מי שעורך צריך לדעת
       שמישהו הוסר מהרשימה, אחרת המספר משתנה בלי הסבר.
     ============================================================ */
  const live = useMemo(() => new Set(roster.map((r) => r.id)), [roster]);
  const dropped = assigned.filter((a) => !live.has(a.student));
  const [picked, setPicked] = useState(
    () => new Set(assigned.filter((a) => live.has(a.student)).map((a) => a.student)));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const list = roster.filter((r) => !q.trim() || r.name.includes(q.trim()));
  /* ⚠ Number.isFinite ולא != null: מכסה לא-מספרית ב-monday
     נותנת NaN, וכל השוואה איתה false — האזהרה נעלמת בשקט. */
  const over = Number.isFinite(def.capacity) && picked.size > def.capacity;

  const toggle = (id) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const save = () => {
    if (busy) return;
    /* ⚠ המכסה נאכפת בשרת; כאן חוסכים שליחה שתידחה ממילא. */
    if (over) { say(`ל"${def.name}" יש ${def.capacity} מקומות — נבחרו ${picked.size}`); return; }
    setBusy(true);
    api.assignPlacement({ placementId: def.id, semester, studentIds: [...picked] })
      .then((r) => { say(`נשמר — ${r.total} משובצים`); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <PI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{def.name} · {semester}</div>

      <div className="card" style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <b className="num" style={{ fontSize: 22 }}>{picked.size}</b>
        <span style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>
          משובצים{def.capacity != null ? ` מתוך מכסה של ${def.capacity}` : ""}
        </span>
        {over && <span className="pill p-low">מעל המכסה</span>}
      </div>

      {/* ⚠ מדווח ולא נשמט בשקט. ראו ההערה למעלה. */}
      {dropped.length > 0 && (
        <div className="note-warn" style={{ marginBottom: 12 }}>
          {dropped.length === 1 ? "משובץ אחד הוסר" : `${dropped.length} משובצים הוסרו`} מהרשימה
          כי אינם פעילים במכינה: {dropped.map((a) => a.studentName || a.student).join(" · ")}.
          שמירה תמחק את השיבוץ שלהם.
        </div>
      )}

      {/* ⚠ הפירוט מוצג כאן, ליד השיבוץ עצמו — זה הרגע שבו
          המנהל צריך לדעת מה הענף דורש ומי מתאים לו.
          לחניך הוא אינו מגיע: השרת אינו שולח אותו. */}
      <PlacementDetail def={def} />

      <ChairPicker def={def} roster={roster} picked={picked} say={say} onDone={onDone} />

      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש חניך" />

      <div className="rows" style={{ maxHeight: "52vh", overflowY: "auto" }}>
        {list.map((r) => {
          const on = picked.has(r.id);
          return (
            <button className="st-row" key={r.id} onClick={() => toggle(r.id)}>
              <div className={"tick" + (on ? " on" : "")}>
                {on && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
              </div>
              <div className="st-main"><div className="st-n">{r.name}</div></div>
            </button>
          );
        })}
      </div>

      <div className="sticky">
        <button className="btn btn-primary" disabled={busy || over} onClick={save}>
          {busy ? "שומר…" : over ? `חריגה ממכסה (${picked.size}/${def.capacity})` : "שמירת השיבוץ"}
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

/* ============================================================
   יו״ר הוועדה או הסדרה
   ------------------------------------------------------------
   ⚠ **יו״ר הוא חניך; "אחראי" בכרטיס הוא המדריך המלווה.** שתי
     עמודות נפרדות בלוח, ולא אחת — ראו shared/placements-ids.js.

   ⚠ **נבחר מתוך המשובצים ולא מכל המכינה.** יו״ר שאינו חבר
     בוועדה הוא כמעט תמיד טעות הקלדה, ובורר עם 33 שמות מזמין
     אותה. אם באמת צריך מישהו מבחוץ — משבצים אותו קודם.

   ⚠ **ענף וקבוצה אינם נושאים יו״ר.** השרת חוסם, וכאן הרכיב
     פשוט אינו מוצג — כפתור שנחסם אחרי לחיצה גרוע מהיעדרו.
   ============================================================ */
function ChairPicker({ def, roster, picked, say, onDone }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  /* ⚠ isTeamCategory מ-shared ולא שתי השוואות: הן היו
     משאירות את "צוות מזדמן" בלי בורר יו״ר, בשקט. */
  if (!isTeamCategory(def.category)) return null;

  const members = roster.filter((r) => picked.has(r.id));
  const cur = def.chair
    ? (roster.find((r) => r.id === def.chair) || { id: def.chair, name: def.chairName || "—" })
    : null;

  const set = (studentId) => {
    if (busy) return;
    setBusy(true);
    api.setChair({ placementId: def.id, studentId })
      .then(() => { say(studentId ? "היו״ר נקבע" : "היו״ר הוסר"); setOpen(false); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="pf-row" style={{ borderBottom: "none", padding: "2px 0" }}>
        <span className="pf-l">יו״ר</span>
        <span className="pf-v">{cur ? cur.name : "טרם נקבע"}</span>
        <button className="conv-edit" disabled={busy} onClick={() => setOpen(!open)}>
          {open ? "סגירה" : cur ? "החלפה" : "בחירה"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          {members.length === 0 ? (
            /* ⚠ אומר מה לעשות, ולא רק "אין". */
            <div className="fld-hint">
              עוד לא שובצו חברים. משבצים קודם, ואז בוחרים יו״ר מתוכם.
            </div>
          ) : (
            <div className="rows" style={{ maxHeight: "34vh", overflowY: "auto" }}>
              {members.map((r) => (
                <button className="st-row" key={r.id} disabled={busy}
                  onClick={() => set(r.id === def.chair ? "" : r.id)}>
                  <div className={"tick" + (r.id === def.chair ? " on" : "")}>
                    {r.id === def.chair && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                  <div className="st-main"><div className="st-n">{r.name}</div></div>
                </button>
              ))}
            </div>
          )}
          {cur && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: "var(--clay)" }}
              disabled={busy} onClick={() => set("")}>הסרת היו״ר</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- פירוט השיבוץ — צוות בלבד ----------
   ⚠ התיאור, הדרישות והאחראי אינם יוצאים מהשרת אל החניך.
     המסך הזה נפתח רק במסלול של המנהל. */
function PlacementDetail({ def }) {
  const [open, setOpen] = useState(false);
  if (!def.desc && !def.needs && !def.hours && !def.lead) return null;
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="pd-head">
        {def.hours && <span className="pill p-new num">{def.hours}</span>}
        {def.lead && <span className="pill p-ok">אחראי: {def.lead}</span>}
        {def.capacity != null && <span className="pill">{def.capacity} מקומות</span>}
      </div>
      {def.desc && (
        <div className={"pd-text" + (open ? " open" : "")}>{def.desc}</div>
      )}
      {def.needs && open && (
        <>
          <div className="pd-k">מה נדרש</div>
          <div className="pd-text open">{def.needs}</div>
        </>
      )}
      {(def.desc || def.needs) && (
        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 8 }}
          onClick={() => setOpen(!open)}>
          {open ? "פחות" : "קראו עוד"}
        </button>
      )}
    </div>
  );
}

/* ---------- כרטיס שיבוץ אחד ---------- */
function PlacementCard({ def, assignments, say, onEdit, cat }) {
  const sems = semestersFor(def.period);
  const Ico = CAT_ICON[cat] || PI.users;
  const mine = assignments.filter((a) => a.placement === def.id);
  const total = mine.length;
  const cap = def.capacity;
  /* ⚠ רק בוועדות התקופה נאמרת. "לאורך כל השנה" הוא ברירת המחדל
     ואינו מוסיף מידע — הוא רק האריך כל כרטיס בשורה. */
  const showPeriod = cat === "ועדה";

  const names = (list) => list.length === 0
    ? "אין משובצים — לחצו לשיבוץ"
    : list.slice(0, 4).map((a) => a.studentName).join(", ")
      + (list.length > 4 ? ` ועוד ${list.length - 4}` : "");

  const bar = cap == null ? null : (
    <div className={"cap-bar" + (total > cap ? " over" : total === cap ? " full" : "")}>
      <div className="cap-fill" style={{ width: Math.min(100, (total / cap) * 100) + "%" }} />
    </div>
  );

  /* ⚠ שיבוץ שנתי הוא כרטיס אחד לחיץ, לא כותרת ומתחתיה שורה
     שחוזרת על אותו מספר. שני סמסטרים — אז יש מה להפריד, וכל
     סמסטר מקבל שורה משלו. */
  if (sems.length === 1) {
    const over = cap != null && total > cap;
    return (
      <button className={`card pl-card one ${tone(def.name)}`}
        onClick={() => onEdit(def, sems[0], mine)}>
        <div className="pl-head">
          <div className="tile">{Ico ? <Ico /> : null}</div>
          <div className="pl-nm">
            <b>{def.name}</b>
            <div className="pl-sub">{names(mine)}</div>
          </div>
          <b className={"pl-n" + (over ? " over" : "")}>
            {total}{cap != null ? `/${cap}` : ""}
          </b>
          <PI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
        </div>
        {bar}
      </button>
    );
  }

  return (
    <div className={`card pl-card ${tone(def.name)}`}>
      <div className="pl-head">
        <div className="tile">{Ico ? <Ico /> : null}</div>
        <div className="pl-nm">
          <b>{def.name}</b>
          {showPeriod && <div className="pl-sub">{def.period}</div>}
        </div>
        {cap != null && <span className="pl-cap">{total}/{cap}</span>}
      </div>
      {bar}

      {sems.map((sem) => {
        const here = mine.filter((a) => a.semester === sem);
        const over = cap != null && here.length > cap;
        return (
          <button key={sem} className="pl-sem" onClick={() => onEdit(def, sem, here)}>
            <span className="pl-semnm">{sem}</span>
            <span className="pl-who">{names(here)}</span>
            <b className={"pl-n" + (over ? " over" : "")}>
              {here.length}{cap != null ? `/${cap}` : ""}
            </b>
            <PI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
          </button>
        );
      })}
    </div>
  );
}

/* ---------- דף מידע לצוות ----------
   ⚠ מוצג רק במסלול המנהל. הטקסט ב-src/placement-guides.js. */
function GuideCard({ cat }) {
  const g = GUIDES[cat];
  const [open, setOpen] = useState(false);
  if (!g) return null;
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button className="guide-h" onClick={() => setOpen(!open)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{g.title}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>
            {open ? "לחצו לסגירה" : g.intro}
          </div>
        </div>
        <PI.chev style={{ color: "var(--line2)", transform: open ? "rotate(-90deg)" : "none" }} />
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {g.sections.map((sec) => (
            <div key={sec.k}>
              <div className="pd-k">{sec.k}</div>
              <div className="pd-text open">{sec.t}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- הדף המלא ---------- */
export function PlacementsPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getPlacements(), []);
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [rolesTab, setRolesTab] = useState(false);
  const [editing, setEditing] = useState(null); // {def, semester, assigned}

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען שיבוצים…</div></div>
  );
  if (err?.setupRequired) return <SetupCard say={say} onDone={reload} />;
  if (err) return (
    <div className="alert a-clay">
      <PI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את השיבוצים</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  if (editing) return (
    <AssignEditor def={editing.def} semester={editing.semester} assigned={editing.assigned}
      roster={data.roster || []} say={say}
      onDone={() => { setEditing(null); reload(); }}
      onCancel={() => setEditing(null)} />
  );

  const defs = (data.definitions || []).filter((d) => d.category === cat);

  return (
    <>
      <div className="screen-title">שיבוצי חניכים</div>

      <ScrollTabs className="seg">
        {CATEGORIES.map((c) => (
          <button key={c} className={!rolesTab && cat === c ? "on" : ""}
            onClick={() => { setRolesTab(false); setCat(c); }}>
            {/* ⚠ plural() ולא שרשרת טרנרי: היא נפלה ל-else,
                וקטגוריה חמישית קיבלה את התווית "קבוצות" — שתי
                לשוניות באותו שם ממש כאן. */}
            {plural(c)}
          </button>
        ))}
        <button className={rolesTab ? "on" : ""} onClick={() => setRolesTab(true)}>תפקידים</button>
      </ScrollTabs>

      {rolesTab ? (
        <RoleHolders say={say} />
      ) : (
        <>
          <GuideCard cat={cat} />

          {defs.length === 0 && (
            <div className="empty"><div className="e1">אין שיבוצים בקטגוריה הזו</div>
              <div className="e2">מוסיפים שורה בלוח ההגדרות ב-monday והיא תופיע כאן.</div></div>
          )}
          {defs.map((d) => (
            <PlacementCard key={d.id} def={d} assignments={data.assignments || []} cat={cat}
              say={say} onEdit={(def, semester, assigned) => setEditing({ def, semester, assigned })} />
          ))}
        </>
      )}
    </>
  );
}
