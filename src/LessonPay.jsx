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
import { monthLabel } from "../shared/budget-boards.js";

const shekel = (n) => Math.round(n || 0).toLocaleString("he-IL");

export default function LessonPay({ say }) {
  const [month, setMonth] = useState(null);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api.getLessonPay(month)
      .then((r) => { setData(r); setErr(""); })
      .catch((e) => setErr(e.message));
  }, [month]);
  useEffect(() => { load(); }, [load]);

  if (err) {
    return <><div className="screen-title">תשלום למרצים</div>
      <div className="login-err">{err}</div></>;
  }
  if (!data) {
    return <><div className="screen-title">תשלום למרצים</div>
      <div className="skel" style={{ height: 220 }} /></>;
  }

  return (
    <>
      <div className="screen-title">תשלום למרצים</div>

      <div className="seg">
        <button className={!month ? "on" : ""} onClick={() => setMonth(null)}>כל השנה</button>
        {(data.months || []).map((m) => (
          <button key={m} className={month === m ? "on" : ""}
            onClick={() => setMonth(m)}>{monthLabel(m)}</button>
        ))}
      </div>

      {month
        ? <MonthView data={data} say={say} onSaved={load} />
        : <YearView data={data} onPick={setMonth} say={say} onSaved={load} />}
      <div style={{ height: 50 }} />
    </>
  );
}

/* ============================================================
   ⚠ הרצועה מציגה שלושה מספרים, ושניים מהם הם "מה חסר".
   ============================================================ */
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
      <PriceList rows={data.rows} canEdit={data.canEdit} say={say} onSaved={onSaved} />
    </>
  );
}

function MonthView({ data, say, onSaved }) {
  return (
    <>
      <Band total={data.total} unreported={data.unreported} unpriced={data.unpriced}
        label={monthLabel(data.month)} />

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
      <PriceList rows={data.rows} canEdit={data.canEdit} say={say} onSaved={onSaved} />
    </>
  );
}

/* ============================================================
   ⚠ העריכה יושבת **באותו מסך שבו רואים את החוסר**, ולא
     בהגדרות. מי שרואה "3 שיעורים בלי מחיר" ורוצה להשלים אותם
     לא צריך לעבור מסך, למצוא אותם שוב ולזכור מה חסר — זו
     בדיוק הטעות של מסך ההצפות (4ס).
   ============================================================ */
function PriceList({ rows, canEdit, say, onSaved }) {
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(null);

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
        <label className="pay-p" key={r.sheetId}>
          <span className="pay-p-n">{r.subject}</span>
          {canEdit ? (
            <input
              value={draft[r.sheetId] !== undefined ? draft[r.sheetId] : String(r.price ?? "")}
              /* ⚠ decimal ולא numeric — זה כסף. */
              inputMode="decimal" placeholder="ריק = לא סוכם" disabled={busy === r.sheetId}
              onChange={(e) => setDraft((d) => ({ ...d, [r.sheetId]: e.target.value }))}
              onBlur={() => commit(r)}
              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
          ) : (
            <span className="num">{r.price == null ? "—" : `${r.price} ₪`}</span>
          )}
        </label>
      ))}
    </div>
  );
}
