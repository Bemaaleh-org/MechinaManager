/* ============================================================
   הפרופיל שלי
   ------------------------------------------------------------
   מסך אחד לחניכים ולצוות. אותו רכיב, אותה נקודת קצה.

   ⚠ **תעודת זהות ומגדר לקריאה בלבד.** הם מזהים את האדם מול
     המכינה, ושינוי שלהם מהמסך הזה היה מנתק את החניך מהשיבוצים,
     מהנוכחות ומהבקשות שלו. תיקון נעשה על ידי הצוות במסך
     החניכים, ששם רואים את ההקשר.

   ⚠ **החלפת סיסמה דורשת את הסיסמה הנוכחית.** בלי זה, מכשיר
     שנשאר פתוח לרגע במטבח מספיק כדי להשתלט על חשבון.

   ⚠ המסך אינו מציג ולעולם לא יציג את הסיסמה עצמה — היא אינה
     קיימת בשום מקום, גם לא בשרת. ראו api/_credentials.js.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { enablePush, disablePush, pushBlocker } from "./push.js";
import { api } from "./api.js";

const PI = {
  user: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.2-6 7.5-6s7.5 2.4 7.5 6"/></svg>,
  eye: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.7"/></svg>,
  eyeOff: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4l16 16"/><path d="M9.6 6.1A9.6 9.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1M6.4 8.2A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1 0 1.9-.1 2.7-.4"/></svg>,
  warn: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

/** שדה סיסמה עם כפתור הצגה */
function Secret({ id, label, value, onChange, disabled, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} type={show ? "text" : "password"} value={value}
          disabled={disabled} autoComplete="new-password"
          onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="pw-eye" tabIndex={-1}
          aria-label={show ? "הסתרה" : "הצגה"} onClick={() => setShow((v) => !v)}>
          {show ? <PI.eyeOff /> : <PI.eye />}
        </button>
      </div>
      {hint && <div className="fld-hint">{hint}</div>}
    </div>
  );
}

/** שורת נתון שאינו ניתן לשינוי כאן */
const Fixed = ({ label, value, note }) => (
  <div className="pf-row">
    <span className="pf-l">{label}</span>
    <span className="pf-v num">{value || "—"}</span>
    {note && <span className="pf-n">{note}</span>}
  </div>
);

export function ProfilePage({ say }) {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const load = () => api.getAccount()
    .then((d) => { setMe(d); setUser(d.user || ""); setEmail(d.email || ""); })
    .catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const dirty = me && (user.trim() !== (me.user || "") || email.trim() !== (me.email || ""));

  const saveDetails = () => {
    if (busy || !dirty) return;
    if (!emailOk) { say("כתובת אימייל לא תקינה"); return; }
    setBusy(true);
    /* ⚠ שינוי פרטים אינו דורש את הסיסמה הנוכחית, כי הוא אינו
       מרחיב גישה. החלפת סיסמה — כן. */
    api.saveAccount({ user: user.trim(), email: email.trim(), current: cur })
      .then(() => { say("נשמר"); load(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const savePassword = () => {
    if (busy || !cur || !pw || pw !== pw2) return;
    setBusy(true);
    api.saveAccount({ current: cur, password: pw })
      .then(() => {
        say("הסיסמה הוחלפה");
        setCur(""); setPw(""); setPw2("");
        load();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  if (err) {
    return (
      <>
        <div className="screen-title">הפרופיל שלי</div>
        <div className="alert a-clay"><PI.warn />
          <div style={{ flex: 1 }}>
            <div className="ttl">{err}</div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
              onClick={() => { setErr(null); load(); }}>נסו שוב</button>
          </div>
        </div>
      </>
    );
  }
  if (!me) return <><div className="screen-title">הפרופיל שלי</div><div className="skel skel-card" /></>;

  return (
    <>
      <div className="screen-title">הפרופיל שלי</div>

      <div className="pf-head">
        <div className="pf-av"><PI.user /></div>
        <div style={{ minWidth: 0 }}>
          <div className="pf-name">{me.name}</div>
          <div className="pf-kind">{me.kind === "student" ? "חניך" : "צוות"}</div>
        </div>
      </div>

      {/* ---------- מה שלא משתנה כאן ---------- */}
      {(me.tz || me.gender || me.details) && (
        <>
          <div className="sec-label">פרטים</div>
          <div className="card" style={{ marginBottom: 14 }}>
            {me.tz && <Fixed label="תעודת זהות" value={me.tz} />}
            {me.gender && <Fixed label="מין" value={me.gender} />}
            {/* ⚠ **פרטי הקשר מגיעים מהרשימה שהמכינה קיבלה ממך**
                ואינם ניתנים לעריכה כאן — הם מזינים גם את המטבח
                (אלרגיה) וגם את הזמנות החולצות, ותיקון חייב לעבור
                דרך מי שמחזיק את הרשימה. */}
            {me.details && me.details.phone && <Fixed label="טלפון" value={me.details.phone} />}
            {me.details && me.details.mail && <Fixed label="אימייל אישי" value={me.details.mail} />}
            {me.details && me.details.city && <Fixed label="עיר מגורים" value={me.details.city} />}
            {me.details && me.details.religion && <Fixed label="הגדרה דתית" value={me.details.religion} />}
            {me.details && me.details.shirt && <Fixed label="מידת חולצה" value={me.details.shirt} />}
            {/* ⚠ אלרגיה מובלטת. ראו StaffDossier ב-Mechina.jsx. */}
            {me.details && me.details.allergy && (
              <div className="pf-alert">
                <b>אלרגיה או רגישות</b>
                <span>{me.details.allergy}</span>
              </div>
            )}
            {/* ⚠ אומר למי לפנות, ולא רק "אי אפשר". */}
            <div className="pf-note">
              אלה מזהים אותך מול המכינה ומגיעים מהרשימה שמסרת.
              תיקון נעשה על ידי הצוות במסך החניכים.
            </div>
          </div>
        </>
      )}

      {/* ---------- שם משתמש ואימייל ---------- */}
      <div className="sec-label">כניסה למערכת</div>
      <div className="card lift" style={{ marginBottom: 14 }}>
        <div className="fld">
          <label htmlFor="pu">שם משתמש</label>
          <input id="pu" value={user} disabled={busy} autoComplete="username"
            onChange={(e) => setUser(e.target.value)} />
          <div className="fld-hint">אפשר להיכנס גם עם שם המשתמש וגם עם האימייל.</div>
        </div>
        <div className="fld">
          <label htmlFor="pe">אימייל</label>
          <input id="pe" type="email" value={email} disabled={busy} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} />
          {email.trim() && !emailOk
            ? <div className="fld-bad">הכתובת אינה נראית תקינה</div>
            : <div className="fld-hint">לכאן יישלח קוד אם תשכחו את הסיסמה.</div>}
        </div>
        {/* ⚠ הסיסמה הנוכחית נדרשת גם כאן: החלפת אימייל היא הדרך
            להשתלט על חשבון דרך "שכחתי סיסמה". */}
        {dirty && (
          <Secret id="pc" label="הסיסמה הנוכחית" value={cur} onChange={setCur}
            disabled={busy} hint="נדרשת כדי לשנות אימייל או שם משתמש" />
        )}
        <button className="btn btn-primary" disabled={busy || !dirty || !cur}
          onClick={saveDetails}>
          {busy ? "שומר…" : "שמירת השינויים"}
        </button>
      </div>

      {/* ---------- התראות לטלפון ---------- */}
      <PushCard say={say} />

      {/* ---------- סיסמה ---------- */}
      <div className="sec-label">החלפת סיסמה</div>
      <div className="card lift">
        <Secret id="c1" label="הסיסמה הנוכחית" value={cur} onChange={setCur} disabled={busy} />
        <Secret id="c2" label="סיסמה חדשה" value={pw} onChange={setPw}
          disabled={busy} hint="לפחות שמונה תווים" />
        <Secret id="c3" label="שוב, לוודא" value={pw2} onChange={setPw2} disabled={busy} />
        {pw2 && pw !== pw2 && <div className="fld-bad" style={{ marginBottom: 12 }}>
          הסיסמאות אינן זהות
        </div>}
        <button className="btn btn-primary"
          disabled={busy || !cur || !pw || pw !== pw2} onClick={savePassword}>
          {busy ? "שומר…" : "החלפת הסיסמה"}
        </button>
        {me.setAt && (
          <div className="pf-note" style={{ marginTop: 10 }}>
            הסיסמה נקבעה לאחרונה ב-{me.setAt.slice(8, 10)}/{me.setAt.slice(5, 7)}/{me.setAt.slice(0, 4)}
          </div>
        )}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}


/* ============================================================
   התראות לטלפון
   ------------------------------------------------------------
   ⚠ **כל כישלון כאן מקבל הסבר משלו.** "לא עבד" אינו מידע:
     הדפדפן לא תומך, המשתמש חסם בהגדרות, ה-PWA לא מותקן
     ב-iPhone, או שהמערכת עוד לא הוגדרה — ארבע בעיות עם ארבע
     פעולות שונות, ורק אחת מהן היא באמת תקלה.

   ⚠ **המסך אומר מראש מה חסר, ולא אחרי שהמשתמש כבר לחץ.**
     בקשת אישור שתיכשל ממילא היא בדיוק מה ש-4יד אוסר.

   ⚠ **וההסבר על הפרטיות מוצג.** אנשים מהססים לאשר התראות,
     ובצדק. כאן הדחיפה ריקה ושום נתון אינו עובר דרך גוגל או
     אפל — וזו עובדה ששווה לומר, לא להסתיר.
   ============================================================ */
function PushCard({ say }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [blocker, setBlocker] = useState(null);

  useEffect(() => {
    setBlocker(pushBlocker());
    api.getPush().then(setState).catch(() => setState({ ready: false, devices: 0 }));
  }, []);

  if (!state) return null;

  const on = state.devices > 0;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const r = on ? await disablePush() : await enablePush();
    if (r.ok) {
      say(on ? "ההתראות כובו במכשיר הזה" : "ההתראות הופעלו");
      api.getPush().then(setState).catch(() => {});
      setBlocker(pushBlocker());
    } else {
      say(r.why || "לא הצלחנו");
    }
    setBusy(false);
  };

  return (
    <>
      <div className="sec-label">התראות לטלפון</div>
      <div className="card lift">
        <div className="pn-b">
          כשמשהו חדש מחכה לכם במערכת, הטלפון יצלצל — גם כשהאפליקציה סגורה.
        </div>

        {/* ⚠ **עיקרון 6:** "לא הוגדר במערכת" שונה מ"לא נרשמת",
            ושונה מ"הדפדפן חוסם". שלושה מצבים, שלוש הודעות. */}
        {!state.ready ? (
          <div className="pn-w">
            ההתראות טרם הופעלו במערכת. צריך להוסיף מפתחות VAPID למשתני
            הסביבה — ראו <code>tools/seed-push.mjs</code>.
          </div>
        ) : blocker ? (
          <div className="pn-w">{blocker}</div>
        ) : (
          <>
            <div className="pn-s">
              {on
                ? `פעיל ב-${state.devices} ${state.devices === 1 ? "מכשיר" : "מכשירים"}`
                : "כבוי במכשיר הזה"}
            </div>
            <button className={"btn btn-sm " + (on ? "btn-ghost" : "btn-primary")}
              style={{ width: "100%", marginTop: 8 }} disabled={busy} onClick={toggle}>
              {busy ? "רגע…" : on ? "כיבוי במכשיר הזה" : "הפעלת התראות"}
            </button>
          </>
        )}

        {/* ⚠ נאמר תמיד, גם כשההתראות כבויות — זה מה שגורם
            לאנשים לאשר. */}
        <div className="pn-p">
          ההתראה שנשלחת <b>ריקה</b>: היא רק אומרת לטלפון "יש משהו חדש",
          והאפליקציה היא זו ששולפת מה. שום נתון של חניך אינו עובר דרך
          גוגל או אפל.
        </div>
      </div>
    </>
  );
}
