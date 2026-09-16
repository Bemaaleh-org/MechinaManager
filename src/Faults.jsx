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

import React, { useState, useEffect } from "react";
import { readUpload } from "./upload-image.js";
import { api } from "./api.js";
import ScrollTabs from "./Tabs.jsx";
import {
  FAULT_PLACE, FIXES, URGENCIES, KINDS, FAULT_KIND, STATUSES, FAULT_STATUS, FAULT_URGENCY,
} from "../shared/faults-board.js";

const FI = {
  tool: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.7-5.7a4.5 4.5 0 0 0 5.6-6L14.6 12l-2.6-2.6 2.7-3.1z"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  pen: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20h4L20 8l-4-4L4 16v4z"/></svg>,
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

/* ⚠ כוכבית אדומה על שדה חובה שעוד לא מולא — ונעלמת כשמולא
   (14.9.2026). "לא ברור שצריך לסמן" היה בדיוק הבעיה. */
const Req = ({ on }) => (on
  ? <span style={{ color: "var(--clay)", marginInlineStart: 4, fontWeight: 900 }} aria-hidden="true">*</span>
  : null);

/* ⚠ `sep` — קו הפרדה מעל הקבוצה. שתי קבוצות בחירה זו לצד זו
   נקראו כאחת, והכותרת של כל אחת ישבה מעל האפשרויות של השנייה. */
function Pick({ label, options, value, onChange, disabled, required = false, sep = false }) {
  return (
    <div className="fld" style={sep ? { borderTop: "1px solid var(--line)", paddingTop: 12 } : undefined}>
      <label>{label}<Req on={required && !value} /></label>
      <div className="pick">
        {options.map((o) => (
          <button type="button" key={o} className={value === o ? "on" : ""} disabled={disabled}
            onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- טופס תקלה — חדשה או עריכה ----------
   ⚠ `reporter` — המדווח עורך את הדיווח שלו: כותרת, מיקום, אופן
     תיקון, דחיפות, תיאור ותמונת הבעיה. שדות הטיפול אינם מוצגים
     לו, והשרת ממילא מתעלם מהם (api/_faults.js). */
function FaultForm({ initial, say, onDone, onCancel, reporter = false }) {
  const editing = Boolean(initial?.id);
  /* ⚠ אצל המדווח התמונה שמעלים בעריכה היא תמונת **הבעיה**. */
  const staffEdit = editing && !reporter;
  const [f, setF] = useState(() => ({
    title: initial?.title || "",
    /* ⚠ **תקלה או שדרוג** — בדיווח חדש נפתח על "תקלה",
       שהוא רוב המוחלט של המקרים — וזה גם מה שריק
       בלוח אומר. בניגוד לדחיפות, כאן ברירת המחדל
       אינה "בחירה שמישהו כבר עשה" — היא מה שהמסך
       נקרא בשבילו. */
    kind: initial?.kind || FAULT_KIND.fault,
    place: initial?.place || "",
    fix: initial?.fix || "",
    /* ⚠ בדיווח חדש — ריק, וחובה לבחור. ברירת מחדל מסומנת מראש
       נראתה כמו בחירה שמישהו כבר עשה. */
    urgency: initial?.urgency || (editing ? FAULT_URGENCY.normal : ""),
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
  /* ⚠ **נטען רק בטופס הצוות.** חניך שמדווח תקלה אינו
     רשאי לראות את המאגר והשרת יחזיר לו 403, וקריאה
     בכל דיווח היא בדיוק מה שהפעמון משלם עליו (4צ). */
  const [pros, setPros] = useState([]);
  useEffect(() => {
    if (!staffEdit) return undefined;
    let alive = true;
    api.getPros()
      .then((r) => { if (alive) setPros((r.pros || []).filter((p) => p.active)); })
      .catch(() => { /* מאגר שלא נטען אינו מפיל טופס תקלה */ });
    return () => { alive = false; };
  }, [staffEdit]);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setT = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  /* ⚠ אופן התיקון חובה בדיווח חדש בלבד — תקלה ישנה בלי ערך לא
     תינעל לעריכה בגללו. */
  const missing = [
    !f.title.trim() && "סוג הבעיה",
    !f.place && "מיקום",
    !editing && !f.fix && "אופן התיקון",
    !f.urgency && "דחיפות",
  ].filter(Boolean);
  const canSave = missing.length === 0;

  /* ⚠ התמונה **מוקטנת בדפדפן** ואז עוברת בגוף הבקשה.
     עד היום המסך אישר 5MB והשרת החזיר 413 — ראו
     src/upload-image.js. */
  const [picking, setPicking] = useState(false);
  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) { setPhoto(null); return; }
    setPicking(true);
    const up = await readUpload(file, say);
    setPicking(false);
    if (up) setPhoto(up);
  };

  const save = () => {
    if (busy || !canSave) return;
    setBusy(true);
    const body = { ...f, ...(editing ? { id: initial.id } : {}) };
    /* ⚠ אותם שדות בשני המסלולים, ומשמעותם שונה לפי המסלול:
       ביצירה זו תמונת **הבעיה**, בעריכה זו תמונת **התיקון**,
       והשרת מפנה אותן לשתי עמודות נפרדות. */
    if (photo) {
      body.photoName = photo.name; body.photoMime = photo.mime; body.photoData = photo.data;
    }
    (editing ? api.editFault(body) : api.addFault(body))
      .then((r) => {
        if (r && r.photoUploaded === false) {
          say(editing ? "התקלה עודכנה, אבל העלאת התמונה נכשלה"
                      : "התקלה נרשמה, אבל העלאת התמונה נכשלה");
        } else say(editing ? "התקלה עודכנה" : "התקלה נרשמה");
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
      <div className="screen-title">
        {/* ⚠ הכותרת נגזרת ממה שנבחר, ולא קבועה על "תקלה". */}
        {editing
          ? (reporter ? "עריכת הדיווח" : `עריכת ${f.kind === FAULT_KIND.upgrade ? "השדרוג" : "התקלה"}`)
          : (f.kind === FAULT_KIND.upgrade ? "שדרוג חדש" : "תקלה חדשה")}
      </div>

      <div className="card lift">
        <div className="fld">
          <label>{f.kind === FAULT_KIND.upgrade ? "מה לשדרג" : "סוג הבעיה"}<Req on={!f.title.trim()} /></label>
          <input value={f.title} onChange={setT("title")} disabled={busy} autoFocus={!editing}
            placeholder={f.kind === FAULT_KIND.upgrade
              ? "מה כדאי לשפר, במשפט" : "מה התקלקל, במשפט"} />
        </div>

        {/* ⚠⚠ **ראשון בטופס, ולא בסוף.** הוא משנה את משמעות
            כל שאר השדות — "מה התקלקל" מול "מה כדאי
            לשפר" — ובחירה שיושבת אחרי שכבר מילאו את
            הכול מבקשת לקרוא את הטופס מחדש. */}
        <Pick label="מה זה" options={KINDS} value={f.kind} onChange={set("kind")} disabled={busy} />

        <Pick label="מיקום" options={FAULT_PLACE} value={f.place} onChange={set("place")} disabled={busy} required />

        <Pick label="אופן התיקון" options={FIXES} value={f.fix} onChange={set("fix")} disabled={busy}
          required={!editing} sep />
        <Pick label="דחיפות" options={URGENCIES} value={f.urgency} onChange={set("urgency")} disabled={busy}
          required sep />

        {staffEdit && (
          <Pick label="סטטוס" options={STATUSES} value={f.status} onChange={set("status")} disabled={busy} />
        )}

        <div className="fld">
          <label>תיאור הבעיה</label>
          <textarea rows={3} value={f.desc} onChange={setT("desc")} disabled={busy}
            placeholder="מה בדיוק קרה, ממתי, מה כבר נוסה" />
        </div>

        {/* ---- תמונה ---- */}
        {!staffEdit ? (
          <div className="fld">
            <label>תמונה (לא חובה)</label>
            {photo ? (
              <div className="photo-pick">
                <img src={photo.preview} alt="התמונה שנבחרה" />
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                  onClick={() => setPhoto(null)}>הסרת התמונה</button>
              </div>
            ) : editing && initial.photoUrl ? (
              /* ⚠ בעריכה של המדווח: התמונה שכבר צורפה מוצגת, וקובץ
                 חדש מתווסף לצידה — עמודת קובץ אינה נדרסת. */
              <>
                <a href={initial.photoUrl} target="_blank" rel="noreferrer" className="photo-pick">
                  <img src={initial.photoUrl} alt="תמונת התקלה" />
                </a>
                <label className="file-drop" style={{ marginTop: 8 }}>
                  <FI.camera />
                  <span>{picking ? "מכין את התמונה…" : "הוספת תמונה נוספת"}</span>
                  <input type="file" accept="image/*" disabled={busy || picking} onChange={pickPhoto} />
                </label>
              </>
            ) : (
              <label className="file-drop">
                <FI.camera />
                <span>{picking ? "מכין את התמונה…" : "צילום או בחירת תמונה"}</span>
                <input type="file" accept="image/*" disabled={busy || picking} onChange={pickPhoto} />
              </label>
            )}
          </div>
        ) : (
          <>
            {initial.photoUrl && (
              <div className="fld">
                <label>התמונה מהדיווח</label>
                <a href={initial.photoUrl} target="_blank" rel="noreferrer" className="photo-pick">
                  <img src={initial.photoUrl} alt="תמונת התקלה" />
                </a>
              </div>
            )}

            {/* ============================================================
                ⚠ **תמונה של התקלה אחרי שתוקנה — עמודה נפרדת.**

                תמונת הדיווח מראה איך נראתה הבעיה; זו מראה איך זה
                נראה עכשיו. עמודה אחת לשתיהן הייתה מוחקת את הראיה
                לבעיה ברגע שמישהו מתעד את הפתרון — וההשוואה בין
                השתיים היא כל התכלית.

                ⚠ **ואינה חובה כדי לסמן "טופלה".** יש תקלות שאין
                  מה לצלם בהן, ודרישה כזו הייתה משאירה אותן פתוחות
                  או שולחת את אב הבית לסמן ב-monday במקום כאן.
                ============================================================ */}
            <div className="fld">
              <label>תמונה אחרי התיקון (לא חובה)</label>
              {photo ? (
                <div className="photo-pick">
                  <img src={photo.preview} alt="התמונה שנבחרה" />
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                    onClick={() => setPhoto(null)}>הסרת התמונה</button>
                </div>
              ) : initial.photoDoneUrl ? (
                <a href={initial.photoDoneUrl} target="_blank" rel="noreferrer" className="photo-pick">
                  <img src={initial.photoDoneUrl} alt="התקלה אחרי התיקון" />
                </a>
              ) : (
                <label className="file-drop">
                  <FI.camera />
                  <span>צילום או בחירת תמונה</span>
                  <input type="file" accept="image/*" disabled={busy} onChange={pickPhoto} />
                </label>
              )}
              {/* ⚠ הסטטוס אינו משתנה מעצמו בהעלאת תמונה — סימון
                  "טופלה" הוא החלטה של אדם, ותמונה היא ראיה. */}
              {photo && f.status !== FAULT_STATUS.done && (
                <button type="button" className="btn btn-ok btn-sm"
                  style={{ width: "100%", marginTop: 8 }} disabled={busy}
                  onClick={() => setF((p2) => ({ ...p2, status: FAULT_STATUS.done }))}>
                  לסמן גם כטופלה
                </button>
              )}
            </div>
          </>
        )}

        {/* ---- מעקב הטיפול — צוות בלבד ---- */}
        {staffEdit && (
          <>
            <div className="fld">
              <label>הערות טיפול</label>
              <textarea rows={3} value={f.notes} onChange={setT("notes")} disabled={busy}
                placeholder="מה נעשה, מי הוזמן, מה סוכם" />
            </div>

            {/* ============================================================
                ⚠⚠ **בורר מהמאגר, והשדות נשארים חופשיים.**

                הבקשה: *"לבחור מהם כשתקלה הולכת לטיפול עם
                איש מקצוע."* הבחירה **ממלאת** את שני השדות
                ואינה מחליפה אותם: הרשומה על התקלה היא האמת,
                והמאגר הוא נוחות — אחרת כיבוי איש מקצוע
                היה משנה למפרע מה כתוב על ארבעים תקלות.

                ⚠ **ומי שאינו במאגר מוקלד כרגיל.** בורר שחוסם
                  הקלדה היה שולח את אב הבית להוסיף למאגר
                  באמצע דיווח — והוא פשוט לא ידווח.
                ============================================================ */}
            {pros.length > 0 && (
              <div className="fld">
                <label>בחירה מהמאגר</label>
                <div className="fl-pros">
                  {pros.map((p) => (
                    <button type="button" key={p.id} disabled={busy}
                      className={"fl-pro" + (f.pro === p.name ? " on" : "")}
                      onClick={() => setF((q) => ({ ...q, pro: p.name, proPhone: p.phone || q.proPhone }))}>
                      <b>{p.name}</b>
                      {p.profession && <span>{p.profession}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  inputMode="decimal" placeholder="ריק = טרם ידוע" />
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

        {missing.length > 0 && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--clay)", marginBottom: 8 }}>
            * חסר: {missing.join(" · ")}
          </div>
        )}
        <button className="btn btn-primary" disabled={busy || !canSave} onClick={save}>
          {busy ? "שומר…" : editing ? "שמירת השינויים" : "רישום התקלה"}
        </button>

        {/* ⚠ המדווח מוחק רק כשהתקלה עדיין "פתוחה" — `canDelete`
            מגיע מהשרת, כדי שהכפתור לא יופיע ויקבל 409. */}
        {editing && (!reporter || initial.canDelete) && (confirmDel ? (
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
          {/* ⚠ **תג רק לשדרוג.** "תקלה" הוא רוב הרשימה
              וגם ברירת המחדל, ותג על כל שורה הוא רעש
              שמפסיקים לראות — בדיוק כמו המקרא הכפול
              בתורניות (4ק). ⚠ ובגוון תחום ולא בצבע מצב
              — שדרוג אינו בעיה ואינו תקין (4ג). */}
          {x.kind === FAULT_KIND.upgrade && <span className="pill p-up">שדרוג</span>}
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
  const [tab, setTab] = useState("open"); // open · mine · done

  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען…</div></div>
  );

  /* ============================================================
     ⚠⚠⚠ **מי רואה מסך צוות נקבע מהתשובה של השרת, לא מדגל במסך**
     ------------------------------------------------------------
     זו הפעם השלישית שאב הבית מדווח "אני לא יכול לשנות סטטוס
     תקלה", והשרת **תמיד** אישר לו: `staff = isManager || isHouse`
     ב-`api/_faults.js`. מה שנשבר בכל פעם הוא **באיזה מסך הוא
     נחת** — אריח מסך הבית, קישור במגירה, לשונית שהשם שלה
     השתנה. כל תיקון סגר נתיב אחד והשאיר את השאר.

     `data.mine === false` פירושו שהשרת עצמו זיהה אותו כצוות
     והחזיר לו את **כל** התקלות. מרגע שזו הבדיקה, כל נתיב
     שקיים היום וכל נתיב שייכתב מחר מגיעים למסך הנכון —
     ואי אפשר עוד שהמסך יהיה מצומצם ממה שהשרת מרשה (4יט).

     ⚠ ואין כאן הרחבת הרשאה: המסך אינו מרשה דבר, הוא רק
       מפסיק להסתיר את מה שכבר מותר.
     ============================================================ */
  if (data && data.mine === false) return <FaultsPage say={say} />;

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

  /* ⚠ `form` הוא true לדיווח חדש, או התקלה עצמה לעריכה. */
  if (form) return (
    <FaultForm say={say} reporter initial={form === true ? null : form}
      onDone={() => { setForm(false); reload(); }}
      onCancel={() => setForm(false)} />
  );

  /* ============================================================
     ⚠⚠ **קודם "מה כבר דווח", ואז הכפתור לדווח.**

     הרשימה פתוחה עכשיו לכל המכינה, וזו כל התכלית: שמונה
     אנשים דיווחו על אותו מזגן שבור כי לאף אחד לא הייתה דרך
     לדעת שכבר דיווחו, ואב הבית קיבל שמונה שורות על תקלה אחת.
     כפתור "דיווח חדש" שיושב **מעל** הרשימה לא היה פותר את
     זה — הסדר כאן הוא התיקון.

     ⚠ **ושלי מסומן בתוך הרשימה ולא ברשימה שנייה.** שתי
       רשימות היו מציגות את אותה תקלה פעמיים למי שדיווח.
     ============================================================ */
  const all = (data && data.faults) || [];
  const c = (data && data.counts) || {};
  const open = all.filter((x) => x.status !== FAULT_STATUS.done);
  const done = all.filter((x) => x.status === FAULT_STATUS.done);
  const list = tab === "open" ? open : tab === "mine" ? all.filter((x) => x.mine) : done;

  return (
    <>
      <div className="screen-title">תקלות ושידרוגים</div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          משהו שבור, דולף או לא עובד? קודם בדקו ברשימה אם כבר דווח —
          ואם לא, דווחו ואב הבית יראה את זה. אפשר לצרף תמונה, היא
          חוסכת חצי מהשאלות.
        </div>
      </div>

      <ScrollTabs className="seg">
        <button className={tab === "open" ? "on" : ""} onClick={() => setTab("open")}>
          פתוחות{open.length ? ` (${open.length})` : ""}
        </button>
        <button className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>
          שלי{c.open || c.done ? ` (${(c.open || 0) + (c.done || 0)})` : ""}
        </button>
        <button className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
          טופלו{done.length ? ` (${done.length})` : ""}
        </button>
      </ScrollTabs>

      <button className="btn btn-primary" style={{ margin: "12px 0 16px" }} onClick={() => setForm(true)}>
        <FI.plus />דיווח על תקלה חדשה
      </button>

      {list.length === 0 ? (
        <div className="empty">
          <div className="e1">
            {tab === "mine" ? "עוד לא דיווחת על תקלה"
              : tab === "done" ? "עוד לא טופלה אף תקלה" : "אין תקלות פתוחות"}
          </div>
          <div className="e2">
            {tab === "mine" ? "דיווח שתגיש יופיע כאן עם הסטטוס שלו."
              : "אם משהו שבור — זה המקום לדווח."}
          </div>
        </div>
      ) : (
        <>
          <div className="grp-h">
            <span>{list.length === 1 ? "תקלה אחת" : `${list.length} תקלות`}</span>
            <span>מתעדכן על ידי אב הבית</span>
          </div>
          <div className="rows">
            {list.map((x) => (
              <div className="st-row" key={x.id} style={{ cursor: "default" }}>
                <div className="st-main">
                  <div className="st-n">{x.title}</div>
                  <div className="st-m">
                    <span className={"pill " + (x.status === FAULT_STATUS.done ? "p-ok"
                      : x.status === FAULT_STATUS.working ? "p-new" : "p-low")}>{x.status}</span>
                    {/* ⚠ "שלי" מסומן ולא מופרד לרשימה שנייה —
                        שתי רשימות היו מציגות אותה תקלה פעמיים. */}
                    {x.mine && <span className="pill p-new">שלי</span>}
                    {x.place && <span>{x.place}</span>}
                    <span className="num">{heDate(x.date)}</span>
                    {/* ⚠ עריכה רק כשהשרת אמר `canEdit` — עד שטופל. */}
                    {x.canEdit && (
                      <button type="button" className="btn btn-ghost btn-sm fl-edit"
                        onClick={() => setForm(x)}>עריכה</button>
                    )}
                  </div>
                </div>
                {/* ⚠ שתי התמונות זו לצד זו — "כך זה נראה" מול
                    "כך זה נראה עכשיו". התמונה שמראה שהתקלה תוקנה
                    היא התשובה לדיווח של החניך, וזה מה שגורם לאנשים
                    להמשיך לדווח. */}
                {x.photoUrl && (
                  <a href={x.photoUrl} target="_blank" rel="noreferrer" className="thumb">
                    <img src={x.photoUrl} alt="" />
                  </a>
                )}
                {x.photoDoneUrl && (
                  <a href={x.photoDoneUrl} target="_blank" rel="noreferrer" className="thumb thumb-done">
                    <img src={x.photoDoneUrl} alt="" />
                    <i>אחרי</i>
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

/* ============================================================
   מאגר אנשי המקצוע
   ------------------------------------------------------------
   ⚠ **המחיקה היא כיבוי.** מי שלא עובד איתנו יותר יורד מהבורר
     שבטופס התקלה ונשאר כאן, מעומעם — טלפון של מי שתיקן את
     המזגן לפני שנתיים הוא בדיוק מה שמחפשים כשהוא מתקלקל שוב.
     ⚠ ולכן הכפתור אומר "הוצאה מהרשימה" ולא "מחיקה" (4לו).
   ============================================================ */
function ProsTab({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getPros(), []);
  const [form, setForm] = useState(null);   // null | {} | row
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);

  if (busy && !data) return <div className="empty"><div className="e1">טוען…</div></div>;
  /* ⚠ כשל הקמה נראה אחרת מ"אין אנשי מקצוע" (עיקרון 6). */
  if (err?.setupRequired) return (
    <div className="alert a-amber">
      <FI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">מאגר אנשי המקצוע טרם הוקם</div>
        <div className="bd">להקמה: <code>npm run seed:pros</code></div>
      </div>
    </div>
  );
  if (err) return (
    <div className="alert a-clay">
      <FI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את המאגר</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  const pros = data.pros || [];
  const live = pros.filter((p) => p.active);
  const off = pros.filter((p) => !p.active);

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) { setPhoto(null); return; }
    const up = await readUpload(file, say);
    if (up) setPhoto(up);
  };

  const save = () => {
    const name = String(form.name || "").trim();
    if (!name) { say("לא הוזן שם"); return; }
    setSaving(true);
    const body = {
      id: form.id, name,
      profession: form.profession || "",
      phone: form.phone || "", notes: form.notes || "",
      ...(photo ? { photoName: photo.name, photoMime: photo.mime, photoData: photo.data } : {}),
    };
    (form.id ? api.editPro(body) : api.addPro(body))
      .then((r) => {
        say(r && r.photoUploaded === false
          ? "נשמר, אבל העלאת התמונה נכשלה"
          : form.id ? "נשמר" : "נוסף למאגר");
        setForm(null); setPhoto(null); reload();
      })
      .catch((e) => say(e.message))
      .finally(() => setSaving(false));
  };

  const archive = (p) => {
    api.archivePro(p.id)
      .then(() => { say(`"${p.name}" הוצא מהרשימה`); reload(); })
      .catch((e) => say(e.message));
  };

  const restore = (p) => {
    api.editPro({ id: p.id, active: true })
      .then(() => { say(`"${p.name}" חזר לרשימה`); reload(); })
      .catch((e) => say(e.message));
  };

  if (form) return (
    <div className="card lift">
      <div className="fld">
        <label>שם<Req on={!String(form.name || "").trim()} /></label>
        <input value={form.name || ""} autoFocus disabled={saving}
          onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="שם מלא" />
      </div>
      {/* ⚠ הרשימה מגיעה מהשרת ואינה מוקלדת במסך — עיקרון 4מד. */}
      <Pick label="מקצוע" options={data.professions || []} value={form.profession || ""}
        onChange={(v) => setForm({ ...form, profession: v })} disabled={saving} />
      <div className="fld">
        <label>טלפון</label>
        <input value={form.phone || ""} inputMode="tel" disabled={saving} dir="ltr"
          onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="050-0000000" />
      </div>
      <div className="fld">
        <label>פרטים</label>
        <textarea rows={3} value={form.notes || ""} disabled={saving}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="על מה הוא עובד, מחירים, מי המליץ, אזור" />
      </div>
      <div className="fld">
        <label>תמונה</label>
        <input type="file" accept="image/*" onChange={pick} disabled={saving} />
      </div>
      <button className="btn btn-primary" disabled={saving} onClick={save}>
        {saving ? "שומר…" : form.id ? "שמירת השינויים" : "הוספה למאגר"}
      </button>
      <button className="btn btn-ghost" style={{ marginTop: 8 }} disabled={saving}
        onClick={() => { setForm(null); setPhoto(null); }}>ביטול</button>
    </div>
  );

  const card = (p, dim) => (
    <div className={"st-row pr-row" + (dim ? " is-off" : "")} key={p.id}>
      {p.photoUrl && <span className="thumb"><img src={p.photoUrl} alt="" /></span>}
      <div className="st-main">
        <div className="st-n">{p.name}</div>
        <div className="st-m">
          {p.profession && <span className="pill p-up">{p.profession}</span>}
          {/* ⚠ dir=ltr — בלעדיו 050-1234567 מוצג הפוך. */}
          {p.phone && <a href={`tel:${p.phone}`} dir="ltr" className="pr-tel">{p.phone}</a>}
        </div>
        {p.notes && <div className="pr-note">{p.notes}</div>}
      </div>
      <div className="pr-acts">
        <button className="by-mini" aria-label={"עריכת " + p.name}
          onClick={() => { setPhoto(null); setForm(p); }}><FI.pen /></button>
        {dim
          ? <button className="btn btn-ghost btn-sm" onClick={() => restore(p)}>החזרה</button>
          : <button className="btn btn-ghost btn-sm" style={{ color: "var(--clay)" }}
              onClick={() => archive(p)}>הוצאה</button>}
      </div>
    </div>
  );

  return (
    <>
      <button className="btn btn-primary by-add" onClick={() => { setPhoto(null); setForm({}); }}>
        <FI.plus />איש מקצוע חדש
      </button>

      {live.length === 0 ? (
        <div className="empty">
          <div className="e1">המאגר ריק</div>
          <div className="e2">מי שיתווסף כאן יופיע בבורר שבטופס התקלה.</div>
        </div>
      ) : <div className="rows">{live.map((p) => card(p, false))}</div>}

      {/* ⚠ מי שהוצא נשאר גלוי ומעומעם, ולא נעלם (4לו, 4ק). */}
      {off.length > 0 && (
        <>
          <div className="sec-label">לא בשימוש</div>
          <div className="rows">{off.map((p) => card(p, true))}</div>
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
  const [tab, setTab] = useState("faults"); // faults | pros

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

  /* ============================================================
     ⚠⚠ **מאגר אנשי המקצוע באותו מסך, ולא בדף משלו.**
     אב הבית שרואה תקלה ורוצה להוסיף את החשמלאי
     שהולך לטפל בה לא צריך לעזוב את המסך ולמצוא דף אחר —
     זו בדיוק הטעות של מסך ההצפות (4ס) ושל עריכת
     המטלות בתורניות (4ק).
     ============================================================ */
  if (tab === "pros") {
    return (
      <>
        <div className="screen-title">תקלות ושידרוגים</div>
        <ScrollTabs className="seg">
          <button onClick={() => setTab("faults")}>הדיווחים</button>
          <button className="on">אנשי מקצוע</button>
        </ScrollTabs>
        <ProsTab say={say} />
      </>
    );
  }

  return (
    <>
      <div className="screen-title">תקלות ושידרוגים</div>

      <ScrollTabs className="seg">
        <button className="on">הדיווחים</button>
        <button onClick={() => setTab("pros")}>אנשי מקצוע</button>
      </ScrollTabs>

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
