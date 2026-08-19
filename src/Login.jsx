/* ============================================================
   מסך כניסה
   ------------------------------------------------------------
   שני מסלולים נפרדים:
     חניך — תעודת זהות
     צוות — קוד אישי (מנהל) או הקוד המשותף (תורן)

   ⚠ שלב בחירת השם מרשימת החניכים הוסר. הוא הציג "חניך 1"…
     "חניך 33" — שמות מציינים שאינם אומרים דבר, ושהמשתמש נאלץ
     לבחור מהם בכל כניסה.

     המשמעות: דיווח של תורן נרשם על השם "תורן" ולא על שם שנבחר.
     השרת לא השתנה — traineeRoster ו-POST /api/auth?action=me
     עדיין קיימים, והשלב ניתן להחזרה בהסרת ההערה הזו ובשחזור
     ענף ה-name. שם החניך במסלול הת"ז מאומת ולא נפגע מכך.

   ⚠ הקוד והת"ז נשלחים לשרת ואינם נשמרים בשום מקום בדפדפן.
     השרת מחזיר עוגייה חתומה (HttpOnly) שגם JavaScript לא קורא.

   ⚠ תעודת זהות אינה סוד. היא נבחרה כמפתח הכניסה של החניכים
     בשלב הזה בהחלטת המכינה, ולא מתוך הנחה שהיא בטוחה. אם
     המסלול הזה יוחלף אי פעם, כאן ובקובץ api/_student-login.js
     בלבד.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";

export default function Login({ notice, onDone }) {
  const [mode, setMode] = useState("student"); // student | staff
  const [code, setCode] = useState("");
  const [tz, setTz] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const switchMode = (m) => {
    if (busy || m === mode) return;
    setMode(m); setErr(null); setCode(""); setTz("");
  };

  const submitCode = (e) => {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true); setErr(null);
    api.login(code.trim())
      .then(() => {
        setCode(""); // לא משאירים את הקוד בזיכרון המסך
        onDone();
      })
      .catch((e2) => setErr(e2.message))
      .finally(() => setBusy(false));
  };

  const submitTz = (e) => {
    e.preventDefault();
    const v = tz.trim();
    if (busy || !v) return;
    setBusy(true); setErr(null);
    api.loginStudent(v)
      .then(() => { setTz(""); onDone(); })
      .catch((e2) => setErr(e2.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="kx kx-login">
      <main className="wrap">
        <img className="login-mark" src="/logo-mark.png" alt="במעלה הדרך" />
        <div className="login-title">מכינת ניר עוז</div>

        {/* הודעות אמיתיות בלבד: קוד שהוחלף, תוקף שפג, הרשאה שכובתה */}
        {notice && (
          <div className="alert a-amber">
            <div style={{ flex: 1 }}><div className="bd" style={{ marginTop: 0 }}>{notice}</div></div>
          </div>
        )}

        {err && (
          <div className="alert a-clay">
            <div style={{ flex: 1 }}><div className="ttl">{err}</div></div>
          </div>
        )}

        <div className="seg">
          <button className={mode === "student" ? "on" : ""} disabled={busy}
            onClick={() => switchMode("student")}>חניך</button>
          <button className={mode === "staff" ? "on" : ""} disabled={busy}
            onClick={() => switchMode("staff")}>צוות</button>
        </div>

        {mode === "student" && (
          <form className="card" onSubmit={submitTz}>
            <div className="fld">
              <label htmlFor="tz">תעודת זהות</label>
              <input id="tz" type="text" inputMode="numeric" autoComplete="off"
                value={tz} disabled={busy} autoFocus maxLength={9}
                onChange={(e) => setTz(e.target.value.replace(/\D/g, ""))}
                placeholder="9 ספרות" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !tz.trim()}>
              {busy ? "בודק…" : "כניסה"}
            </button>
          </form>
        )}

        {mode === "staff" && (
          <form className="card" onSubmit={submitCode}>
            <div className="fld">
              <label htmlFor="code">קוד כניסה</label>
              <input id="code" type="password" inputMode="text" autoComplete="one-time-code"
                value={code} disabled={busy} autoFocus
                onChange={(e) => setCode(e.target.value)} placeholder="הזינו את הקוד" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>
              {busy ? "בודק…" : "כניסה"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
