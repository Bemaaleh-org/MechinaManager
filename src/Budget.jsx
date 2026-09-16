/* ============================================================
   תקציב המטבח — כמה עולה להאכיל את המכינה
   ------------------------------------------------------------
   שני ראשים: קייטרינג (מה שמזמינים מבחוץ) וקניות (כל השאר).
   התקציב נקבע מסוגי הימים; הקניות בפועל יורדות מתקציב
   הקניות, וההפרש אומר אם חרגנו.

   עמוד לכל חודש. סוג היום נגזר מהלו״ז, ומי שרוצה אחרת כופה
   ליום בודד — כפייה מסומנת וניתנת לניקוי.

   ⚠ מנהל ואחראי מטבח. השרת אוכף; כאן זו תצוגה.
   ============================================================ */

import { israelDateStr } from "./testDate.js";
import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { useExcel, downloadTable } from "./excel.js";
import ScrollTabs from "./Tabs.jsx";
import { monthLabel, ORDER_KIND, consecutiveMonths, DAY_COMMUNITY } from "../shared/budget-boards.js";

const BI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
  dl: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>,
  clip: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5"/></svg>,
};

/* ============================================================
   הקבלה על הקנייה, ומי העלה אותה
   ------------------------------------------------------------
   ⚠ **שם המעלה מוצג בקטן לצד הקובץ** — זו הבקשה, ומה שהוא עונה
     עליו הוא "את מי לשאול על הקנייה הזו". השם נכתב בשרת מהסשן
     ואינו נשלח מהמסך (5כו).

   ⚠ **בלי קבלה מוצג כפתור ולא מסגרת ריקה.** שורה שכתוב בה
     "אין קבלה" בכל קנייה היא רעש שמפסיקים לראות (4ש).

   ⚠ **וכשל נאמר ולא נבלע.** קובץ שנבחר ולא עלה, בלי מילה,
     נראה בדיוק כמו קובץ שעלה (עיקרון 6).
   ============================================================ */
function Receipt({ order, canUpload, say, reload }) {
  const [busy, setBusy] = useState(false);
  const ref = React.useRef(null);

  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    /* ⚠ אותו גבול של השרת, ונאמר לפני ההמתנה ולא אחריה. */
    if (f.size > 3.5 * 1024 * 1024) { say("הקובץ גדול מ-3.5MB — צלמו שוב או הקטינו"); return; }
    setBusy(true);
    const fr = new FileReader();
    fr.onerror = () => { setBusy(false); say("קריאת הקובץ נכשלה"); };
    fr.onload = () => {
      const data = String(fr.result || "").split(",")[1] || "";
      api.setReceipt({ orderId: order.id, fileData: data, fileName: f.name, fileMime: f.type })
        .then((r) => { say(`הקבלה הועלתה · ${r.by}`); reload(); })
        .catch((e) => say(e.message))
        .finally(() => setBusy(false));
    };
    fr.readAsDataURL(f);
  };

  if (!order.receipt && !canUpload) return null;

  return (
    <div className="rc-line">
      {order.receipt ? (
        <>
          {order.receipt.url
            ? <a className="rc-file" href={order.receipt.url} target="_blank" rel="noreferrer">
                <BI.clip />{order.receipt.name}
              </a>
            : <span className="rc-file rc-off"><BI.clip />{order.receipt.name}</span>}
          {/* ⚠ **מי העלה — בקטן, לצד הקובץ.** */}
          {order.by && <span className="rc-by">העלה/תה {order.by}</span>}
          {canUpload && (
            <button className="rc-x" disabled={busy}
              onClick={() => { setBusy(true);
                api.removeReceipt(order.id)
                  .then(() => { say("הקבלה הוסרה"); reload(); })
                  .catch((e) => say(e.message))
                  .finally(() => setBusy(false)); }}>הסרה</button>
          )}
        </>
      ) : (
        <button className="rc-add" disabled={busy} onClick={() => ref.current && ref.current.click()}>
          <BI.clip />{busy ? "מעלה…" : "העלאת קבלה"}
        </button>
      )}
      {canUpload && (
        <input ref={ref} type="file" accept="image/*,application/pdf"
          style={{ display: "none" }} onChange={pick} />
      )}
    </div>
  );
}

const DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const dowOf = (iso) => DOW[new Date(iso + "T12:00:00Z").getUTCDay()];
const dm = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const shekel = (n) => Math.round(n || 0).toLocaleString("he-IL");

function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);
  const run = React.useCallback(() => {
    let live = true;
    setBusy(true);
    fn().then((d) => { if (live) { setData(d); setErr(null); } })
        .catch((e) => { if (live) setErr(e); })
        .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

/* ---------- עריכת יום אחד ---------- */
function DayEditor({ day, types, headcount, say, onDone, onCancel, dining }) {
  const [type, setType] = useState(day.type);
  const [type2, setType2] = useState(day.type2 || null);
  const [cost, setCost] = useState("");
  const [flat, setFlat] = useState(day.flat != null ? String(day.flat) : "");
  const [note, setNote] = useState(day.note || "");
  /* ⚠ מחרוזת ריקה = "לא נספר", ו-"0" = "אף אחד לא אכל". שני
     מצבים שונים, ולכן מחרוזת ולא מספר. */
  const [dHeads, setDHeads] = useState(day.diningHeads != null ? String(day.diningHeads) : "");
  const [busy, setBusy] = useState(false);
  const dRate = (dining && dining.rate) || 45;
  const dReady = Boolean(dining && dining.ready);
  const dNum = dHeads.trim() !== "" && Number.isFinite(Number(dHeads)) ? Number(dHeads) : null;
  /* ⚠ ספירה רק ביום עשייה קהילתית — לפי הסוג שנבחר כאן עכשיו */
  const isComm = type === DAY_COMMUNITY || type2 === DAY_COMMUNITY;

  const chosen = types.find((t) => t.name === type);
  const chosen2 = types.find((t) => t.name === type2);
  const per = cost.trim() !== "" ? Number(cost) : null;
  /* ⚠ אותה נוסחה שבשרת. שני הסוגים מתחברים, והמחיר הידני
     דורס את שניהם — ראו dayCost ב-shared/budget-boards.js. */
  const one = (t) => t
    ? {
        catering: (t.catering || 0) * (t.fixedHeads > 0 ? t.fixedHeads : headcount),
        dining: t.dining || 0,
        purchases: (t.purchases || 0) * headcount,
      }
    : { catering: 0, dining: 0, purchases: 0 };
  const a = one(chosen), b = one(chosen2);
  const flatN = flat.trim() !== "" ? Number(flat) || 0 : 0;
  /* ⚠ מה שנספר גובר על התעריף, בדיוק כמו בשרת. */
  const dSum = dNum != null ? dNum * dRate : null;
  const preview = per != null
    ? { catering: 0, dining: 0, purchases: per * headcount, flat: flatN }
    : { catering: a.catering + b.catering,
        dining: dSum != null ? dSum : a.dining + b.dining,
        purchases: a.purchases + b.purchases, flat: flatN };

  const save = () => {
    if (busy) return;
    setBusy(true);
    api.setBudgetDay({
      date: day.date, type, type2, cost: cost.trim(), flat: flat.trim(), note: note.trim(),
      ...(dReady ? { diningHeads: dHeads.trim() } : {}),
    })
      .then(() => { say("היום עודכן"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const clear = () => {
    if (busy) return;
    setBusy(true);
    api.setBudgetDay({
      date: day.date, type: null, type2: null, cost: "", flat: "", note: "",
      ...(dReady ? { diningHeads: "" } : {}),
    })
      .then(() => { say("היום חזר ללו״ז"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <BI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">יום {dowOf(day.date)}׳ · {dm(day.date)}</div>

      <div className="card lift">
        <div className="fld">
          <label>סוג היום</label>
          <div className="pick pick-wrap">
            {types.map((t) => (
              <button type="button" key={t.name} className={type === t.name ? "on" : ""}
                disabled={busy} onClick={() => setType(t.name)}>{t.name}</button>
            ))}
          </div>
        </div>

        {/* ---------- סוג נוסף ----------
            ⚠ "שגרה + אחר": יום שגרה שקרה בו עוד משהו. שני
              הסוגים מתחברים, ולכן נשמר גם מה היום היה וגם מה
              נוסף לו — במקום מחיר ידני שדורס את שניהם ומוחק
              את הסיבה שבגללה היום יקר. */}
        <div className="fld">
          <label>ועוד — "אחר" (לא חובה)</label>
          {/* ⚠ רק "אחר". סוג שני שהוא סדרה או שגרה פירושו לחשב
              יום שלם פעמיים, וזה כמעט תמיד טעות. "אחר" הוא
              הסל שנועד בדיוק לזה: משהו שקרה ביום ואין לו שם. */}
          <div className="pick">
            <button type="button" className={!type2 ? "on" : ""} disabled={busy}
              onClick={() => setType2(null)}>בלי</button>
            <button type="button" className={type2 === "אחר" ? "on" : ""} disabled={busy || type === "אחר"}
              onClick={() => setType2("אחר")}>אחר</button>
          </div>
          {chosen2 && (
            <div className="bg-fixed" style={{ marginTop: 7 }}>
              היום מחושב כ<b>{type}</b> ועוד <b>{type2}</b> — שני הסכומים מתחברים.
            </div>
          )}
        </div>

        <div className="fld">
          {/* ⚠ **decimal ולא numeric.** `inputMode="numeric"` פותח בטלפון
    מקלדת ספרות **בלי נקודה עשרונית** — כלומר שדה כסף שאי אפשר
    להקליד בו 12.5. זה לא היה כלל מוצהר אלא ברירת מחדל שהועתקה
    משדות של כמות, ושם היא נכונה: מפתח מלאי ומספר סועדים הם
    מספרים שלמים.

    הכלל: **כמות → numeric · כסף → decimal.** */}
          <label>סכום מיוחד לאדם (לא חובה)</label>
          <input value={cost} onChange={(e) => setCost(e.target.value)} disabled={busy}
            inputMode="decimal" placeholder="ריק = לפי סוג היום" />
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            סכום מיוחד נזקף כולו לקניות — הוא הוצאה נקודתית ולא שינוי בהסכם הקייטרינג.
            {(chosen || chosen2) && " ⚠ הוא דורס את סוגי היום שנבחרו למעלה."}
          </div>
        </div>

        {/* ⚠ שני סוגי סכום, ושונים במהות:
              לאדם  — מוכפל במצבה, ודורס את סוגי היום
              מדויק — סכום היום עצמו, ומתווסף למה שכבר יש
            הסעה של 300 ₪ אינה 300 ₪ לאדם, ואינה מבטלת את
            הארוחות של אותו יום. */}
        <div className="fld">
          <label>סכום מדויק ליום (לא חובה)</label>
          <input value={flat} onChange={(e) => setFlat(e.target.value)} disabled={busy}
            inputMode="decimal" placeholder="ריק = אין" />
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            סכום של היום כולו, לא לאדם — <b>מתווסף</b> ואינו מחליף.
          </div>
        </div>

        {/* ============================================================
            ⚠⚠ **כמה אכלו בחד״א — מספר שנספר, לא תעריף שנגזר**

            עד היום החד״א היה סכום קבוע על סוג היום (750 ₪ ליום
            עשייה קהילתית). זו הערכה. מי שסופר בפועל 22 סועדים
            יודע שזה 22 × {dRate} ₪, ו**מה שנספר גובר**.

            ⚠ ריק אינו אפס: ריק = "לא נספר" ומשאיר את התעריף;
              0 = "אף אחד לא אכל" ומאפס את היום (4ט).
            ============================================================ */}
        <div className="fld">
          <label>כמה אכלו בחד״א (לא חובה)</label>
          {dReady && !isComm && dHeads.trim() === "" ? (
            <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600 }}>
              נספר רק בימי עשייה קהילתית.
            </div>
          ) : dReady ? (
            <>
              {!isComm && (
                <div className="bg-fixed" style={{ marginBottom: 6 }}>
                  זה אינו יום עשייה קהילתית — ספירת סועדים נרשמת רק בימים כאלה. נקו את השדה כדי לשמור.
                </div>
              )}
              <input value={dHeads} onChange={(e) => setDHeads(e.target.value)} disabled={busy}
                inputMode="numeric" placeholder="ריק = לפי תעריף סוג היום" />
              <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
                {dNum != null
                  ? <>{dNum} סועדים × {dRate} ₪ = <b>{shekel(dSum)} ₪</b> — <b>גובר</b> על התעריף הקבוע.</>
                  : <>ריק = לא נספר, ונשאר התעריף של סוג היום. 0 = אף אחד לא אכל.</>}
              </div>
            </>
          ) : (
            /* ⚠ אומר מה להריץ ולא מציג שדה מת (עיקרון 6). */
            <div className="bg-fixed">
              העמודה טרם הוקמה בלוח. הריצו פעם אחת: <b>npm run seed:dining</b>
            </div>
          )}
        </div>

        <div className="fld">
          <label>הערה</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} disabled={busy}
            placeholder="למשל: ארוחת חג, אירוח קבוצה" />
        </div>

        <div className="bg-calc">
          <span>
            קייטרינג {shekel(preview.catering)}
            {preview.dining > 0 ? ` · חד״א ${shekel(preview.dining)}` : ""}
            {" · קניות "}{shekel(preview.purchases)}
            {preview.flat > 0 ? ` · מדויק ${shekel(preview.flat)}` : ""}
          </span>
          <b className="num">
            {shekel(preview.catering + preview.dining + preview.purchases + preview.flat)} ₪
          </b>
        </div>

        <button className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        {day.overridden && (
          <button className="btn btn-ghost" style={{ marginTop: 8 }} disabled={busy} onClick={clear}>
            ביטול הכפייה — חזרה ללו״ז
          </button>
        )}
      </div>
    </>
  );
}

/* ---------- קנייה חדשה ----------
   ⚠ הקנייה יורדת מהתקציב ואינה מוסיפה לו. שבועית נזקפת כולה
     לחודש שבו נעשתה; רבעונית מתחלקת על החודשים שנבחרו. */
function OrderForm({ months, defaultMonth, today, say, onDone, onCancel }) {
  const [kind, setKind] = useState(ORDER_KIND.weekly);
  /* ============================================================
     ⚠ **החודשים נבחרים, ואינם נגזרים מחודש פתיחה.**

     קודם נבחר "חודש פתיחה" והקנייה נפרשה על שלושה חודשים
     **רצופים** ממנו. זו הנחה שאינה תמיד נכונה — קנייה יכולה
     לכסות ספטמבר ונובמבר ולדלג על חודש שאין בו פעילות, ואז
     שליש מהסכום נזקף לחודש שלא נגע בו.

     ⚠ ברירת המחדל נשארת שלושה רצופים מהחודש הנוכחי, כי זה
       המקרה השכיח — משנים רק כשצריך.
     ============================================================ */
  /* ⚠ **`today` הוא היום בשעון ישראל מהשרת**, ולא היום הראשון
     של החודש שמוצג. ראו ההערה ב-`_kitchen-budget.js`. */
  const [f, setF] = useState({ name: "", amount: "", date: today, note: "" });
  const [picked, setPicked] = useState(() =>
    consecutiveMonths(defaultMonth).filter((m) => months.includes(m)));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const quarterly = kind === ORDER_KIND.quarterly;
  const ok = f.name.trim() && Number(f.amount) > 0
    && (quarterly ? picked.length > 0 : f.date);
  const amount = Number(f.amount) || 0;

  const save = () => {
    if (busy || !ok) return;
    setBusy(true);
    api.addPurchase({
      name: f.name.trim(), amount, kind,
      ...(quarterly ? { months: [...picked].sort() } : { date: f.date }),
      note: f.note.trim(),
    })
      .then((r) => {
        say(quarterly ? `נוספה — מתחלקת על ${r.months.map(monthLabel).join(", ")}` : "הקנייה נוספה");
        onDone();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <BI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">קנייה חדשה</div>

      <div className="card lift">
        <div className="fld">
          <label>סוג הקנייה</label>
          <div className="pick">
            <button type="button" className={!quarterly ? "on" : ""} disabled={busy}
              onClick={() => setKind(ORDER_KIND.weekly)}>שבועית</button>
            <button type="button" className={quarterly ? "on" : ""} disabled={busy}
              onClick={() => setKind(ORDER_KIND.quarterly)}>רבעונית</button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            {quarterly
              ? "מתחלקת על החודשים שתבחרו, ויורדת מכל אחד מהם"
              : "יורדת כולה מתקציב החודש שבו נעשתה"}
          </div>
        </div>

        <div className="fld">
          <label>שם הקנייה</label>
          <input value={f.name} onChange={set("name")} disabled={busy} autoFocus
            placeholder={quarterly ? "למשל: אוכל יבש — רבעון ראשון" : "למשל: קנייה שבועית"} />
        </div>

        <div className="two">
          <div className="fld">
            <label>סכום (₪)</label>
            <input value={f.amount} onChange={set("amount")} disabled={busy} inputMode="decimal" />
          </div>
          {!quarterly && (
            <div className="fld">
              <label>תאריך הקנייה</label>
              <input type="date" value={f.date} onChange={set("date")} disabled={busy} />
            </div>
          )}
        </div>

        {quarterly && (
          <div className="fld">
            <label>על אילו חודשים היא מתחלקת</label>
            {/* ⚠ **רשת ולא רשימה נפתחת.** בחירה מרובה ב-<select multiple>
                אינה עובדת במגע — נגיעה שנייה מבטלת את הראשונה, וזה
                בדיוק המקום שבו מישהו יבחר חודש אחד בלי לשים לב. */}
            <div className="mo-grid">
              {months.map((m) => {
                const on = picked.includes(m);
                return (
                  <button key={m} type="button" disabled={busy}
                    className={"mo-c" + (on ? " on" : "")}
                    onClick={() => setPicked((p) =>
                      on ? p.filter((x) => x !== m) : [...p, m].sort())}>
                    {monthLabel(m)}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 6 }}>
              {picked.length
                ? `הסכום מתחלק שווה בשווה על ${picked.length} חודשים`
                : "יש לבחור לפחות חודש אחד"}
            </div>
          </div>
        )}

        <div className="fld">
          <label>הערה</label>
          <input value={f.note} onChange={set("note")} disabled={busy} />
        </div>

        {/* ⚠ מחלקים במספר שנבחר בפועל ולא ב-3 קבוע — קנייה על
            שני חודשים היא חצי בכל אחד. */}
        {amount > 0 && (!quarterly || picked.length > 0) && (
          <div className="bg-calc">
            <span>{quarterly
              ? `יורד מכל אחד מ-${picked.length} החודשים`
              : "יורד מתקציב החודש"}</span>
            <b className="num">{shekel(quarterly ? amount / picked.length : amount)} ₪</b>
          </div>
        )}

        <button className="btn btn-primary" disabled={busy || !ok} onClick={save}>
          {busy ? "שומר…" : "הוספת הקנייה"}
        </button>
      </div>
    </>
  );
}

/* ---------- תקציב סוגי הימים ----------
   ⚠ שינוי כאן מזיז את כל השנה, לא חודש אחד: זה תעריף ולא
     חריגה. חריגה ליום בודד נעשית בלחיצה על היום עצמו.

   שלושה רכיבים לכל סוג. הקבוע קיים בגלל העשייה הקהילתית —
   900 ₪ ליום, בין אם הגיעו עשרים אנשים או ארבעים. */
function PriceTab({ types, headcount, say, onChanged, isHead = false }) {
  const [draft, setDraft] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(null); // id
  const [newTitle, setNewTitle] = useState("");

  const addType = () => {
    const nm = newName.trim();
    if (!nm || busyId) return;
    setBusyId("new");
    /* ⚠ נוצר עם אפסים ולא עם ניחוש — התעריף נקבע מיד אחר כך
       בשדות שכבר קיימים, ומספר מומצא נראה כמו נתון. */
    api.addDayType({ name: nm })
      .then((r) => { say(`"${r.name}" נוסף — עכשיו אפשר לקבוע לו תעריף`); setNewName(""); setAdding(false); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusyId(null));
  };

  const rename = (t) => {
    const nm = newTitle.trim();
    if (!nm || busyId) return;
    setBusyId(t.id);
    api.renameDayType({ typeId: t.id, name: nm })
      .then((r) => {
        /* ⚠ ההודעה אומרת כמה ימים נשארו עם השם הישן. monday
           אינה מעדכנת תוויות למפרע, ושינוי שקט היה מפצל את
           התקציב לשני סוגים שנראים כמו אחד. */
        say(r.renamed && r.renamed.days
          ? `השם שונה. ⚠ ${r.renamed.days} ימים עדיין מסומנים "${r.renamed.from}" ויש לעדכן אותם`
          : "השם שונה");
        setRenaming(null); onChanged();
      })
      .catch((e) => say(e.message))
      .finally(() => setBusyId(null));
  };

  const key = (t, f) => t.id + ":" + f;
  const valueOf = (t, f) => (key(t, f) in draft ? draft[key(t, f)] : String(t[f] ?? 0));

  const commit = (t, f) => {
    const k = key(t, f);
    const v = draft[k];
    if (v === undefined) return;
    const clean = String(v).trim();
    const drop = () => setDraft((d) => { const n = { ...d }; delete n[k]; return n; });
    if (clean === String(t[f] ?? 0)) { drop(); return; }
    const n = Number(clean);
    if (!Number.isFinite(n) || n < 0) { say("סכום לא תקין"); drop(); return; }
    setBusyId(t.id);
    api.setDayTypeBudget({ typeId: t.id, [f]: n })
      .then((r) => { say(`${r.name} עודכן`); drop(); onChanged(); })
      .catch((e) => say(e.message))
      .finally(() => setBusyId(null));
  };

  const field = (t, f, label) => (
    <label className="bg-f">
      <span>{label}</span>
      <input value={valueOf(t, f)} inputMode="decimal" disabled={busyId === t.id}
        onChange={(e) => setDraft((d) => ({ ...d, [key(t, f)]: e.target.value }))}
        onBlur={() => commit(t, f)}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
    </label>
  );

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, lineHeight: 1.6 }}>
          התקציב מחולק לשניים: <b>קייטרינג</b> — מה שמזמינים מבחוץ,
          ו<b>קניות</b> — כל השאר. שינוי כאן משפיע על כל השנה.
        </div>
      </div>

      <div className="grp-h">
        <span>סכומים לאדם</span>
        <span>× {headcount} סועדים</span>
      </div>

      {/* ⚠ **הוספת סוג יום — ראש המכינה בלבד.** סוג יום משנה
          את חישוב הכסף של כל השנה, וזו החלטה תקציבית ולא
          תפעול יומיומי. הכפתור אינו מוצג למי שאינו רשאי,
          כדי שלא יקבל 403 אחרי שהקליד (4יד). */}
      {isHead && (adding ? (
        <div className="bg-add">
          <input value={newName} autoFocus disabled={busyId === "new"}
            placeholder="שם סוג היום — למשל: בישול לשבת"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addType(); }} />
          <button className="btn btn-primary btn-sm" disabled={!newName.trim() || busyId === "new"}
            onClick={addType}>{busyId === "new" ? "מוסיף…" : "הוספה"}</button>
          <button className="btn btn-ghost btn-sm" disabled={busyId === "new"}
            onClick={() => { setAdding(false); setNewName(""); }}>ביטול</button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 10 }}
          onClick={() => setAdding(true)}>+ סוג יום חדש</button>
      ))}

      <div className="rows">
        {types.map((t) => {
          const heads = t.fixedHeads > 0 ? t.fixedHeads : headcount;
          const perDay = (t.catering || 0) * heads + (t.purchases || 0) * headcount;
          return (
            <div className="bg-type" key={t.id}>
              <div className="bg-type-h">
                {isHead && renaming === t.id ? (
                  <input className="bg-rename" value={newTitle} autoFocus disabled={busyId === t.id}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") rename(t);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onBlur={() => rename(t)} />
                ) : (
                  <b>{t.name}</b>
                )}
                {isHead && renaming !== t.id && (
                  <button className="conv-edit" disabled={busyId === t.id}
                    onClick={() => { setRenaming(t.id); setNewTitle(t.name); }}>שם</button>
                )}
                <span className="num">{shekel(perDay)} ₪ ליום</span>
              </div>
              {/* ⚠ שני שדות בלבד. סוג עם מנה קבועה מחושב לפיה
                  מאחורי הקלעים — המספר עצמו יושב בלוח ואינו
                  נחשף כאן, כדי שלא ייראה כמו עוד תעריף לעריכה. */}
              <div className="bg-fields two-up">
                {field(t, "catering", t.fixedHeads > 0 ? "קייטרינג — מנה קבועה" : "קייטרינג לאדם")}
                {field(t, "purchases", "קניות לאדם")}
              </div>
              {t.fixedHeads > 0 && (
                <div className="bg-fixed">
                  הקייטרינג כאן קבוע — {shekel((t.catering || 0) * t.fixedHeads)} ₪ ליום,
                  ואינו משתנה לפי מספר הסועדים
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}

/* ---------- סיכום שנתי ---------- */
/* ============================================================
   ניצול תקציב הקניות
   ------------------------------------------------------------
   ⚠ הניצול נמדד מול הקניות ולא מול הסך הכול. הקייטרינג הוא
     חוזה — הוא לא "מנוצל", הוא פשוט עולה. תקציב הקניות הוא
     הסכום שיש מולו שיקול דעת, והוא היחיד שאפשר לחרוג ממנו.

   ⚠ צבע לעולם לא לבדו. לכל מצב יש גם מילה — "בתקציב", "קרוב
     לתקרה", "חריגה" — כדי שמי שאינו מבחין בין ירוק לאדום עדיין
     יידע מה קורה.

   ⚠ שלושת הצבעים נבדקו בוולידטור מול שני הרקעים של האפליקציה.
     הענבר והחימר הישנים (#8A5A1E ו-#9E3626) נכשלו: הפרש של
     2.6 בלבד בעיוורון צבעים, ו-9.0 אפילו בראייה מלאה — שני
     מצבים שונים שנראים אותו דבר.
   ------------------------------------------------------------ */
const UTIL = {
  ok:   { c: "#177A45", label: "בתקציב" },
  warn: { c: "#B08400", label: "קרוב לתקרה" },
  over: { c: "#B02A1F", label: "חריגה" },
};
const utilOf = (spent, budget) => {
  if (!budget) return { pct: 0, ...UTIL.ok, none: true };
  const pct = (spent / budget) * 100;
  const t = pct > 100 ? UTIL.over : pct >= 85 ? UTIL.warn : UTIL.ok;
  return { pct, ...t };
};

function UtilBlock({ spent, budget, title, sub = "מתקציב הקניות", usedLabel = "נקנה" }) {
  const u = utilOf(spent, budget);
  const left = budget - spent;
  return (
    <div className="util" style={{ "--u": u.c }}>
      <div className="util-h">{title}</div>
      <div className="util-top">
        <div className="util-pct num">{Math.round(u.pct)}%</div>
        <div className="util-side">
          <span className="util-tag">{u.label}</span>
          <span className="util-sub">{sub}</span>
        </div>
      </div>

      {/* ⚠ הפס נעצר ב-100% והחריגה מסומנת בנפרד. פס שגולש
          מחוץ למסלול שלו אינו קריא, והחריגה חשובה מכדי להיות
          רק "פס ארוך יותר". */}
      <div className="util-bar">
        <span className="util-fill" style={{ width: Math.min(100, u.pct) + "%" }} />
        {u.pct > 100 && <span className="util-over" />}
      </div>

      <div className="util-legs">
        <div><b className="num">{shekel(spent)} ₪</b><span>{usedLabel}</span></div>
        <div><b className="num">{shekel(budget)} ₪</b><span>תקציב</span></div>
        <div>
          <b className="num" style={{ color: left < 0 ? UTIL.over.c : undefined }}>
            {shekel(Math.abs(left))} ₪
          </b>
          <span>{left < 0 ? "מעל התקציב" : "נותר"}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- גרף חודשי ----------
   ⚠ ציר אחד. שלושת הרכיבים באותה יחידה (₪) ולכן הם נערמים
     באותה עמודה, ולא על שני סולמות.

   ⚠ הפלטה נבדקה בוולידטור מול שני הרקעים. הפער הקשה ביותר הוא
     ירוק↔ענבר (ΔE 9.4 בפרוטאנופיה) — בטווח שמחייב קידוד משני,
     ולכן יש מקרא, רווח של 2px בין הפלחים, וטבלה מלאה מתחת
     לגרף. הצבע לבדו אינו נושא את המידע. */
const PARTS = [
  { k: "catering",  c: "#2A62A8", label: "קייטרינג" },
  { k: "dining",    c: "#B08400", label: 'חד"א של הקיבוץ' },
  { k: "purchases", c: "#177A45", label: "קניות" },
];

function YearChart({ rows }) {
  const [hot, setHot] = useState(null);
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="chart">
      <div className="chart-legend">
        {PARTS.map((p2) => (
          <span key={p2.k}><i style={{ background: p2.c }} />{p2.label}</span>
        ))}
      </div>

      <div className="chart-plot">
        {rows.map((r) => {
          const over = r.spent > r.purchases;
          return (
            <button className={"cbar" + (hot === r.month ? " hot" : "")} key={r.month}
              onClick={() => setHot(hot === r.month ? null : r.month)}
              aria-label={`${monthLabel(r.month)}: סך ${shekel(r.total)} ₪`}>
              <span className="cbar-stack" style={{ height: Math.max(2, (r.total / max) * 100) + "%" }}>
                {PARTS.map((p2) => {
                  const v = r[p2.k] || 0;
                  if (!v) return null;
                  return <span key={p2.k} className="cseg"
                    style={{ height: (v / r.total) * 100 + "%", background: p2.c }} />;
                })}
              </span>
              {/* ⚠ חריגה בקניות מסומנת בצורה, לא בצבע */}
              {over && <span className="cbar-over">!</span>}
              <span className="cbar-x">{monthLabel(r.month).slice(0, 3)}</span>
            </button>
          );
        })}
      </div>

      {hot && (() => {
        const r = rows.find((x) => x.month === hot);
        return (
          <div className="chart-tip">
            <b>{monthLabel(r.month)} · {shekel(r.total)} ₪</b>
            {PARTS.map((p2) => (r[p2.k] ? (
              <span key={p2.k}>
                <i style={{ background: p2.c }} />{p2.label} {shekel(r[p2.k])} ₪
              </span>
            ) : null))}
            {r.spent > 0 && (
              <span className={r.spent > r.purchases ? "tip-over" : ""}>
                נקנה בפועל {shekel(r.spent)} ₪ מתוך תקציב קניות {shekel(r.purchases)} ₪
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ============================================================
   הקבלות — חודש-חודש, וההווה פתוח
   ------------------------------------------------------------
   הבקשה: *"לגבי קבלות לקנייה, אני רוצה שיהיה שם לפי חודשים,
   לדוגמא ברגע שספטמבר נגמר אז יהיה כזה bar ספטמבר ויפתח
   אוקטובר."*

   הקבלות ישבו עד כאן **בתוך תצוגת החודש בלבד**, כלומר כדי
   לראות אם לספטמבר יש קבלות היה צריך לדפדף לספטמבר, ולזכור
   מה היה שם כשמדפדפים הלאה. השאלה "מה עוד חסר" — שהיא כל
   הסיבה שהעמודה קיימת — לא הייתה ניתנת לשאילה בשום מסך.

   ⚠ **החודש הנוכחי פתוח והשאר רצועות.** רשימה של עשרה חודשים
     פתוחים היא גלילה של מאה שורות; רשימה של עשר רצועות סגורות
     מסתירה בדיוק את מה שעובדים עליו היום. ⚠ ולכן זו בחירה
     ראשונית ולא כפייה בכל רינדור: מי שפתח את אוקטובר נשאר בו
     (אותו דפוס של `mi === null` בלוח הנוכחות, 4פ).

   ⚠ **החודש נגזר מתאריך הקנייה ולא מהחודשים שהיא נזקפת בהם.**
     קנייה רבעונית מתחלקת לשלושה חודשים בתקציב — אבל הקבלה
     שלה היא מסמך אחד מיום אחד, והופעתה בשלושה חודשים הייתה
     נראית כמו שלוש קבלות חסרות.

   ⚠ **הרצועה אומרת כמה חסר ולא רק כמה יש.** "4 קניות · 2,180 ₪"
     נקרא כחודש מתועד; המספר שבגללו נכנסים למסך הוא כמה
     מהן בלי קבלה (4יח, 4לג).

   ⚠ **וחודש בלי קניות אינו מוצג כלל** — רצועה ריקה נראית כמו
     תקלה, ושורה "0 קניות" בעשרה חודשים היא רעש.
   ============================================================ */
function ReceiptsTab({ say }) {
  const { data, err, busy, reload } = useLoad(() => api.getBudgetYear(), []);
  const [open, setOpen] = useState(null);

  /* ⚠ שעון ישראל ו-`?date=` ולא `new Date()` גולמי — אחרת
     בערב וב-UTC נפתח החודש הלא-נכון (4פ). */
  const nowMonth = israelDateStr().slice(0, 7);

  const groups = React.useMemo(() => {
    if (!data) return [];
    const by = new Map();
    for (const o of data.orders || []) {
      const m = String(o.date || "").slice(0, 7)
        || (Array.isArray(o.months) && o.months[0]) || o.startMonth || "";
      if (!m) continue;
      if (!by.has(m)) by.set(m, []);
      by.get(m).push(o);
    }
    return [...by.entries()]
      .map(([month, rows]) => ({
        month,
        rows: rows.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
        total: rows.reduce((a, o) => a + (Number(o.amount) || 0), 0),
        missing: rows.filter((o) => !o.receipt).length,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [data]);

  /* ⚠ בחירה ראשונית בלבד, ו-`open === null` פירושו "עוד לא
     נבחר". ברירת מחדל קשיחה הייתה מחזירה את המשתמש לחודש
     הנוכחי בכל טעינה מחדש אחרי העלאת קבלה. */
  useEffect(() => {
    if (open !== null || !groups.length) return;
    setOpen(groups.some((g) => g.month === nowMonth) ? nowMonth : groups[0].month);
  }, [groups, open, nowMonth]);

  if (busy && !data) return <div className="empty" style={{ paddingTop: 40 }}><div className="e1">טוען…</div></div>;
  if (err) return <div className="alert a-clay"><BI.warn /><div style={{ flex: 1 }}>
    <div className="ttl">לא הצלחנו לטעון</div><div className="bd">{err.message}</div></div></div>;
  if (!data) return null;

  const missing = groups.reduce((a, g) => a + g.missing, 0);
  const count = groups.reduce((a, g) => a + g.rows.length, 0);

  if (!count) {
    return (
      <div className="empty" style={{ paddingTop: 34 }}>
        <div className="e-ico"><BI.clip /></div>
        <div className="e1">עדיין לא נרשמה שום קנייה</div>
        <div className="e2">קנייה נרשמת בלשונית "חודש", והקבלה נטענת עליה.</div>
      </div>
    );
  }

  return (
    <>
      <div className="band">
        <div className="band-h">קבלות על הקניות</div>
        <div className="band-grid">
          <div className="band-c">
            <div className="band-n">{count}</div>
            <div className="band-l">קניות נרשמו</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (count - missing ? " ok" : "")}>{count - missing}</div>
            <div className="band-l">עם קבלה</div>
          </div>
          <div className="band-c">
            <div className={"band-n" + (missing ? " warn" : "")}>{missing}</div>
            <div className="band-l">בלי קבלה</div>
          </div>
        </div>
      </div>

      {/* ⚠ נאמר רק כשהוא נכון. "0 בלי קבלה" בכל טעינה הוא
          בדיוק השורה שמפסיקים לקרוא. */}
      {missing === 0 && (
        <div className="q-note" style={{ marginBottom: 10 }}>
          לכל הקניות שנרשמו יש קבלה.
        </div>
      )}

      <div className="rc-months">
        {groups.map((g) => {
          const isOpen = open === g.month;
          return (
            <div className={"rc-mo" + (isOpen ? " on" : "")} key={g.month}>
              {/* ⚠ שתי שורות ולא אחת. שם החודש, שתי התגיות והסיכום
                  בשורה אחת נדחסים בטלפון ונשברים לשלוש שורות
                  לא מיושרות — רצועה שנראית כמו תקלה. */}
              <button className="rc-bar" onClick={() => setOpen(isOpen ? "" : g.month)}>
                <BI.chev style={{ transform: isOpen ? "rotate(-90deg)" : "rotate(180deg)" }} />
                <span className="rc-mo-t">
                  <span className="rc-mo-h">
                    <span className="rc-mo-n">{monthLabel(g.month)}</span>
                    {g.month === nowMonth && <span className="pill p-new">החודש</span>}
                  </span>
                  <span className="rc-mo-s num">
                    {g.rows.length} קניות · {shekel(g.total)} ₪
                  </span>
                </span>
                {g.missing > 0
                  ? <span className="pill p-bad num">{g.missing} בלי קבלה</span>
                  : <span className="pill p-ok">הכול מתועד</span>}
              </button>

              {isOpen && (
                <div className="rows rc-mo-b">
                  {g.rows.map((o) => (
                    <div className="st-row" key={o.id} style={{ cursor: "default" }}>
                      <div className="st-main">
                        <div className="st-n">{o.name}</div>
                        <div className="st-m">
                          <span className={"pill " + (o.kind === ORDER_KIND.weekly ? "p-ok" : "p-new")}>
                            {o.kind}
                          </span>
                          <span className="num">{shekel(o.amount)} ₪</span>
                          {o.date && <span className="num">· {dm(o.date)}</span>}
                        </div>
                        <Receipt order={o} canUpload={data.canUploadReceipt}
                          say={say} reload={reload} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function YearView({ say, onMonth }) {
  const { data, err, busy } = useLoad(() => api.getBudgetYear(), []);
  if (busy && !data) return <div className="empty" style={{ paddingTop: 40 }}><div className="e1">טוען…</div></div>;
  if (err) return <div className="alert a-clay"><BI.warn /><div style={{ flex: 1 }}>
    <div className="ttl">לא הצלחנו לטעון</div><div className="bd">{err.message}</div></div></div>;
  if (!data) return null;

  const exportYear = () => {
    downloadTable({
      file: "תקציב-מטבח-שנתי",
      sheet: "סיכום שנתי",
      title: `תקציב המטבח — סיכום שנתי · ${data.headcount} סועדים`,
      header: ["חודש", "ימים", "קייטרינג", "חד״א", "תקציב קניות", "נקנה בפועל", "יתרה", "סה״כ תקציב"],
      rows: [
        ...data.rows.map((r) => [monthLabel(r.month), r.days, Math.round(r.catering),
          Math.round(r.dining || 0), Math.round(r.purchases), Math.round(r.spent),
          Math.round(r.left), Math.round(r.total)]),
        [], ["סה״כ השנה", "", Math.round(data.catering), Math.round(data.dining || 0),
          Math.round(data.purchases), Math.round(data.spent), Math.round(data.left),
          Math.round(data.total)],
      ],
      widths: [16, 7, 12, 10, 13, 12, 11, 13],
    });
    say("הקובץ ירד");
  };

  const max = Math.max(...data.rows.map((r) => r.total), 1);

  return (
    <>
      <div className="bg-total">
        <div className="bg-total-k">סך התקציב לשנה</div>
        <div className="bg-total-v num">{shekel(data.total)} ₪</div>
        <div className="bg-total-s">
          קייטרינג {shekel(data.catering)}
          {data.dining > 0 ? ` · חד״א ${shekel(data.dining)}` : ""}
          {" · קניות "}{shekel(data.purchases)} · {data.headcount} סועדים
        </div>
      </div>

      <UtilBlock spent={data.spent} budget={data.purchases} title="ניצול התקציב השנתי" />

      <div className="sec-label">ניצול חודשי · לחיצה למספרים</div>
      <YearChart rows={data.rows} />

      <div className="sec-label">חודש אחר חודש · לחיצה לפירוט</div>
      <div className="rows">
        {data.rows.map((r) => (
          <button className="st-row" key={r.month} onClick={() => onMonth(r.month)}>
            <div className="st-main">
              <div className="st-n">{monthLabel(r.month)}</div>
              <div className="st-m">
                <span className="num">קייטרינג {shekel(r.catering)}</span>
                {r.dining > 0 && <span className="num">· חד״א {shekel(r.dining)}</span>}
                <span className="num">· קניות {shekel(r.purchases)}</span>
                {r.left < 0 && <span className="pill p-low">חריגה</span>}
              </div>
              <div className="bg-bar"><span style={{ width: `${(r.total / max) * 100}%` }} /></div>
            </div>
            <b className="num" style={{ flex: "0 0 auto", fontSize: 14.5 }}>{shekel(r.total)} ₪</b>
          </button>
        ))}
      </div>

      <button className="btn btn-ghost btn-sm" style={{ width: "100%", margin: "12px 0" }}
        onClick={exportYear}><BI.dl />הורדת הסיכום השנתי לאקסל</button>
      <div style={{ height: 20 }} />
    </>
  );
}

/* ---------- הדף ---------- */
/* ============================================================
   חד״א — דף משלו (13.9.2026)
   ------------------------------------------------------------
   הבקשה: *"לסמן כמה אנשים אכלו בחד״א — כל איש שווה 45 ₪ — ככה
   נוכל לעקוב אחרי התקציב של החד״א."* ובהמשך אותו יום: *"ספירה
   רק בימים שיש בהם עשייה קהילתית"*, ו*"תיקח נגזרת מתקציב החד״א
   שכבר קיים — אחרי 5 סועדים יהיה 225 מ-1500 או 3000 — ואופציה
   קטנה לשנות את התקציב לכל חודש בנפרד."*

   · **רק ימי עשייה קהילתית** ברשימה (`community` מהשרת). יום
     אחר שכבר נושא ספירה מוצג כדי שאפשר יהיה לנקות אותה.
   · **נוצל = מה שנספר** (`diningUsed`), ולא התעריף של ימים שטרם
     נספרו.
   · **התקציב נגזר** (`diningPlan` — תעריף החד״א של ימי העשייה
     הקהילתית בחודש), ו**שינוי לחודש אחד** הוא כפתור קטן לראש
     המכינה (`diningBudgetSet`). ריק מחזיר לנגזר.
   · ⚠ ההרשאות מהשרת (`canEditDining`, `canSetDining`) — 4יד.
   · ⚠ ימים עתידיים סגורים לספירה.
   ============================================================ */
function DiningTab({ data, say, reload }) {
  const today = israelDateStr();
  const rate = data.diningRate || 45;
  const canCount = data.canEditDining !== false;
  const canSet = Boolean(data.canSetDining);
  /* ⚠ אישור בתוך המסך ולא `confirm()` של הדפדפן — הוא
     נראה זר ובחלק מהדפדפנים במובייל נחסם לגמרי (4ק). */
  const [vals, setVals] = useState({});
  const [busyDate, setBusyDate] = useState(null);
  const [bEdit, setBEdit] = useState(false);
  const [budget, setBudget] = useState("");
  const [rEdit, setREdit] = useState(false);
  const [rateVal, setRateVal] = useState("");
  /* ⚠ **התעריף ליום** נפרד מ**המחיר לסועד**, והבלבול ביניהם הוא
     בדיוק מה שהמסך צריך למנוע: 600 ₪ הוא מה שיום עשייה
     קהילתית עולה כשאיש לא נספר, ו-45 ₪ הוא מה שכל סועד עולה
     כשכן. שני שדות, שני כפתורים, ושתי הסברות. */
  const [dEdit, setDEdit] = useState(false);
  const [dayVal, setDayVal] = useState("");
  const [sBusy, setSBusy] = useState(false);

  useEffect(() => {
    setVals({});
    setBEdit(false);
    setREdit(false);
    setDEdit(false);
  }, [data.month]);

  if (!data.diningReady) {
    return (
      <div className="bg-fixed">
        עמודת "אכלו בחד״א" טרם הוקמה. הריצו פעם אחת: <b>npm run seed:dining</b>
      </div>
    );
  }

  const valOf = (d) => (d.date in vals ? vals[d.date]
    : (d.diningHeads != null ? String(d.diningHeads) : ""));

  const saveDay = (d) => {
    const v = valOf(d).trim();
    const was = d.diningHeads != null ? String(d.diningHeads) : "";
    if (v === was) return;
    setBusyDate(d.date);
    api.setDiningHeads({ date: d.date, heads: v })
      .then(() => {
        say(v === "" ? `${dm(d.date)} — הספירה נוקתה`
          : `${dm(d.date)} — ${v} סועדים · ${shekel(Number(v) * rate)} ₪`);
        reload();
      })
      .catch((e) => {
        say(e.message);
        setVals((x) => { const n = { ...x }; delete n[d.date]; return n; });
      })
      .finally(() => setBusyDate(null));
  };

  const run = (p, msg) => {
    setSBusy(true);
    p.then(() => { say(msg); setBEdit(false); setREdit(false); reload(); })
      .catch((e) => say(e.message))
      .finally(() => setSBusy(false));
  };

  const used = data.diningUsed || 0;
  const plan = data.diningPlan || 0;
  const budgetN = data.diningBudget != null ? data.diningBudget : plan;
  const derived = data.diningBudgetSet == null;
  const days = data.days.filter((d) => d.community || d.diningHeads != null);

  return (
    <>
      <div className="card bg-hada">
        <div className="bg-hada-h">
          <span>חדר האוכל של הקיבוץ · {monthLabel(data.month)}</span>
        </div>
        <div className="bg-hada-s">
          {data.diningDays > 0
            ? <>{data.diningHeads} סועדים × {rate} ₪ · נספרו {data.diningDays} מתוך {data.communityDays} ימי עשייה קהילתית</>
            : data.communityDays > 0
              ? <>עדיין לא נספרו סועדים החודש · {data.communityDays} ימי עשייה קהילתית</>
              : <>אין החודש ימי עשייה קהילתית</>}
        </div>
        {budgetN > 0 && (
          <UtilBlock spent={used} budget={budgetN} title="ניצול תקציב החד״א"
            sub="מתקציב החד״א" usedLabel="נוצל" />
        )}
        <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, marginTop: 8 }}>
          {derived
            ? <>התקציב נגזר מתעריף החד״א — {data.diningDayRate != null
                ? <b>{shekel(data.diningDayRate)} ₪</b> : "—"} ל{data.communityDays === 1
                ? "יום עשייה קהילתית" : `כל אחד מ-${data.communityDays} ימי העשייה הקהילתית`} בחודש.</>
            : <>התקציב נקבע ידנית לחודש הזה. הנגזר מימי העשייה הקהילתית: {shekel(plan)} ₪.</>}
        </div>

        {/* ============================================================
            ⚠ **התעריף ליום — ראש המכינה, מהמסך.**
              הוא יושב על סוג היום בלוח (עיקרון 1) והיה ניתן לשינוי
              רק דרך monday. ⚠ `canSetDayRate` מהשרת ולא נגזר כאן
              (4יד), ו-`diningDayTypeId` הוא מה שהשרת מצפה לו —
              המסך אינו מחפש את סוג היום בעצמו.
            ============================================================ */}
        {/* ============================================================
            ⚠⚠⚠ **היתרה עוברת מעצמה (16.9.2026).**

            קודם זה היה כפתור שראש המכינה לוחץ עליו בסוף
            החודש, והדיווח שהתקבל היה "בתקציב הכללי לא
            מתווסף מה שנשאר מהחד״א" — כלומר הכפתור לא
            נלחץ. פעולה שמישהו צריך לזכור בסוף כל חודש היא
            פעולה שלא תיעשה (4כו).

            ⚠ הנוסח מגיע מהשרת (`diningMoveNote`) ואינו מנוסח
              כאן — שתי גרסאות של אותה הצהרה מתפצלות (4מד).
            ============================================================ */}
        {data.diningMoved > 0 && (
          <div className="bg-moved">
            <b>+{shekel(data.diningMoved)} ₪</b> {data.diningMoveNote
              || "הוספו לתקציב הקניות, וירדו מתקציב החד״א"}
          </div>
        )}
        {/* ⚠ וכשעוד לא — הסיבה במילים, כדי שיהיה ברור למה
            הכסף עדיין כאן ומה חסר כדי שיעבור (4כב). */}
        {!data.diningMoved && data.diningMoveReason && data.communityDays > 0 && (
          <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, marginTop: 6 }}>
            היתרה תעבור לתקציב הקניות מעצמה — {data.diningMoveReason}.
          </div>
        )}

        {data.canSetDayRate && data.diningDayTypeId && !dEdit && (
          <div style={{ marginTop: 6 }}>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setDayVal(String(data.diningDayRate ?? "")); setDEdit(true); }}>
              שינוי התעריף ליום
            </button>
          </div>
        )}
        {data.canSetDayRate && dEdit && (
          <div style={{ marginTop: 8 }}>
            <div className="fld">
              <label htmlFor="dn-dr">תעריף החד״א ליום עשייה קהילתית (₪)</label>
              <input id="dn-dr" type="number" inputMode="decimal" min="0" dir="ltr" autoFocus
                value={dayVal} onChange={(e) => setDayVal(e.target.value)} />
            </div>
            {/* ⚠ נאמר מה זה משנה **לפני** השמירה: התעריף חל על כל
                חודשי השנה, ולא רק על החודש שמוצג. */}
            <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginBottom: 8 }}>
              חל על כל החודשים, ומשנה את התקציב הנגזר בכל אחד מהם.
              יום שנספרו בו סועדים מחושב לפי הספירה ולא לפי התעריף.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" disabled={sBusy}
                onClick={() => run(api.setDayTypeBudget({
                  typeId: data.diningDayTypeId, dining: dayVal.trim(),
                }), "תעריף החד״א ליום עודכן")}>
                {sBusy ? "…" : "שמירה"}
              </button>
              <button className="btn btn-ghost btn-sm" disabled={sBusy}
                onClick={() => setDEdit(false)}>ביטול</button>
            </div>
          </div>
        )}

        {/* ⚠ "לא בגדול" — כפתור קטן, ורק לראש המכינה. */}
        {canSet && !bEdit && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setBudget(String(budgetN)); setBEdit(true); }}>
              שינוי התקציב לחודש הזה
            </button>
            {!derived && (
              <button className="btn btn-ghost btn-sm" disabled={sBusy}
                onClick={() => run(api.setDiningBudget({ month: data.month, amount: "" }),
                  "החודש חזר לתקציב הנגזר")}>
                חזרה לתקציב הנגזר
              </button>
            )}
          </div>
        )}
        {canSet && bEdit && (
          <div style={{ marginTop: 8 }}>
            <div className="fld">
              <label htmlFor="dn-b">תקציב החד״א ל{monthLabel(data.month)} (₪)</label>
              <input id="dn-b" type="number" inputMode="decimal" min="0" dir="ltr" autoFocus
                value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" disabled={sBusy}
                onClick={() => run(api.setDiningBudget({ month: data.month, amount: budget.trim() }),
                  budget.trim() === "" ? "החודש חזר לתקציב הנגזר"
                    : `תקציב החד״א ל${monthLabel(data.month)} נקבע`)}>
                {sBusy ? "…" : "שמירה"}
              </button>
              <button className="btn btn-ghost btn-sm" disabled={sBusy}
                onClick={() => setBEdit(false)}>ביטול</button>
            </div>
          </div>
        )}
      </div>

      <div className="sec-label">כמה אכלו בחד״א — ימי עשייה קהילתית</div>
      <div className="tm-sub">
        כל סועד שנספר: {rate} ₪. ריק = לא נספר · 0 = אף אחד לא אכל.
        {!canCount && " הספירה נעשית על ידי ראש המכינה ואחראי המטבח."}
        {canSet && !rEdit && (
          <> <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }}
            onClick={() => { setRateVal(String(rate)); setREdit(true); }}>
            שינוי המחיר לסועד
          </button></>
        )}
      </div>
      {canSet && rEdit && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="fld">
            <label htmlFor="dn-r">מחיר לסועד (₪) — לכל החודשים</label>
            <input id="dn-r" type="number" inputMode="decimal" min="1" dir="ltr" autoFocus
              value={rateVal} onChange={(e) => setRateVal(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={sBusy}
              onClick={() => run(api.setDiningRate(rateVal.trim()), "המחיר לסועד עודכן")}>
              {sBusy ? "…" : "שמירה"}
            </button>
            <button className="btn btn-ghost btn-sm" disabled={sBusy}
              onClick={() => setREdit(false)}>ביטול</button>
          </div>
        </div>
      )}

      {days.length === 0 ? (
        <div className="empty">
          <b>אין ימי עשייה קהילתית ב{monthLabel(data.month)}</b>
          <span>ספירת סועדים נרשמת רק בימים כאלה.</span>
        </div>
      ) : (
        <div className="ledger">
          {days.map((d) => {
            const future = d.date > today;
            const v = valOf(d);
            return (
              <div className="led-item" key={d.date}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{dm(d.date)} · {dowOf(d.date)}{d.date === today ? " · היום" : ""}</b>
                  <div style={{ fontSize: 12, color: d.community ? "var(--faint)" : "var(--clay)", fontWeight: 600 }}>
                    {d.community
                      ? (d.diningHeads != null ? `נוצלו ${shekel(d.diningHeads * rate)} ₪` : "טרם נספר")
                      : `יום ${d.type} — אינו יום עשייה קהילתית. אפשר רק לנקות`}
                  </div>
                </div>
                <div className="fld" style={{ margin: 0, width: 92, flex: "0 0 auto" }}>
                  <input value={v} dir="ltr" inputMode="numeric"
                    style={{ textAlign: "center" }}
                    aria-label={"כמה אכלו ב-" + dm(d.date)}
                    disabled={!canCount || future || busyDate === d.date}
                    placeholder={future ? "—" : "לא נספר"}
                    onChange={(e) => setVals((x) => ({ ...x, [d.date]: e.target.value }))}
                    onBlur={() => saveDay(d)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function BudgetPage({ say, isHead = false }) {
  useExcel();
  const [view, setView] = useState("month");
  const [month, setMonth] = useState(null);
  const { data, err, busy, reload } = useLoad(() => api.getBudget(month), [month]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  /* ⚠ אישור מחיקת קנייה — מזהה השורה שנפתחה, כדי
     שלא ייפתחו שני אישורים בבת אחת. */
  const [del, setDel] = useState(null);
  const [busyDel, setBusyDel] = useState(false);
  const [headEdit, setHeadEdit] = useState(false);
  const [head, setHead] = useState("");
  const [headMode, setHeadMode] = useState("forward");
  const [headFrom, setHeadFrom] = useState("");


  if (busy && !data) return (
    <div className="empty" style={{ paddingTop: 60 }}><div className="e1">טוען תקציב…</div></div>
  );
  if (err?.setupRequired) return (
    <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>התקציב עדיין לא חובר ל-monday</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>{err.message}</div>
    </div>
  );
  if (err) return (
    <div className="alert a-clay">
      <BI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">לא הצלחנו לטעון את התקציב</div>
        <div className="bd">{err.message}</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
      </div>
    </div>
  );
  if (!data) return null;

  if (editing) return (
    <DayEditor day={editing} types={data.types} headcount={data.headcount} say={say}
      dining={{ rate: data.diningRate, ready: data.diningReady }}
      onDone={() => { setEditing(null); reload(); }}
      onCancel={() => setEditing(null)} />
  );
  if (adding) return (
    <OrderForm months={data.months} defaultMonth={data.month}
      today={data.today || data.days[0].date} say={say}
      onDone={() => { setAdding(false); reload(); }}
      onCancel={() => setAdding(false)} />
  );

  const saveHead = () => {
    const n = Number(head);
    if (!Number.isFinite(n) || n < 1) { say("מספר לא תקין"); return; }
    api.setHeadcount({ headcount: n, mode: headMode, from: headFrom })
      .then(() => {
        say(headMode === "retro" ? "המצבה עודכנה לכל השנה" : "המצבה עודכנה מהתאריך והלאה");
        setHeadEdit(false); reload();
      })
      .catch((e) => say(e.message));
  };

  const exportMonth = () => {
    downloadTable({
      file: "תקציב-מטבח-" + data.month,
      sheet: "תקציב",
      title: `תקציב המטבח — ${monthLabel(data.month)} · ${data.headcount} סועדים`,
      header: ["תאריך", "יום", "סוג היום", "קייטרינג", "קניות", "סה״כ", "הערה"],
      rows: [
        ...data.days.map((d) => [dm(d.date), dowOf(d.date),
          d.type + (d.type2 ? " + " + d.type2 : ""),
          Math.round(d.catering), Math.round(d.purchases), Math.round(d.total), d.note || ""]),
        [],
        ["תקציב קייטרינג", "", "", Math.round(data.catering), "", "", ""],
        ["תקציב קניות", "", "", "", Math.round(data.purchases), "", ""],
        ["נקנה בפועל", "", "", "", Math.round(data.spent), "", ""],
        ["יתרה בקניות", "", "", "", Math.round(data.left), "", ""],
        ["סה״כ תקציב החודש", "", "", "", "", Math.round(data.total), ""],
      ],
      widths: [10, 6, 16, 11, 10, 10, 22],
    });
    say("הקובץ ירד");
  };

  const idx = data.months.indexOf(data.month);
  const go = (i) => { if (i >= 0 && i < data.months.length) setMonth(data.months[i]); };
  const monthOrders = data.orders.filter((o) => o.share > 0);
  /* ⚠ הרשאת הכתיבה מהשרת ואינה נגזרת במסך (4יד).
     `canSetDayRate` הוא `mayEdit(session,"kitchen")` בדיוק — אותה
     שאלה שהשרת אוכף על כל כתיבה בתקציב. */
  const canWrite = data.canSetDayRate !== false;

  /* ⚠ אותו בורר חודש לשתי התצוגות — חודש וחד״א. */
  const monthNav = (
        <div className="bg-nav">
            <button className="btn btn-ghost btn-sm" disabled={idx <= 0} onClick={() => go(idx - 1)}>
              <BI.chev style={{ transform: "rotate(180deg)" }} />
            </button>
            <select value={data.month} onChange={(e) => setMonth(e.target.value)}>
              {data.months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" disabled={idx >= data.months.length - 1}
              onClick={() => go(idx + 1)}>
              <BI.chev />
            </button>
          </div>
  );

  return (
    <>
      <div className="screen-title">תקציב המטבח</div>

      {/* ============================================================
          ⚠⚠ **שורת הגדרה כפולה בלוח — נאמרת ואינה נבלעת.**
            נמצאו שתי שורות "מספר סועדים" (37 ו-33), והשרת קורא
            את הראשונה. מי שערך את השנייה ב-monday לא ראה שום
            שינוי ולא קיבל שום שגיאה — בדיוק סוג התקלה שאין לה
            סימן (4ט). ההתנהגות לא שונתה; מה שנוסף הוא שהמסך
            אומר שזה קורה ומה לעשות.
          ============================================================ */}
      {Array.isArray(data.settingDupes) && data.settingDupes.length > 0 && (
        <div className="bg-fixed" style={{ marginBottom: 10 }}>
          {data.settingDupes.map((d) => (
            <div key={d.name}>
              ⚠ בלוח ההגדרות יש <b>{d.count}</b> שורות בשם "{d.name}" — נקראת הראשונה.
              כדאי למחוק את המיותרת ב-monday, אחרת עריכה של השורה השנייה לא תשפיע.
            </div>
          ))}
        </div>
      )}

      {/* ⚠ עטוף ב-`ScrollTabs` מרגע שיש חמש לשוניות: רצועה
          שנחתכת נראית שלמה, ומי שלא יודע שאפשר להחליק לא
          מגיע ללשונית האחרונה — כלומר היא אינה קיימת (4ר). */}
      <ScrollTabs className="seg">
        <button className={view === "month" ? "on" : ""} onClick={() => setView("month")}>חודש</button>
        <button className={view === "year" ? "on" : ""} onClick={() => setView("year")}>כל השנה</button>
        <button className={view === "prices" ? "on" : ""} onClick={() => setView("prices")}>תקציב</button>
        <button className={view === "dining" ? "on" : ""} onClick={() => setView("dining")}>חד״א</button>
        <button className={view === "receipts" ? "on" : ""} onClick={() => setView("receipts")}>קבלות</button>
      </ScrollTabs>

      {view === "prices" ? (
        <PriceTab types={data.types} headcount={data.headcount} say={say}
          onChanged={reload} isHead={isHead} />
      ) : view === "year" ? (
        <YearView say={say} onMonth={(m) => { setMonth(m); setView("month"); }} />
      ) : view === "receipts" ? (
        <ReceiptsTab say={say} />
      ) : view === "dining" ? (
      <>
        {monthNav}
        <DiningTab data={data} say={say} reload={reload} />
      </>
      ) : (
      <>
        {monthNav}

        <div className="bg-total">
          <div className="bg-total-k">סך התקציב לחודש</div>
          <div className="bg-total-v num">{shekel(data.total)} ₪</div>
          <div className="bg-total-s">
            קייטרינג {shekel(data.catering)}
            {data.dining > 0 ? ` · חד״א ${shekel(data.dining)}` : ""}
            {" · קניות "}{shekel(data.purchases)}
          </div>
          {/* ============================================================
              ⚠⚠ **"כמה כבר נסגר" — ולא "כמה נוצל מתוך הסך הכול".**

                הבקשה הייתה 16,000/25,000. ⚠ אבל 4ו קובע שהניצול
                נמדד מול **הקניות** ולא מול הסך הכול, כי
                הקייטרינג הוא חוזה: הוא אינו "מנוצל", הוא פשוט
                עולה, ואחוז שמודד אותו כאילו אפשר לחסוך בו
                מייפה את התמונה בדיוק ברגע שמסתכלים עליה כדי
                להחליט.

                לכן שני מספרים ושתי מילים שונות — "נסגר"
                מול "לשיקול דעת" — ולא אחוז אחד שקורא
                לשניהם אותו דבר (4יח).
              ============================================================ */}
          {data.committed != null && (
            <div className="bg-total-sp">
              <div className="bg-sp-bar">
                <span style={{ width: `${Math.min(100,
                  Math.round((data.committed / (data.total || 1)) * 100))}%` }} />
              </div>
              <div className="bg-sp-n">
                <b className="num">{shekel(data.committed)}</b>
                <span>כבר נסגר</span>
              </div>
              <div className="bg-sp-n">
                <b className="num">{shekel(data.total)}</b>
                <span>סך החודש</span>
              </div>
              {data.left != null && (
                <div className="bg-sp-n">
                  <b className="num">{shekel(data.left)}</b>
                  <span>לשיקול דעת</span>
                </div>
              )}
            </div>
          )}
          <div className="bg-total-why">
            ״נסגר״ = קייטרינג + חד״א שנאכל + קניות שכבר בוצעו.
            הקייטרינג הוא חוזה ואינו ניתן לחיסכון, ולכן ״לשיקול דעת״
            הוא מה שנשאר בתקציב הקניות בלבד.
          </div>
        </div>

        {/* ---------- הקניות מול תקציב הקניות ---------- */}
        <UtilBlock spent={data.spent} budget={data.purchases}
          title={`ניצול תקציב הקניות · ${monthLabel(data.month)}`} />

        {/* ============================================================
            ⚠⚠ **החד״א — כמה נאכל, ומה נשאר**

            ⚠ **המספר לבדו אינו התמונה.** "1,240 ₪" נקרא כחשבון
              החודש כשהוא חשבון של שלושה ימים מתוך שלושים, ולכן
              כתוב כאן **בכמה ימים בכלל נספרו סועדים** (4יח).

            ⚠ **ובלי תקציב אין "נשאר".** `diningBudget === null`
              פירושו שהשורה בלוח ההגדרות טרם נכתבה, והמסך אומר
              זאת במילים — 0 היה נראה כמו תקציב שנגמר (עיקרון 6).
            ============================================================ */}
        {(data.dining > 0 || data.communityDays > 0 || data.diningHeads > 0) && (
          <div className="card bg-hada">
            <div className="bg-hada-h">
              {/* ⚠ בלי מספר בפינה (14.9.2026) — "1,500 ₪" לבדו לא אמר
                  מה הוא, והניצול מתחת כבר אומר את מה שצריך. */}
              <span>חדר האוכל של הקיבוץ</span>
            </div>
            <div className="bg-hada-s">
              {data.diningDays > 0
                ? <>{data.diningHeads} סועדים נספרו ב-{data.diningDays} ימים
                    · {data.diningRate} ₪ לסועד</>
                : <>עדיין לא נספרו סועדים החודש — הסכום לפי התעריף של סוגי הימים</>}
            </div>
            {/* ⚠ נוצל = מה שנספר, מול התקציב הנגזר (או זה שנקבע לחודש) */}
            {data.diningBudget > 0 && (
              <UtilBlock spent={data.diningUsed || 0} budget={data.diningBudget}
                title="ניצול תקציב החד״א" sub="מתקציב החד״א" usedLabel="נוצל" />
            )}
            {/* ⚠ **ניהול החד״א בדף משלו** (13.9.2026): ספירה, תקציב
                ומחיר לסועד — ולא בתוך כרטיסי התקציב של החודש. כאן
                נשאר הסיכום, וכפתור אחד לשם. */}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
              onClick={() => setView("dining")}>
              ניהול החד״א — ספירה ותקציב
            </button>
          </div>
        )}

        {headEdit ? (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="two">
              <div className="fld">
                <label>מספר סועדים</label>
                <input value={head} onChange={(e) => setHead(e.target.value)}
                  inputMode="numeric" autoFocus />
              </div>
              {headMode === "forward" && (
                <div className="fld">
                  <label>בתוקף מתאריך</label>
                  <input type="date" value={headFrom} onChange={(e) => setHeadFrom(e.target.value)} />
                </div>
              )}
            </div>

            <div className="fld">
              <label>ממתי זה תקף</label>
              <div className="pick">
                <button type="button" className={headMode === "forward" ? "on" : ""}
                  onClick={() => setHeadMode("forward")}>מהתאריך והלאה</button>
                <button type="button" className={headMode === "retro" ? "on" : ""}
                  onClick={() => setHeadMode("retro")}>לכל השנה</button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4,
                            lineHeight: 1.6 }}>
                {headMode === "forward"
                  ? "חודשים שקדמו לתאריך יישארו עם המצבה שהייתה בהם — מי שעזב באמצע השנה אינו מוזיל אותם."
                  : "מתקן את כל השנה למספר הזה ומוחק את היסטוריית השינויים. מתאים כשהמספר הוזן שגוי מלכתחילה."}
              </div>
            </div>

            <button className="btn btn-primary" onClick={saveHead}>שמירה</button>
            <button className="btn btn-ghost" style={{ marginTop: 8 }}
              onClick={() => setHeadEdit(false)}>ביטול</button>
          </div>
        ) : (
          <div className="card bg-head">
            <div style={{ flex: 1 }}>
              <b className="num" style={{ fontSize: 18 }}>{data.headcount}</b>
              <span style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 600, marginRight: 8 }}>
                סועדים — חניכים וצוות
              </span>
              {(data.headcounts || []).length > 1 && (
                <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 3 }}>
                  {data.headcounts.filter((h) => h.from).length} שינויים במהלך השנה
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm"
              onClick={() => {
                setHead(String(data.headcount));
                setHeadFrom(data.days[0].date);
                setHeadMode("forward");
                setHeadEdit(true);
              }}>שינוי</button>
          </div>
        )}

        <div className="sec-label">מה מושך את התקציב</div>
        <div className="card" style={{ marginBottom: 12 }}>
          {data.byType.map((t) => (
            <div className="bg-row" key={t.type}>
              <span style={{ flex: 1 }}>{t.type}</span>
              <span className="num" style={{ color: "var(--muted)" }}>{t.days} ימים</span>
              <b className="num">{shekel(t.total)} ₪</b>
            </div>
          ))}
        </div>

        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 14 }}
          onClick={exportMonth}><BI.dl />הורדת החודש לאקסל</button>

        {/* ⚠⚠ **כמה מהתמונה חסר — ולא רק מה שיש.**
            "נקנה 4,200 ₪" בלי לומר שלשלוש מתוך חמש הקניות אין
            קבלה נקרא כמו חודש מתועד. אותו כלל של `unpriced`
            בשווי המלאי ושל `unmarked` באירוחים (4לג, 4יח).
            ⚠ ומוצג רק כשהוא נכון — שורה קבועה "0 בלי קבלה"
            היא רעש שמפסיקים לראות. */}
        <div className="sec-label">
          קניות החודש
          {data.canUploadReceipt && monthOrders.some((o) => !o.receipt) && (
            <span className="sec-more">
              {monthOrders.filter((o) => !o.receipt).length} בלי קבלה
            </span>
          )}
        </div>
        {monthOrders.length === 0 ? (
          <div className="card" style={{ marginBottom: 10, fontSize: 13.5, color: "var(--muted)",
                                         fontWeight: 600, textAlign: "center" }}>
            עדיין לא נרשמה קנייה לחודש הזה
          </div>
        ) : (
          <div className="rows" style={{ marginBottom: 10 }}>
            {monthOrders.map((o) => (
              <div className="st-row" key={o.id} style={{ cursor: "default" }}>
                <div className="st-main">
                  <div className="st-n">{o.name}</div>
                  <div className="st-m">
                    <span className={"pill " + (o.kind === ORDER_KIND.weekly ? "p-ok" : "p-new")}>
                      {o.kind}
                    </span>
                    <span className="num">{shekel(o.amount)} ₪</span>
                    {o.kind === ORDER_KIND.quarterly && (
                      <span>· {o.months.map(monthLabel).join(" · ")}</span>
                    )}
                    {o.date && <span className="num">· {dm(o.date)}</span>}
                  </div>
                  <Receipt order={o} canUpload={data.canUploadReceipt} say={say} reload={reload} />
                  {/* ============================================================
                      ⚠⚠ **אישור לפני מחיקת קנייה — והוא אומר מה יוצא מהסכום.**

                      עד כאן "מחיקה" מחקה מיד: נגיעה אחת בטלפון על שורה של
                      2,637 ₪, בלי שאלה ובלי דרך לחזור. זה בדיוק מה ש-4ק
                      קובע ("מחיקה שקטה היא סוג הפעולה שאי אפשר לתקן")
                      ומה ש-5ו דורש מאישור על פעולה כספית: **כמה ומה**,
                      ולא "בטוח?".

                      ⚠ ואישור **בתוך המסך** ולא `confirm()` של הדפדפן —
                        הוא נראה זר, ובחלק מהדפדפנים במובייל הוא נחסם
                        לגמרי, כלומר הכפתור פשוט לא עושה כלום (4ק).
                      ============================================================ */}
                  {canWrite && del === o.id && (
                    <div className="ord-ask">
                      <div>למחוק את "{o.name}"? יורדו {shekel(o.share)} ₪ מהחודש
                        {o.kind === ORDER_KIND.quarterly && o.months.length > 1
                          && ` (ומהחודשים ${o.months.map(monthLabel).join(" · ")})`}.</div>
                      <div className="ord-ask-b">
                        <button className="btn btn-clay btn-sm" disabled={busyDel}
                          onClick={() => { setBusyDel(true);
                            api.deletePurchase(o.id)
                              .then(() => { say("הקנייה נמחקה"); setDel(null); reload(); })
                              .catch((e) => say(e.message))
                              .finally(() => setBusyDel(false)); }}>
                          {busyDel ? "מוחק…" : "כן, למחוק"}
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={busyDel}
                          onClick={() => setDel(null)}>ביטול</button>
                      </div>
                    </div>
                  )}
                </div>
                <b className="num" style={{ flex: "0 0 auto", color: "var(--clay)" }}>
                  −{shekel(o.share)}
                </b>
                {/* ⚠ מי שאינו רשאי לכתוב אינו רואה כפתור מחיקה.
                    ה-GET של התקציב פתוח לכל כניסת צוות והכתיבה
                    לראש המכינה ולאחראי המטבח (5יז), וכפתור שמחזיר
                    403 אחרי הלחיצה הוא בדיוק 4יד. */}
                {canWrite && (
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--clay)" }}
                    onClick={() => setDel(del === o.id ? null : o.id)}>
                    {del === o.id ? "סגירה" : "מחיקה"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginBottom: 16 }}
          onClick={() => setAdding(true)}><BI.plus />קנייה חדשה</button>

        <div className="sec-label">ימי החודש · לחיצה לשינוי</div>
        <div className="rows">
          {data.days.map((d) => (
            <button className="st-row" key={d.date} onClick={() => setEditing(d)}>
              <div className="bg-day num">
                <b>{dm(d.date)}</b>
                <span>{dowOf(d.date)}׳</span>
              </div>
              <div className="st-main">
                {/* ⚠ "שגרה + אחר" נכתב במפורש: מי שרואה יום יקר
                    צריך לדעת מיד ממה הוא מורכב. */}
                <div className="st-n" style={{ fontSize: 14.5 }}>
                  {d.type}{d.type2 ? ` + ${d.type2}` : ""}
                </div>
                <div className="st-m">
                  {d.overridden && <span className="pill p-new">נקבע ידנית</span>}
                  {d.note && <span>{d.note}</span>}
                  {!d.overridden && !d.note && d.total > 0 && (
                    <span className="num">
                      {d.catering > 0 ? `קייטרינג ${shekel(d.catering)}` : ""}
                      {d.catering > 0 && d.purchases > 0 ? " · " : ""}
                      {d.purchases > 0 ? `קניות ${shekel(d.purchases)}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <b className="num" style={{ flex: "0 0 auto", fontSize: 14.5,
                                          color: d.total ? "var(--ink)" : "var(--faint)" }}>
                {d.total ? shekel(d.total) + " ₪" : "—"}
              </b>
            </button>
          ))}
        </div>
        <div style={{ height: 30 }} />
      </>
      )}
    </>
  );
}
