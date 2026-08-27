/* ============================================================
   בדיקת שירות הדואר
   ------------------------------------------------------------
   ⚠ המסך הזה קיים כי מסך "שכחתי סיסמה" **חייב** לומר לכולם
     "הבקשה נקלטה" — אחרת הוא הופך למנוע בדיקה של מי רשום
     במכינה. התוצאה היא שכשהמייל נכשל, אין שום דרך לדעת.

     כאן, ורק כאן, מוצגת השגיאה כלשונה.

   ⚠ מנהל בלבד, והשרת אוכף.
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";

const MI = {
  ok: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5l5.5 5.5L20 7"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

/** שורת מצב אחת — סימן, מילה וערך. ⚠ לא רק צבע. */
const Row = ({ ok, label, value }) => (
  <div className={"mc-row " + (ok ? "ok" : "bad")}>
    <span className="mc-mark">{ok ? "✓" : "✗"}</span>
    <span className="mc-l">{label}</span>
    <span className="mc-v num">{value}</span>
  </div>
);

export function MailCheckPage({ say }) {
  const [st, setSt] = useState(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);

  const load = () => api.getMailStatus().then(setSt).catch((e) => say(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const test = () => {
    if (busy || !to.trim()) return;
    setBusy(true); setOut(null);
    api.sendTestMail(to.trim())
      .then((d) => { setOut(d); setSt((p) => ({ ...p, ...d })); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <div className="screen-title">בדיקת שליחת מייל</div>

      <div className="cy-lead">
        המערכת עובדת גם בלי מייל — איפוס סיסמה הופך לקוד בן שש ספרות
        שמופיע לך בפעמון ההתראות. <b>המייל הוא נוחות, לא תנאי.</b>
      </div>

      {!st ? <div className="skel skel-card" /> : (
        <>
          <div className="sec-label">מה מוגדר ב-Vercel</div>
          <div className="card" style={{ marginBottom: 14 }}>
            <Row ok={st.hasKey} label="RESEND_API_KEY"
              value={st.hasKey ? (st.keyLooksRight ? "תקין" : "לא נראה תקין") : "חסר"} />
            <Row ok={Boolean(st.from)} label="MAIL_FROM" value={st.from || "חסר"} />
            {/* ⚠ המידע שהכי מבלבל: onboarding@resend.dev שולח רק
                לכתובת שאיתה נפתח החשבון. */}
            {st.isTestFrom && (
              <div className="mc-note">
                כתובת הבדיקה של Resend שולחת <b>רק לכתובת שאיתה נפתח חשבון Resend</b>.
                לשליחה לחניכים צריך לאמת דומיין.
              </div>
            )}
          </div>

          {(st.problems || []).length > 0 && (
            <div className="alert a-amber" style={{ marginBottom: 14 }}><MI.warn />
              <div style={{ flex: 1 }}>
                <div className="ttl">מה חסר</div>
                <div className="bd">{st.problems.join(" · ")}</div>
              </div>
            </div>
          )}

          <div className="sec-label">שליחת מכתב בדיקה</div>
          <div className="card lift">
            <div className="fld">
              <label htmlFor="mt">לאיזו כתובת</label>
              <input id="mt" type="email" value={to} disabled={busy}
                placeholder="you@example.com"
                onChange={(e) => setTo(e.target.value)} />
              <div className="fld-hint">
                אם MAIL_FROM הוא onboarding@resend.dev — יש להזין כאן את הכתובת
                שאיתה נפתח חשבון Resend, אחרת השליחה תידחה.
              </div>
            </div>
            <button className="btn btn-primary" disabled={busy || !to.trim()} onClick={test}>
              {busy ? "שולח…" : "שליחה"}
            </button>
          </div>

          {out && (
            <div className={"alert " + (out.sent ? "a-ok" : "a-clay")} style={{ marginTop: 14 }}>
              {out.sent ? <MI.ok /> : <MI.warn />}
              <div style={{ flex: 1 }}>
                <div className="ttl">{out.sent ? "נשלח" : "נכשל"}</div>
                {/* ⚠ השגיאה כלשונה. היא מה שמאפשר לתקן. */}
                {!out.sent && <div className="bd mc-err">{out.reason}</div>}
                {out.advice && <div className="bd mc-fix">{out.advice}</div>}
                {out.sent && (
                  <div className="bd">
                    מכאן איפוס סיסמה יישלח במייל. אם לא הגיע — לבדוק בספאם.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}
