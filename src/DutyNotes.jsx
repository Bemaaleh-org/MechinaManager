/* ============================================================
   הצפה לבעלי תפקידים — מסך הצוות
   ------------------------------------------------------------
   ⚠ **תיבת יוצא, לא מראה.** זה כל המסך, וזו הסיבה שאין בו
     רשימת חניכים, אין מצב "טופל" ואין מונים.

   ⚠ **הפנייה היא לתפקיד ולא לאדם.** אין כאן בורר חניך, וזה
     מכוון: כשאין רשימת חניכים אין מאיפה שתצמח עמודה "לפי
     אדם". ההצפה גם נשארת נכונה אם התפקיד עבר לחניך אחר.

   ⚠ **הגבול כתוב במסך, בטקסט מלא ולא באותיות קטנות.** מי
     ששולח צריך לדעת מראש שלא יראה אם זה בוצע — אחרת הוא
     יחכה למשוב שלא יגיע ויסיק שההצפה נעלמה.
   ============================================================ */

import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const NI = {
  send: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z"/></svg>,
  warn: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  x: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
};

const heFull = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

export default function DutyNotesPage({ say }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [opts, setOpts] = useState([]);
  const [f, setF] = useState({ duty: "", title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => Promise.all([
    api.getDutyNotes(),
    /* ⚠ רשימת האחריות נבנית מהלוח — התפקידים מהעמודה,
       והוועדות והסדרות מהגדרות השיבוצים. תפקיד או ועדה
       שיתווספו יופיעו כאן בלי דיפלוי. */
    api.getStudents().catch(() => ({ roles: [] })),
    api.getPlacements().catch(() => ({ definitions: [] })),
  ]).then(([n, s, p]) => {
    setData(n); setErr(null);
    const list = [];
    for (const r of s.roles || []) list.push({ key: r, label: r });
    list.push({ key: "מוביל שבוע", label: "מוביל שבוע" });
    for (const d of p.definitions || []) {
      if (d.category === "ועדה" || d.category === "סדרה") {
        list.push({ key: `יו״ר#${d.id}`, label: `יו״ר ${d.name}` });
      }
    }
    setOpts(list);
  }).catch((e) => setErr(e.message)), []);

  useEffect(() => { load(); }, [load]);

  const send = () => {
    if (busy || !f.duty || !f.title.trim()) return;
    setBusy(true);
    api.sendDutyNote({ duty: f.duty, title: f.title.trim(), body: f.body.trim() })
      .then(() => { say("נשלח"); setF({ duty: f.duty, title: "", body: "" }); return load(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = (id) => {
    if (busy) return;
    setBusy(true);
    api.deleteDutyNote(id)
      .then(() => load())
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  if (err) {
    return (
      <div className="alert a-clay"><NI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">{err}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
            onClick={() => { setErr(null); load(); }}>נסו שוב</button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="skel skel-card" />;

  const label = (k) => (opts.find((o) => o.key === k) || {}).label || k;

  return (
    <>
      {/* ---------- הטופס ---------- */}
      <div className="card lift" style={{ marginBottom: 14 }}>
        <div className="fld">
          <label htmlFor="dn-duty">למי</label>
          <select id="dn-duty" value={f.duty} disabled={busy}
            onChange={(e) => setF({ ...f, duty: e.target.value })}>
            <option value="">בחרו אחריות</option>
            {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="dn-t">נושא</label>
          <input id="dn-t" value={f.title} disabled={busy}
            placeholder="במשפט אחד — מה צריך תשומת לב"
            onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        <div className="fld">
          <label htmlFor="dn-b">פירוט</label>
          <textarea id="dn-b" rows={3} value={f.body} disabled={busy}
            placeholder="מידע שיעזור, הקשר, מי לשאול — לא חובה"
            onChange={(e) => setF({ ...f, body: e.target.value })} />
        </div>
        <button className="btn btn-primary" disabled={busy || !f.duty || !f.title.trim()}
          onClick={send}>
          <NI.send />{busy ? "שולח…" : "שליחה"}
        </button>

        {/* ⚠ הגבול, בטקסט מלא. ראו ההערה בראש הקובץ. */}
        <div className="alert a-amber" style={{ marginTop: 14, marginBottom: 0 }}>
          <div style={{ flex: 1 }}>
            <div className="ttl">מה קורה אחרי השליחה</div>
            <div className="bd">
              ההצפה תופיע אצל מי שמחזיק בתפקיד, במרכז התפקיד שלו.
              <b> לא תראו אם היא בוצעה</b> — רק תשובה, אם הוא יבחר לשלוח אחת.
              המשימות שהחניכים כותבים לעצמם אינן נגישות לצוות, וזו החלטה
              של המכינה ולא מגבלה טכנית.
            </div>
          </div>
        </div>
      </div>

      {/* ---------- מה נשלח ---------- */}
      <div className="sec-label">נשלחו ({data.notes.length})</div>
      {data.notes.length === 0 ? (
        <div className="attn-calm">
          <b>עוד לא נשלחה אף הצפה</b>
          <span>כאן יופיע מה ששלחתם, ותשובות שהתקבלו</span>
        </div>
      ) : data.notes.map((n) => (
        <div className="msg" key={n.id}>
          <div className="msg-h">
            <b>{n.title}</b>
            <span>{label(n.duty)} · {n.by}{n.at ? ` · ${heFull(n.at.slice(0, 10))}` : ""}</span>
            <button className="task-x" style={{ marginInlineStart: "auto" }}
              onClick={() => remove(n.id)} aria-label="הסרה"><NI.x /></button>
          </div>
          {n.body && <div className="msg-b">{n.body}</div>}
          {n.reply && (
            <div className="msg-reply">
              <b>התקבלה תשובה{n.replyAt ? ` · ${heFull(n.replyAt.slice(0, 10))}` : ""}</b>
              {n.reply}
            </div>
          )}
        </div>
      ))}
      <div style={{ height: 40 }} />
    </>
  );
}
