/* ============================================================
   תפריט ומנות
   ------------------------------------------------------------
   אחראי המטבח כותב מנה פעם אחת — מצרכים לכמות אנשים אחת —
   ומשם כל כמות אחרת היא הכפלה. בוחרים מנות, מזינים כמה אוכלים,
   ומקבלים רשימת מצרכים מאוחדת מול המלאי.

   ⚠ הבדיקה מול המלאי היא התראה, לא חסימה. שם מצרך אינו תמיד
     שם הפריט בלוח, וההתאמה חלקית — "חסר" כאן פירושו "בדקו".
   ============================================================ */

import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import TextBlock from "./TextBlock.jsx";
import { useExcel, downloadTable, shareText } from "./excel.js";
import { parseItems, scaleItems, mergeItems, DEFAULT_BASE } from "../shared/dishes.js";
import { DAYS, MEALS, DAY_LETTER, dayNameOf } from "../shared/weekmenu.js";
import { israelDateStr } from "./testDate.js";

const MI = {
  chev: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>,
  plus: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  dish: (p) => <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 13h18a9 9 0 0 0-18 0z"/><path d="M2 17h20M12 4v-.01"/></svg>,
  cart: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>,
  warn: (p) => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 2 20h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/></svg>,
};

const qty = (n) => (n == null ? "לפי הטעם" : String(Math.round(n * 100) / 100));

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
  }, deps); // eslint-disable-line
  React.useEffect(run, [run]);
  return { data, err, busy, reload: run };
}

export function MenuPage({ say }) {
  useExcel();
  const { data, err, busy, reload } = useLoad(() => api.getMenu(), []);
  const [sub, setSub] = useState("week");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [picked, setPicked] = useState([]);
  const [heads, setHeads] = useState(String(DEFAULT_BASE));

  if (busy && !data) return <><div className="screen-title">תפריט ארוחות</div>
    <div className="skel skel-card" /><div className="skel skel-card" /></>;
  if (err) return (
    <>
      <div className="screen-title">תפריט ארוחות</div>
      <div className="alert a-clay"><MI.warn />
        <div style={{ flex: 1 }}>
          <div className="ttl">{err.setupRequired ? "לוח המנות טרם הוקם" : "לא הצלחנו לטעון"}</div>
          <div className="bd">{err.message}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={reload}>נסו שוב</button>
        </div>
      </div>
    </>
  );
  if (!data) return null;

  if (editing) {
    return <DishForm initial={editing.id ? editing : null}
      defaultBase={data.defaultBase} say={say}
      onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />;
  }
  if (viewing) return <DishView dish={viewing} onBack={() => setViewing(null)} />;

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      <div className="screen-title">תפריט ארוחות</div>

      <div className="seg">
        {/* ⚠ "ארוחות שבועיות" ראשון — זו השאלה שרוב המכינה
            נכנסת בשבילה ("מה אוכלים השבוע"), ואילו תכנון ארוחה
            והמנות הם כלי עבודה של אחראי המטבח. */}
        <button className={sub === "week" ? "on" : ""} onClick={() => setSub("week")}>ארוחות שבועיות</button>
        <button className={sub === "plan" ? "on" : ""} onClick={() => setSub("plan")}>תכנון ארוחה</button>
        <button className={sub === "dishes" ? "on" : ""} onClick={() => setSub("dishes")}>
          המנות ({data.counts.dishes})
        </button>
      </div>

      {sub === "week" && <WeeklyMeals say={say} />}

      {sub === "dishes" && (
        <>
          {data.dishes.length === 0 ? (
            <div className="empty tone-3">
              <div className="e-ico"><MI.dish /></div>
              <div className="e1">עדיין אין מנות</div>
              <div className="e2">
                מוסיפים מנה פעם אחת עם המצרכים לכמות אנשים אחת, ומשם כל כמות אחרת מחושבת לבד.
              </div>
            </div>
          ) : (
            <div className="rows">
              {data.dishes.map((d) => (
                /* ⚠ מי שאינו רשאי לערוך עדיין רואה את המנה —
                   הלחיצה פותחת אותה לקריאה. */
                <button className="st-row" key={d.id}
                  onClick={() => data.canEdit ? setEditing(d) : setViewing(d)}>
                  <div className="tile sm"><MI.dish /></div>
                  <div className="st-main">
                    <div className="st-n">{d.name}</div>
                    <div className="st-m">
                      <span>מצרכים ל-{d.baseHeads}</span>
                      <span>· {parseItems(d.items).length} מצרכים</span>
                    </div>
                  </div>
                  <MI.chev style={{ color: "var(--line2)", flex: "0 0 auto" }} />
                </button>
              ))}
            </div>
          )}

          {data.canEdit && (
            <>
              <div className="sticky">
                <button className="btn btn-primary" onClick={() => setEditing({})}>
                  <MI.plus />מנה חדשה
                </button>
              </div>
              <div style={{ height: 60 }} />
            </>
          )}
        </>
      )}

      {sub === "plan" && (
        <Planner dishes={data.dishes} picked={picked} onToggle={toggle}
          heads={heads} setHeads={setHeads} meals={data.meals} say={say}
          canEdit={data.canEdit} onReload={reload} />
      )}
    </>
  );
}

/* ---------- תכנון ארוחה ---------- */
function Planner({ dishes, picked, onToggle, heads, setHeads, meals, say, canEdit, onReload }) {
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const n = Number(heads) || 0;

  /* ⚠ תצוגה מקדימה מקומית, מאותה נוסחה של השרת (shared/dishes).
     היא מיידית; הבדיקה מול המלאי מגיעה מהשרת. */
  const preview = picked.length && n > 0
    ? mergeItems(picked
        .map((id) => dishes.find((d) => d.id === id))
        .filter(Boolean)
        .map((d) => scaleItems(parseItems(d.items), d.baseHeads, n)))
    : [];

  const check = () => {
    if (!picked.length) { say("בחרו מנה אחת לפחות"); return; }
    if (!(n > 0)) { say("הזינו מספר סועדים"); return; }
    setBusy(true);
    api.planMenu({ dishIds: picked, heads: n })
      .then((r) => setPlan(r))
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const toShopping = () => {
    if (!plan) return;
    const short = plan.items.filter((i) => i.short > 0 || !i.known);
    if (!short.length) { say("אין מה להוסיף — הכול במלאי"); return; }
    setBusy(true);
    api.addKitchenShopping(
      short.map((i) => ({
        name: i.name,
        qty: i.short > 0 ? `${qty(i.short)}${i.unit ? " " + i.unit : ""}`
          : `${qty(i.qty)}${i.unit ? " " + i.unit : ""}`,
      })),
      "אוכל"
    )
      .then(() => { say(`${short.length} פריטים נוספו לרשימת הקניות`); onReload(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="fld">
          <label>כמה אוכלים</label>
          <input value={heads} onChange={(e) => setHeads(e.target.value)} inputMode="numeric" />
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            הכמויות מוכפלות מהמנה. מצרך שנכתב בלי כמות נשאר "לפי הטעם".
          </div>
        </div>
      </div>

      <div className="sec-label">בחירת מנות ({picked.length})</div>
      {dishes.length === 0 ? (
        <div className="empty tone-3">
          <div className="e-ico"><MI.dish /></div>
          <div className="e1">אין מנות לבחור</div>
          <div className="e2">הוסיפו מנה בלשונית "המנות".</div>
        </div>
      ) : (
        /* ---------- כרטיסייה לכל מנה ----------
           ⚠ הכרטיס מראה את המצרכים **בכמות שנבחרה**, לא בכמות
             שנשמרה. זו כל התועלת: מי שמתכנן ל-17 רוצה לראות
             2.92 קילו, לא "6 קילו ל-35" ולחשב בראש.

           ⚠ ולכן גם מנה שלא נבחרה מציגה את הכמות המחושבת —
             ההחלטה אם לקחת אותה תלויה בדיוק במספר הזה. */
        <div className="dish-grid">
          {dishes.map((d) => {
            const on = picked.includes(d.id);
            const items = n > 0
              ? scaleItems(parseItems(d.items), d.baseHeads, n)
              : parseItems(d.items);
            return (
              <button className={"dish-card" + (on ? " on" : "")} key={d.id}
                onClick={() => onToggle(d.id)}>
                <div className="dish-top">
                  <div className={"tick" + (on ? " on" : "")}>
                    {on && <span style={{ color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                  <div className="dish-nm">
                    <b>{d.name}</b>
                    <span>{n > 0 ? `מצרכים ל-${n} סועדים` : `מצרכים ל-${d.baseHeads}`}</span>
                  </div>
                  <MI.dish style={{ color: on ? "var(--accent)" : "var(--line2)", flex: "0 0 auto" }} />
                </div>

                {items.length > 0 && (
                  <div className="dish-items">
                    {items.map((it, i) => (
                      <span className="dish-it" key={i}>
                        {it.name}
                        <b>{qty(it.qty)}{it.unit ? ` ${it.unit}` : ""}</b>
                      </span>
                    ))}
                  </div>
                )}

                {d.how && <div className="dish-how">{d.how}</div>}
              </button>
            );
          })}
        </div>
      )}

      {preview.length > 0 && (
        <>
          <div className="sec-label">מה צריך · {n} סועדים</div>
          <div className="card" style={{ marginBottom: 12 }}>
            {preview.map((it, i) => (
              <div className="ing" key={i}>
                <span className="ing-n">{it.name}</span>
                <b className="num">{qty(it.qty)}{it.unit ? ` ${it.unit}` : ""}</b>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" disabled={busy} onClick={check}>
            {busy ? "בודק…" : "בדיקה מול המלאי"}
          </button>
        </>
      )}

      {plan && (
        <>
          <div className="sec-label">מול המלאי</div>
          <div className="band" style={{ marginTop: 0 }}>
            <div className="band-grid">
              <div className="band-c">
                <div className="band-n">{plan.counts.items}</div>
                <div className="band-l">מצרכים</div>
              </div>
              <div className="band-c">
                <div className={"band-n" + (plan.counts.short ? " warn" : " ok")}>{plan.counts.short}</div>
                <div className="band-l">חסרים</div>
              </div>
              <div className="band-c">
                <div className="band-n">{plan.counts.unknown}</div>
                <div className="band-l">לא נמצאו במלאי</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            {plan.items.map((it, i) => (
              <div className={"ing" + (it.short > 0 ? " short" : !it.known ? " unk" : "")} key={i}>
                <span className="ing-n">
                  {it.name}
                  {/* ⚠ שלושה מצבים ולא שניים: יש · חסר · לא נמצא.
                      "לא נמצא" אינו "חסר" — ייתכן שהוא במלאי
                      בשם אחר, וזו בדיקה של אדם. */}
                  {it.short > 0 && <span className="pill p-low">חסר {qty(it.short)}</span>}
                  {!it.known && <span className="pill p-new">לא נמצא במלאי</span>}
                </span>
                <b className="num">
                  {qty(it.qty)}{it.unit ? ` ${it.unit}` : ""}
                  {it.known && <span className="ing-have"> · יש {it.have}</span>}
                </b>
              </div>
            ))}
          </div>

          {canEdit && (
            <button className="btn btn-primary" disabled={busy} onClick={toShopping}>
              <MI.cart />הוספת החסרים לרשימת הקניות
            </button>
          )}
          <button className="btn btn-ghost" style={{ marginTop: 8 }}
            onClick={() => {
              downloadTable({
                file: "מצרכים", sheet: "מצרכים",
                title: `מצרכים ל-${plan.heads} סועדים · ${plan.dishes.map((d) => d.name).join(", ")}`,
                header: ["מצרך", "כמות", "יחידה", "במלאי", "חסר"],
                rows: plan.items.map((i) => [i.name, i.qty ?? "לפי הטעם", i.unit || "",
                  i.known ? i.have : "לא נמצא", i.short || ""]),
                widths: [26, 10, 10, 10, 8],
              });
              say("הקובץ ירד");
            }}>הורדה לאקסל</button>
          <div style={{ height: 40 }} />
        </>
      )}
    </>
  );
}

/* ---------- מנה לקריאה ----------
   ⚠ מי שאינו אחראי מטבח רואה את המנה במלואה ואינו יכול לשנות
     אותה. חסימת הצפייה הייתה מסתירה בדיוק את מה שהתפריט נועד
     לתת — מה יש במנה. */
function DishView({ dish, onBack }) {
  const items = parseItems(dish.items);
  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>
        <MI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{dish.name}</div>
      <div className="card lift">
        <div className="sec-label" style={{ marginTop: 0 }}>מצרכים ל-{dish.baseHeads} סועדים</div>
        {items.map((it, i) => (
          <div className="ing" key={i}>
            <span className="ing-n">{it.name}</span>
            <b className="num">{qty(it.qty)}{it.unit ? ` ${it.unit}` : ""}</b>
          </div>
        ))}
        {dish.how && (
          <>
            <div className="sec-label">הוראות הכנה</div>
            <div className="rl-desc">{dish.how}</div>
          </>
        )}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}

/* ---------- טופס מנה ---------- */
function DishForm({ initial, defaultBase, say, onDone, onCancel }) {
  /* ⚠ בלי "סוג". מנה היא שם, כמות אנשים ומצרכים — סיווג
     שאיש אינו מסנן לפיו הוא שדה שצריך למלא בלי סיבה. */
  const [f, setF] = useState({
    name: initial?.name || "",
    baseHeads: String(initial?.baseHeads || defaultBase),
    items: initial?.items || "", how: initial?.how || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const parsed = parseItems(f.items);

  const save = () => {
    if (busy || !f.name.trim()) return;
    setBusy(true);
    const call = initial
      ? api.editDish({ dishId: initial.id, ...f })
      : api.addDish(f);
    call.then(() => { say(initial ? "המנה עודכנה" : "המנה נוספה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (busy || !initial) return;
    setBusy(true);
    api.deleteDish(initial.id)
      .then(() => { say("המנה נמחקה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <MI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{initial ? "עריכת מנה" : "מנה חדשה"}</div>

      <div className="card lift">
        <div className="fld">
          <label>שם המנה</label>
          <input value={f.name} onChange={set("name")} disabled={busy} placeholder="למשל: שניצל" />
        </div>

        <div className="fld">
          <label>המצרכים למטה הם עבור כמה אנשים</label>
          <input value={f.baseHeads} onChange={set("baseHeads")} disabled={busy} inputMode="numeric" />
          <div style={{ fontSize: 11.5, color: "var(--faint)", fontWeight: 600, marginTop: 4 }}>
            ⚠ זה המספר שכל הכמויות מתייחסות אליו. כמות אחרת מחושבת ממנו בהכפלה.
          </div>
        </div>

        <div className="fld">
          <label>מצרכים</label>
          <textarea value={f.items} onChange={set("items")} disabled={busy} rows={6}
            placeholder={"שורה לכל מצרך, למשל:\nחזה עוף 6 קילו\nביצים 20\nמלח"} />
          {parsed.length > 0 && (
            <div className="ing-prev">
              {parsed.map((it, i) => (
                <span key={i}>{it.name} <b>{qty(it.qty)}</b>{it.unit ? ` ${it.unit}` : ""}</span>
              ))}
            </div>
          )}
        </div>

        <div className="fld">
          <label>הוראות הכנה</label>
          <textarea value={f.how} onChange={set("how")} disabled={busy} rows={5} />
        </div>

        <button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        {initial && (
          <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--clay)" }}
            disabled={busy} onClick={remove}>מחיקת המנה</button>
        )}
      </div>
      <div style={{ height: 40 }} />
    </>
  );
}

/* ============================================================
   ארוחות שבועיות
   ------------------------------------------------------------
   ⚠⚠ **בלוק טקסט, וזו נקודת המוצא ולא הפתרון.**

   מה שהמכינה צריכה בסוף הוא תפריט מובנה — מנה לכל ארוחה,
   כמויות, וקישור למלאי ולרשימת הקניות. אבל מבנה שנקבע לפני
   שראינו איך התפריט **באמת** כתוב יישבר בעריכה הראשונה, וזה
   בדיוק מה שקרה ב"נהלים במכינה": הקוד אינו מכיר את תוכנו,
   ובכוונה.

   ⚠ **ובינתיים זה כבר שימושי היום** — אחראי המטבח מדביק את
     התפריט של השבוע וכל המכינה רואה אותו, בלי דיפלוי ובלי
     לוח חדש.

   ⚠ **`menuText` ולא `headText`.** התפריט אינו נוהל של
     המכינה אלא תוכן תפעולי של המטבח, ומי שכותב אותו הוא
     אחראי המטבח. שימוש חוזר בדגל הנהלים היה סוגר לו את
     המסך (5יז).

   ⚠ **ומצב "טרם נכתב" מוצג כאן**, בניגוד לכלל של ScreenNote
     שמחזיר null על בלוק ריק. שם הבלוק הוא תוספת למסך; כאן
     הוא **כל** הלשונית, ולשונית ריקה בלי מילה נראית שבורה
     (עיקרון 6).
   ============================================================ */
/* ============================================================
   ארוחות שבועיות — טבלה, לא בלוק טקסט
   ------------------------------------------------------------
   ⚠⚠ **התפריט חוזר על עצמו ואינו תלוי בתאריך.** "יום שני —
     ארוחת ערב" הוא התפריט של כל יום שני, עד שאחראי המטבח
     ישנה אותו. ראו shared/weekmenu.js, ולמה זה לוח נפרד
     מלוח `menus` שמחזיק ארוחה לתאריך.

   ⚠ **נפתח על היום של היום.** מי שנכנס למסך שואל "מה אוכלים
     היום", וזו התשובה שצריכה להיות מול העיניים בלי לחיצה.
     ⚠ ובשעון ישראל ודרך `?date=` — `new Date()` גולמי היה
       פותח על היום הלא-נכון בערב וב-UTC (4פ).

   ⚠ **יום שלם ולא רשת של 21 תאים.** רשת שלמה בטלפון נותנת
     תאים של שישה פיקסלים: קריאה כרשת, בלתי קריאה כתפריט —
     אותו לקח של לוח הנוכחות (4פ). מי שרוצה את כל השבוע מקבל
     אותו בלשונית "כל השבוע", דחוס ובלי המצרכים.

   ⚠ **תא ריק מוצג ואינו מדולג.** יום בלי ארוחת צהריים אינו
     יום שאין בו צהריים — הוא יום שטרם הוזן, וזו הבחנה שאי
     אפשר לעשות ברשימה שמדלגת (עיקרון 6).
   ============================================================ */
function WeeklyMeals({ say }) {
  const today = dayNameOf(israelDateStr()) || DAYS[0];
  const [day, setDay] = useState(today);
  const [view, setView] = useState("day"); // day · week
  const [edit, setEdit] = useState(null);  // { day, meal, ...cell }
  const [n, setN] = useState(0);
  const { data, err, busy, reload } = useLoad(() => api.getWeekMenu(), [n]);

  useEffect(() => { if (n) reload(); }, [n]); // eslint-disable-line

  if (busy && !data) return <div className="skel skel-card" />;
  if (err) return (
    <div className={"alert " + (err.setupRequired ? "a-amber" : "a-clay")}>
      <MI.warn />
      <div style={{ flex: 1 }}>
        <div className="ttl">{err.setupRequired ? "התפריט השבועי טרם הוקם" : "התפריט לא נטען"}</div>
        <div className="bd">{err.message}</div>
        {!err.setupRequired && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
            onClick={() => setN((x) => x + 1)}>נסו שוב</button>
        )}
      </div>
    </div>
  );
  if (!data) return null;

  if (edit) return (
    <CellForm cell={edit} dishes={data.dishes} say={say}
      onDone={() => { setEdit(null); setN((x) => x + 1); }}
      onCancel={() => setEdit(null)} />
  );

  const row = data.grid.find((g) => g.day === day) || data.grid[0];

  return (
    <>
      {/* ⚠ הרצועה אומרת כמה מהתמונה כבר מולא. "התפריט" שמוצג
          כשמולאו בו שלושה תאים מתוך 21 נראה שלם עד שמחפשים
          בו משהו (4יח). */}
      <div className="wm-bar">
        <span>{data.counts.filled} מתוך {data.counts.total} ארוחות הוזנו</span>
        {data.canEdit
          ? <b>אפשר לערוך</b>
          : <b title={data.editHint || ""}>לצפייה בלבד</b>}
      </div>

      <div className="seg wm-seg">
        <button className={view === "day" ? "on" : ""} onClick={() => setView("day")}>יום אחד</button>
        <button className={view === "week" ? "on" : ""} onClick={() => setView("week")}>כל השבוע</button>
      </div>

      {view === "day" ? (
        <>
          <div className="wm-days">
            {data.grid.map((g) => (
              <button key={g.day} className={(g.day === day ? "on " : "") + (g.day === today ? "now" : "")}
                onClick={() => setDay(g.day)}>
                {g.letter}
                {g.day === today && <i>היום</i>}
              </button>
            ))}
          </div>

          {row.meals.map((c) => (
            <MealCard key={c.meal} c={c} canEdit={data.canEdit}
              onEdit={() => setEdit({ ...c, day: row.day })} />
          ))}
        </>
      ) : (
        /* ⚠ **גלילה אופקית בתוך מכל משלה** — טבלה רחבה שגורמת
            לגוף הדף לגלול לצדדים היא בדיוק מה שאסור. */
        <div className="wm-wrap">
          <table className="wm-tbl">
            <thead>
              <tr>
                <th />
                {DAYS.map((d) => (
                  <th key={d} className={d === today ? "now" : ""}>{DAY_LETTER[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEALS.map((m) => (
                <tr key={m}>
                  <th className="wm-rh">{m.replace("ארוחת ", "")}</th>
                  {DAYS.map((d) => {
                    const g = data.grid.find((x) => x.day === d);
                    const c = g ? g.meals.find((x) => x.meal === m) : null;
                    return (
                      <td key={d} className={c && c.filled ? "" : "wm-e"}>
                        {c && c.filled
                          ? <button className="wm-cell" onClick={() => { setDay(d); setView("day"); }}>
                              {String(c.main || "").split("\n")[0] || "—"}
                            </button>
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.missingDishes.length > 0 && (
        /* ⚠ מנה שנמחקה מדווחת ואינה נעלמת — חלק מהמצרכים לא
            יחושבו, ומי שמסתכל צריך לדעת למה (4ט). */
        <div className="note-warn"><MI.warn />
          {data.missingDishes.length} מנות מקושרות אינן קיימות עוד בלוח המנות
        </div>
      )}

      <WeeklyNote say={say} />
    </>
  );
}

/* ---------- ארוחה אחת ---------- */
function MealCard({ c, canEdit, onEdit }) {
  const line = (label, v) => (String(v || "").trim() ? (
    <div className="wm-l"><span>{label}</span><div>{v}</div></div>
  ) : null);

  return (
    <div className="card wm-card">
      <div className="wm-h">
        <b>{c.meal}</b>
        {canEdit && (
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>
            {c.filled ? "עריכה" : "מילוי"}
          </button>
        )}
      </div>

      {!c.filled ? (
        <div className="wm-empty">טרם הוזן</div>
      ) : (
        <>
          {c.main && <div className="wm-main">{c.main}</div>}
          {line("ללא גלוטן", c.gf)}
          {line("תוספת", c.side)}
          {line("חלבון נוסף", c.protein)}
          {line("מצרכים", c.items)}
          {c.dishNames && c.dishNames.length > 0 && (
            <div className="wm-l">
              <span>מנות</span>
              <div>{c.dishNames.map((d) => d.name).join(" · ")}</div>
            </div>
          )}
          {/* ⚠ **מחושב בשרת ומוצג כאן.** אותה רשימה בדיוק שמסך
              התכנון מקבל — שני חישובים היו נותנים שני מספרים. */}
          {c.computed && c.computed.length > 0 && (
            <div className="wm-calc">
              <div className="wm-calc-h">מצרכים מחושבים מהמנות</div>
              {c.computed.map((it, i) => (
                <div className="wm-calc-r" key={i}>
                  <span>{it.name}</span>
                  <b>{qty(it.qty)}{it.unit ? " " + it.unit : ""}</b>
                </div>
              ))}
            </div>
          )}
          {c.note && <div className="wm-note">{c.note}</div>}
        </>
      )}
    </div>
  );
}

/* ---------- עריכת תא ---------- */
function CellForm({ cell, dishes, say, onDone, onCancel }) {
  const [f, setF] = useState({
    main: cell.main || "", gf: cell.gf || "", side: cell.side || "",
    protein: cell.protein || "", items: cell.items || "", note: cell.note || "",
  });
  const [picked, setPicked] = useState(cell.dishes || []);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () => {
    if (busy) return;
    setBusy(true);
    api.setWeekMenuCell({ day: cell.day, meal: cell.meal, ...f, dishes: picked })
      .then(() => { say("נשמר"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };
  const clear = () => {
    if (busy) return;
    setBusy(true);
    api.clearWeekMenuCell({ day: cell.day, meal: cell.meal })
      .then(() => { say("התא נוקה"); onDone(); })
      .catch((e) => say(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onCancel}>
        <MI.chev style={{ transform: "rotate(180deg)" }} />חזרה
      </button>
      <div className="screen-title">{cell.day} · {cell.meal}</div>

      <div className="card lift">
        <div className="fld">
          <label>מנה עיקרית</label>
          <textarea rows={2} value={f.main} onChange={set("main")} disabled={busy}
            placeholder="למשל: פסטה ברוטב שמנת פטריות" />
        </div>
        <div className="fld">
          <label>ללא גלוטן</label>
          <input value={f.gf} onChange={set("gf")} disabled={busy}
            placeholder="מה מקבל מי שאינו אוכל גלוטן" />
        </div>
        <div className="fld">
          <label>תוספת</label>
          <textarea rows={2} value={f.side} onChange={set("side")} disabled={busy} />
        </div>
        <div className="fld">
          <label>חלבון נוסף</label>
          <input value={f.protein} onChange={set("protein")} disabled={busy} />
        </div>

        {/* ============================================================
            ⚠ **המנות אינן מחליפות את שדה המצרכים.** חלק מהארוחות
              אינן "מנה" — לחם, גבינות, ממרחים — ומי שיאלץ להגדיר
              להן מנה פשוט לא ימלא כלום. מי שכן מקשר מנה מקבל את
              המצרכים מחושבים לכמות הסועדים ואינו מקליד אותם.
            ============================================================ */}
        <div className="fld">
          <label>מנות מלוח המנות (לא חובה)</label>
          <div className="rows scroll-y wm-pick">
            {dishes.length === 0 && <div className="wm-empty">אין עדיין מנות בלוח</div>}
            {dishes.map((d) => {
              const on = picked.includes(d.id);
              return (
                <button className="st-row" key={d.id} disabled={busy}
                  onClick={() => setPicked((p) => on ? p.filter((x) => x !== d.id) : [...p, d.id])}>
                  <div className={"tick" + (on ? " on" : "")} />
                  <div className="st-main">
                    <div className="st-n">{d.name}</div>
                    <div className="st-m"><span>מצרכים ל-{d.baseHeads}</span></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="fld">
          <label>מצרכים (טקסט חופשי)</label>
          <textarea rows={3} value={f.items} onChange={set("items")} disabled={busy}
            placeholder="למשל: 3 קג פסטה, 3 חב׳ שמנת, פטריות, תבלינים" />
        </div>
        <div className="fld">
          <label>הערה</label>
          <input value={f.note} onChange={set("note")} disabled={busy} />
        </div>

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy} onClick={save}>
          {busy ? "שומר…" : "שמירה"}
        </button>
        {cell.id && (
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }}
            disabled={busy} onClick={clear}>ניקוי התא</button>
        )}
      </div>
    </>
  );
}

/* ---------- הערת המטבח, מתחת לטבלה ----------
   ⚠ **הבלוק נשאר ולא נמחק.** מה שכבר נכתב ב"ארוחות שבועיות"
     הוא טקסט של המכינה, ומחיקתו הייתה מוחקת עבודה של מישהו.
     הוא יורד לתחתית ומופיע רק כשיש בו משהו (4ש). */
function WeeklyNote({ say }) {
  const [block, setBlock] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    api.getChores()
      .then((r) => {
        if (!alive) return;
        setBlock((r.texts || []).find((t) => t.key === "menu.weekly") || null);
        setCanEdit(Boolean(r.me && r.me.menuText));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [n]);

  if (!block) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <TextBlock block={block} canEdit={canEdit} say={say}
        onSaved={() => setN((x) => x + 1)} />
    </div>
  );
}

export const MENU_CSS = `
.wm-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;
  font-size:12px;font-weight:800;color:var(--muted);background:var(--soft);
  border-radius:var(--r-md);padding:9px 12px;margin-bottom:10px}
.wm-seg{margin-bottom:12px}

/* ⚠ שבע אותיות ברוחב שווה — לא רצועה נגללת. שבעה פריטים
   נכנסים תמיד, וחץ גלילה עליהם היה רעש (4ר). */
.wm-days{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-bottom:12px;
  direction:rtl}
.kx .wm-days button{position:relative;padding:9px 0;border-radius:var(--r-sm);
  border:1px solid var(--line2);background:var(--surface);color:var(--muted);
  font-size:14px;font-weight:900;transition:all .12s var(--ease)}
.kx .wm-days button.now{border-color:var(--accent)}
.kx .wm-days button.on{background:var(--navy);border-color:var(--navy);color:#fff}
.wm-days button i{display:block;font-size:8.5px;font-style:normal;font-weight:800;
  opacity:.75;margin-top:1px}

.wm-card{margin-bottom:10px}
.wm-h{display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin-bottom:8px}
.wm-h b{font-size:14px;font-weight:900;color:var(--ink)}
.wm-main{font-size:15px;font-weight:900;color:var(--ink);line-height:1.45;
  white-space:pre-wrap;margin-bottom:8px}
.wm-l{display:flex;gap:9px;font-size:12.5px;line-height:1.55;margin-top:5px}
.wm-l span{flex:0 0 74px;color:var(--faint);font-weight:800}
.wm-l div{flex:1;color:var(--ink);font-weight:600;white-space:pre-wrap}
.wm-empty{font-size:12.5px;font-weight:700;color:var(--faint);padding:4px 0}
.wm-note{margin-top:9px;font-size:11.5px;font-weight:700;color:var(--faint);
  white-space:pre-wrap}
.wm-calc{margin-top:10px;background:var(--soft);border-radius:var(--r-sm);padding:9px 11px}
.wm-calc-h{font-size:11px;font-weight:900;color:var(--faint);margin-bottom:5px}
.wm-calc-r{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;
  font-weight:700;color:var(--ink);padding:2px 0}
.wm-calc-r b{font-variant-numeric:tabular-nums}

.wm-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:12px}
.wm-tbl{width:100%;min-width:520px;border-collapse:collapse;direction:rtl}
.wm-tbl th,.wm-tbl td{border:1px solid var(--line2);padding:7px 6px;font-size:11.5px;
  text-align:center;vertical-align:middle}
.wm-tbl thead th{background:var(--soft);font-weight:900;color:var(--muted);width:13%}
.wm-tbl thead th.now{color:var(--accent)}
.wm-rh{background:var(--soft);font-weight:900;color:var(--muted);white-space:nowrap;width:9%}
.wm-e{color:var(--faint)}
.kx .wm-cell{padding:0;background:none;border:0;font-size:11.5px;font-weight:700;
  color:var(--ink);line-height:1.4;text-align:center;width:100%}

/* ⚠ scroll-y הקיימת ולא max-height חדש: כלל כזה בתוך
   .rows נבלע על ידי .kx .rows overflow:hidden (4ק).
   ⚠⚠ ואין בקטיקים בהערות CSS — הבלוק הזה הוא template literal,
   ובקטיק סוגר אותו ומפיל את כל הקובץ (ראו styles.js). */
.wm-pick{max-height:38vh}
`;
