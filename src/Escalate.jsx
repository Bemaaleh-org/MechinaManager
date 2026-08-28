/* ============================================================
   הצפה — רכיב אחד, בתוך כל הקשר
   ------------------------------------------------------------
   ⚠ **היה כאן מסך.** `src/DutyNotes.jsx` היה דף נפרד שבו איש
     צוות בוחר תפקיד מרשימה ואז כותב. הבחירה ההיא הייתה כל
     הבעיה: מי שעומד מול כרטיס "אחראי מטבח" ורוצה להעיר לו
     משהו לא צריך לעזוב את המסך, למצוא דף אחר, ולבחור שם שוב
     את מה שכבר היה מול העיניים שלו.

     עכשיו הרכיב הזה יושב **בתוך** ההקשר: בכרטיס התפקיד
     שב"בעלי תפקידים", ובמסך של כל ועדה, סדרה וצוות. אין
     בורר, כי אין מה לבחור — ההקשר כבר בחר.

   ⚠ **וההבטחה של 4מה נשמרת בדיוק כפי שהייתה: תיבת יוצא, לא
     מראה.** אין מצב "טופל", אין חותמת קריאה ואין מונה. מספר
     הוא תחילתו של דירוג, ודירוג הוא מעקב. מה שכן חוזר הוא
     תשובה שהחניך **בחר** לשלוח.

   ⚠ **ההפניה היא לתפקיד ולא לאדם.** `duty` הוא מפתח האחריות
     (`אחראי מטבח`, `יו״ר#12345`), ולכן ההצפה נשארת נכונה גם
     כשהתפקיד עובר לחניך אחר — ואין מאיפה שתצמח עמודה
     "לפי אדם".

   ⚠ **המחיר מוצהר במסך ולא בהערה בקוד.** מי ששולח צריך לדעת
     מראש שלא יראה אם זה בוצע, אחרת הוא יחכה למשוב שלא יגיע
     ויסיק שההצפה נעלמה.
   ============================================================ */

import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const EI = {
  send: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z"/></svg>,
  x: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  reply: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/></svg>,
};

const when = (iso) => {
  if (!iso) return "";
  const d = String(iso).slice(0, 10);
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
};

/**
 * @param duty   מפתח האחריות — "אחראי מטבח" או "יו״ר#<מזהה>"
 * @param label  איך לקרוא לו על המסך
 * @param who    מי נושא אותו כרגע, לתצוגה בלבד (רשות)
 * @param compact  בתוך כרטיס תפקיד, בלי כותרת גדולה
 */
export default function Escalate({ duty, label, who, say, compact = false }) {
  const [notes, setNotes] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [canSend, setCanSend] = useState(false);

  /* ⚠ נטען רק כשהרכיב מורכב, והוא מורכב רק כשההקשר פתוח —
     כרטיס תפקיד שנפתח, או לשונית צוות שנבחרה. רשימת תפקידים
     סגורה אינה מייצרת ולו בקשה אחת. */
  const load = useCallback(() => {
    api.getDutyNotes()
      .then((r) => {
        setNotes((r.notes || []).filter((n) => n.duty === duty));
        setCanSend(Boolean(r.canSend));
        setErr("");
      })
      .catch((e) => setErr(e.message));
  }, [duty]);
  useEffect(() => { load(); }, [load]);

  const send = () => {
    if (busy) return;
    if (!f.title.trim()) { say("צריך נושא"); return; }
    setBusy(true);
    api.sendDutyNote({ duty, title: f.title.trim(), body: f.body.trim() })
      .then(() => { setF({ title: "", body: "" }); setOpen(false); load(); say("ההצפה נשלחה"); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = (id) => {
    api.deleteDutyNote(id)
      .then(() => { load(); say("ההצפה הוסרה"); })
      .catch((e) => say(e.message));
  };

  /* ⚠ כשל טעינה נראה אחרת מ"אין הצפות" — עיקרון 6. */
  if (err) return <div className="login-err esc-err">{err}</div>;
  if (notes === null) return <div className="skel" style={{ height: 64 }} />;

  /* ⚠ הכפתור יודע מראש. חניך שיראה טופס ויקליד בו יקבל 403
     אחרי שכבר השקיע — אותו כלל כמו canEditTalks (4יד). */
  if (!canSend) {
    return (
      <div className="esc esc-ro">
        ההצפות אל <b>{label}</b> נשלחות על ידי הצוות, ומגיעות למי שנושא
        את התפקיד — במרכז התפקיד שלו.
      </div>
    );
  }

  return (
    <div className={"esc" + (compact ? " esc-c" : "")}>
      {!compact && <div className="esc-h">הצפה אל {label}</div>}

      {!open && (
        <button className="btn btn-ghost btn-sm esc-open" onClick={() => setOpen(true)}>
          <EI.send />הצפה אל {label}
        </button>
      )}

      {open && (
        <div className="esc-form">
          <div className="fld">
            <label>הנושא</label>
            <input value={f.title} autoFocus
              onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))}
              placeholder="מה צריך לבדוק" />
          </div>
          <div className="fld">
            <label>פירוט</label>
            <textarea rows={3} value={f.body}
              onChange={(e) => setF((p) => ({ ...p, body: e.target.value }))}
              placeholder="רשות" />
          </div>
          <div className="esc-f">
            <button className="btn btn-primary btn-sm"
              disabled={busy || !f.title.trim()} onClick={send}>
              {busy ? "שולח…" : "שליחה"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>ביטול</button>
          </div>
          {/* ⚠ המחיר, בטקסט מלא ולא באותיות קטנות. */}
          <div className="esc-n">
            ההצפה מופנית <b>לתפקיד ולא לאדם</b>
            {who ? ` — כרגע ${who}` : ""}, ונשארת נכונה גם אם התפקיד יעבור.
            {" "}<b>לא תדעו אם היא טופלה</b>: זו הבחירה שנעשתה כדי לתת
            לחניכים אוטונומיה, והבדיקה חוזרת לשיחה.
          </div>
        </div>
      )}

      {/* ---------- מה כבר נשלח לתפקיד הזה ---------- */}
      {notes.length > 0 && (
        <div className="esc-list">
          <div className="esc-lh">נשלחו {notes.length}</div>
          {notes.map((n) => (
            <div className="esc-item" key={n.id}>
              <div className="esc-it">
                <b>{n.title}</b>
                {/* ⚠ **רק על מה שאני שלחתי**, ו-`mine` נגזר בשרת
                    ולא מהשוואת שמות כאן — היא הייתה נשברת ביום
                    שאיש צוות משנה את שמו. השרת חוסם ממילא (404),
                    והכפתור צריך לדעת מראש (4יד). */}
                {n.mine && (
                  <button className="esc-del" onClick={() => remove(n.id)} title="הסרה">
                    <EI.x />
                  </button>
                )}
              </div>
              {n.body && <div className="esc-ib">{n.body}</div>}
              <div className="esc-im">{n.by} · {when(n.at)}</div>
              {/* ⚠ התשובה חוזרת כי החניך **בחר** לשלוח אותה.
                  זה הדבר היחיד שזורם פנימה. */}
              {n.reply && (
                <div className="esc-reply">
                  <EI.reply />
                  <div>
                    <div>{n.reply}</div>
                    <span>{when(n.replyAt)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
