/* ============================================================
   מיונים לצבא
   ------------------------------------------------------------
   שני מסכים באותו רכיב, ולפי מה שהשרת מרשה:

     החניך      — המיונים שלו, ומוסיף ועורך אותם.
     צוות / יו״ר — הכול, וקריאה בלבד.

   ⚠⚠ **הכתיבה היא של החניך, וזו לא מגבלה טכנית.** `army`
     ו-`tryouts` תמיד מולאו על ידו על עצמו; עריכה מבחוץ הופכת
     את הנתון מ"מה שהחניך מספר" ל"מה שהצוות רשם עליו". השרת
     חוסם, והמסך אינו מציע.

   ⚠ **מי רואה את הכול נקבע בשרת** (`canSeeAll`) ולא נגזר כאן
     מתפקיד. תיבה בלוח היא שקובעת מי ועדת הגיוסים, ומסך
     שינחש היה מציע כפתור שמקבל 403 (4יד).
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const dmy = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y.slice(2)}`;
};

/* ⚠ הגוון לפי משמעות המצב, לא לפי מיקומו ברשימה. ומצב שאינו
   מוכר מקבל ברירת מחדל ואינו נעלם (4יא). */
const TONE = {
  "עבר": "p-ok",
  "לא עבר": "p-low",
  "ממתין לתשובה": "p-new",
  "מתוכנן": "p-cool",
  "לא הגיע": "p-low",
  "בוטל": "p-idle",
};
const toneOf = (st) => TONE[st] || "p-idle";

const EMPTY = { name: "", date: "", status: "מתוכנן", track: "", note: "" };

export default function Tryouts({ say }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    api.getTryouts()
      .then((r) => { setData(r); setErr(""); })
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ⚠ עיקרון 6: כשל טעינה נראה אחרת מ"אין מיונים", ולוח שלא
     הוקם נראה אחרת משניהם. */
  if (err) {
    return (
      <>
        <div className="screen-title">מיונים לצבא</div>
        {/^לוח המיונים טרם הוקם/.test(err) ? (
          <div className="empty">
            <div className="e1">לוח המיונים טרם הוקם</div>
            <div className="e2">מריצים <code>npm run seed:tryouts</code> פעם אחת.</div>
          </div>
        ) : <div className="login-err">{err}</div>}
      </>
    );
  }
  if (!data) {
    return <><div className="screen-title">מיונים לצבא</div>
      <div className="skel" style={{ height: 200 }} /></>;
  }

  return data.canSeeAll
    ? <AllTryouts data={data} />
    : <MyTryouts data={data} say={say} reload={load} />;
}

/* ============================================================
   המסך של החניך
   ============================================================ */
function MyTryouts({ data, say, reload }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(null);

  const save = () => {
    if (busy || !form.name.trim()) return;
    setBusy(true);
    const body = {
      name: form.name.trim(), date: form.date, status: form.status,
      track: form.track.trim(), note: form.note.trim(),
    };
    (form.id ? api.editTryout({ ...body, id: form.id }) : api.addTryout(body))
      .then(() => { say(form.id ? "המיון עודכן" : "המיון נוסף"); setForm(null); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = (id) => {
    setBusy(true);
    api.deleteTryout(id)
      .then(() => { say("נמחק"); setAsking(null); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  if (form) {
    return (
      <>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}
          disabled={busy} onClick={() => setForm(null)}>ביטול</button>
        <div className="screen-title">{form.id ? "עריכת מיון" : "מיון חדש"}</div>
        <div className="card lift">
          <div className="fld">
            <label>מה המיון</label>
            <input value={form.name} disabled={busy} autoFocus
              placeholder="למשל: גיבוש שייטת · יום מא״ה"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="two">
            <div className="fld">
              <label>תאריך</label>
              <input type="date" dir="ltr" value={form.date} disabled={busy}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="fld">
              <label>מצב</label>
              <select value={form.status} disabled={busy}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {data.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="fld">
            <label>מסלול (לא חובה)</label>
            <input value={form.track} disabled={busy}
              placeholder="לאיזה מסלול או יחידה"
              onChange={(e) => setForm({ ...form, track: e.target.value })} />
          </div>
          <div className="fld">
            <label>הערות</label>
            <textarea rows={3} value={form.note} disabled={busy}
              placeholder="מה היה, מה השלב הבא"
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="btn btn-primary" disabled={busy || !form.name.trim()} onClick={save}>
            {busy ? "שומר…" : "שמירה"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="screen-title">המיונים שלי</div>
      <div className="ty-note">
        מה שנרשם כאן הוא <b>מה שאתם ממלאים על עצמכם</b>. הצוות ויו״ר ועדת
        ההכנה לצה״ל רואים את הרשימה כדי ללוות אתכם, ואינם עורכים אותה.
      </div>

      {data.tryouts.length === 0 ? (
        <div className="empty">
          <div className="e1">עוד לא רשמתם מיונים</div>
          <div className="e2">כל מיון בשורה משלו — כך אפשר לעקוב אחרי כולם.</div>
        </div>
      ) : data.tryouts.map((t) => (
        <div className="ty-card card" key={t.id}>
          <div className="ty-top">
            <b>{t.name}</b>
            {t.status && <span className={"pill " + toneOf(t.status)}>{t.status}</span>}
          </div>
          <div className="ty-meta">
            {t.date && <span>{dmy(t.date)}</span>}
            {t.track && <span>· {t.track}</span>}
          </div>
          {t.note && <div className="ty-note-b">{t.note}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy}
              onClick={() => setForm({ ...t, date: t.date || "", track: t.track || "",
                                       note: t.note || "", status: t.status || "מתוכנן" })}>
              עריכה
            </button>
            <button className="btn btn-ghost btn-sm ev-del" disabled={busy}
              onClick={() => setAsking(t.id)}>מחיקה</button>
          </div>
          {/* ⚠ אישור בתוך המסך ולא confirm() של הדפדפן (4ק). */}
          {asking === t.id && (
            <div className="alert a-clay" style={{ marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <div className="ttl">למחוק את "{t.name}"?</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="btn btn-clay btn-sm" style={{ flex: 1 }} disabled={busy}
                    onClick={() => remove(t.id)}>כן, למחוק</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={busy}
                    onClick={() => setAsking(null)}>ביטול</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="sticky">
        <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY })}>
          הוספת מיון
        </button>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}

/* ============================================================
   המסך של יו״ר הוועדה והצוות
   ------------------------------------------------------------
   ⚠ **קריאה בלבד, ובמפורש.** הבקשה הייתה "שיוכלו לקחת את
     המידע ולעשות איתו דברים" — לא לערוך אותו.
   ============================================================ */
function AllTryouts({ data }) {
  const [tab, setTab] = useState("students");
  const s = data.summary;

  return (
    <>
      <div className="screen-title">מיונים לצבא</div>
      <div className="ty-note">
        {data.seeAllWhy === "צוות" ? "הרשימה גלויה לצוות" : `הרשימה גלויה לך כ${data.seeAllWhy}`}.
        המיונים ממולאים על ידי החניכים, והמסך הזה קורא אותם ואינו עורך.
      </div>

      <div className="band">
        <div><b className="num">{s.total}</b><span>מיונים</span></div>
        <div><b className="num">{s.students}</b><span>חניכים ניגשו</span></div>
        {/* ⚠ **"טרם ניגש" מוצג במפורש.** המספר שאומר כמה מהתמונה
            חסר שייך למסך, לא ללוג (4יח). */}
        <div><b className="num">{s.none}</b><span>טרם ניגשו</span></div>
      </div>

      <div className="ty-status">
        {data.statuses.map((st) => (
          <span key={st} className={"pill " + toneOf(st)}>{st} {s.byStatus[st] || 0}</span>
        ))}
      </div>

      <div className="seg">
        <button className={tab === "students" ? "on" : ""}
          onClick={() => setTab("students")}>לפי חניך</button>
        <button className={tab === "all" ? "on" : ""}
          onClick={() => setTab("all")}>כל המיונים</button>
      </div>

      {tab === "students" ? (
        <div className="rows">
          {data.perStudent.map((p) => (
            <div className="ty-row" key={p.id}>
              <div className="ty-row-n">{p.name}</div>
              <div className="ty-row-f">
                {p.count === 0
                  ? <span className="pill p-idle">טרם ניגש</span>
                  : <>
                      <span className="pill p-cool">{p.count} מיונים</span>
                      {p.passed > 0 && <span className="pill p-ok">{p.passed} עבר</span>}
                      {p.waiting > 0 && <span className="pill p-new">{p.waiting} ממתין</span>}
                    </>}
              </div>
              {p.last && (
                <div className="ty-row-l">אחרון: {p.last.name}{p.last.date ? ` · ${dmy(p.last.date)}` : ""}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rows">
          {data.tryouts.length === 0
            ? <div className="empty"><div className="e1">אין עדיין מיונים</div></div>
            : data.tryouts.map((t) => (
              <div className="ty-row" key={t.id}>
                <div className="ty-row-n">
                  {t.name}
                  {t.status && <span className={"pill " + toneOf(t.status)}>{t.status}</span>}
                </div>
                <div className="ty-row-l">
                  {t.studentName}{t.date ? ` · ${dmy(t.date)}` : ""}{t.track ? ` · ${t.track}` : ""}
                </div>
                {t.note && <div className="ty-note-b">{t.note}</div>}
              </div>
            ))}
        </div>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}
