/* ============================================================
   תקלות ובעיות — דיווח ומעקב תחזוקה
   ------------------------------------------------------------
   שני מסכים על אותם נתונים:

   FaultReportPage — כל חניך. מדווח, ורואה את הדיווחים שלו
     עם הסטטוס בלבד.
   FaultsPage      — מנהל ואב בית. רואים הכול, ומנהלים את
     הטיפול: איש מקצוע, עלות ותאריך סיום.

   ⚠ ההפרדה נאכפת בשרת. עלויות ופרטי איש מקצוע אינם יוצאים
     אל החניך כלל — לא מוסתרים בתצוגה.

   מחזור חיים: פתוחה → בטיפול → טופלה. הרשימה ממוינת כך
   שהפתוחות והדחופות תמיד למעלה, והמסך נפתח על "פתוחות".
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";
import {
  FAULT_PLACE, FIXES, URGENCIES, STATUSES, FAULT_STATUS, FAULT_URGENCY,
} from "../shared/faults-board.js";

const FI = {
  tool: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.7-5.7a4.5 4.5 0 0 0 5.6-6L14.6 12l-2.6-2.6 2.7-3.1z"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  camera: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.3-2h7l1.3 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5z"/><circle cx="12" cy="13" r="3.4"/></svg>,
  check: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  coin: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M14.6 9.2a3 3 0 0 0-2.6-1.2c-1.6 0-2.6.9-2.6 2s1 1.8 2.6 2 2.7.8 2.7 2-1.1 2-2.7 2a3 3 0 0 1-2.6-1.2M12 6.2v11.6"/></svg>,
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

const heDate = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

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

/* ---------- טופס תקלה — חדשה או עריכה ---------- */
function FaultForm({ initial, say, onDone, onCancel }) {
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(() => ({
    title: initial?.title || "",
    place: initial?.place || "",
    fix: initial?.fix || "",
    urgency: initial?.urgency || FAULT_URGENCY.normal,
    status: initial?.status || FAULT_STATUS.open,
    desc: initial?.desc || "",
    notes: initial?.notes || "",
    cost: initial?.cost == null ? "" : String(initial.cost),
    pro: initial?.pro || "",
    proPhone: initial?.proPhone || "",
    doneDate: initial?.doneDate || "",
  }));
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setT = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const canSave = f.title.trim() && f.place;

  /* התמונה נקראת כ-base64 ועוברת בגוף הבקשה, כמו אישור המחלה
     בבקשות היציאה. עד 5MB — צילום טלפון רגיל נכנס בקלות. */
  const pickPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) { setPhoto(null); return; }
    if (file.size > 5 * 1024 * 1024) { say("התמונה גדולה מדי — עד 5MB"); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto({
      name: file.name, mime: file.type || "image/jpeg",
      data: String(reader.result).split(",")[1] || "",
      preview: String(reader.result),
    });
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (busy || !canSave) return;
    setBusy(true);
    const body = { ...f, ...(editing ? { id: initial.id } : {}) };
    if (!editing && photo) {
      body.photoName = photo.name; body.photoMime = photo.mime; body.photoData = photo.data;
    }
    (editing ? api.editFault(body) : api.addFault(body))
      .then((r) => {
        if (r && r.photoUploaded === false) say("התקלה נרשמה, אבל העלאת התמונה נכשלה");
        else say(editing ? "התקלה עודכנה" : "התקלה נרשמה");
        onDone();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy) return;
    setBusy(true);
    api.deleteFault(initial.id)
      .then(() => { say("התקלה נמחקה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <FI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{editing ? "עריכת תקלה" : "תקלה חדשה"}</div>

      <div className="card lift">
        <div className="fld">
          <label>סוג הבעיה</label>
          <input value={f.title} onChange={setT("title")} disabled={busy} autoFocus={!editing}
            placeholder="מה התקלקל, במשפט" />
        </div>

        <Pick label="מיקום" options={FAULT_PLACE} value={f.place} onChange={set("place")} disabled={busy} />

        <div className="two">
          <Pick label="אופן התיקון" options={FIXES} value={f.fix} onChange={set("fix")} disabled={busy} />
          <Pick label="דחיפות" options={URGENCIES} value={f.urgency} onChange={set("urgency")} disabled={busy} />
        </div>

        {editing && (
          <Pick label="סטטוס" options={STATUSES} value={f.status} onChange={set("status")} disabled={busy} />
        )}

        <div className="fld">
          <label>תיאור הבעיה</label>
          <textarea rows={3} value={f.desc} onChange={setT("desc")} disabled={busy}
            placeholder="מה בדיוק קרה, ממתי, מה כבר נוסה" />
        </div>

        {/* ---- תמונה ---- */}
        {!editing ? (
          <div className="fld">
            <label>תמונה (לא חובה)</label>
            {photo ? (
              <div className="photo-pick">
                <img src={photo.preview} alt="התמונה שנבחרה" />
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                  onClick={() => setPhoto(null)}>הסרת התמונה</button>
              </div>
            ) : (
              <label className="file-drop">
                <FI.camera />
                <span>צילום או בחירת תמונה</span>
                <input type="file" accept="image/*" disabled={busy} onChange={pickPhoto} />
              </label>
            )}
          </div>
        ) : initial.photoUrl ? (
          <div className="fld">
            <label>התמונה שצורפה</label>
            <a href={initial.photoUrl} target="_blank" rel="noreferrer" className="photo-pick">
              <img src={initial.photoUrl} alt="תמונת התקלה" />
            </a>
          </div>
        ) : null}

        {/* ---- מעקב הטיפול — צוות בלבד ---- */}
        {editing && (
          <>
            <div className="fld">
              <label>הערות טיפול</label>
              <textarea rows={3} value={f.notes} onChange={setT("notes")} disabled={busy}
                placeholder="מה נעשה, מי הוזמן, מה סוכם" />
            </div>

            <div className="two">
              <div className="fld">
                <label>איש מקצוע</label>
                <input value={f.pro} onChange={setT("pro")} disabled={busy} placeholder="שם" />
              </div>
              <div className="fld">
                <label>טלפון</label>
                <input value={f.proPhone} onChange={setT("proPhone")} disabled={busy}
                  inputMode="tel" placeholder="050-0000000" />
              </div>
            </div>

            <div className="two">
              <div className="fld">
                <label>עלות הטיפול (₪)</label>
                <input value={f.cost} onChange={setT("cost")} disabled={busy}
                  inputMode="numeric" placeholder="ריק = טרם ידוע" />
              </div>
              <div className="fld">
                <label>תאריך סיום הטיפול</label>
                <input type="date" value={f.doneDate} onChange={setT("doneDate")} disabled={busy} />
              </div>
            </div>

            {initial.reporter && (
              <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>
                דווח על ידי {initial.reporter}
              </div>
            )}
          </>
        )}

        <button className="btn btn-primary" disabled={busy || !canSave} onClick={save}>
          {busy ? "שומר…" : editing ? "שמירת השינויים" : "רישום התקלה"}
        </button>

        {editing && (confirmDel ? (
          <button className="btn btn-clay" style={{ marginTop: 8 }} disabled={busy} onClick={remove}>
            למחוק לצמיתות?
          </button>
        ) : (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            onClick={() => setConfirmDel(true)}>מחיקת התקלה</button>
        ))}
      </div>
    </>
  );
}

/* ---------- כרטיס תקלה ---------- */
function FaultCard({ x, onOpen }) {
  const urgent = x.urgency === FAULT_URGENCY.urgent && x.status !== FAULT_STATUS.done;
  const done = x.status === FAULT_STATUS.done;
  return (
    <button className="st-row" onClick={onOpen} style={{ width: "100%", textAlign: "right" }}>
      <div className="st-main">
        <div className="st-n" style={done ? { color: "var(--faint)", textDecoration: "line-through" } : undefined}>
          {x.title}
        </div>
        <div className="st-m">
          <span className={"pill " + (done ? "p-ok" : x.status === FAULT_STATUS.working ? "p-new" : "p-low")}>
            {x.status}
          </span>
          {urgent && <span className="pill p-low">דחוף</span>}
          {x.place && <span>{x.place}</span>}
          {x.fix && <span>· {x.fix}</span>}
          <span className="num">{heDate(x.date)}</span>
          {x.reporter && <span>· {x.reporter}</span>}
          {x.cost > 0 && <span className="num">· {x.cost} ₪</span>}
        </div>
      </div>
      {x.photoUrl && <span className="thumb"><img src={x.photoUrl} alt="" /></span>}
      <FI.chev style={{ color: "var(--line2)" }} />
    </button>
  );
}

/* ---------- הקמה בלחיצה ---------- */
function SetupCard({ say, onDone }) {
  const [busy, setBusy] = useState(false);
  const [failMsg, setFailMsg] = useState(null);
  const run = () => {
    if (busy) return;
    setBusy(true); setFailMsg(null);
    api.setupFaults()
      .then(() => { say("לוח התקלות נוצר"); onDone(); })
      .catch((e) => setFailMsg(e.message))
      .finally(() => setBusy(false));
  };
  return (
    <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}><FI.tool /></div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>לוח התקלות עדיין לא חובר ל-monday</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, marginBottom: 16 }}>
        לחיצה אחת תיצור את הלוח ותוודא שהתפקיד "אב בית" קיים.
      </div>
      {failMsg && <div className="login-err" style={{ marginBottom: 12 }}>{failMsg}</div>}
      <button className="btn btn-primary" disabled={busy} onClick={run}>
        {busy ? "יוצר…" : "יצירת הלוח עכשיו"}
      </button>
    </div>
  );
}

/* ============================================================
   דיווח תקלה — המסך של החניך
   ------------------------------------------------------------
   כל חניך יכול לדווח, ורואה את מה שהוא עצמו דיווח עם הסטטוס.
   ⚠ עלויות ופרטי איש המקצוע אינם מגיעים לכאן — השרת לא מחזיר
     אותם לחניך כלל (toStudentFault).
   ============================================================ */
export function FaultReportPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getFaults(), []);
  const [form, setForm] = useState(false);

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען…</div></div>
  );
  if (err?.setupRequired) return (
    <div className="empty" style={{ paddingTop: 50 }}>
      <div className="e1">הדיווח עדיין לא זמין</div>
      <div className="e2">לוח התקלות טרם חובר. פנו למנהל.</div>
    </div>
  );
  if (err) return (
    <div className="alert a-clay">
      <FI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );

  if (form) return (
    <FaultForm say={say}
      onDone={() => { setForm(false); reload(); }}
      onCancel={() => setForm(false)} />
  );

  const mine = (data && data.faults) || [];
  const open = mine.filter((x) => x.status !== FAULT_STATUS.done);

  return (
    <>
      <div className="screen-title">דיווח תקלה</div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          משהו שבור, דולף או לא עובד? דווחו כאן ואב הבית יראה את זה.
          אפשר לצרף תמונה — היא חוסכת חצי מהשאלות.
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setForm(true)}>
        <FI.plus />דיווח על תקלה חדשה
      </button>

      <div className="sec-label">הדיווחים שלי</div>
      {mine.length === 0 ? (
        <div className="empty">
          <div className="e1">עוד לא דיווחת על תקלה</div>
          <div className="e2">דיווח שתגיש יופיע כאן עם הסטטוס שלו.</div>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="grp-h">
              <span>{open.length === 1 ? "דיווח אחד פתוח" : `${open.length} דיווחים פתוחים`}</span>
              <span>מתעדכן על ידי אב הבית</span>
            </div>
          )}
          <div className="rows">
            {mine.map((x) => (
              <div className="st-row" key={x.id} style={{ cursor: "default" }}>
                <div className="st-main">
                  <div className="st-n">{x.title}</div>
                  <div className="st-m">
                    <span className={"pill " + (x.status === FAULT_STATUS.done ? "p-ok"
                      : x.status === FAULT_STATUS.working ? "p-new" : "p-low")}>{x.status}</span>
                    {x.place && <span>{x.place}</span>}
                    <span className="num">{heDate(x.date)}</span>
                  </div>
                </div>
                {x.photoUrl && (
                  <a href={x.photoUrl} target="_blank" rel="noreferrer" className="thumb">
                    <img src={x.photoUrl} alt="" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}

/* ---------- הדף המלא — צוות ---------- */
export function FaultsPage({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getFaults(), []);
  const [filter, setFilter] = useState("open"); // open | done | all
  const [form, setForm] = useState(null);

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען תקלות…</div></div>
  );
  if (err?.setupRequired) return <SetupCard say={say} onDone={reload} />;
  if (err) return (
    <div className="alert a-clay">
      <FI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את התקלות</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  if (form) return (
    <FaultForm initial={form.id ? form : null} say={say}
      onDone={() => { setForm(null); reload(); }}
      onCancel={() => setForm(null)} />
  );

  const all = data.faults || [];
  const c = data.counts || {};
  const list = all.filter((x) =>
    filter === "all" ? true :
    filter === "done" ? x.status === FAULT_STATUS.done :
    filter === "urgent" ? x.status !== FAULT_STATUS.done && x.urgency === FAULT_URGENCY.urgent :
    x.status !== FAULT_STATUS.done);

  return (
    <>
      <div className="screen-title">תקלות ובעיות</div>

      {/* ⚠ שלושת המספרים שמסכמים את מצב התחזוקה על כהה, ואחריהם
          הפירוט. הדחופות ראשונות — הן מה שקובע אם צריך לרוץ. */}
      <div className="band">
        <div className="band-h">מצב התחזוקה</div>
        <div className="band-grid">
          <div className="band-c">
            <div className={"band-n" + (c.urgentOpen ? " warn" : " ok")}>{c.urgentOpen || 0}</div>
            <div className="band-l">דחופות פתוחות</div>
          </div>
          <div className="band-c">
            <div className="band-n">{(c.open || 0) + (c.working || 0)}</div>
            <div className="band-l">פתוחות בסך הכול</div>
          </div>
          <div className="band-c">
            <div className="band-n">{(c.totalCost || 0).toLocaleString("he-IL")}</div>
            <div className="band-l">עלות מצטברת (₪)</div>
          </div>
        </div>
      </div>

      {/* ⚠ אין כאן אריחי מספרים. הם הציגו בדיוק את מה שברצועה
          שמעל, ולא היו לחיצים — שני עותקים של אותם מספרים על
          אותו מסך. הסינון למטה הוא הדרך להגיע לדחופות ולטופלו. */}

      <div className="seg">
        <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>
          פתוחות{(c.open || 0) + (c.working || 0) ? ` (${(c.open || 0) + (c.working || 0)})` : ""}
        </button>
        <button className={filter === "urgent" ? "on" : ""} onClick={() => setFilter("urgent")}>
          דחופות{c.urgentOpen ? ` (${c.urgentOpen})` : ""}
        </button>
        <button className={filter === "done" ? "on" : ""} onClick={() => setFilter("done")}>
          טופלו{c.done ? ` (${c.done})` : ""}
        </button>
        <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>הכול</button>
      </div>

      {list.length === 0 ? (
        <div className={"empty " + (filter === "urgent" ? "tone-8" : "tone-1")}>
          <div className="e-ico">{filter === "urgent" ? <FI.warn /> : <FI.check />}</div>
          <div className="e1">{filter === "done" ? "עוד לא טופלו תקלות"
            : filter === "urgent" ? "אין תקלות דחופות" : "אין תקלות פתוחות"}</div>
          <div className="e2">{filter === "done" ? ""
            : filter === "urgent" ? "מה שדחוף יקפוץ לכאן." : "כשמשהו מתקלקל — רושמים אותו כאן."}</div>
        </div>
      ) : (
        <div className="rows">
          {list.map((x) => <FaultCard key={x.id} x={x} onOpen={() => setForm(x)} />)}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <FI.plus />תקלה חדשה
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}
