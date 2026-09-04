/* ============================================================
   ניהול צוותים — ועדות וסדרות
   ------------------------------------------------------------
   המסך שמחליף את הגיליון: היו״ר והמדריך המלווה מנהלים כאן את
   כל המשימות של הוועדה, משייכים אותן לחניכים, ורואים התקדמות.

   ⚠⚠ **זה אינו מרכז התפקיד, וזו לא טעות בעיצוב.**
     ב-`src/Duty.jsx` המשימות שייכות לחניך בלבד והצוות אינו
     רואה אותן — הבטחה שכתובה שם על המסך במילים (4מה). כאן
     ההפך המכוון: הלוח משותף, "באחריות מי" נכתב בשם, וכולם
     רואים הכול.

     ולכן **שני מסכים ולא לשוניות באותו מסך**, שתי פסקאות
     סוגרות הפוכות, ואף מונה משותף. אם המסך הזה ייראה כמו
     מרכז התפקיד, ההבטחה שם תיקרא כשקר גם כשהיא אמת.

   ⚠ **ההתקדמות נגזרת מ"נחשב סגור" שבלוח אוצר המילים.** מנהל
     המכינה שיוסיף סטטוס חדש מחליט בעצמו אם הוא סוגר משימה,
     בלי דיפלוי (עיקרון 1). וכשאין אף סטטוס סוגר — נאמר במפורש
     ולא מוצג 0%, שנראה כמו נתון (עיקרון 6).
   ============================================================ */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "./api.js";
import Escalate from "./Escalate.jsx";
import ScrollTabs from "./Tabs.jsx";
import { CATEGORY, PERIOD, PERIODS, plural, byCategory } from "../shared/placements.js";
import { dutyKey, DUTY_CHAIR } from "../shared/duties.js";
import { TEAM_CATEGORIES } from "../shared/team.js";
import ScreenNote from "./ScreenNote.jsx";

const TI = {
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  x: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5 9.5 18 20 6.5"/></svg>,
  users: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6"/><path d="M17 8.5a3 3 0 0 0 0-1M18 14.6c2 .7 3.5 2.4 3.5 5.4"/></svg>,
  list: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>,
  warn: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  link: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>,
  bell: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5z"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>,
  cal: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
};

/* ⚠ אותו גיבוב יציב כמו `tone()` ב-Placements.jsx: שם חדש
   מקבל צבע מעצמו, בלי עמודת צבע לתחזק ובלי דיפלוי (4ג). */
const tone = (s) => {
  let h = 0;
  for (const ch of String(s || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 8) + 1;
};
const he = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");
const dmy = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

/* ============================================================
   טבעת ההתקדמות
   ------------------------------------------------------------
   ⚠ **null אינו 0.** בלי אף סטטוס סוגר אי אפשר לדעת מה הושלם,
     והטבעת מציגה קו מקווקו ו"—" במקום 0% — עיקרון 6 בגרסה
     חזותית: הגדרה חסרה נראית אחרת מהתקדמות אפסית.
   ============================================================ */
function Ring({ pct, size = 62 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const known = pct !== null && pct !== undefined;
  return (
    <svg className="tm-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="tm-ring-bg"
        strokeDasharray={known ? undefined : "3 4"} />
      {known && (
        <circle cx={size / 2} cy={size / 2} r={r} className="tm-ring-fg"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      )}
      <text x="50%" y="50%" className="tm-ring-t">{known ? pct + "%" : "—"}</text>
    </svg>
  );
}

/* ============================================================
   רשימת הצוותים
   ============================================================ */
function TeamList({ data, onPick }) {
  if (!data.teams.length) {
    return (
      <div className="empty">
        <div className="e-ico"><TI.users /></div>
        <b>אין ועדות או סדרות שאתם משובצים אליהן</b>
        <span>ניהול משימות קיים לוועדה ולסדרה. שיבוץ נעשה על ידי הצוות.</span>
      </div>
    );
  }
  return (
    <div className="tm-grid">
      {data.teams.map((t) => (
        <button className={"tm-card tone-" + tone(t.name)} key={t.id} onClick={() => onPick(t.id)}>
          <div className="tm-card-h">
            <div>
              <div className="tm-card-n">{t.name}</div>
              {/* ⚠ הקטגוריה לא מוצגת כאן — הלשונית כבר אמרה
                  אותה, ושורה שחוזרת על הכותרת שמעליה היא רעש. */}
              <div className="tm-card-s">
                {t.isChair ? "אתם היו״ר"
                  : t.chairName ? "יו״ר · " + t.chairName
                  : "אין יו״ר"}
                {t.lead ? " · מדריך " + t.lead : ""}
              </div>
            </div>
            <Ring pct={t.progress.pct} size={54} />
          </div>
          <div className="tm-card-f">
            <span className="pill p-ok">{t.progress.done} הושלמו</span>
            <span className="pill">{t.progress.open} פתוחות</span>
            {t.late > 0 && <span className="pill p-low">{t.late} באיחור</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   עורך המשימה
   ------------------------------------------------------------
   ⚠ **המפה האופטימית כאן היא `id → אובייקט` ולא `id → bool`.**
     ב-`src/Duty.jsx` המשימה היא בוצע/לא בוצע ולכן דגל מספיק;
     כאן לסטטוס יש ערכים רבים, ולבעלים, לשלב ולתאריך יש ערך
     משלהם. העתקת המפה הבוליאנית משם הייתה שוברת את הסטטוס
     הרב-ערכי **בשקט** — הוא היה חוזר ל"מסומן/לא מסומן".
   ============================================================ */
function TaskEditor({ team, vocab, members, task, perm, me, onSave, onCancel, onDelete, say }) {
  const [f, setF] = useState(() => ({
    title: task?.title || "",
    owner: task?.owner || "",
    status: task?.status || "",
    stage: task?.stage || "",
    due: task?.due || "",
    note: task?.note || "",
    link: task?.link || "",
  }));
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  /* ⚠ מארכב מוסתר מהבורר **ונשאר נבחר** אם המשימה כבר נושאת
     אותו. אחרת פתיחת משימה ישנה הייתה מוחקת לה את הסטטוס
     בשקט ברגע שמישהו לוחץ שמירה. */
  const opts = (list, cur) => list.filter((x) => !x.archived || x.id === cur);

  const save = () => {
    if (busy) return;
    if (!f.title.trim()) { say("אין משימה בלי כותרת"); return; }
    setBusy(true);
    onSave(f).catch((e) => { say(e.message); setBusy(false); });
  };

  return (
    <div className="tm-editor card lift">
      <div className="fld">
        <label>המשימה</label>
        <input value={f.title} autoFocus
          onChange={(e) => set("title", e.target.value)}
          placeholder="למשל: להזמין הסעה לטקס" />
      </div>

      <div className="tm-row2">
        <div className="fld">
          <label>באחריות</label>
          <select value={f.owner} onChange={(e) => set("owner", e.target.value)}
            disabled={!perm.manage}>
            {/* ⚠ ריק הוא "טרם שויכה" ולא שגיאה — יו״ר פותח
                רשימה ואז מחלק, וזה הסדר הטבעי. */}
            <option value="">— טרם שויכה —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id} disabled={!m.active}>
                {m.name}{m.active ? "" : " (אינו פעיל)"}
              </option>
            ))}
          </select>
          {!perm.manage && (
            <div className="fld-hint">שיוך לחניך אחר נעשה על ידי היו״ר או המדריך המלווה</div>
          )}
        </div>
        <div className="fld">
          <label>תאריך יעד</label>
          <input type="date" dir="ltr" value={f.due} onChange={(e) => set("due", e.target.value)} />
        </div>
      </div>

      <div className="tm-row2">
        <div className="fld">
          <label>סטטוס</label>
          <select value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">—</option>
            {opts(vocab.statuses, f.status).map((x) => (
              <option key={x.id} value={x.id}>{x.name}{x.closes ? " ✓" : ""}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>שלב</label>
          <select value={f.stage} onChange={(e) => set("stage", e.target.value)}>
            <option value="">—</option>
            {opts(vocab.stages, f.stage).map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="fld">
        <label>הערות</label>
        <textarea rows={3} value={f.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="מה צריך לדעת כדי לבצע" />
      </div>

      <div className="fld">
        <label>קישור</label>
        <input value={f.link} onChange={(e) => set("link", e.target.value)}
          placeholder="גיליון, מסמך או טופס" dir="ltr" />
      </div>

      <div className="tm-editor-f">
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "שומר…" : task ? "שמירה" : "הוספת המשימה"}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>ביטול</button>
        {task && onDelete && (
          <button className="btn btn-ghost tm-del" onClick={onDelete}>מחיקה</button>
        )}
      </div>
      {task && (task.by || task.upBy) && (
        <div className="tm-meta">
          {task.by && <span>נפתחה על ידי {task.by}</span>}
          {task.upBy && <span>· עודכנה על ידי {task.upBy}</span>}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   כרטיס משימה
   ------------------------------------------------------------
   ⚠ **`.kx .tm-task` ולא `.tm-task`.** הכרטיס הוא `<button>`,
     ו-`.kx button` מאפסת background ו-border בסגוליות גבוהה
     יותר. אותה מלכודת תפסה כבר את `.task-box` ואת `.yr2-c`.
   ============================================================ */
function TaskCard({ t, statusName, onOpen }) {
  return (
    <button className={"tm-task" + (t.done ? " done" : "") + (t.late ? " late" : "")}
      onClick={onOpen}>
      <div className="tm-task-m">
        <div className="tm-task-t">{t.title}</div>
        <div className="tm-task-s">
          <span className={"tm-st" + (t.done ? " on" : "")}>{statusName || "ללא סטטוס"}</span>
          {t.ownerName
            ? <span className="tm-own">{t.ownerName}</span>
            : <span className="tm-own none">טרם שויכה</span>}
          {t.due && (
            <span className={"tm-due" + (t.late ? " late" : "")}>
              <TI.cal />{he(t.due)}
            </span>
          )}
          {t.link && <span className="tm-has"><TI.link /></span>}
        </div>
        {t.note && <div className="tm-task-n">{t.note}</div>}
      </div>
      {t.done && <span className="tm-done-mark"><TI.check /></span>}
    </button>
  );
}

/* ============================================================
   ההצפות של הוועדה
   ------------------------------------------------------------
   ⚠ **אותו רכיב בדיוק שיושב בכרטיס התפקיד** (src/Escalate.jsx).
     שני עותקים היו נפרדים בתיקון הראשון, ואז "ההצפה מתפקיד"
     ו"ההצפה מוועדה" היו מתנהגות אחרת בלי שאיש יבחין.

   ⚠ **ואין כאן מרחב מפתחות שני, בכוונה.** ההצפה ממשיכה להיות
     מופנית ל-`יו״ר#<מזהה הוועדה>` — מפתח שכבר קיים, שכבר נישא
     ב-`dutiesForStudent`, וששורד החלפת יו״ר. מפתח בשם
     "צוות#<מזהה>" היה מכפיל את הערוץ ומייצר שתי תיבות דואר
     לאותה שאלה.

   ⚠ **התיבה הנכנסת של היו״ר אינה כאן.** היא במרכז התפקיד,
     ומכאן יש אליה **קישור אחד בכיוון אחד** — כדי ששני המסכים
     לא ייראו כמו אותו מסך, וההבטחה של 4מה לא תיקרא כשקר.
   ============================================================ */
/* ============================================================
   מרצים של הצוות
   ------------------------------------------------------------
   ⚠ **אותו לוח חוות דעת של המרצים, ולא לוח שני.** מרצה שהגיע
     לסדרה הוא אותו מרצה שיכול להגיע לשיעור רגיל, ושני לוחות
     היו מייצרים שתי היסטוריות על אותו אדם — ואז "האם כבר
     עבדנו איתו" מקבלת שתי תשובות.

   ⚠ **כל חברי הצוות כותבים, ולא רק היו״ר** — בקשה מפורשת של
     המכינה. מה שמצומצם הוא **עריכה ומחיקה**: של מי שכתב, או
     של היו״ר והמדריך. חוות דעת היא טקסט שאדם כתב.
   ============================================================ */
const EMPTY_LECT = { name: "", topic: "", field: "", phone: "", opinion: "", lessonDate: "" };

function Lecturers({ d, say, reload }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(null);
  const list = d.lecturers || [];

  const save = () => {
    if (busy || !form.name.trim()) return;
    setBusy(true);
    const body = {
      name: form.name.trim(), topic: form.topic.trim(), field: form.field.trim(),
      phone: form.phone.trim(), opinion: form.opinion.trim(),
      lessonDate: form.lessonDate,
    };
    (form.id
      ? api.editTeamLecturer({ ...body, id: form.id })
      : api.addTeamLecturer({ ...body, team: d.team.id }))
      .then(() => { say(form.id ? "עודכן" : "נוסף"); setForm(null); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  if (form) {
    return (
      <div className="card lift">
        <div className="fld">
          <label>שם המרצה</label>
          <input value={form.name} disabled={busy} autoFocus
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="tm-row2">
          <div className="fld">
            <label>נושא</label>
            <input value={form.topic} disabled={busy}
              onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="fld">
            <label>תאריך</label>
            <input type="date" dir="ltr" value={form.lessonDate} disabled={busy}
              onChange={(e) => setForm({ ...form, lessonDate: e.target.value })} />
          </div>
        </div>
        <div className="tm-row2">
          <div className="fld">
            <label>תחום</label>
            <input value={form.field} disabled={busy}
              onChange={(e) => setForm({ ...form, field: e.target.value })} />
          </div>
          <div className="fld">
            <label>טלפון</label>
            <input value={form.phone} disabled={busy} inputMode="tel" dir="ltr"
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="fld">
          <label>חוות דעת ופירוט</label>
          <textarea rows={4} value={form.opinion} disabled={busy}
            placeholder="מה היה, איך עבד מול הקבוצה, האם להזמין שוב"
            onChange={(e) => setForm({ ...form, opinion: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
            disabled={busy || !form.name.trim()} onClick={save}>
            {busy ? "שומר…" : "שמירה"}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy}
            onClick={() => setForm(null)}>ביטול</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="tm-note">
        המרצים שהגיעו לצוות הזה. מה שנכתב כאן מופיע גם ברשימת חוות הדעת
        הכללית של המכינה — אותו מרצה, היסטוריה אחת.
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="e1">עוד לא נרשמו מרצים</div>
          <div className="e2">כל מי שהגיע — עם מה שכדאי לזכור עליו לפעם הבאה.</div>
        </div>
      ) : list.map((x) => (
        <div className="card tm-lect" key={x.id}>
          <div className="tm-lect-h">
            <b>{x.name}</b>
            {x.field && <span className="pill p-new">{x.field}</span>}
          </div>
          <div className="tm-lect-m">
            {x.topic && <span>{x.topic}</span>}
            {x.lessonDate && <span>· {x.lessonDate}</span>}
            {x.phone && <span dir="ltr">· {x.phone}</span>}
          </div>
          {x.opinion && <div className="tm-lect-o">{x.opinion}</div>}
          <div className="tm-lect-f">
            {x.by && <span>{x.by}</span>}
            {/* ⚠ עריכה ומחיקה — מי שכתב, או היו״ר והמדריך. */}
            {(x.mine || d.me.manage) && (
              <>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => setForm({
                    ...x, topic: x.topic || "", field: x.field || "",
                    phone: x.phone || "", opinion: x.opinion || "",
                    lessonDate: x.lessonDate || "",
                  })}>עריכה</button>
                <button className="esc-del" title="מחיקה"
                  onClick={() => setAsking(x.id)}>✕</button>
              </>
            )}
          </div>
          {asking === x.id && (
            <div className="alert a-clay" style={{ marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <div className="ttl">למחוק את חוות הדעת על {x.name}?</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="btn btn-clay btn-sm" style={{ flex: 1 }} disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      api.deleteTeamLecturer(x.id)
                        .then(() => { say("נמחק"); setAsking(null); reload(); })
                        .catch((e) => say(e.message))
                        .finally(() => setBusy(false));
                    }}>כן, למחוק</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                    onClick={() => setAsking(null)}>ביטול</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {d.me.write && (
        <button className="btn btn-primary tm-add" onClick={() => setForm({ ...EMPTY_LECT })}>
          <TI.plus />מרצה חדש
        </button>
      )}
    </>
  );
}

/* ============================================================
   סיכום הצוות
   ------------------------------------------------------------
   ⚠ **הנתונים נגזרים והטקסט נכתב.** המספרים למעלה מגיעים
     מהמשימות ומהמרצים בזמן השליפה, והטקסט הוא מה שהקבוצה
     רוצה לזכור. סיכום שהוא רק טקסט מאבד את המספרים, וסיכום
     שהוא רק מספרים אינו סיכום.

   ⚠ **כל חברי הצוות כותבים אותו** — בקשה מפורשת של המכינה.
     סיכום שרק היו״ר יכול לגעת בו אינו סיכום של הסדרה.
   ============================================================ */
function TeamSummary({ d, say, reload }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(d.summary || "");
  const [busy, setBusy] = useState(false);
  const lect = d.lecturers || [];

  const save = () => {
    if (busy) return;
    setBusy(true);
    api.saveTeamSummary({ team: d.team.id, summary: text })
      .then(() => { say("נשמר"); setEdit(false); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <div className="ld-facts">
        <div><b className="num">{d.counts.done}/{d.counts.total}</b><span>משימות שנסגרו</span></div>
        <div><b className="num">{lect.length}</b><span>מרצים</span></div>
        <div><b className="num">{d.members.length}</b><span>חברי צוות</span></div>
      </div>
      {/* ⚠ המספר שאומר כמה מהתמונה חסר — מוצג ולא מושמט (4יח). */}
      {d.counts.late > 0 && (
        <div className="ld-gap">{d.counts.late} משימות באיחור</div>
      )}

      {lect.length > 0 && (
        <div className="tm-sum-l">
          <i>מרצים</i>
          {lect.map((x) => (
            <span key={x.id}>{x.name}{x.lessonDate ? ` · ${x.lessonDate}` : ""}</span>
          ))}
        </div>
      )}

      <div className="sec-label">סיכום</div>
      {edit ? (
        <>
          <textarea rows={8} value={text} disabled={busy}
            placeholder="מה עבד, מה לא, מה כדאי לדעת לפעם הבאה"
            onChange={(e) => setText(e.target.value)} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={busy}
              onClick={save}>{busy ? "שומר…" : "שמירה"}</button>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy}
              onClick={() => { setText(d.summary || ""); setEdit(false); }}>ביטול</button>
          </div>
        </>
      ) : (
        <>
          <div className={"ld-text" + (d.summary ? "" : " ld-empty")}>
            {d.summary || "עוד לא נכתב סיכום."}
          </div>
          {d.summaryBy && <div className="ld-by">{d.summaryBy}</div>}
          {d.me.write && (
            <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 6 }}
              onClick={() => setEdit(true)}>
              {d.summary ? "עריכת הסיכום" : "כתיבת סיכום"}
            </button>
          )}
        </>
      )}
    </>
  );
}

function TeamNotes({ team, me, say, go }) {
  /* ⚠ **dutyKey ולא מחרוזת מוקלדת.** הגרש ב"יו״ר" הוא U+05F4
     בכל המאגר, אבל מפתח שנבנה ביד הוא בדיוק מה ש-shared/duties.js
     מזהיר ממנו: מפתח שגוי בתו אחד נשמר, מופיע לשולח בתיבת
     היוצא, **ולעולם לא מגיע** — כי הפעמון משווה מול dutyKey. */
  const duty = dutyKey({ name: DUTY_CHAIR, scope: team.id });

  if (me.role === "chair") {
    return (
      <div className="tm-esc">
        <div className="tm-esc-h">ההצפות אליכם</div>
        <p>
          מה שהצוות מציף אליכם כיו״ר <b>{team.name}</b> יושב במרכז התפקיד,
          יחד עם המשימות האישיות שלכם ומסמך החפיפה.
        </p>
        <button className="btn btn-primary" onClick={() => go && go("duty")}>
          למרכז התפקיד
        </button>
      </div>
    );
  }

  return (
    <Escalate duty={duty} label={"יו״ר " + team.name} say={say}
      who={team.chairName || null} />
  );
}

/* ============================================================
   מסך הצוות
   ============================================================ */
function TeamHub({ id, say, onBack, go }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState("tasks");
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null);   /* משימה, "new", או null */
  const [editTeam, setEditTeam] = useState(false);

  const load = useCallback(() => {
    api.getTeam(id)
      .then((r) => { setD(r); setErr(""); })
      .catch((e) => setErr(e.message));
  }, [id]);
  useEffect(() => { setD(null); load(); }, [load]);

  const nameOf = useCallback((tid) => {
    if (!d || !tid) return "";
    const all = [...d.vocab.statuses, ...d.vocab.stages];
    return (all.find((v) => v.id === tid) || {}).name || "";
  }, [d]);

  const shown = useMemo(() => {
    if (!d) return [];
    const me = d.me.id;
    if (filter === "mine") return d.tasks.filter((t) => t.owner === me);
    if (filter === "open") return d.tasks.filter((t) => !t.done);
    if (filter === "none") return d.tasks.filter((t) => !t.owner);
    if (filter === "late") return d.tasks.filter((t) => t.late);
    return d.tasks;
  }, [d, filter]);

  /* קיבוץ לפי שלב — הסדר של אוצר המילים, וללא-שלב בסוף */
  const groups = useMemo(() => {
    if (!d) return [];
    const order = d.vocab.stages.map((s) => s.id);
    const map = new Map();
    for (const t of shown) {
      const k = t.stage || "";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    }
    return [...map.entries()]
      .sort((a, b) => {
        if (!a[0]) return 1;
        if (!b[0]) return -1;
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      })
      .map(([k, list]) => ({ key: k, label: nameOf(k) || "ללא שלב", list }));
  }, [d, shown, nameOf]);

  if (err) return <div className="login-err">{err}</div>;
  if (!d) return <div className="skel" style={{ height: 220 }} />;

  const save = (f) => {
    const body = { ...f, owner: f.owner || "", status: f.status || "", stage: f.stage || "" };
    const p = edit === "new"
      ? api.addTeamTask({ teamId: d.team.id, ...body })
      : api.updateTeamTask({ id: edit.id, ...body });
    return p.then(() => { setEdit(null); load(); say("נשמר"); });
  };
  const del = () => {
    if (edit === "new" || !edit) return;
    api.deleteTeamTask(edit.id)
      .then(() => { setEdit(null); load(); say("נמחקה"); })
      .catch((e) => say(e.message));
  };

  const t = tone(d.team.name);
  const FILTERS = [
    ["all", "הכול", d.tasks.length],
    ["open", "פתוחות", d.counts.open],
    ["mine", "שלי", d.tasks.filter((x) => x.owner === d.me.id).length],
    ["none", "טרם שויכו", d.counts.unassigned],
    ["late", "באיחור", d.counts.late],
  ];

  return (
    <>
      <div className="tm-top">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <TI.chev />חזרה לצוותים
        </button>
        {/* ⚠ הכפתור יודע מראש: team-admin הוא צוות בלבד,
            ויו״ר שילחץ היה מקבל 403 אחרי שכבר פתח טופס (4יד). */}
        {!d.me.role || d.me.role === "staff" ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setEditTeam(true)}>
            עריכת הצוות
          </button>
        ) : null}
      </div>

      {editTeam && (
        <TeamForm team={d.team} say={say}
          onCancel={() => setEditTeam(false)}
          onDone={() => { setEditTeam(false); load(); say("נשמר"); }}
          onDeleted={() => { setEditTeam(false); onBack(); }} />
      )}

      {/* ---------- הכותרת ---------- */}
      <div className={"tm-hero tone-" + t}>
        <div className="tm-hero-m">
          <div className="tm-hero-c">{d.team.category}</div>
          <h2>{d.team.name}</h2>
          <div className="tm-hero-p">
            {d.team.chairName ? <span>יו״ר · {d.team.chairName}</span> : <span>אין יו״ר</span>}
            {d.team.lead && <span>מדריך מלווה · {d.team.lead}</span>}
            <span>{d.members.length} חברי צוות</span>
          </div>
        </div>
        <Ring pct={d.counts.pct} size={78} />
      </div>

      {/* ⚠ המבנה של `.band` הוא band-h / band-grid / band-c —
          לא i/b/span. ניחוש המבנה נתן שלושה מספרים דבוקים
          זה לזה בשורה אחת. */}
      <div className="band tm-band">
        <div className="band-h">הוועדה במספרים</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n ok">{d.counts.done}</div>
            <div className="band-l">הושלמו</div>
          </div>
          <div className="band-c">
            <div className="band-n">{d.counts.open}</div>
            <div className="band-l">פתוחות</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (d.counts.late ? " warn" : "")}>{d.counts.late}</div>
            <div className="band-l">באיחור</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (d.counts.unassigned ? " warn" : "")}>{d.counts.unassigned}</div>
            <div className="band-l">טרם שויכו</div>
          </div>
        </div>
      </div>

      {/* ⚠ אזהרה היא חלק מהתשובה ולא לוג. הגדרה חסרה נראית
          אחרת ממצב ריק — עיקרון 6. */}
      {d.warnings.map((w, i) => (
        <div className="note-warn" key={i}><TI.warn />{w}</div>
      ))}

      <ScrollTabs className="tm-tabs">
        {[["tasks", "משימות", <TI.list key="a" />],
          ["people", "לפי אדם", <TI.users key="b" />],
          /* ⚠ **מרצים וסיכום — בכל צוות, ולא רק בסדרה.** ועדה
             שמביאה מרצה היא מצב אמיתי, ולשונית שמופיעה ונעלמת
             לפי קטגוריה מלמדת את המשתמש לא לסמוך על הניווט. */
          ["lect", "מרצים", <TI.users key="d" />],
          ["sum", "סיכום", <TI.list key="e" />],
          ["notes", "הצפות", <TI.bell key="c" />]]
          .map(([k, label, ic]) => (
            <button key={k} className={"tm-tab" + (view === k ? " on" : "")}
              onClick={() => setView(k)}>{ic}{label}</button>
          ))}
      </ScrollTabs>

      {view === "notes" && (
        <TeamNotes team={d.team} me={d.me} say={say} go={go} />
      )}

      {/* ⚠ `load` ולא `reload` — הטוען כאן נקרא `load`.
          `reload` שאינו קיים עובר את `vite build` בשלום ונופל
          בדפדפן ב-ReferenceError, וזה בדיוק סוג השגיאה שהבנייה
          לא תופסת (4ס). */}
      {view === "lect" && (
        <Lecturers d={d} say={say} reload={load} />
      )}

      {view === "sum" && (
        <TeamSummary d={d} say={say} reload={load} />
      )}

      {view === "tasks" && (
        <>
          <div className="tm-filters">
            {FILTERS.map(([k, label, n]) => (
              <button key={k} className={"tm-chip" + (filter === k ? " on" : "")}
                onClick={() => setFilter(k)}>{label}<i>{n}</i></button>
            ))}
          </div>

          {d.me.write && edit !== "new" && (
            <button className="btn btn-primary tm-add" onClick={() => setEdit("new")}>
              <TI.plus />משימה חדשה
            </button>
          )}
          {edit === "new" && (
            <TaskEditor team={d.team} vocab={d.vocab} members={d.members} task={null}
              perm={d.me} me={d.me.id} say={say}
              onSave={save} onCancel={() => setEdit(null)} />
          )}

          {!d.tasks.length && (
            <div className="empty">
              <div className="e-ico"><TI.list /></div>
              <b>אין עדיין משימות</b>
              <span>
                {d.me.write
                  ? "כאן מנהלים את כל מה שהוועדה צריכה לעשות — במקום גיליון."
                  : "היו״ר או המדריך המלווה יפתחו את הרשימה."}
              </span>
            </div>
          )}

          {groups.map((g) => (
            <div className="tm-group" key={g.key || "none"}>
              <div className="tm-group-h">{g.label}<i>{g.list.length}</i></div>
              {g.list.map((x) => (
                <React.Fragment key={x.id}>
                  {edit && edit !== "new" && edit.id === x.id ? (
                    <TaskEditor team={d.team} vocab={d.vocab} members={d.members} task={x}
                      perm={d.me} me={d.me.id} say={say}
                      onSave={save} onCancel={() => setEdit(null)}
                      onDelete={d.me.manage || x.byId === d.me.id ? del : null} />
                  ) : (
                    <TaskCard t={x} statusName={nameOf(x.status)}
                      /* ⚠ מי שאינו רשאי לערוך פותח לקריאה — הכפתור
                         חייב לדעת מראש, אחרת הוא מקבל 403 אחרי
                         שכבר הקליד (אותו כלל כמו canEditTalks). */
                      onOpen={() => (x.mayEdit ? setEdit(x) : say(
                        "אפשר לשנות משימה שלך או שיצרת. ליו״ר ולמדריך המלווה יש גישה מלאה"))} />
                  )}
                </React.Fragment>
              ))}
            </div>
          ))}
        </>
      )}

      {view === "people" && (
        <div className="rows tm-people">
          {d.byOwner.map((m) => (
            <div className="tm-person" key={m.id}>
              <div className="tm-person-h">
                <b>{m.name}{!m.active && <span className="pill p-low">אינו פעיל</span>}</b>
                <span>{m.done}/{m.total}</span>
              </div>
              <div className="mini-bar">
                <i style={{ width: (m.total ? (m.done / m.total) * 100 : 0) + "%" }} />
              </div>
              <div className="tm-person-f">
                {m.total === 0
                  ? <span className="tm-faint">טרם שויכו לו משימות</span>
                  : <><span>{m.open} פתוחות</span>{m.late > 0 && <span className="tm-bad">{m.late} באיחור</span>}</>}
              </div>
            </div>
          ))}
          {d.counts.unassigned > 0 && (
            <div className="tm-person none">
              <div className="tm-person-h"><b>טרם שויכו</b><span>{d.counts.unassigned}</span></div>
              <div className="tm-person-f">
                <span className="tm-faint">משימות שממתינות לחלוקה</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          ⚠ **הפסקה ההפוכה מזו שבמרכז התפקיד.**
          שם כתוב "המשימות כאן שלך בלבד. הצוות אינו רואה אותן".
          כאן חייב להיות כתוב ההפך, במפורש — אחרת חניך שיראה
          שני מסכים דומים יניח שגם שם הכול גלוי, וההבטחה תיקרא
          כשקר בדיוק כשהיא אמת.
          ============================================================ */}
      <div className="tm-note">
        המשימות כאן <b>משותפות לכל הצוות</b> — היו״ר, המדריך המלווה וכל חברי
        הוועדה רואים אותן ואת מי שאחראי עליהן. זה ההפך ממרכז התפקיד, שבו
        המשימות האישיות שלכם סגורות בפני הצוות.
      </div>
    </>
  );
}

/* ============================================================
   טופס הקמת צוות
   ------------------------------------------------------------
   ⚠ **זה מה ש"בלי מפתח" אומר בפועל.** "קם צוות באמצע שנה,
     נגיד צוות יום הזיכרון" — דני מקים אותו כאן, קובע לו יו״ר
     ומכסה, משבץ אליו חניכים, ומנהל בו משימות. אף שורת קוד
     ואף דיפלוי (עיקרון 1).

   ⚠ **שדות מוגדרים ולא טופס חופשי.** קטגוריה, תקופה ומכסה הן
     בדיוק מה שכל שאר המערכת כבר יודעת לקרוא — לוח השיבוצים,
     הפרופיל של החניך, מסך המדריך. שדה חופשי היה נראה גמיש
     יותר ולא היה מגיע לאף מסך.
   ============================================================ */
function TeamForm({ preset, team, say, onDone, onCancel, onDeleted }) {
  const [f, setF] = useState(() => ({
    name: team ? team.name : "",
    category: team ? team.category : (preset || CATEGORY.adhoc),
    period: team ? team.period : PERIOD.yearly,
    capacity: team && team.capacity != null ? String(team.capacity) : "",
    desc: team ? (team.desc || "") : "",
    lead: team ? (team.lead || "") : "",
    archived: team ? Boolean(team.archived) : false,
  }));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (busy) return;
    if (!f.name.trim()) { say("אין צוות בלי שם"); return; }
    setBusy(true);
    api.saveTeamDef({ ...f, id: team ? team.id : undefined })
      .then((r) => onDone(team ? team.id : r.id, f.name.trim(), f.category))
      .catch((e) => { say(e.message); setBusy(false); });
  };

  /* ⚠ **אישור לפני מחיקה, ובלי `confirm()` של הדפדפן.** הוא
     נראה זר, ובחלק מהדפדפנים במובייל הוא נחסם לגמרי — כלומר
     הכפתור פשוט לא עושה כלום. */
  const remove = () => {
    if (busy) return;
    setBusy(true);
    api.deleteTeam(team.id)
      .then(() => { say(`"${team.name}" נמחק`); onDeleted(); })
      .catch((e) => { say(e.message); setBusy(false); setConfirm(false); });
  };

  return (
    <div className="tm-editor card lift">
      <div className="tm-form-h">{team ? "עריכת " + team.name : "צוות חדש"}</div>

      <div className="fld">
        <label>שם הצוות</label>
        <input value={f.name} autoFocus onChange={(e) => set("name", e.target.value)}
          placeholder="למשל: צוות יום הזיכרון" />
      </div>

      <div className="tm-row2">
        <div className="fld">
          <label>סוג</label>
          {/* ⚠ רק קטגוריות שמנהלות משימות. ענף וקבוצה נוצרים
              במסך השיבוצים — לענף אין יו״ר, ולקבוצה יש מדריך
              צוות, ושניהם דברים אחרים. */}
          <select value={f.category} onChange={(e) => set("category", e.target.value)}>
            {TEAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {team && <div className="fld-hint">שינוי סוג מעביר את הצוות ללשונית אחרת</div>}
        </div>
        <div className="fld">
          <label>תקופה</label>
          <select value={f.period} onChange={(e) => set("period", e.target.value)}>
            {PERIODS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="tm-row2">
        <div className="fld">
          <label>מכסת חניכים</label>
          {/* ⚠ type=number, אבל השרת בודק Number.isFinite בכל
              מקרה: תוכן לא-מספרי נותן NaN, וההשוואה מולו תמיד
              false — כלומר האכיפה מתבטלת בשקט. */}
          <input type="number" min="0" step="1" dir="ltr" value={f.capacity}
            onChange={(e) => set("capacity", e.target.value)}
            placeholder="ריק = בלי הגבלה" />
        </div>
        <div className="fld">
          <label>מדריך מלווה</label>
          <input value={f.lead} onChange={(e) => set("lead", e.target.value)}
            placeholder="שם איש הצוות" />
        </div>
      </div>

      <div className="fld">
        <label>תיאור</label>
        <textarea rows={2} value={f.desc} onChange={(e) => set("desc", e.target.value)}
          placeholder="מה הצוות עושה" />
      </div>

      {team && (
        <label className="ch-chk">
          <input type="checkbox" checked={Boolean(f.archived)}
            onChange={(e) => set("archived", e.target.checked)} />
          {/* ⚠ **ארכוב ולא מחיקה** הוא מה שעושים לצוות שהיה
              ונגמר: המשימות, השיבוצים וההיסטוריה נשמרים,
              והצוות פשוט יורד מהרשימה. */}
          <span>מוארכב — יורד מהרשימה, וכל המשימות וההיסטוריה נשמרות</span>
        </label>
      )}

      <div className="tm-editor-f">
        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "שומר…" : team ? "שמירה" : "יצירת הצוות"}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>ביטול</button>
        {team && !confirm && (
          <button className="btn btn-ghost tm-del" onClick={() => setConfirm(true)}>מחיקה</button>
        )}
      </div>

      {/* ⚠ המחיקה נחסמת בשרת כשיש שיבוצים או משימות, וההודעה
          אומרת כמה יש ומה לעשות במקום. האישור כאן הוא כדי שלא
          תישלח בכלל בלחיצה אחת. */}
      {team && confirm && (
        <div className="tm-danger">
          <b>למחוק את "{team.name}"?</b>
          <span>
            מחיקה אפשרית רק לצוות בלי שיבוצים ובלי משימות. אם יש בו תוכן,
            השרת יעצור ויאמר כמה — ואז עדיף לארכב.
          </span>
          <div className="tm-editor-f">
            <button className="btn btn-primary tm-del-go" disabled={busy} onClick={remove}>
              {busy ? "מוחק…" : "כן, למחוק"}
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>ביטול</button>
          </div>
        </div>
      )}

      {!team && (
        <div className="tm-esc-n">
          אחרי היצירה: קובעים יו״ר ומשבצים חניכים במסך
          <b> שיבוצי חניכים</b>, ואז מנהלים כאן את המשימות.
        </div>
      )}
    </div>
  );
}

/* ============================================================
   השער
   ============================================================ */
export default function TeamsPage({ say, go }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [pick, setPick] = useState(null);
  /* ⚠ **הלשוניות כאן הן `.seg` ולא `.tm-tab`.** בתוך מסך הצוות
     כבר יש שורת לשוניות (משימות · לפי אדם · הצפות), ושתי שורות
     באותו מראה בשני מפלסים היו נקראות כמו אותה בחירה — המשתמש
     היה לוחץ וחושב שהוא לא זז. */
  const [cat, setCat] = useState(null);
  const [creating, setCreating] = useState(false);
  const [made, setMade] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (pick) return;
    api.getTeams()
      .then((r) => {
        setList(r);
        setErr("");
        /* ⚠ **הלשונית הפותחת נקבעת מהנתונים ולא בקוד.** ברירת
           מחדל קבועה ל"סדרות" הייתה נוחתת על לשונית שאולי אינה
           מרונדרת כלל — ואז המסך נראה ריק בלי סיבה. */
        setCat((cur) => {
          const live = tabsOf(r);
          return cur && live.includes(cur) ? cur : (live[0] || null);
        });
      })
      .catch((e) => setErr(e.message));
  }, [pick, tick]);

  if (pick) return <TeamHub id={pick} say={say} go={go} onBack={() => setPick(null)} />;

  const TABS = list ? tabsOf(list) : [];
  const shown = list && cat ? list.teams.filter((t) => t.category === cat) : [];

  return (
    <>
      <div className="screen-title">ניהול צוותים</div>
      <ScreenNote name="note.teams" say={say} />
      <div className="tm-sub">
        משימות, אחריות והתקדמות במקום אחד — במקום גיליון.
      </div>

      {/* ⚠ כשל טעינה נראה אחרת מ"אין צוותים" — עיקרון 6. */}
      {err && <div className="login-err">{err}</div>}
      {!err && !list && <div className="skel" style={{ height: 180 }} />}

      {!err && list && (
        <>
          {/* ⚠ רצועה של לשונית אחת אינה בחירה — היא רעש. */}
          {TABS.length > 1 && (
            <ScrollTabs className="seg tm-seg">
              {TABS.map((c) => (
                <button key={c} className={cat === c ? "on" : ""}
                  onClick={() => { setCat(c); setCreating(false); setMade(null); }}>
                  {plural(c)}
                  <i className="seg-n">{list.teams.filter((t) => t.category === c).length}</i>
                </button>
              ))}
            </ScrollTabs>
          )}

          {/* ⚠ הכפתור יודע מראש. team-admin הוא צוות בלבד, וחניך
              יו״ר שילחץ היה מקבל 403 אחרי שכבר מילא טופס (4יד). */}
          {list.canManage && !creating && !made && (
            <button className="btn btn-primary tm-add" onClick={() => setCreating(true)}>
              <TI.plus />צוות חדש
            </button>
          )}

          {creating && (
            <TeamForm preset={cat || CATEGORY.adhoc} say={say}
              onCancel={() => setCreating(false)}
              onDone={(id, name, category) => {
                setCreating(false);
                setCat(category);
                setMade({ id, name, category });
              }} />
          )}

          {/* ============================================================
              ⚠ **כרטיס הצלחה, ולא קפיצה אל הצוות החדש.**

              `invalidatePlacements()` בשרת מנקה את המטמון **במופע
              שטיפל בבקשה בלבד**, והוא בן 30 שניות. בייצור הבקשה
              הבאה עשויה לנחות על מופע אחר ולקבל "הצוות אינו נמצא"
              על צוות שזה עתה נוצר — כלומר יצירה מוצלחת שנראית
              בדיוק כמו כישלון.

              ולכן הכרטיס אומר מה קרה ומה השלב הבא, ונותן כפתור
              רענון מפורש. לחיצה שנייה על "צוות חדש" הייתה מחזירה
              «"X" כבר קיים בלוח ההגדרות» — שני מסרים סותרים,
              ואף אחד מהם לא נכון.
              ============================================================ */}
          {made && (
            <div className="tm-made card lift">
              <div className="tm-made-h">✓ {made.name} נוצר</div>
              <p>
                הצוות ריק כרגע. <b>יו״ר וחניכים נקבעים במסך שיבוצי חניכים</b>,
                ומשם חוזרים לכאן לנהל את המשימות.
              </p>
              <div className="tm-editor-f">
                <button className="btn btn-primary" onClick={() => setPick(made.id)}>
                  למסך הצוות
                </button>
                <button className="btn btn-ghost" onClick={() => { setMade(null); setTick((t) => t + 1); }}>
                  רענון הרשימה
                </button>
              </div>
            </div>
          )}

          {shown.length === 0 && !creating && !made ? (
            <div className="empty">
              <div className="e-ico"><TI.users /></div>
              <b>{emptyTitle(cat, list.canManage)}</b>
              <span>{emptyHint(cat, list.canManage)}</span>
            </div>
          ) : (
            shown.length > 0 && <TeamList data={{ ...list, teams: shown }} onPick={setPick} />
          )}
        </>
      )}
    </>
  );
}

/* ============================================================
   אילו לשוניות בכלל מוצגות
   ------------------------------------------------------------
   ⚠ **לשונית נרנדרת רק אם יש בה צוות** — פלוס "צוותים מזדמנים"
     תמיד למנהל, כי שם מקימים את הראשון. חניך שמשובץ לוועדה
     אחת אינו צריך לראות שתי לשוניות ריקות שיסיק מהן שמשהו לא
     נטען.

   ⚠ והסדר מ-`byCategory` ולא ממערך מקובע כאן — זה בדיוק המקום
     שבו נולדות רשימות מקבילות שמתפצלות.
   ============================================================ */
function tabsOf(list) {
  return [...TEAM_CATEGORIES].sort(byCategory).filter(
    (c) => list.teams.some((t) => t.category === c)
      || (c === CATEGORY.adhoc && list.canManage));
}

/* ⚠ **שלוש קטגוריות, שני קהלים, ושש הודעות ריקות שונות.**
   "אין ועדות" למנהל ולחניך אינן אותה אמירה: אצל המנהל זה מצב
   שהוא יכול לתקן, ואצל החניך זה פשוט מצב, והוא צריך לדעת
   למי לפנות. */
function emptyTitle(cat, canManage) {
  if (cat === CATEGORY.adhoc) return "אין צוותים מזדמנים";
  if (cat === CATEGORY.series) return canManage ? "אין סדרות" : "אינכם משובצים לאף סדרה";
  if (cat === CATEGORY.committee) return canManage ? "אין ועדות" : "אינכם משובצים לאף ועדה";
  return "אין צוותים";
}
function emptyHint(cat, canManage) {
  if (cat === CATEGORY.adhoc) {
    return canManage
      ? "צוות שקם באמצע שנה — צוות יום הזיכרון, צוות טקס. אפשר להקים אותו כאן ולשבץ אליו חניכים."
      : "כאן יופיעו צוותים שקמים באמצע שנה, אם תשובצו לאחד מהם.";
  }
  return canManage
    ? "השיבוצים מוגדרים במסך שיבוצי חניכים."
    : "שיבוץ נעשה על ידי הצוות.";
}
