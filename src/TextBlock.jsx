/* ============================================================
   בלוק טקסט נערך
   ------------------------------------------------------------
   נוסח שהמכינה כתבה — נוהל, הסבר, תדריך — שיושב בלוח ולא בקוד,
   וראש המכינה עורך אותו מהאפליקציה.

   ⚠ **המפתח הוא שם השורה בלוח.** בלוק שנמחק בטעות חוזר לחיים
     ביצירת שורה חדשה עם אותו שם, בלי לתקן מזהה בקוד.

   ⚠ **בלוק שאינו קיים אינו שגיאה** — הוא פשוט לא מוצג. טקסט
     הסבר שנעלם אינו סיבה להפיל מסך.

   ⚠ **ולראש המכינה בלבד.** אלה נהלים של המכינה, ועריכה שלהם
     היא שינוי של מה שכתוב במכינה — לא של מסך.
   ============================================================ */

import React, { useState } from "react";
import { api } from "./api.js";

const BI = {
  pen: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
};

const when = (iso) => {
  if (!iso) return "";
  const d = String(iso).slice(0, 10);
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
};

export default function TextBlock({ block, canEdit, say, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);

  if (!block) return null;

  const open = () => { setF({ title: block.title, body: block.body }); setEdit(true); };
  const save = () => {
    if (busy) return;
    if (!f.body.trim()) { say("אין נוהל בלי תוכן"); return; }
    setBusy(true);
    api.saveText({ key: block.key, title: f.title, body: f.body })
      .then(() => { setEdit(false); say("הנוסח נשמר"); onSaved && onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  if (edit) {
    return (
      <div className="tb tb-edit card lift">
        <div className="fld">
          <label>כותרת</label>
          <input value={f.title} onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="fld">
          <label>הנוסח</label>
          {/* ⚠ textarea ולא עורך עשיר: הטקסט נשמר בלוח monday
              וצריך להיקרא גם שם. HTML היה מופיע שם כתגיות. */}
          <textarea rows={14} value={f.body} dir="rtl"
            onChange={(e) => setF((p) => ({ ...p, body: e.target.value }))} />
        </div>
        <div className="tb-f">
          <button className="btn btn-primary" disabled={busy || !f.body.trim()} onClick={save}>
            {busy ? "שומר…" : "שמירה"}
          </button>
          <button className="btn btn-ghost" onClick={() => setEdit(false)}>ביטול</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tb">
      <div className="tb-h">
        <b>{block.title}</b>
        {canEdit && (
          <button className="tb-pen" onClick={open} title="עריכת הנוסח">
            <BI.pen />עריכה
          </button>
        )}
      </div>
      {/* ⚠ `white-space: pre-wrap` ב-CSS — הטקסט נשמר עם שבירות
          שורה שמישהו כתב בכוונה, ורינדור שמוחק אותן הופך רשימה
          של תשעה סעיפים לפסקה אחת. */}
      <div className="tb-body">{block.body}</div>
      {block.by && (
        <div className="tb-by">נערך על ידי {block.by}{block.at ? " · " + when(block.at) : ""}</div>
      )}
    </div>
  );
}
