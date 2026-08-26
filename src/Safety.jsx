/* ============================================================
   בטיחות ותקלות — דיווח אירועי בטיחות
   ------------------------------------------------------------
   גלוי למנהלים ולאחראי הבטיחות בלבד. ההרשאה נאכפת בשרת —
   מה שכאן הוא תצוגה.

   הטופס חושף שדות לפי ההקשר: "פגיעה" פותחת נזק לגוף ולרכוש;
   "טיפול רפואי — כן" פותח את פירוט הטיפול.

   ⚠ אין כפתור מחיקה, בכוונה. אירוע בטיחות הוא רשומה רשמית
     שמדווחת הלאה — מתקנים בעריכה.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import {
  SAFETY_PLACE, SEVERITIES, SAFETY_SEVERITY, YES_NO,
} from "../shared/safety-board.js";

const SI = {
  shield: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  check: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  bandage: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M10.5 10.5h.01M13.5 13.5h.01M13.5 10.5h.01M10.5 13.5h.01"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
};

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

const todayIso = () => new Date().toISOString().slice(0, 10);
const heDate = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

/* ---------- בורר תוויות ---------- */
function Pick({ label, options, value, onChange, disabled }) {
  return (
    <div className="fld">
      <label>{label}</label>
      <div className="pick">
        {options.map((o) => (
          <button type="button" key={o} className={value === o ? "on" : ""} disabled={disabled}
            onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- הטופס — דיווח חדש או עריכה ---------- */
function IncidentForm({ initial, say, onDone, onCancel }) {
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(() => ({
    title: initial?.title || "",
    date: initial?.date || todayIso(),
    place: initial?.place || "",
    severity: initial?.severity || "",
    bodyHarm: initial?.bodyHarm || "",
    propHarm: initial?.propHarm || "",
    desc: initial?.desc || "",
    evac: initial?.evac || "",
    medical: initial?.medical || "",
    medicalDetail: initial?.medicalDetail || "",
    lessons: initial?.lessons || "",
    reportMod: initial?.reportMod || "",
    reportCouncil: initial?.reportCouncil || "",
    parents: initial?.parents || "",
  }));
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setT = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const injury = f.severity === SAFETY_SEVERITY.injury;
  const canSave = f.title.trim() && f.date && f.severity;

  const save = () => {
    if (busy || !canSave) return;
    setBusy(true);
    const body = { ...f, ...(editing ? { id: initial.id } : {}) };
    (editing ? api.editSafety(body) : api.addSafety(body))
      .then(() => { say(editing ? "הדיווח עודכן" : "הדיווח נשמר"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy) return;
    setBusy(true);
    api.deleteSafety(initial.id)
      .then(() => { say("הדיווח נמחק"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <SI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{editing ? "עריכת דיווח" : "דיווח אירוע בטיחות"}</div>

      <div className="card">
        <div className="fld">
          <label>כותרת האירוע</label>
          <input value={f.title} onChange={setT("title")} disabled={busy} autoFocus={!editing}
            placeholder="מה קרה, במשפט" />
        </div>

        <div className="two">
          <div className="fld">
            <label>תאריך</label>
            <input type="date" value={f.date} onChange={setT("date")} disabled={busy} />
          </div>
          <Pick label="מקום" options={SAFETY_PLACE} value={f.place} onChange={set("place")} disabled={busy} />
        </div>

        <Pick label="סוג האירוע" options={SEVERITIES} value={f.severity} onChange={set("severity")} disabled={busy} />

        {injury && (
          <div className="two">
            <div className="fld">
              <label>הנזק לגוף</label>
              <input value={f.bodyHarm} onChange={setT("bodyHarm")} disabled={busy} placeholder="אם אין — להשאיר ריק" />
            </div>
            <div className="fld">
              <label>הנזק לרכוש</label>
              <input value={f.propHarm} onChange={setT("propHarm")} disabled={busy} placeholder="אם אין — להשאיר ריק" />
            </div>
          </div>
        )}

        <div className="fld">
          <label>תיאור המקרה</label>
          <textarea rows={4} value={f.desc} onChange={setT("desc")} disabled={busy}
            placeholder="מה קרה, מי היה מעורב, איך הסתיים" />
        </div>

        <div className="two">
          <Pick label="האם התבצע פינוי" options={[YES_NO.yes, YES_NO.no]} value={f.evac} onChange={set("evac")} disabled={busy} />
          <Pick label="טיפול רפואי שניתן" options={[YES_NO.yes, YES_NO.no]} value={f.medical} onChange={set("medical")} disabled={busy} />
        </div>

        {f.medical === YES_NO.yes && (
          <div className="fld">
            <label>פירוט הטיפול</label>
            <input value={f.medicalDetail} onChange={setT("medicalDetail")} disabled={busy}
              placeholder="מה נעשה, על ידי מי" />
          </div>
        )}

        <div className="fld">
          <label>לקחים ומסקנות</label>
          <textarea rows={3} value={f.lessons} onChange={setT("lessons")} disabled={busy}
            placeholder="מה עושים כדי שלא יקרה שוב" />
        </div>

        <div className="two">
          {/* ⚠ ההורים ראשונים בסדר: הדיווח אליהם קודם בזמן
              לדיווח לגורמים החיצוניים, ולעיתים הוא הדחוף מכולם. */}
          <Pick label="דווח להורים" options={[YES_NO.yes, YES_NO.no]} value={f.parents} onChange={set("parents")} disabled={busy} />
          <Pick label="דיווח למשרד הביטחון" options={[YES_NO.yes, YES_NO.no]} value={f.reportMod} onChange={set("reportMod")} disabled={busy} />
          <Pick label="דיווח למועצת המכינות" options={[YES_NO.yes, YES_NO.no]} value={f.reportCouncil} onChange={set("reportCouncil")} disabled={busy} />
        </div>

        <button className="btn btn-primary" disabled={busy || !canSave} onClick={save}>
          {busy ? "שומר…" : editing ? "שמירת השינויים" : "שמירת הדיווח"}
        </button>

        {editing && (confirmDel ? (
          <button className="btn btn-clay" style={{ marginTop: 8 }} disabled={busy} onClick={remove}>
            למחוק את הדיווח לצמיתות?
          </button>
        ) : (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            onClick={() => setConfirmDel(true)}>מחיקת הדיווח</button>
        ))}
      </div>
    </>
  );
}

/* ---------- כרטיס דיווח ברשימה ---------- */
function IncidentCard({ x, onOpen }) {
  const injury = x.severity === SAFETY_SEVERITY.injury;
  const pending = [
    /* ⚠ ההורים ראשונים גם כאן, באותו סדר שבו מדווחים בפועל. */
    x.parents !== "כן" && "הורים",
    x.reportMod !== "כן" && "משרד הביטחון",
    x.reportCouncil !== "כן" && "מועצת המכינות",
  ].filter(Boolean);
  /* ⚠ הגוון לפי חומרה ולא לפי מקום: פגיעה וכמעט-ונפגע הם
     ההבחנה שקובעת מה עושים עם הדיווח. */
  return (
    <button className={"st-row " + (injury ? "tone-8" : "tone-3")}
      onClick={onOpen} style={{ width: "100%", textAlign: "right" }}>
      <div className="tile sm">{injury ? <SI.bandage /> : <SI.warn />}</div>
      <div className="st-main">
        <div className="st-n">{x.title}</div>
        <div className="st-m">
          <span className={"pill " + (injury ? "p-low" : "p-new")}>{x.severity || "—"}</span>
          {x.place && <span>{x.place}</span>}
          <span className="num">{heDate(x.date)}</span>
          {/* ⚠ נרשם מהסשן — ראו _safety.js */}
          {x.by && <span>· {x.by}</span>}
        </div>
        {/* ⚠ דיווח לגורם חיצוני שטרם נשלח הוא מטלה פתוחה, לא
            עוד תגית בשורה. הוא מקבל שורה משלו ובצבע. */}
        {pending.length > 0 && (
          <div className="sf-pend">ממתין לדיווח: {pending.join(" · ")}</div>
        )}
      </div>
      <SI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
    </button>
  );
}

/* ---------- הקמה בלחיצה — פיתוח מקומי בלבד ---------- */
function SetupCard({ say, onDone }) {
  const [busy, setBusy] = useState(false);
  const [failMsg, setFailMsg] = useState(null);
  const run = () => {
    if (busy) return;
    setBusy(true); setFailMsg(null);
    api.setupSafety()
      .then(() => { say("לוח הבטיחות נוצר"); onDone(); })
      .catch((e) => setFailMsg(e.message))
      .finally(() => setBusy(false));
  };
  return (
    <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}><SI.shield /></div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>לוח הבטיחות עדיין לא חובר ל-monday</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, marginBottom: 16 }}>
        לחיצה אחת תיצור את הלוח ותוסיף את התפקיד "אחראי בטיחות".
      </div>
      {failMsg && <div className="login-err" style={{ marginBottom: 12 }}>{failMsg}</div>}
      <button className="btn btn-primary" disabled={busy} onClick={run}>
        {busy ? "יוצר…" : "יצירת הלוח עכשיו"}
      </button>
    </div>
  );
}

/* ---------- הדף המלא ---------- */
export function SafetyPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getSafety(), []);
  const [form, setForm] = useState(null); // null | {} חדש | דיווח לעריכה
  const [filter, setFilter] = useState("all"); // all | injury | owed

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען דיווחים…</div></div>
  );
  if (err?.setupRequired) return <SetupCard say={say} onDone={reload} />;
  if (err) return (
    <div className="alert a-clay">
      <SI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את הדיווחים</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  if (form) return (
    <IncidentForm initial={form.id ? form : null} say={say}
      onDone={() => { setForm(null); reload(); }}
      onCancel={() => setForm(null)} />
  );

  const list = data.incidents || [];
  const isInjury = (x) => x.severity === SAFETY_SEVERITY.injury;
  /* ⚠ "ממתין לדיווח" = לפחות אחד משני הגורמים החיצוניים טרם
     קיבל דיווח. זו המטלה הפתוחה היחידה במסך הזה. */
  const isOwed = (x) => x.parents !== "כן" || x.reportMod !== "כן" || x.reportCouncil !== "כן";
  const injuries = list.filter(isInjury).length;
  const owed = list.filter(isOwed).length;
  const shown = filter === "injury" ? list.filter(isInjury)
    : filter === "owed" ? list.filter(isOwed) : list;

  return (
    <>
      <div className="screen-title">אירועי בטיחות</div>

      {/* ⚠ שלושת המספרים שקובעים: כמה אירועים, כמה מהם פגיעה
          בפועל, וכמה עוד ממתינים לדיווח לגורם חיצוני. האחרון
          הוא היחיד שיש עליו מה לעשות היום. */}
      <div className="band">
        <div className="band-h">מצב הבטיחות</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{list.length}</div>
            <div className="band-l">דיווחים בשנה</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (injuries ? " warn" : " ok")}>{injuries}</div>
            <div className="band-l">פגיעות בפועל</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (owed ? " warn" : " ok")}>{owed}</div>
            <div className="band-l">ממתינים לדיווח</div>
          </div>
        </div>
      </div>

      {list.length > 0 && (
        <div className="seg">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
            הכול ({list.length})
          </button>
          <button className={filter === "injury" ? "on" : ""} onClick={() => setFilter("injury")}>
            פגיעות ({injuries})
          </button>
          <button className={filter === "owed" ? "on" : ""} onClick={() => setFilter("owed")}>
            לדיווח ({owed})
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty tone-1">
          <div className="e-ico"><SI.check /></div>
          <div className="e1">{list.length === 0 ? "אין דיווחים" : "אין אירועים בקטגוריה הזו"}</div>
          <div className="e2">{list.length === 0
            ? "שיישאר ככה. אם קרה משהו — מדווחים כאן."
            : "נסו סינון אחר."}</div>
        </div>
      ) : (
        <div className="rows">
          {shown.map((x) => <IncidentCard key={x.id} x={x} onOpen={() => setForm(x)} />)}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <SI.plus />דיווח אירוע בטיחות
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}
