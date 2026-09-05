/* ============================================================
   דוח תשלום למרצים
   ------------------------------------------------------------
   בנוי כמו תקציב המטבח בכוונה: אותה רצועת סיכום, אותה רשימת
   חודשים, ואותו דפוס של "מספר גדול ולידו כמה ממנו עוד לא ידוע".

   ⚠⚠ **המספר החשוב כאן אינו הסכום אלא מה שחסר.** מפגש שטרם
     דווח אינו כסף שמגיע ואינו כסף שלא מגיע — הוא לא ידוע (4ח),
     וגיליון בלי מחיר אינו חינם. סכום שנראה סופי בזמן ששליש
     מהחודש טרם דווח הוא בדיוק המספר שמחליטים לפיו לא נכון,
     ולכן שתי השורות האלה יושבות **מתחת לסכום** ולא בהערת שוליים.

   ⚠ **צוות בלבד.** עלויות אינן נתון של חניך (עיקרון 4).
   ============================================================ */
import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import ScrollTabs from "./Tabs.jsx";
import { useExcel, downloadTable } from "./excel.js";
import { monthLabel } from "../shared/budget-boards.js";

const shekel = (n) => Math.round(n || 0).toLocaleString("he-IL");

/**
 * ⚠ `bare` — בלי כותרת משלו. הדוח מוצג גם כדף עצמאי (ואז
 *   `LessonsPage` כבר כתב את הכותרת) וגם בתוך רצועת הלשוניות.
 *   שתי כותרות זו אחר זו נראות כמו באג.
 */
export default function LessonPay({ say, bare = false }) {
  useExcel();
  const [month, setMonth] = useState(null);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api.getLessonPay(month)
      .then((r) => { setData(r); setErr(""); })
      .catch((e) => setErr(e.message));
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const Title = () => (bare ? null : <div className="screen-title">תשלום למרצים</div>);

  if (err) return <><Title /><div className="login-err">{err}</div></>;
  if (!data) return <><Title /><div className="skel" style={{ height: 220 }} /></>;

  return (
    <>
      <Title />

      {/* ============================================================
          ⚠ **רצועה נגללת, ולא `.seg` רגילה.**

          `.seg` היא `display:flex` עם `flex:1` על כל כפתור —
          ועם שנים־עשר חודשים כל כפתור נדחס עד ש"ספטמבר 2026"
          גולש החוצה, והמסך זז הצידה. `ScrollTabs` נותן רוחב
          טבעי לכל לשונית, גלילה אופקית, וחצים שמופיעים רק
          כשיש מה לגלול (4ר).
          ============================================================ */}
      <ScrollTabs className="seg seg-scroll">
        <button className={!month ? "on" : ""} onClick={() => setMonth(null)}>כל השנה</button>
        {(data.months || []).map((m) => (
          <button key={m} className={month === m ? "on" : ""}
            onClick={() => setMonth(m)}>{monthLabel(m)}</button>
        ))}
      </ScrollTabs>

      {month
        ? <MonthView data={data} say={say} onSaved={load} />
        : <YearView data={data} onPick={setMonth} say={say} onSaved={load} />}

      {/* ⚠ יושב אחרי הדוח ולא לפניו: הוספה היא פעולה נדירה,
          והקריאה היא מה שבאים בשבילו. */}
      <OneOff data={data} say={say} onSaved={load} />
      <Excluded data={data} say={say} onSaved={load} />
      <div style={{ height: 50 }} />
    </>
  );
}

/* ============================================================
   ⚠ הרצועה מציגה שלושה מספרים, ושניים מהם הם "מה חסר".
   ============================================================ */
/* ============================================================
   ייצוא — חודשי ושנתי
   ------------------------------------------------------------
   ⚠⚠ **הכותרת נושאת את ההסתייגות, ולא רק המסך.** קובץ שיוצא
     מכאן ייפתח בגיליון, ייערך, ויישלח להנהלת חשבונות — הרחק
     מהמסך שאמר "הסכום אינו סופי". שתי השורות האלה הן בדיוק
     מה שהופך את המספר למשהו שאפשר להחליט לפיו (4יח), ולכן הן
     נוסעות איתו.

   ⚠ **"טרם דווחו" ו"בלי מחיר" הן עמודות ולא הערה** — מי שממיין
     בגיליון צריך לראות מיד אילו שורות אינן שלמות.

   ⚠ סכום שאי אפשר לחשב יוצא כ"—" ולא כ-0. אפס הוא מתנדב.
   ============================================================ */
function exportRows(rows, { file, title }) {
  downloadTable({
    file, sheet: "תשלום למרצים", title,
    header: ["שיעור", "מרצה", "מפגשים שהתקיימו", "מחיר למפגש", "סכום",
             "מפגשים שטרם דווחו", "הערת תשלום"],
    widths: [26, 18, 16, 13, 12, 17, 26],
    rows: rows.map((r) => [
      r.subject, r.lecturer || "", r.held,
      r.price == null ? "—" : r.price,
      r.amount == null ? "—" : r.amount,
      r.pending || 0, r.payNote || "",
    ]),
  });
}

/** כותרת שנושאת את מה שחסר — ראו ההערה מעל. */
const exportTitle = (label, d) => {
  const gaps = [];
  if (d.unreported) gaps.push(`${d.unreported} מפגשים טרם דווחו`);
  if (d.unpriced) gaps.push(`${d.unpriced} שיעורים בלי מחיר`);
  return `דוח תשלום למרצים · ${label} · סך הכול ${shekel(d.total)} ₪`
    + (gaps.length ? ` · הסכום אינו סופי: ${gaps.join(", ")}` : "");
};

function Band({ total, unreported, unpriced, label }) {
  return (
    <>
      <div className="band">
        <div><b className="num">{shekel(total)} ₪</b><span>{label}</span></div>
        <div className={"band-n" + (unreported ? " warn" : "")}>
          <b className="num">{unreported}</b><span>מפגשים טרם דווחו</span>
        </div>
        <div className={"band-n" + (unpriced ? " warn" : "")}>
          <b className="num">{unpriced}</b><span>שיעורים בלי מחיר</span>
        </div>
      </div>
      {/* ⚠ במילים ולא רק בצבע — מי שאינו מבחין בגוונים, ומי
          שמדפיס בשחור-לבן, צריך לדעת שהמספר אינו סופי (4ו). */}
      {(unreported > 0 || unpriced > 0) && (
        <div className="pay-warn">
          הסכום אינו סופי:
          {unreported > 0 && ` ${unreported} מפגשים עדיין לא סומנו כהתקיימו או לא.`}
          {unpriced > 0 && ` ל-${unpriced} שיעורים לא הוזן מחיר למפגש.`}
        </div>
      )}
    </>
  );
}

function YearView({ data, onPick, say, onSaved }) {
  const y = data.year;
  return (
    <>
      <Band total={y.total} unreported={y.unreported} unpriced={y.unpriced}
        label="סך הכול השנה" />

      {/* ⚠ הייצוא יושב מתחת לרצועה ולא בראש המסך — הוא נגזרת
          של מה שרואים, ולא הפעולה הראשית. */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}
        onClick={() => exportRows(data.rows || [], {
          file: "תשלום-למרצים-שנתי",
          title: exportTitle("כל השנה", data.year),
        })}>
        ייצוא הדוח השנתי
      </button>

      <div className="grp-h"><span>לפי חודש</span></div>
      <div className="rows">
        {(data.perMonth || []).length === 0 ? (
          <div className="empty"><div className="e1">אין עדיין מפגשים שדווחו</div></div>
        ) : data.perMonth.map((m) => (
          <button className="pay-m" key={m.month} onClick={() => onPick(m.month)}>
            <div className="pay-m-n">{monthLabel(m.month)}</div>
            <div className="pay-m-f">
              {m.unreported > 0 && <span className="pill p-new">{m.unreported} טרם דווחו</span>}
              {m.unpriced > 0 && <span className="pill p-low">{m.unpriced} בלי מחיר</span>}
            </div>
            <b className="num">{shekel(m.total)} ₪</b>
          </button>
        ))}
      </div>

      <div className="grp-h"><span>מחיר למפגש</span></div>
      <PriceList rows={data.rows} canEdit={data.canEdit} say={say} onSaved={onSaved}
        canExclude={data.canExclude} excludeReady={data.excludeReady} />
    </>
  );
}

function MonthView({ data, say, onSaved }) {
  return (
    <>
      <Band total={data.total} unreported={data.unreported} unpriced={data.unpriced}
        label={monthLabel(data.month)} />

      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}
        disabled={!data.rows.length}
        onClick={() => exportRows(data.rows, {
          file: "תשלום-למרצים-" + data.month,
          title: exportTitle(monthLabel(data.month), data),
        })}>
        ייצוא החודש הזה
      </button>

      {data.rows.length === 0 ? (
        <div className="empty">
          <div className="e1">אין מפגשים בחודש הזה</div>
          <div className="e2">או שעדיין לא דווח עליהם.</div>
        </div>
      ) : (
        <div className="rows">
          {data.rows.map((r) => (
            <div className="pay-r" key={r.sheetId}>
              <div className="pay-r-t">
                <b>{r.subject}</b>
                {/* ⚠ סכום שאי אפשר לחשב מוצג כ"—" ולא כ-0.
                    אפס פירושו מתנדב, וזה משהו אחר לגמרי. */}
                <span className="num">{r.amount == null ? "—" : `${shekel(r.amount)} ₪`}</span>
              </div>
              <div className="pay-r-m">
                {r.lecturer && <span>{r.lecturer}</span>}
                <span>{r.held} מפגשים</span>
                {r.price != null
                  ? <span>× {r.price} ₪</span>
                  : <span className="pay-miss">לא הוזן מחיר</span>}
                {r.pending > 0 && <span className="pay-pend">{r.pending} טרם דווחו</span>}
              </div>
              {r.payNote && <div className="pay-r-note">{r.payNote}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="grp-h"><span>מחיר למפגש</span></div>
      <PriceList rows={data.rows} canEdit={data.canEdit} say={say} onSaved={onSaved}
        canExclude={data.canExclude} excludeReady={data.excludeReady} />
    </>
  );
}

/* ============================================================
   ⚠ העריכה יושבת **באותו מסך שבו רואים את החוסר**, ולא
     בהגדרות. מי שרואה "3 שיעורים בלי מחיר" ורוצה להשלים אותם
     לא צריך לעבור מסך, למצוא אותם שוב ולזכור מה חסר — זו
     בדיוק הטעות של מסך ההצפות (4ס).
   ============================================================ */
function PriceList({ rows, canEdit, say, onSaved, canExclude, excludeReady }) {
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(null);
  const [asking, setAsking] = useState(null);

  const exclude = (r) => {
    setBusy(r.sheetId);
    api.setLessonNoPay({ id: r.sheetId, noPay: true })
      .then(() => { say(`"${r.subject}" הוצא מהדוח`); setAsking(null); onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  const commit = (r) => {
    const v = draft[r.sheetId];
    if (v === undefined) return;
    const clean = String(v).trim();
    if (clean === String(r.price ?? "")) return;
    if (clean && !(Number(clean) >= 0)) { say("מחיר לא תקין"); return; }
    setBusy(r.sheetId);
    api.setLessonPrice({ id: r.sheetId, price: clean })
      .then(() => { say("נשמר"); onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  if (!rows || !rows.length) return null;

  return (
    <div className="rows">
      {rows.map((r) => (
        /* ⚠ העוטף נושא את הפס המפריד ואת אישור ההוצאה שנפתח
           מתחת לשורה. ראו ההערה ב-styles.js ליד .pay-pw. */
        <div className="pay-pw" key={r.sheetId}>
          <div className="pay-p">
            {/* ⚠ label ולא span, ו-htmlFor מפורש: הכפתור יושב
                עכשיו באותה שורה, ו-label שעוטף את שניהם היה
                מעביר כל לחיצה על הכפתור גם לשדה המחיר. */}
            <label className="pay-p-n" htmlFor={"pay-p-" + r.sheetId}>{r.subject}</label>
            {canEdit ? (
              <input id={"pay-p-" + r.sheetId}
                value={draft[r.sheetId] !== undefined ? draft[r.sheetId] : String(r.price ?? "")}
                /* ⚠ decimal ולא numeric — זה כסף. */
                inputMode="decimal" placeholder="ריק = לא סוכם" disabled={busy === r.sheetId}
                onChange={(e) => setDraft((d) => ({ ...d, [r.sheetId]: e.target.value }))}
                onBlur={() => commit(r)}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
            ) : (
              <span className="num">{r.price == null ? "—" : `${r.price} ₪`}</span>
            )}
            {/* ============================================================
                ⚠⚠ **הוצאה מהדוח — הצוות, ולא אחראי הלו״ז.**
                המחיר פתוח לאחראי הלו״ז כי הוא זה שמסכם עם המרצים;
                הוצאת שיעור מהדוח היא החלטה תקציבית ונשארת אצל
                הצוות. **canExclude מגיע מהשרת** ואינו נגזר כאן
                מתפקיד — כפתור שיציע פעולה ויקבל 403 אחרי הלחיצה
                הוא בדיוק מה שאין לעשות (4יד).
                ============================================================ */}
            {canExclude && excludeReady && (
              <button type="button" className="btn btn-ghost btn-sm ev-del"
                disabled={busy === r.sheetId} onClick={() => setAsking(r.sheetId)}>
                הוצאה
              </button>
            )}
          </div>

          {/* ⚠ אישור בתוך המסך ולא confirm() של הדפדפן (4ק).
              ⚠ והוא אומר **מה בדיוק ייצא מהסכום** — "בטוח?" על
              פעולה שמשנה מספר כסף אינו שאלה שאפשר לענות עליה. */}
          {asking === r.sheetId && (
            <div className="alert a-clay" style={{ marginTop: 6 }}>
              <div style={{ flex: 1 }}>
                <div className="ttl">להוציא את "{r.subject}" מדוח התשלום?</div>
                <div className="e2">
                  {r.held} מפגשים
                  {r.amount ? ` · ${shekel(r.amount)} ₪` : ""} יירדו מהסכום.
                  השיעור עצמו נשאר פעיל בכל שאר המערכת, ואפשר להחזיר אותו
                  לדוח בכל רגע מהרשימה שבתחתית המסך.
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="btn btn-clay btn-sm" style={{ flex: 1 }}
                    disabled={busy === r.sheetId} onClick={() => exclude(r)}>
                    כן, להוציא
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                    disabled={busy === r.sheetId} onClick={() => setAsking(null)}>ביטול</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   מה שהוצא מהדוח
   ------------------------------------------------------------
   ⚠⚠ **הוצאה שאי אפשר לראות היא הוצאה שאיש לא יזכור.** בעוד
     חודשיים מרצה שכן צריך תשלום פשוט לא יהיה בדוח, ולא יהיה
     שום סימן לכך. הרשימה יושבת בתחתית המסך, לצד כל שורה כמה
     מפגשים התקיימו בה, ועם כפתור החזרה.

   ⚠ **ריקה = אינה מוצגת כלל.** כותרת מעל ריק נראית כמו תקלה
     (4מא). מי שלא הוציא כלום לא צריך לדעת שאפשר.
   ============================================================ */
function Excluded({ data, say, onSaved }) {
  const [busy, setBusy] = useState(null);
  const list = data.excluded || [];
  if (!list.length) return null;

  const restore = (r) => {
    setBusy(r.sheetId);
    api.setLessonNoPay({ id: r.sheetId, noPay: false })
      .then(() => { say(`"${r.subject}" חזר לדוח`); onSaved(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(null));
  };

  return (
    <>
      <div className="grp-h"><span>הוצאו מהדוח · {list.length}</span></div>
      <div className="pay-warn">
        השיעורים האלה אינם נספרים בסכום. הם פעילים בכל שאר המערכת,
        ומפגשיהם ממשיכים להופיע בלוח השיעורים.
      </div>
      <div className="rows">
        {list.map((r) => (
          <div className="pay-r" key={r.sheetId}>
            <div className="pay-r-t">
              <b>{r.subject}</b>
              {data.canExclude && (
                <button className="btn btn-ghost btn-sm" disabled={busy === r.sheetId}
                  onClick={() => restore(r)}>החזרה לדוח</button>
              )}
            </div>
            <div className="pay-r-m">
              {r.lecturer && <span>{r.lecturer}</span>}
              <span>{r.held} מפגשים התקיימו</span>
              {r.price != null && <span>× {r.price} ₪</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   שיעור מזדמן
   ------------------------------------------------------------
   ⚠⚠ **נרשם אחרי שהתקיים, ולכן המחיר חובה.** בגיליון קבוע
     "ריק" פירושו "טרם סוכם" — מצב לגיטימי שנמשך חודשים. כאן
     מי שרושם כבר יודע כמה זה עלה, וריק הוא שכחה.

   ⚠ **נוצרים גיליון ומפגש אמיתיים**, ולא שורה שחיה רק בדוח:
     הסכום חייב להישאר ניתן לבדיקה מול מה שבאמת קרה (4ח).
     המשמעות המעשית — השיעור יופיע גם בגיליונות ובלוח.
     זה נאמר במסך מראש, כי מי שיגלה את זה אחר כך יחשוב שנוצר
     משהו בטעות.

   ⚠ **הצוות בלבד** (`canExclude`), כמו ההוצאה מהדוח ומאותו
     טעם: זו רשומה תקציבית ולא דיווח תפעולי.
   ============================================================ */
function OneOff({ data, say, onSaved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ subject: "", lecturer: "", date: "", price: "" });

  if (!data.canExclude) return null;

  const ready = f.subject.trim() && f.date && String(f.price).trim() !== "";

  const submit = () => {
    if (!ready || busy) return;
    setBusy(true);
    api.addOneOffLesson({
      subject: f.subject.trim(), lecturer: f.lecturer.trim(),
      date: f.date, price: f.price,
    })
      .then(() => {
        say("השיעור נוסף לדוח");
        setF({ subject: "", lecturer: "", date: "", price: "" });
        setOpen(false);
        onSaved();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  if (!open) {
    return (
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }}
        onClick={() => setOpen(true)}>
        הוספת שיעור מזדמן
      </button>
    );
  }

  return (
    <>
      <div className="grp-h"><span>שיעור מזדמן</span></div>
      <div className="card lift">
        <div className="e2" style={{ marginBottom: 10 }}>
          מרצה שהגיע פעם אחת. נוצרים לו גיליון ומפגש אחד שמסומן שהתקיים —
          ולכן הוא יופיע גם בגיליונות המרצים ובלוח השיעורים, כמו כל שיעור
          אחר. זה מה שמאפשר לבדוק את הסכום מול מה שבאמת קרה.
        </div>
        <div className="fld">
          <label>שם השיעור</label>
          <input value={f.subject} disabled={busy} autoFocus
            placeholder="למשל: הרצאת אורח — יזמות"
            onChange={(e) => setF({ ...f, subject: e.target.value })} />
        </div>
        <div className="fld">
          <label>המרצה (לא חובה)</label>
          <input value={f.lecturer} disabled={busy}
            onChange={(e) => setF({ ...f, lecturer: e.target.value })} />
        </div>
        <div className="two">
          <div className="fld">
            <label>מתי התקיים</label>
            <input type="date" dir="ltr" value={f.date} disabled={busy}
              onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div className="fld">
            <label>כמה עלה</label>
            {/* ⚠ decimal ולא numeric — זה כסף. */}
            <input inputMode="decimal" value={f.price} disabled={busy} placeholder="₪"
              onChange={(e) => setF({ ...f, price: e.target.value })} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-primary" style={{ flex: 1 }}
            disabled={!ready || busy} onClick={submit}>
            {busy ? "מוסיף…" : "הוספה לדוח"}
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy}
            onClick={() => setOpen(false)}>ביטול</button>
        </div>
      </div>
    </>
  );
}
