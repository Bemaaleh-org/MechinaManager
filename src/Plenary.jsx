/* ============================================================
   מליאות ומאגר מרצים — שני המסכים של ועדת קבוצה ותוכן
   ------------------------------------------------------------
   ⚠⚠ **בנק הפתקים אינו מוצג לחניכים**, וזו אינה הסתרה
     בתצוגה: השרת אינו שולח אותו כלל (עיקרון 4). מי שרואה
     עשרה פתקים ויודע מי היה בחדר מזהה מי כתב מה, וזה שובר
     את האנונימיות בפועל.

   ⚠ **מה שכן פתוח לכולם**: הרשימה, סדר היום והסיכומים —
     אחרי שהוועדה בנתה אותם. "בסוף כל המליאות פתוחות לצפייה".

   ⚠ **הפתק אנונימי או מזוהה, לבחירת הכותב**, והמחיר מוצהר
     במסך: פתק אנונימי אי אפשר למחוק ואי אפשר לערוך — אין
     דרך לדעת שהוא שלך (5י).
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import {
  LECT_STATUS, LECT_STATUSES, isOpenLect,
} from "../shared/lecturers-ids.js";
import { PLENARY_STATUS } from "../shared/plenary-ids.js";

const PI = {
  chev: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  note: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>,
  users: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.6"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M17 5.2a3.6 3.6 0 0 1 0 6.9M18 20a6.6 6.6 0 0 0-2-4.7"/></svg>,
  warn: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  up: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 19V6M6 12l6-6 6 6"/></svg>,
  down: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v13M6 12l6 6 6-6"/></svg>,
};

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
};

/* ============================================================
   ⚠⚠ קריאת .docx בדפדפן, בלי שום חבילה
   ------------------------------------------------------------
   קובץ .docx הוא ZIP, ו-`word/document.xml` שבתוכו נושא את
   הטקסט. `DecompressionStream("deflate-raw")` מובנה בדפדפן
   ופורס את הרשומות — כלומר אין כאן תלות חדשה, ואין העלאה
   לשרת של קובץ שכל מה שצריך ממנו הוא הטקסט.

   ⚠ **הטקסט נכנס לשדה ונשאר ניתן לעריכה.** מסמך וורד נושא
     כותרות, טבלאות ועיצוב, וחילוץ טקסט שטוח לעולם לא יהיה
     מושלם — הצגתו כ"הסיכום נשמר" הייתה שקר. מה שהוא כן:
     חוסך הקלדה מחדש של אלף מילים.

   ⚠ **ומחזיר null בכישלון**, והמסך אומר "לא הצלחנו לקרוא את
     הקובץ — אפשר להדביק את הטקסט". קובץ שנבלע בשקט נראה כמו
     מסך שבור (עיקרון 6).
   ============================================================ */
async function docxText(file) {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(buf.buffer);
    /* סריקת רשומות ה-ZIP המקומיות — PK\x03\x04 */
    for (let i = 0; i + 30 < buf.length; i++) {
      if (dv.getUint32(i, true) !== 0x04034b50) continue;
      const method = dv.getUint16(i + 8, true);
      const compSize = dv.getUint32(i + 18, true);
      const nameLen = dv.getUint16(i + 26, true);
      const extraLen = dv.getUint16(i + 28, true);
      const nameStart = i + 30;
      const name = new TextDecoder().decode(buf.subarray(nameStart, nameStart + nameLen));
      if (name !== "word/document.xml") continue;
      const dataStart = nameStart + nameLen + extraLen;
      /* ⚠ גודל 0 בכותרת המקומית פירושו שהוא יושב ב-data
         descriptor שאחרי הנתונים; אין לנו דרך לדעת אותו כאן,
         ולכן נכשלים ברעש ולא מנחשים. */
      if (!compSize) return null;
      const raw = buf.subarray(dataStart, dataStart + compSize);
      let xml;
      if (method === 0) {
        xml = new TextDecoder().decode(raw);
      } else if (method === 8 && typeof DecompressionStream === "function") {
        const ds = new DecompressionStream("deflate-raw");
        const stream = new Blob([raw]).stream().pipeThrough(ds);
        xml = new TextDecoder().decode(await new Response(stream).arrayBuffer());
      } else {
        return null;
      }
      /* פסקה → שורה, ואז הסרת התגיות */
      return xml
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:tab[^>]*\/>/g, "\t")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    return null;
  } catch { return null; }
}

/* ============================================================
   מסך המליאות
   ============================================================ */
export function PlenaryPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [n, setN] = useState(0);
  const [open, setOpen] = useState(null);  // מזהה מליאה פתוחה
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getPlenaries()
      .then((r) => { if (alive) { setD(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, [n]);

  const reload = () => setN((x) => x + 1);

  if (err) return (
    <>
      <div className="screen-title">מליאות</div>
      <div className={"alert " + (err.setupRequired ? "a-amber" : "a-clay")}>
        <PI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">{err.setupRequired ? "הלוחות טרם הוקמו" : "לא הצלחנו לטעון"}</div>
          <div className="bd">{err.message}</div>
        </div>
      </div>
    </>
  );
  if (!d) return <><div className="screen-title">מליאות</div>
    <div className="skel skel-card" /><div className="skel skel-card" /></>;

  if (open) return (
    <PlenaryView id={open} canEdit={d.canEdit} roster={d.roster || []}
      statuses={d.statuses} say={say}
      onBack={() => { setOpen(null); reload(); }} />
  );

  if (adding) return (
    <NewPlenary say={say}
      onDone={(id) => { setAdding(false); reload(); setOpen(id); }}
      onCancel={() => setAdding(false)} />
  );

  return (
    <>
      <div className="screen-title">מליאות</div>
      <div className="tm-sub">
        כל אחד מכניס פתק, ואחראי המליאה בונים ממנו את סדר היום.
      </div>

      <div className="band">
        <div className="band-h">המליאות</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{d.counts.total}</div>
            <div className="band-l">בסך הכול</div>
          </div>
          <div className="band-c">
            <div className="band-n ok">{d.counts.open}</div>
            <div className="band-l">תיבות פתוחות</div>
          </div>
          {/* ⚠ **כמה סיכומים חסרים** — המספר שאומר כמה מהתמונה
              אין, ולא רק כמה יש (4יח). */}
          <div className="band-c">
            <div className={"band-n" + (d.counts.noSummary ? " warn" : "")}>{d.counts.noSummary}</div>
            <div className="band-l">בלי סיכום</div>
          </div>
        </div>
      </div>

      {!d.canEdit && d.editHint && <div className="ro-bar">{d.editHint}</div>}

      {d.plenaries.length === 0 ? (
        <div className="empty tone-2">
          <div className="e-ico"><PI.users /></div>
          <div className="e1">עוד לא נפתחה מליאה</div>
          <div className="e2">ועדת קבוצה ותוכן פותחת מליאה, וממנה נפתחת תיבת הפתקים לכולם.</div>
        </div>
      ) : (
        <div className="rows">
          {d.plenaries.map((p) => (
            <button className="st-row" key={p.id} onClick={() => setOpen(p.id)}>
              <div className="tile sm"><PI.users /></div>
              <div className="st-main">
                <div className="st-n">{p.title}</div>
                <div className="st-m">
                  {p.date && <span>{dmy(p.date)}</span>}
                  <span>· {p.status}</span>
                  {p.open && <span className="pl-open">· תיבת פתקים פתוחה</span>}
                  {p.agendaCount > 0 && <span>· {p.agendaCount} בסדר היום</span>}
                  {p.summary && <span>· יש סיכום</span>}
                </div>
              </div>
              <PI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
            </button>
          ))}
        </div>
      )}

      {d.canEdit && (
        <>
          <div className="sticky">
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <PI.plus />מליאה חדשה
            </button>
          </div>
          <div style={{ height: 60 }} />
        </>
      )}
    </>
  );
}

function NewPlenary({ say, onDone, onCancel }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const save = () => {
    if (busy || !title.trim()) return;
    setBusy(true);
    api.addPlenary({ title: title.trim(), date })
      .then((r) => { say("נפתחה, ותיבת הפתקים פתוחה"); onDone(r.id); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <PI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">מליאה חדשה</div>
      <div className="card lift">
        <div className="fld">
          <label>שם המליאה</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} autoFocus
            placeholder="למשל: מליאת אמצע סמסטר" />
        </div>
        <div className="fld">
          <label>תאריך (לא חובה)</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={busy} />
        </div>
        {/* ⚠ נאמר מראש: התיבה נפתחת מיד. פעולה שנייה שאיש לא
            יזכור הייתה משאירה מליאה שאי אפשר להכניס לה פתק. */}
        <div className="bg-fixed" style={{ marginBottom: 10 }}>
          תיבת הפתקים תיפתח מיד, וכל חניך יוכל להכניס אליה פתק.
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }}
          disabled={busy || !title.trim()} onClick={save}>
          {busy ? "פותח…" : "פתיחת המליאה"}
        </button>
      </div>
    </>
  );
}

/* ---------- מליאה אחת ---------- */
function PlenaryView({ id, canEdit, roster, statuses, say, onBack }) {
  const [d, setD] = useState(null);
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("notes");
  const [txt, setTxt] = useState("");
  const [anon, setAnon] = useState(false);
  const [summary, setSummary] = useState("");
  const [fileMsg, setFileMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    api.getPlenary(id).then((r) => {
      if (!alive) return;
      setD(r);
      setSummary(r.plenary.summary || "");
    }).catch(() => {});
    return () => { alive = false; };
  }, [id, n]);

  const reload = () => setN((x) => x + 1);
  if (!d) return <div className="skel skel-card" />;
  const p = d.plenary;

  const addNote = () => {
    if (busy || !txt.trim()) return;
    setBusy(true);
    api.addPlenaryNote({ plenary: id, text: txt.trim(), anon })
      .then(() => { setTxt(""); say("הפתק נכנס"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const patch = (b) => {
    setBusy(true);
    api.editPlenary({ id, ...b })
      .then(() => { say("נשמר"); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const patchNote = (noteId, b) => {
    setBusy(true);
    api.editPlenaryNote({ noteId, ...b })
      .then(reload)
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setFileMsg("קורא…");
    const text = await docxText(f);
    if (!text) {
      /* ⚠ כישלון נאמר ואינו נבלע (עיקרון 6). */
      setFileMsg("לא הצלחנו לקרוא את הקובץ. אפשר להדביק את הטקסט לשדה.");
      return;
    }
    setSummary((s) => (s.trim() ? s + "\n\n" : "") + text);
    setFileMsg(`נקראו ${text.length.toLocaleString("he-IL")} תווים — אפשר לערוך לפני השמירה.`);
  };

  const notes = d.notes || [];
  const inAgenda = notes.filter((x) => x.inAgenda);

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
        <PI.chev style={{ transform: "rotate(180deg)" }} />כל המליאות
      </button>
      <div className="screen-title">{p.title}</div>
      <div className="tm-sub">
        {p.date ? dmy(p.date) : "בלי תאריך"} · {p.status}
        {p.ownerNames && p.ownerNames.length > 0 && <> · אחראים: {p.ownerNames.join(" · ")}</>}
      </div>

      <div className="seg">
        <button className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>פתקים</button>
        <button className={tab === "agenda" ? "on" : ""} onClick={() => setTab("agenda")}>סדר יום</button>
        {/* ⚠ **הפרוטוקול מוצג רק למי שרשאי לערוך.** הוא אינו
            בגוף התשובה של חניך כלל (השרת אינו שולח אותו), ולכן
            לשונית ריקה כאן הייתה נראית כמו תקלה. */}
        {canEdit && (
          <button className={tab === "prot" ? "on" : ""} onClick={() => setTab("prot")}>פרוטוקול</button>
        )}
        <button className={tab === "sum" ? "on" : ""} onClick={() => setTab("sum")}>סיכום</button>
        {canEdit && (
          <button className={tab === "set" ? "on" : ""} onClick={() => setTab("set")}>הגדרות</button>
        )}
      </div>

      {/* ---------- פתקים ---------- */}
      {tab === "notes" && (
        <>
          {p.open ? (
            <div className="card lift pl-box">
              <div className="fld">
                <label>פתק למליאה</label>
                <textarea rows={3} value={txt} disabled={busy}
                  onChange={(e) => setTxt(e.target.value)}
                  placeholder="מה שווה להעלות במליאה" />
              </div>
              <label className="pl-anon">
                <input type="checkbox" checked={anon} disabled={busy}
                  onChange={(e) => setAnon(e.target.checked)} />
                <span>אנונימי</span>
              </label>
              {/* ⚠ המחיר מוצהר במסך (5י). */}
              {anon && (
                <div className="bg-fixed" style={{ marginBottom: 10 }}>
                  פתק אנונימי אינו נושא את שמכם בשום מקום — ולכן גם אי אפשר
                  למחוק אותו או לערוך אותו אחר כך.
                </div>
              )}
              <button className="btn btn-primary" style={{ width: "100%" }}
                disabled={busy || !txt.trim()} onClick={addNote}>
                {busy ? "שולח…" : "הכנסת הפתק"}
              </button>
            </div>
          ) : (
            <div className="note-warn"><PI.warn />תיבת הפתקים סגורה — הוועדה בונה את סדר היום</div>
          )}

          {/* ⚠⚠ הבנק לוועדה בלבד, והשרת אינו שולח אותו לאחרים. */}
          {canEdit && (
            <>
              <div className="sec-label">בנק הפתקים ({notes.length})</div>
              {notes.length === 0 ? (
                <div className="empty"><div className="e1">עוד לא נכנסו פתקים</div></div>
              ) : (
                <div className="rows">
                  {notes.map((x, i) => (
                    <div className={"card pl-note" + (x.inAgenda ? " in" : "")} key={x.id}>
                      <div className="pl-nt">{x.text}</div>
                      <div className="pl-nm">
                        <span>{x.anon ? "אנונימי" : (x.author || "—")}</span>
                        {x.date && <span>· {dmy(x.date)}</span>}
                      </div>
                      <div className="pl-na">
                        <button className={"btn btn-ghost btn-sm" + (x.inAgenda ? " on" : "")}
                          disabled={busy}
                          onClick={() => patchNote(x.id, { inAgenda: !x.inAgenda })}>
                          {x.inAgenda ? "בסדר היום ✓" : "לסדר היום"}
                        </button>
                        <button className="esc-del" title="למעלה" disabled={busy || i === 0}
                          onClick={() => patchNote(x.id, { order: i - 1 })}><PI.up /></button>
                        <button className="esc-del" title="למטה" disabled={busy || i === notes.length - 1}
                          onClick={() => patchNote(x.id, { order: i + 1 })}><PI.down /></button>
                        <button className="esc-del" title="מחיקה" disabled={busy}
                          onClick={() => {
                            setBusy(true);
                            api.deletePlenaryNote(x.id).then(reload)
                              .catch((e) => say(e.message)).finally(() => setBusy(false));
                          }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ---------- סדר יום ---------- */}
      {tab === "agenda" && (
        <>
          {canEdit && inAgenda.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="pl-nm" style={{ marginBottom: 8 }}>
                {inAgenda.length} פתקים מסומנים לסדר היום
              </div>
              {/* ⚠ **בונה טיוטה לשדה ואינו כותב ישירות.** סדר
                  היום הוא טקסט שאדם מנסח, והפתקים הם חומר הגלם
                  — כתיבה אוטומטית שדורסת ניסוח היא בדיוק מה
                  שאי אפשר לתקן. */}
              <button className="btn btn-ghost btn-sm" disabled={busy}
                onClick={() => patch({
                  agenda: inAgenda.map((x, i) => `${i + 1}. ${x.text}`).join("\n"),
                })}>בניית סדר היום מהפתקים</button>
            </div>
          )}
          {canEdit ? (
            <EditBlock label="סדר היום" value={p.agenda || ""} busy={busy}
              onSave={(v) => patch({ agenda: v })} />
          ) : p.agenda ? (
            <div className="card pl-read">{p.agenda}</div>
          ) : (
            <div className="empty"><div className="e1">סדר היום טרם נבנה</div></div>
          )}
        </>
      )}

      {/* ---------- פרוטוקול ---------- */}
      {/* ============================================================
          ⚠⚠ **שלושה שדות ולא אחד**: סדר היום הוא מה שתכננו,
            הפרוטוקול הוא מה שנאמר, והסיכום הוא מה שמספרים
            למכינה. עמודה אחת לשלושתם הייתה מכריחה לבחור בין
            לאבד את הפרוטוקול לבין לפרסם אותו כמות שהוא.

          ⚠ **ולמי שאינו רשאי הלשונית כלל אינה קיימת** — לא
            ריקה ולא נעולה. השרת אינו שולח את השדה (4מא).
          ============================================================ */}
      {tab === "prot" && canEdit && (
        <>
          <div className="tm-sub lct-note">
            רישום פנימי של המליאה — מי אמר מה ומה הוחלט. אינו מוצג לחניכים;
            מה שהם קוראים הוא הסיכום.
          </div>
          <EditBlock label="פרוטוקול המליאה" value={p.protocol || ""} busy={busy}
            rows={16} onSave={(v) => patch({ protocol: v })} />
        </>
      )}

      {/* ---------- סיכום ---------- */}
      {tab === "sum" && (
        canEdit ? (
          <div className="card lift">
            <div className="fld">
              <label>סיכום המליאה</label>
              <textarea rows={12} value={summary} disabled={busy}
                onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div className="fld">
              <label>או להעלות קובץ וורד</label>
              <input type="file" accept=".docx" onChange={onFile} disabled={busy} />
              <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
                {fileMsg || "הטקסט ייכנס לשדה למעלה ויישאר ניתן לעריכה — עיצוב וטבלאות לא ייקלטו."}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}
              onClick={() => patch({ summary })}>
              {busy ? "שומר…" : "שמירת הסיכום"}
            </button>
          </div>
        ) : p.summary ? (
          <div className="card pl-read">
            {p.summary}
            {p.summaryBy && <div className="pl-nm" style={{ marginTop: 8 }}>נכתב על ידי {p.summaryBy}</div>}
          </div>
        ) : (
          <div className="empty"><div className="e1">אין עדיין סיכום</div></div>
        )
      )}

      {/* ---------- הגדרות ---------- */}
      {tab === "set" && canEdit && (
        <div className="card lift">
          <div className="fld">
            <label>סטטוס</label>
            <div className="pick pick-wrap">
              {statuses.map((st) => (
                <button type="button" key={st} className={p.status === st ? "on" : ""}
                  disabled={busy} onClick={() => patch({ status: st })}>{st}</button>
              ))}
            </div>
          </div>
          <div className="fld">
            <label>תיבת הפתקים</label>
            <div className="pick">
              <button type="button" className={p.open ? "on" : ""} disabled={busy}
                onClick={() => patch({ open: true })}>פתוחה</button>
              <button type="button" className={!p.open ? "on" : ""} disabled={busy}
                onClick={() => patch({ open: false })}>סגורה</button>
            </div>
          </div>
          <div className="fld">
            <label>אחראי המליאה (עד שלושה)</label>
            <OwnerPick roster={roster} value={d.owners || []} busy={busy}
              onSave={(ids) => patch({ owners: ids })} />
          </div>
        </div>
      )}
    </>
  );
}

/* ⚠ בחירה מקומית ושמירה מפורשת — לא סימון אופטימי (4י, 5כד). */
function OwnerPick({ roster, value, busy, onSave }) {
  const [draft, setDraft] = useState(value);
  const [q, setQ] = useState("");
  useEffect(() => { setDraft(value); }, [value.join(",")]); // eslint-disable-line
  const list = roster.filter((s) => !q.trim() || s.name.includes(q.trim()));
  const same = draft.join(",") === value.join(",");
  return (
    <>
      <input className="search" value={q} placeholder="חיפוש חניך"
        onChange={(e) => setQ(e.target.value)} />
      <div className="rows scroll-y stl-pick">
        {list.map((s) => {
          const on = draft.includes(s.id);
          return (
            <button className="st-row" key={s.id} disabled={busy || (!on && draft.length >= 3)}
              onClick={() => setDraft((p) => on ? p.filter((x) => x !== s.id) : [...p, s.id])}>
              <div className={"tick" + (on ? " on" : "")} />
              <div className="st-main"><div className="st-n">{s.name}</div></div>
            </button>
          );
        })}
      </div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
        disabled={busy || same} onClick={() => onSave(draft)}>שמירת האחראים</button>
    </>
  );
}

/* ⚠ `rows` הוא prop ולא קבוע: פרוטוקול ארוך מסדר יום, ותיבה
   של עשר שורות מכריחה לגלול בתוך תיבה בתוך דף. */
function EditBlock({ label, value, busy, onSave, rows = 10 }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return (
    <div className="card lift">
      <div className="fld">
        <label>{label}</label>
        <textarea rows={rows} value={v} disabled={busy} onChange={(e) => setV(e.target.value)} />
      </div>
      <button className="btn btn-primary" style={{ width: "100%" }}
        disabled={busy || v === value} onClick={() => onSave(v)}>שמירה</button>
    </div>
  );
}

/* ============================================================
   מאגר מרצים
   ============================================================ */

/* ⚠ **שם אחד, במקום אחד.** הכותרת חוזרת בארבעה מקומות במסך
   הזה ועוד בניווט; שני נוסחים שנפרדים זה מזה הם בדיוק איך
   שמסך מקבל שני שמות ומשתמש חושב שאלה שני מסכים (5ט). */
export const LECT_TITLE = "מרצה שכדאי להביא";
/* ⚠⚠ **שני מסכים באותו רכיב, ובכוונה.**
   לוועדה זה **מאגר** — רשימה מלאה, סטטוסים, פרטי קשר והערות
   פנימיות. לחניך זה **טופס הצעה** ורשימת ההצעות שלו בלבד: את
   המאגר עצמו הוא אינו רואה (השרת אינו שולח אותו), כי הוא נושא
   טלפונים של אנשים מחוץ למכינה ושיקולים פנימיים של הוועדה.

   ⚠ **הכותרת אינה "מאגר מרצים" לחניך.** מסך ששמו "מאגר" ומציג
     שתי שורות נראה כמו מאגר שבור. השם אומר מה עושים כאן.
   ⚠ **ו-`canBrowse` מגיע מהשרת** ואינו נגזר מאורך הרשימה (4יד). */
export function LecturersPage({ say }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [n, setN] = useState(0);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("open");

  useEffect(() => {
    let alive = true;
    api.getLecturers()
      .then((r) => { if (alive) { setD(r); setErr(null); } })
      .catch((e) => { if (alive) setErr(e); });
    return () => { alive = false; };
  }, [n]);
  const reload = () => setN((x) => x + 1);

  if (err) return (
    <>
      <div className="screen-title">{LECT_TITLE}</div>
      <div className={"alert " + (err.setupRequired ? "a-amber" : "a-clay")}>
        <PI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">{err.setupRequired ? "הלוח טרם הוקם" : "לא הצלחנו לטעון"}</div>
          <div className="bd">{err.message}</div>
        </div>
      </div>
    </>
  );
  if (!d) return <><div className="screen-title">{LECT_TITLE}</div>
    <div className="skel skel-card" /></>;

  if (form) return (
    <LectForm initial={form.id ? form : null} say={say}
      onDone={() => { setForm(null); reload(); }} onCancel={() => setForm(null)} />
  );

  const browse = d.canBrowse !== false;
  const list = browse
    ? d.lecturers.filter((x) =>
      filter === "mine" ? x.mine : filter === "all" ? true : isOpenLect(x.status))
    : d.lecturers;

  return (
    <>
      <div className="screen-title">{browse ? "מאגר מרצים" : LECT_TITLE}</div>
      <div className="tm-sub">
        {browse ? (
          <>מרצה ששווה להביא — כל אחד מציע, וועדת קבוצה ותוכן מטפלת.
            {/* ⚠ נאמר במפורש: הרשימה עוברת בין מחזורים. */}
            {" "}המאגר נשאר גם למחזור הבא.</>
        ) : (
          <>שמעתם מרצה שכדאי שיגיע למכינה? הציעו אותו כאן.
            {" "}ועדת קבוצה ותוכן עוברת על ההצעות ומחליטה את מי להביא.</>
        )}
      </div>

      {/* ⚠ **המחיר מוצהר במסך** ולא רק נאכף בשרת: חניך שיראה
          רשימה קצרה יניח שהמאגר ריק, וזה עיקרון 6 בכיוון
          ההפוך — מסך שנראה כמו נתון והוא סינון. */}
      {!browse && (
        <div className="tm-sub lct-note">
          המאגר המלא נמצא אצל הוועדה, ומופיעות כאן ההצעות שלכם בלבד.
        </div>
      )}

      {browse && (
        <div className="seg">
          <button className={filter === "open" ? "on" : ""} onClick={() => setFilter("open")}>
            פתוחים{d.counts.open ? ` (${d.counts.open})` : ""}
          </button>
          <button className={filter === "mine" ? "on" : ""} onClick={() => setFilter("mine")}>שלי</button>
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>הכול</button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty tone-3">
          <div className="e-ico"><PI.note /></div>
          <div className="e1">{browse && filter !== "mine" ? "המאגר ריק" : "עוד לא הצעתם"}</div>
          <div className="e2">שמעתם מרצה טוב? זה המקום.</div>
        </div>
      ) : (
        <div className="rows">
          {list.map((x) => (
            <LectCard key={x.id} x={x} statuses={d.statuses} canManage={d.canManage}
              say={say} onEdit={() => setForm(x)} onSaved={reload} />
          ))}
        </div>
      )}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({})}>
          <PI.plus />הצעת מרצה
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

function LectCard({ x, statuses, canManage, say, onEdit, onSaved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(x.notes || "");

  const patch = (b) => {
    setBusy(true);
    api.editLecturer({ id: x.id, ...b })
      .then(() => { say("נשמר"); onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="card gb-item">
      <button className="gb-hd" onClick={() => setOpen(!open)}>
        <div className="tile sm"><PI.note /></div>
        <div className="st-main">
          <div className="st-n">{x.name}</div>
          <div className="st-m">
            <span>{x.status}</span>
            {x.topic && <span>· {x.topic}</span>}
            {x.by && <span>· הציע {x.by}</span>}
          </div>
        </div>
        <PI.chev style={{ transform: open ? "rotate(-90deg)" : "none", color: "var(--line2)" }} />
      </button>
      {open && (
        <div className="gb-bd">
          {x.about && <div className="gb-det">{x.about}</div>}
          {(x.phone || x.email || x.link) && (
            <div className="pl-nm" style={{ marginBottom: 10 }}>
              {x.phone && <span dir="ltr">{x.phone}</span>}
              {x.email && <span> · {x.email}</span>}
              {x.link && <span> · <a href={x.link} target="_blank" rel="noreferrer">קישור ↗</a></span>}
            </div>
          )}
          {x.canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>עריכה</button>
          )}
          {x.canDelete && (
            <button className="btn btn-ghost btn-sm" style={{ marginInlineStart: 8 }}
              disabled={busy}
              onClick={() => {
                setBusy(true);
                api.deleteLecturer(x.id).then(() => { say("נמחק"); onSaved(); })
                  .catch((e) => say(e.message)).finally(() => setBusy(false));
              }}>מחיקה</button>
          )}
          {canManage && (
            <div className="gb-adm">
              <div className="fld">
                <label>סטטוס</label>
                <div className="pick pick-wrap">
                  {statuses.map((st) => (
                    <button type="button" key={st} className={x.status === st ? "on" : ""}
                      disabled={busy} onClick={() => patch({ status: st })}>{st}</button>
                  ))}
                </div>
              </div>
              <div className="fld">
                <label>הערות הוועדה</label>
                <textarea rows={2} value={notes} disabled={busy}
                  onChange={(e) => setNotes(e.target.value)} />
              </div>
              <button className="btn btn-ghost btn-sm" disabled={busy}
                onClick={() => patch({ notes })}>שמירת ההערות</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LectForm({ initial, say, onDone, onCancel }) {
  const [f, setF] = useState({
    name: initial ? initial.name : "",
    topic: initial ? initial.topic || "" : "",
    about: initial ? initial.about || "" : "",
    phone: initial ? initial.phone || "" : "",
    email: initial ? initial.email || "" : "",
    link: initial ? initial.link || "" : "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () => {
    if (busy || !f.name.trim()) return;
    setBusy(true);
    const p = initial ? api.editLecturer({ id: initial.id, ...f }) : api.addLecturer(f);
    p.then(() => { say(initial ? "עודכן" : "תודה — ההצעה נוספה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <PI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת ההצעה" : "הצעת מרצה"}</div>
      <div className="card lift">
        <div className="fld"><label>שם</label>
          <input value={f.name} onChange={set("name")} disabled={busy} autoFocus /></div>
        <div className="fld"><label>נושא</label>
          <input value={f.topic} onChange={set("topic")} disabled={busy}
            placeholder="על מה הוא מדבר" /></div>
        <div className="fld"><label>למה שווה להביא אותו</label>
          <textarea rows={3} value={f.about} onChange={set("about")} disabled={busy} /></div>
        <div className="two">
          <div className="fld"><label>טלפון</label>
            <input value={f.phone} onChange={set("phone")} disabled={busy}
              inputMode="tel" dir="ltr" /></div>
          <div className="fld"><label>אימייל</label>
            <input value={f.email} onChange={set("email")} disabled={busy} dir="ltr" /></div>
        </div>
        <div className="fld"><label>קישור</label>
          <input value={f.link} onChange={set("link")} disabled={busy} dir="ltr" /></div>
        <button className="btn btn-primary" style={{ width: "100%" }}
          disabled={busy || !f.name.trim()} onClick={save}>
          {busy ? "שומר…" : initial ? "שמירה" : "הוספה למאגר"}
        </button>
      </div>
    </>
  );
}

export const PLENARY_CSS = `
.pl-open{color:var(--t1);font-weight:900}
.pl-box{margin-bottom:14px}
.pl-anon{display:flex;align-items:center;gap:7px;margin-bottom:10px;
  font-size:12.5px;font-weight:800;color:var(--muted)}
/* ⚠ lct-note ולא pl-note — האחרון הוא כרטיס הפתק במליאה,
   ושימוש חוזר בשם היה נותן לשורת הסבר ריפוד ומסגרת של
   כרטיס. אותה מלכודת של bg- במסך הבאגים.
   ⚠⚠ ואין בקטיקים בהערה הזו: הבלוק כולו הוא מחרוזת תבנית,
   ובקטיק בתוכו סוגר אותה. קרה כאן, וזו הפעם הרביעית במאגר. */
.lct-note{color:var(--clay);margin-top:-4px}
.pl-note{padding:11px 13px;margin-bottom:7px}
.pl-note.in{border-color:var(--t1)}
.pl-nt{font-size:13px;font-weight:700;color:var(--ink);line-height:1.55;white-space:pre-wrap}
.pl-nm{display:flex;flex-wrap:wrap;gap:4px;font-size:11px;font-weight:700;
  color:var(--faint);margin-top:4px}
.pl-na{display:flex;align-items:center;gap:5px;margin-top:8px}
.pl-read{font-size:13px;font-weight:600;color:var(--ink);line-height:1.7;white-space:pre-wrap}
`;
