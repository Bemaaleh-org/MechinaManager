/* עוצב בפרוטוטייפ. הועתק כלשונו. */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&family=Suez+One&display=swap');

/* ⚠ שוליי ברירת המחדל של הדפדפן על body יצרו רצועה בהירה מעל
   הסרגל הכחול באייפון. ה-reset למטה מכסה רק את .kx וצאצאיו.
   רקע כחול על body מבטיח שגם בגלילת יתר ובזמן הטעינה — לפני
   ש-React מרנדר — לא תופיע רצועה בהירה בקצה העליון. */
html,body{margin:0;padding:0;background:#012E58}

.kx, .kx *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
.kx{
  --bg:#F5F1E8; --surface:#fff; --ink:#1F2733; --muted:#6B6455; --faint:#A29A88;
  --line:#E7E0D2; --line2:#D3C9B6;
  --accent:#002454; --accent-soft:#DDE5F0;
  --amber:#8A5A1E; --amber-soft:#F5EBDA;
  --clay:#9E3626; --clay-soft:#F8E6E2;
  --brand-clay:#906048; --brand-clay-soft:#EFE6DE;
  --ok:#1F6B45; --ok-soft:#E1EFE8;

  /* ---- רדיוסים, צללים ותנועה ----
     ⚠ הצל בשתי שכבות: קו דק וצמוד שמגדיר את הקצה, ופיזור רחב
       ורך שמרים את הכרטיס מהרקע. שכבה אחת נותנת או קצה חד או
       ערפל — לא את שתיהן. */
  --r-lg:20px; --r-md:14px; --r-sm:10px;
  --sh-1:0 1px 2px rgba(47,38,22,.05), 0 8px 20px -12px rgba(47,38,22,.18);
  --sh-2:0 2px 5px rgba(47,38,22,.06), 0 20px 44px -20px rgba(47,38,22,.3);
  --ease:cubic-bezier(.22,1,.36,1);

  /* ---- פלטת הקטגוריות ----
     ⚠ שמונה צבעים, כל אחד ברמת מילוי רכה וברמת דיו. ענף, סדרה,
       ועדה וקבוצה מקבלים כל אחד את שלו, וגם כל פריט בתוכם —
       נוי אינו רפת. הצבע נגזר מהשם (ראו tone ב-Placements),
       ולכן ענף חדש שיתווסף בלוח מקבל צבע מעצמו, בלי דיפלוי
       ובלי עמודת צבע לתחזק. */
  --t1:#0E7C6B; --t1-s:#DEF2EE;
  --t2:#3B4C9E; --t2-s:#E4E7F7;
  --t3:#9A6410; --t3-s:#FAEDD9;
  --t4:#A83A5B; --t4-s:#F9E3E9;
  --t5:#6D4796; --t5-s:#ECE4F6;
  --t6:#16639E; --t6-s:#DEEAF6;
  --t7:#5B7A2E; --t7-s:#EAF1DB;
  --t8:#A84B32; --t8-s:#FAE5DF;
  font-family:'Heebo',system-ui,-apple-system,'Segoe UI',Arial,sans-serif;
  direction:rtl; background:var(--bg); color:var(--ink);
  min-height:100vh; padding-bottom:28px; font-size:16px; line-height:1.45;
  font-feature-settings:'tnum' 1;
}
.kx button{font-family:inherit;font-size:inherit;color:inherit;background:none;border:none;cursor:pointer}
.kx input,.kx select,.kx textarea{font-family:inherit;font-size:inherit;color:inherit}
.num{font-variant-numeric:tabular-nums}

/* ---- shell ---- */
/* ⚠ אזור בטוח באייפון. עם black-translucent + viewport-fit=cover
   האפליקציה מצוירת מתחת לשעון ולמצלמה.

   הריפוד הוא בתוך האלמנט ולכן הרקע הכחול מכסה גם אותו — הכחול
   מגיע עד קצה המסך, והתוכן בלבד נדחף מטה. env() מחזיר 0 בדפדפן
   רגיל ובאנדרואיד, ולכן שם שום דבר לא משתנה. */
.top{position:sticky;top:0;z-index:40;color:#fff;
  background:linear-gradient(135deg,#012E58 0%,#0A4478 100%);
  padding:calc(12px + env(safe-area-inset-top)) 16px 12px}
.top-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.top h1{font-size:18px;font-weight:800;letter-spacing:-.4px;line-height:1.15}
.top .sub{font-size:12px;opacity:.72;font-weight:500;margin-top:2px}
.brand-coin{width:46px;height:46px;border-radius:50%;background:#fff;display:grid;place-items:center;
  flex:0 0 auto;box-shadow:0 2px 8px rgba(0,0,0,.18)}
.brand-coin img{width:38px;height:38px;object-fit:contain;display:block}
.who{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);
  padding:7px 11px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap}
.who .dot{width:7px;height:7px;border-radius:50%;background:#7FB3E0}

.wrap{padding:16px 14px 24px;max-width:640px;margin:0 auto;
  padding-right:calc(14px + env(safe-area-inset-right));
  padding-left:calc(14px + env(safe-area-inset-left))}
.sec-label{font-size:11.5px;font-weight:800;letter-spacing:.9px;color:var(--faint);margin:22px 2px 9px}
/* כותרת מסך מלאה, מעל בורר המצבים */
.screen-title{font-family:'Suez One',Heebo,serif;font-size:23px;font-weight:400;letter-spacing:0;margin:2px 2px 14px;line-height:1.3}
.screen-title + .sec-label{margin-top:4px}
.sec-label:first-child{margin-top:4px}

/* ---- day ledger (signature) ---- */
.ledger{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.led-head{padding:13px 16px 11px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline}
.led-head .d{font-size:15px;font-weight:800}
.led-head .duty{font-size:12.5px;color:var(--muted);font-weight:600}
.led-item{display:flex;align-items:center;gap:13px;padding:14px 16px;border-bottom:1px solid var(--line);
  width:100%;text-align:right;min-height:62px;transition:background .13s}
.led-item:last-child{border-bottom:none}
.led-item:active{background:#F7F3EA}
.tick{width:26px;height:26px;border-radius:8px;border:2px solid var(--line2);flex:0 0 26px;
  display:grid;place-items:center;transition:all .15s}
.tick.on{background:var(--ok);border-color:var(--ok)}
.tick.due{border-color:var(--amber);background:var(--amber-soft)}
.tick.late{border-color:var(--clay);background:var(--clay)}
.led-txt{flex:1;min-width:0}
.led-txt .t{font-size:15.5px;font-weight:700;letter-spacing:-.2px}
.led-txt .s{font-size:12.5px;color:var(--muted);margin-top:1px;font-weight:500}
.led-item.done .led-txt .t{color:var(--faint);text-decoration:line-through;text-decoration-thickness:1.5px}

/* משימות ניקיון — יושבות בתוך .ledger ומשתמשות באותם מרווחים,
   טיפוגרפיה ו-tick של שורות הצ'ק ליסט שמעליהן. ההבדל היחיד:
   השורה מתפצלת לשני אזורי לחיצה, סימון והרחבה. */
.task-row{border-bottom:1px solid var(--line)}
.task-row:last-child{border-bottom:none}
.task-main{display:flex;align-items:center;gap:13px;padding:14px 16px;min-height:62px}
.task-tick{flex:0 0 26px;display:grid;place-items:center}
.task-txt{flex:1;min-width:0;text-align:right;display:block}
.task-txt .t{display:block;font-size:15.5px;font-weight:700;letter-spacing:-.2px}
.task-txt .s{display:block;font-size:12.5px;color:var(--muted);margin-top:1px;font-weight:500}
.task-row.done .task-txt .t{color:var(--faint);text-decoration:line-through;text-decoration-thickness:1.5px}
.task-more{flex:0 0 24px;color:var(--faint);display:grid;place-items:center}
/* חץ ניווט למשימה שיש לה יעד. כהה יותר מחץ הפירוט, כי הניווט
   הוא הפעולה העיקרית בשורה כזו. */
.task-go{flex:0 0 30px;color:var(--accent);display:grid;place-items:center;min-height:44px}
.task-detail{padding:0 16px 14px 55px;font-size:13.5px;line-height:1.6;color:var(--muted);
  font-weight:500;white-space:pre-wrap}
.led-empty{padding:26px 16px;text-align:center;font-size:13.5px;color:var(--muted);font-weight:600}

/* מסך כניסה — משתמש במחלקות הקיימות (.card .fld .btn .rows).
   נשאר רק מרכוז אנכי, גודל הלוגו, ורשימת השמות שצריכה לגלול
   כשיש 33 חניכים. */
/* רקע שקוף, בלי מסגרת ובלי צל — הסמל עומד בפני עצמו */
.login-mark{display:block;width:140px;height:140px;object-fit:contain;
  margin:0 auto 16px;border:none;box-shadow:none;background:none}
/* מתקרב באופי לכיתוב שבלוגו בלי להטמיע פונט חיצוני: Heebo 800,
   הכחול של הסמל, ומרווח אותיות מעט צר כמו במקור.
   משקל 800 נטען ב-@import בראש הקובץ — לא נופל לברירת מחדל. */
.login-title{font-family:'Suez One',Heebo,serif;font-weight:400;
  font-size:30px;color:#012E58;text-align:center;letter-spacing:0;
  line-height:1.2;margin:0 0 26px}
/* תמונת הכרם בשקיעה מתחת לשכבת הכחול — הטקסט הלבן נשאר קריא */
/* ⚠ הרקע והכרטיס של מסך הכניסה מוגדרים בשכבת ההרמה בסוף
   הקובץ. כאן נשאר רק מה שלא השתנה. */
.kx-login .login-title{color:#fff}
.kx-login .seg button{color:rgba(255,255,255,.78)}
.kx-login .login-err{background:rgba(255,255,255,.95)}
.kx-login{padding-bottom:calc(24px + env(safe-area-inset-bottom));
  display:flex;flex-direction:column;min-height:100vh;min-height:100dvh}
.kx-login .wrap{width:100%;margin-top:auto;margin-bottom:auto;
  padding-top:calc(16px + env(safe-area-inset-top))}
/* למסך הכניסה אין סרגל כחול, ולכן השעון הלבן היה יושב על רקע
   בהיר ולא נקרא. רצועה כחולה בגובה האזור הבטוח בלבד. */
.kx-login::before{content:"";position:fixed;top:0;right:0;left:0;
  height:env(safe-area-inset-top);background:#012E58;z-index:5}
.kx-login .rows{max-height:52vh;overflow-y:auto}
.kx-login .row:last-child{border-bottom:none}
.login-err{background:var(--clay-soft);color:var(--clay);border-radius:10px;padding:9px 12px;
  font-size:13px;font-weight:700;margin-bottom:12px;text-align:right}
.login-roster{display:flex;flex-direction:column;gap:7px;max-height:46vh;overflow-y:auto;margin-top:4px}
.login-name{min-height:48px;background:var(--bg);border:1px solid var(--line);border-radius:12px;
  font-size:15px;font-weight:700;padding:0 14px;text-align:right}
.login-name:active{background:var(--line)}

/* חיווי מצב בדיקה — מכוון להיות בולט ולא נעים להתעלם ממנו */
.test-banner{display:flex;align-items:flex-start;gap:9px;margin-bottom:9px;padding:11px 13px;
  border-radius:12px;background:var(--amber-soft);border:1px solid var(--amber);
  color:var(--ink);font-size:12.5px;font-weight:700;line-height:1.5}
.test-banner svg{flex:0 0 auto;margin-top:1px;color:var(--amber)}

/* סיכום משימות למנהל — תצוגה בלבד, אין בו אזורי לחיצה */
.tsum-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
  padding:2px 2px 12px;border-bottom:1px solid var(--line);margin-bottom:4px}
.tsum-week{font-size:14.5px;font-weight:800}
.tsum-total{font-size:12.5px;font-weight:700;color:var(--muted)}
.tsum-total.ok{color:var(--ok)}
/* שורת יום היא כפתור שפותח פירוט. width ו-text-align נדרשים
   כי button לא יורש אותם. */
.tsum-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 2px;
  border-bottom:1px solid var(--line);width:100%;text-align:right;min-height:48px}
.tsum-row:active{background:#F7F3EA}
.tsum-row:last-child{border-bottom:none}
.tsum-day{display:flex;align-items:center;gap:7px;font-size:14.5px;font-weight:700}
.tsum-row.full .tsum-day{color:var(--ok)}
.tsum-v{display:grid;place-items:center;width:18px;height:18px;border-radius:6px;background:var(--ok);color:#fff}
.tsum-count{font-size:13px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}
.tsum-row.full .tsum-count{color:var(--ok)}

/* פירוט יום — תצוגה בלבד. אין כאן אזורי לחיצה, ולכן שורות
   ולא כפתורים. הריבוע הוא חיווי מצב, לא פקד. */
.tday-row{display:flex;align-items:center;gap:12px;padding:12px 2px;
  border-bottom:1px solid var(--line);min-height:56px}
.tday-row:last-child{border-bottom:none}
.tday-txt{flex:1;min-width:0}
.tday-txt .t{display:block;font-size:14.5px;font-weight:700;letter-spacing:-.2px}
.tday-txt .s{display:block;font-size:12px;color:var(--muted);margin-top:2px;font-weight:500}
.tday-row.done .tday-txt .t{color:var(--faint)}
.tday-state{flex:0 0 auto;font-size:12px;font-weight:800;color:var(--clay);
  background:var(--clay-soft);padding:4px 9px;border-radius:7px;white-space:nowrap}
.tday-state.ok{color:var(--ok);background:var(--ok-soft)}
.chev{color:var(--line2);flex:0 0 auto}
.when{font-size:11px;font-weight:800;letter-spacing:.6px;color:var(--faint);
  background:var(--bg);padding:3px 8px;border-radius:6px;flex:0 0 auto}

/* ---- cards / alerts ---- */
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:15px 16px}
.alert{border-radius:14px;padding:13px 15px;display:flex;gap:11px;align-items:flex-start;margin-bottom:9px}
.alert .ttl{font-weight:800;font-size:14.5px}
.alert .bd{font-size:13px;margin-top:3px;line-height:1.4}
.a-clay{background:var(--clay-soft);border:1px solid #EFCEC7;color:#5E2016}
.a-amber{background:var(--amber-soft);border:1px solid #EDDCBF;color:#5C3708}
.a-ok{background:var(--ok-soft);border:1px solid #C9E2D4;color:#194B32}

.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.chip{background:rgba(255,255,255,.75);border:1px solid rgba(0,0,0,.09);padding:4px 9px;border-radius:8px;
  font-size:12.5px;font-weight:600}

/* ---- buttons ---- */
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;
  border-radius:13px;font-weight:800;font-size:15.5px;letter-spacing:-.2px;transition:transform .08s,opacity .15s}
.btn:active{transform:scale(.985)}
.btn:disabled{opacity:.42}
/* ⚠ הכללים האלה חייבים להיות מקודמים ב-.kx.
   ‎.kx button‎ למעלה מאפס רקע וצבע, והסגוליות שלו (0,1,1) גבוהה
   מזו של ‎.btn-primary‎ לבדו (0,1,0) — כלומר ‎background:none‎ ניצח,
   והכפתורים הוצגו כטקסט כהה בלי מלבן. הקידומת מעלה את הסגוליות
   ל-(0,2,0) ומחזירה את העיצוב המקורי. */
.kx .btn-primary{background:var(--accent);color:#fff}
.kx .btn-ghost{background:var(--surface);border:1.5px solid var(--line2);color:var(--ink)}
.kx .btn-clay{background:var(--clay);color:#fff}
.kx .btn-ok{background:var(--ok);color:#fff}
.btn-sm{min-height:42px;font-size:14px;border-radius:11px;padding:0 14px;width:auto}

/* ---- segmented ---- */
.seg{display:flex;background:#E9E2D2;border-radius:13px;padding:4px;gap:3px;margin-bottom:14px}
.seg button{flex:1;min-height:44px;border-radius:10px;font-weight:700;font-size:14.5px;color:var(--muted);transition:all .15s}
.seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.09)}
.seg button.on.clay{color:var(--clay)}
.seg-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.seg-scroll::-webkit-scrollbar{display:none}
.seg-scroll button{flex:1 0 auto;padding:0 14px;white-space:nowrap}

/* weekly compliance board */
.wk{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.wk-day{background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:9px 4px;text-align:center}
.wk-day .dn{font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.2px}
.wk-day .dd{font-size:11px;color:var(--faint);font-weight:600;margin-top:1px}
.wk-mark{width:30px;height:30px;border-radius:50%;margin:8px auto 4px;display:grid;place-items:center}
.wk-mark.done{background:var(--ok)}
.wk-mark.miss{background:var(--clay)}
.wk-mark.fut{background:var(--line);height:5px;width:20px;border-radius:99px;margin:20px auto 15px}
.wk-day .who2{font-size:10px;color:var(--faint);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wk-day.is-today{border-color:var(--accent);border-width:2px}

/* ---- product rows ---- */
.grp{margin-bottom:14px}
.grp-h{font-size:12px;font-weight:800;letter-spacing:.7px;color:var(--muted);padding:0 4px 7px;
  display:flex;justify-content:space-between;align-items:center}
.rows{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.row{display:flex;align-items:center;gap:10px;padding:11px 13px;border-bottom:1px solid var(--line);min-height:64px}
.row:last-child{border-bottom:none}
.row.hot{background:#FDF8EC}
.r-main{flex:1;min-width:0}
.r-name{font-size:15px;font-weight:700;letter-spacing:-.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.r-meta{font-size:12px;color:var(--muted);margin-top:2px;font-weight:500;display:flex;gap:7px;align-items:center}
.pill{font-size:10.5px;font-weight:800;letter-spacing:.4px;padding:2px 6px;border-radius:5px}
.p-low{background:var(--clay-soft);color:var(--clay)}
.p-ok{background:var(--ok-soft);color:var(--ok)}
.p-new{background:var(--amber-soft);color:var(--amber)}
/* ⚠ שני גוונים שנוספו לרצועת המספרים בשורת החניך.
   p-cool — יום חופש, שהוא זכות במכסה ולא בעיה, ולכן אינו אדום.
   p-idle — "לא סומן", שהוא היעדר נתון ולא מצב, ולכן אפור. */
.p-cool{background:var(--accent-soft);color:var(--accent)}
.p-idle{background:var(--bg);color:var(--faint)}
.p-mid{background:var(--accent-soft);color:var(--accent)}

/* stepper */
.step{display:flex;align-items:center;gap:0;background:var(--bg);border:1px solid var(--line);border-radius:11px;flex:0 0 auto}
.step button{width:42px;height:44px;font-size:21px;font-weight:700;color:var(--accent);display:grid;place-items:center}
.step button:disabled{color:var(--line2)}
.step input{width:56px;height:44px;text-align:center;background:none;border:none;font-size:16px;font-weight:800;
  outline:none;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.step input::-webkit-outer-spin-button,.step input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.step.filled{background:var(--accent-soft);border-color:#B4C6DC}

/* count row */
.crow{padding:12px 13px;border-bottom:1px solid var(--line)}
.crow:last-child{border-bottom:none}
.crow.done{background:#F8F5ED}
.crow-top{display:flex;align-items:center;gap:10px}
.exp{display:flex;gap:6px;margin-top:10px}
.exp button{flex:1;min-height:46px;border-radius:10px;border:1.5px solid var(--line2);font-size:13.5px;font-weight:700;
  color:var(--muted);background:var(--surface);display:flex;align-items:center;justify-content:center;gap:6px}
.exp button.on-ok{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}
.exp button.on-soon{background:var(--amber-soft);border-color:var(--amber);color:var(--amber)}

/* reason chips */
.reasons{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-right:2px}
.reasons button{padding:8px 13px;border-radius:9px;border:1.5px solid var(--line2);font-size:13.5px;font-weight:700;
  color:var(--muted);background:var(--surface);min-height:40px}
.reasons button.on{background:var(--clay);border-color:var(--clay);color:#fff}

/* progress */
.prog{height:6px;background:#E1D9C7;border-radius:99px;overflow:hidden;margin-top:9px}
.prog i{display:block;height:100%;background:var(--accent);border-radius:99px;transition:width .3s}

/* sticky bar */
.sticky{position:fixed;bottom:calc(10px + env(safe-area-inset-bottom));right:0;left:0;padding:10px 14px;z-index:35;
  background:linear-gradient(to top,var(--bg) 62%,rgba(239,242,241,0));pointer-events:none}
.sticky>*{pointer-events:auto;max-width:612px;margin:0 auto}

/* nav */
.nav{position:fixed;bottom:0;right:0;left:0;z-index:50;background:var(--surface);border-top:1px solid var(--line);
  display:flex;padding:6px 4px calc(6px + env(safe-area-inset-bottom))}
/* min-width:0 מונע מהכיתוב למתוח את הכפתור מעבר לחלקו; nowrap מונע
   שבירה לשתי שורות. נבדק עם 5 טאבים ברוחב 360px. */
.nav button{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;
  font-size:10.5px;font-weight:700;color:var(--faint);position:relative;min-height:58px;justify-content:center}
.nav button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.nav button.on{color:var(--accent)}
.nav .bdg{position:absolute;top:2px;left:calc(50% - 20px);background:var(--clay);color:#fff;font-size:10px;font-weight:800;
  min-width:17px;height:17px;border-radius:99px;display:grid;place-items:center;padding:0 4px}

/* search & fields */
.search{width:100%;min-height:48px;background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:0 14px;outline:none;font-size:15.5px;margin-bottom:12px}
.search:focus{border-color:var(--accent)}
.fld{margin-bottom:13px}
.fld label{display:block;font-size:12.5px;font-weight:800;color:var(--muted);margin-bottom:5px;letter-spacing:.2px}
.fld input,.fld select{width:100%;min-height:48px;background:var(--surface);border:1px solid var(--line2);
  border-radius:11px;padding:0 13px;outline:none;font-size:15.5px}
/* ⚠ textarea לא היה ברשימה, ולכן קיבל רוחב ברירת מחדל לפי cols
   ויצא צר מהשדה שלידו בכל טופס שיש בו תיאור. */
.fld textarea{width:100%;display:block;background:var(--surface);border:1px solid var(--line2);
  border-radius:11px;padding:10px 13px;outline:none;font-size:15.5px;line-height:1.5;resize:vertical}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:var(--accent)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.pick{display:flex;gap:6px}
.pick button{flex:1;min-height:46px;border-radius:10px;border:1.5px solid var(--line2);background:var(--surface);
  font-size:14px;font-weight:700;color:var(--muted)}
.pick button.on{background:var(--accent);border-color:var(--accent);color:#fff}

/* modal */
.scrim{position:fixed;inset:0;background:rgba(12,22,20,.5);z-index:100;display:flex;align-items:flex-end;
  animation:fade .18s ease}
.sheet{background:var(--bg);width:100%;max-height:92vh;overflow-y:auto;border-radius:20px 20px 0 0;
  animation:up .24s cubic-bezier(.2,.8,.3,1);padding-bottom:calc(16px + env(safe-area-inset-bottom))}
.sheet-h{position:sticky;top:0;background:var(--bg);padding:16px 16px 12px;display:flex;justify-content:space-between;
  align-items:center;border-bottom:1px solid var(--line);z-index:2}
.sheet-h h3{font-size:17.5px;font-weight:800;letter-spacing:-.3px}
.sheet-b{padding:16px}
@keyframes fade{from{opacity:0}}
@keyframes up{from{transform:translateY(26px)}}

/* stats */
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
.stat .k{font-size:11.5px;font-weight:800;letter-spacing:.5px;color:var(--muted)}
.stat .v{font-size:26px;font-weight:900;letter-spacing:-1px;margin-top:4px;font-variant-numeric:tabular-nums}
.stat .n{font-size:11.5px;color:var(--faint);font-weight:600;margin-top:1px}
.stat.clay .v{color:var(--clay)}
.stat.ok .v{color:var(--ok)}

.bar{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}
.bar:last-child{border-bottom:none}
.bar .bn{font-size:14px;font-weight:600;flex:0 0 96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar .bt{flex:1;height:9px;background:var(--bg);border-radius:99px;overflow:hidden}
.bar .bt i{display:block;height:100%;background:var(--clay);border-radius:99px}
.bar .bv{font-size:13.5px;font-weight:800;flex:0 0 auto;font-variant-numeric:tabular-nums}

.empty{text-align:center;padding:40px 24px;color:var(--muted)}
.empty .emo{font-size:38px;line-height:1;display:block;margin-bottom:10px}
.empty .e1{font-size:16px;font-weight:800;color:var(--ink);margin-bottom:5px}
.empty .e2{font-size:13.5px;line-height:1.5}

.toast{position:fixed;bottom:calc(78px + env(safe-area-inset-bottom));right:16px;left:16px;z-index:200;background:var(--ink);color:#fff;
  border-radius:13px;padding:14px 16px;font-size:14.5px;font-weight:700;text-align:center;
  animation:up .22s cubic-bezier(.2,.8,.3,1);max-width:400px;margin:0 auto;box-shadow:0 8px 24px rgba(0,0,0,.22)}

/* ============================================================
   מכינה — נוכחות, בקשות וחניכים
   ------------------------------------------------------------
   משתמש באותם משתני צבע, אותם רדיוסים ואותה טיפוגרפיה של
   המטבח. אין כאן פלטה שנייה ואין גופן נוסף — רק רכיבים שלא
   היו קיימים.
   ============================================================ */

/* לוח נוכחות שנתי */
.yr{display:flex;flex-direction:column;gap:8px}
.yr-row{display:flex;align-items:flex-start;gap:9px}
.yr-lab{font-size:11px;font-weight:800;color:var(--muted);flex:0 0 40px;padding-top:2px;letter-spacing:.2px}
.yr-cells{display:flex;flex-wrap:wrap;gap:3px}
.yr-c{width:13px;height:13px;border-radius:3.5px;background:var(--surface);border:1px solid var(--line);
  padding:0;flex:0 0 auto}
.yr-c.off{background:#E8E2D3;border-color:#E8E2D3}
.yr-c.future{background:var(--bg);border-color:var(--line)}
.yr-c.present{background:#16A34A;border-color:#16A34A}
.yr-c.sick{background:#DC2626;border-color:#DC2626}
.yr-c.just{background:#D97706;border-color:#D97706}
.yr-c.vac{background:#2563EB;border-color:#2563EB}
.yr-c.unmarked{background:repeating-linear-gradient(45deg,#fff,#fff 2px,#E1D9C7 2px,#E1D9C7 4px);
  border-color:var(--line2)}
.yr-c.sel{outline:2px solid var(--ink);outline-offset:1px}
.yr-key{display:flex;flex-wrap:wrap;gap:11px;margin-top:13px;padding-top:12px;border-top:1px solid var(--line)}
.yr-key i{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--muted);font-style:normal}
.yr-key i b{width:11px;height:11px;border-radius:3px;display:block;border:1px solid var(--line)}

/* מכסת ימי חופש — שתי מחציות זו לצד זו */
.quota{display:flex;gap:9px}
.quota-h{flex:1;background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:12px 13px}
.quota-h .qk{font-size:11.5px;font-weight:800;color:var(--muted);letter-spacing:.3px}
.quota-h .qv{display:flex;align-items:baseline;gap:3px;margin-top:5px}
.quota-h .qv b{font-size:25px;font-weight:900;letter-spacing:-1px;font-variant-numeric:tabular-nums}
.quota-h .qv span{font-size:12.5px;font-weight:700;color:var(--faint)}
.quota-dots{display:flex;gap:4px;margin-top:8px}
.quota-dots i{width:100%;height:5px;border-radius:99px;background:var(--accent);display:block}
.quota-dots i.used{background:var(--line)}

/* שורת חניך */
.st-row{display:flex;align-items:center;gap:11px;padding:11px 13px;border-bottom:1px solid var(--line);
  min-height:60px;width:100%;text-align:right;background:none}
.st-row:last-child{border-bottom:none}
.st-row:active{background:#F7F3EA}
.st-av{width:34px;height:34px;border-radius:50%;background:var(--accent-soft);color:var(--accent);
  display:grid;place-items:center;font-size:13px;font-weight:800;flex:0 0 34px}
.st-av.absent{background:var(--clay-soft);color:var(--clay)}
.st-main{flex:1;min-width:0}
.st-n{font-size:14.5px;font-weight:700;letter-spacing:-.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.st-m{font-size:11.5px;color:var(--muted);margin-top:2px;font-weight:600;display:flex;gap:6px;align-items:center}
/* ⚠ הריבוע נושא **תווית ומספר**, ולא מספר לבדו. שלושה מספרים
   צבעוניים בלי מילה נקראים כרעש, ומי שאינו מבחין בין הגוונים
   אינו מקבל מהם דבר — אותו כלל כמו בגרפים (4ו). */
.st-fig{display:flex;gap:4px;flex:0 0 auto;flex-wrap:wrap;justify-content:flex-end;max-width:52%}
.st-fig b{font-size:11px;font-weight:800;padding:2px 6px 3px;border-radius:6px;
  font-variant-numeric:tabular-nums;min-width:26px;text-align:center;
  display:flex;flex-direction:column;align-items:center;line-height:1.15}
.st-fig b i{font-size:8.5px;font-style:normal;font-weight:700;opacity:.72;letter-spacing:-.1px}

/* בורר מצב בשורת סימון.
   ⚠ הצבעים במלוא העוצמה בכוונה — המסמן סורק 33 שורות במהירות,
   וגוני פסטל לא נקראים ממרחק. */
.abs-pick{display:flex;gap:5px;padding:0 13px 12px;flex-wrap:wrap}
.abs-pick button{flex:1;min-width:64px;min-height:42px;border-radius:9px;border:2px solid var(--line2);
  background:var(--surface);font-size:13.5px;font-weight:800;color:var(--muted)}
.abs-pick button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.abs-pick button.on.here{background:#15803D;border-color:#15803D;color:#fff}
.abs-pick button.on.vac{background:#1D4ED8;border-color:#1D4ED8;color:#fff}
.abs-pick button.on.sick{background:#B91C1C;border-color:#B91C1C;color:#fff}
.abs-pick button.on.just{background:#B45309;border-color:#B45309;color:#fff}
.abs-pick button:disabled{opacity:.45}

/* מצב החניך בשורה — תגים בצבע מלא, לא פסטל */
.pill.pp-ok{background:#15803D;color:#fff}
.pill.pp-none{background:#E7E0D2;color:#6B6455}
.st-av.here{background:#DCFCE7;color:#15803D}
.st-av.none{background:#F0EBDE;color:#A29A88}
.abs-note{padding:0 13px 12px}
.abs-note input{width:100%;min-height:44px;background:var(--bg);border:1px solid var(--line2);
  border-radius:10px;padding:0 12px;outline:none;font-size:14px}
.abs-note input:focus{border-color:var(--accent)}
.abs-lock{font-size:11.5px;font-weight:700;color:var(--amber);padding:0 13px 11px;display:flex;gap:6px}

/* כרטיס בקשה */
.rq{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 15px;margin-bottom:10px}
.rq-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.rq-name{font-size:15px;font-weight:800;letter-spacing:-.2px}
.rq-meta{font-size:12px;color:var(--muted);margin-top:5px;font-weight:600;display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.rq-detail{font-size:13.5px;line-height:1.55;color:var(--muted);font-weight:500;
  margin-top:9px;white-space:pre-wrap}
.rq-act{display:flex;gap:6px;margin-top:12px}
.rq-act button{flex:1;min-height:46px;border-radius:10px;border:1.5px solid var(--line2);font-size:13.5px;
  font-weight:800;color:var(--muted);background:var(--surface)}
.rq-act button.ok{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}
.rq-act button.no{background:var(--clay-soft);border-color:var(--clay);color:var(--clay)}
.rq-act button:disabled{opacity:.45}

/* ---- מסך הבית של המנהל ---- */
.dash-greet{font-family:'Suez One',Heebo,serif;font-size:26px;font-weight:400;letter-spacing:0;margin:4px 2px 2px}
/* ---- תמונות המכינה — כרטיס תמונה עם כיתוב עדין ---- */
/* באנר כותרת: התמונה כרקע בפרופורציות שלה (cover, בלי מתיחה),
   גרדיאנט כהה בתחתית כדי שהכותרת הלבנה תישאר קריאה */
.photo-head{position:relative;border-radius:18px;overflow:hidden;margin:0 0 14px;height:150px;
  background-size:cover;background-position:center;
  box-shadow:0 8px 24px rgba(60,48,30,.16);display:flex;align-items:flex-end}
.photo-head::before{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(8,30,52,.04) 35%,rgba(8,30,52,.6) 100%)}
.photo-head .pht{position:relative;z-index:1;color:#fff;font-family:'Suez One',Heebo,serif;
  font-size:24px;padding:11px 16px;text-shadow:0 1px 8px rgba(0,0,0,.5)}
.photo-hero{position:relative;border-radius:18px;overflow:hidden;margin:2px 0 14px;
  box-shadow:0 8px 24px rgba(60,48,30,.14)}
.photo-hero img{display:block;width:100%;height:150px;object-fit:cover}
.photo-hero .ph-cap{position:absolute;right:0;left:0;bottom:0;padding:30px 14px 10px;color:#fff;
  font-family:'Suez One',Heebo,serif;font-size:19px;text-align:right;
  background:linear-gradient(180deg,transparent,rgba(8,30,52,.72));text-shadow:0 1px 6px rgba(0,0,0,.45)}
.dash-date{font-size:13px;color:var(--muted);font-weight:600;margin:0 2px 16px}
.dash-card{width:100%;text-align:right;background:var(--surface);border:1px solid var(--line);
  border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:13px;min-height:74px}
.dash-card:active{background:#F7F3EA}
.dash-ico{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;font-size:22px;line-height:1;
  background:var(--accent-soft);color:var(--accent)}
.dash-ico.warn{background:#FEE2E2;color:#B91C1C}
.dash-ico.ok{background:#DCFCE7;color:#15803D}
.dash-main{flex:1;min-width:0}
.dash-t{font-size:15px;font-weight:800;letter-spacing:-.2px}
.dash-s{font-size:12.5px;color:var(--muted);font-weight:600;margin-top:2px}
.dash-v{font-size:24px;font-weight:900;letter-spacing:-1px;font-variant-numeric:tabular-nums;flex:0 0 auto}
.dash-v.warn{color:#B91C1C}
.dash-col{display:flex;flex-direction:column;gap:9px}

/* ============ מסך הבית של המנהל — הגרסה הגדולה ============
   שלוש רצועות: פתיח על התמונה, מספרי היום, ומה שדורש טיפול.
   הניווט המהיר יושב באריחים בתחתית — המגירה נשארת המפה
   המלאה, וכאן רק היעדים השכיחים.                            */
.hero2{position:relative;border-radius:22px;overflow:hidden;margin:4px 0 16px;
  box-shadow:0 12px 30px -14px rgba(0,36,84,.45)}
.hero2 img{display:block;width:100%;height:210px;object-fit:cover}
.hero2 .h2-veil{position:absolute;inset:0;
  background:linear-gradient(178deg,rgba(0,36,84,.06) 30%,rgba(0,26,60,.82) 88%)}
.hero2 .h2-txt{position:absolute;right:18px;left:18px;bottom:14px;color:#fff}
.hero2 .h2-greet{font-family:'Suez One',Heebo,serif;font-size:30px;line-height:1.15;
  text-shadow:0 1px 10px rgba(0,20,50,.5)}
.hero2 .h2-date{font-size:13.5px;font-weight:700;opacity:.92;margin-top:3px}
.hero2 .h2-cap{position:absolute;top:12px;left:14px;font-size:11.5px;font-weight:800;
  color:#fff;background:rgba(0,26,60,.45);backdrop-filter:blur(3px);
  padding:4px 11px;border-radius:20px;letter-spacing:.3px}

.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
.kx .stat-tile{background:var(--surface);border:1px solid var(--line);border-radius:18px;
  padding:14px 15px 12px;text-align:right;display:flex;flex-direction:column;gap:1px;
  transition:transform .06s}
.kx .stat-tile:active{transform:scale(.98)}
.stat-tile .sv{font-family:'Suez One',Heebo,serif;font-size:34px;line-height:1.1;
  font-variant-numeric:tabular-nums;color:var(--accent)}
.stat-tile.warn .sv{color:var(--clay)}
.stat-tile.good .sv{color:var(--ok)}
.stat-tile .sl{font-size:13px;font-weight:800;letter-spacing:-.2px}
.stat-tile .ss{font-size:11.5px;color:var(--muted);font-weight:600;min-height:15px}

.attn{display:flex;flex-direction:column;gap:9px;margin-bottom:18px}
.kx .attn-row{width:100%;text-align:right;background:var(--surface);border:1px solid var(--line);
  border-right:4px solid var(--line2);border-radius:14px;padding:12px 14px;
  display:flex;align-items:center;gap:12px}
.kx .attn-row.clay{border-right-color:var(--clay)}
.kx .attn-row.amber{border-right-color:var(--amber)}
.kx .attn-row:active{background:#F7F3EA}
.attn-t{font-size:14px;font-weight:800}
.attn-s{font-size:12.5px;color:var(--muted);font-weight:600;margin-top:1px}
.attn-calm{background:var(--ok-soft);border:1px solid #CBE3D5;border-radius:16px;
  padding:18px 16px;text-align:center;margin-bottom:18px}
.attn-calm b{display:block;font-size:15px;color:var(--ok);margin-bottom:2px}
.attn-calm span{font-size:12.5px;color:var(--muted);font-weight:600}

.gantt-strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:18px;
  scrollbar-width:none}
.gantt-strip::-webkit-scrollbar{display:none}
.kx .gantt-chip{flex:0 0 auto;background:var(--accent-soft);color:var(--accent);border-radius:12px;
  padding:8px 13px;font-size:12.5px;font-weight:800;white-space:nowrap}
.kx .gantt-chip.now{background:var(--accent);color:#fff}

.navgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.kx .nav-tile{background:var(--surface);border:1px solid var(--line);border-radius:16px;
  padding:14px 13px;text-align:right;display:flex;align-items:center;gap:11px;
  transition:transform .06s}
.kx .nav-tile:active{transform:scale(.98)}
.nav-ico{width:38px;height:38px;border-radius:12px;background:var(--accent-soft);
  color:var(--accent);display:grid;place-items:center;flex:0 0 auto}
.nav-tile b{font-size:13.5px;font-weight:800;letter-spacing:-.2px}
.nav-badge{margin-right:auto;background:var(--clay);color:#fff;border-radius:20px;
  min-width:21px;height:21px;display:grid;place-items:center;
  font-size:11.5px;font-weight:800;padding:0 6px}


/* ---- מגירת ניווט (שלושת הקווים) ---- */
.hamb{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex:0 0 auto;
  background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);color:#fff}
.drawer-scrim{position:fixed;inset:0;background:rgba(10,18,32,.48);z-index:120;animation:fade .16s ease}
.drawer{position:absolute;top:0;bottom:0;right:0;width:min(82vw,320px);background:var(--surface);
  border-radius:0 0 0 22px;display:flex;flex-direction:column;box-shadow:-14px 0 40px rgba(0,0,0,.22);
  animation:drawer-in .22s cubic-bezier(.2,.8,.3,1);
  padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
@keyframes drawer-in{from{transform:translateX(40px);opacity:.6}}
.drawer-h{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:16px 16px 13px;border-bottom:1px solid var(--line)}
.drawer-brand{display:flex;align-items:center;gap:10px;min-width:0}
.drawer-brand img{width:38px;height:38px;object-fit:contain;flex:0 0 auto}
.drawer-brand b{display:block;font-size:15.5px;font-weight:900;letter-spacing:-.3px;line-height:1.2}
.drawer-brand span{display:block;font-size:11.5px;color:var(--muted);font-weight:600;margin-top:1px}
.drawer-x{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;color:var(--muted)}
.drawer-x:active{background:var(--bg)}
.drawer-body{flex:1;overflow-y:auto;padding:8px 10px 12px}
.drawer-gl{font-size:10.5px;font-weight:800;letter-spacing:.9px;color:var(--faint);
  padding:14px 8px 5px}
.drawer-item{display:flex;align-items:center;gap:12px;width:100%;text-align:right;
  min-height:46px;padding:0 10px;border-radius:11px;font-size:14.5px;font-weight:700;
  color:var(--ink);position:relative}
.drawer-item svg{flex:0 0 auto;color:var(--muted)}
.drawer-item span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drawer-item:active{background:var(--bg)}
.drawer-item.on{background:var(--accent-soft);color:var(--accent)}
.drawer-item.on svg{color:var(--accent)}
.drawer-badge{background:#DC2626;color:#fff;font-size:10.5px;font-weight:800;min-width:19px;
  height:19px;border-radius:99px;display:grid;place-items:center;padding:0 5px;flex:0 0 auto}
.drawer-f{border-top:1px solid var(--line);padding:12px 16px 14px}
.drawer-user b{display:block;font-size:13.5px;font-weight:800}
.drawer-user span{display:block;font-size:11.5px;color:var(--muted);font-weight:600;margin-top:1px}
.drawer-out{width:100%;min-height:44px;margin-top:10px;border-radius:11px;
  border:1.5px solid var(--line2);font-size:13.5px;font-weight:800;color:var(--clay)}
.drawer-out:active{background:var(--clay-soft)}

/* פאנל תצוגה מקדימה של התראות — נפתח מתחת לסרגל */
.notif-panel{position:sticky;top:0;z-index:39;background:var(--surface);
  border-bottom:1px solid var(--line);box-shadow:0 10px 24px rgba(10,20,40,.14);
  max-width:640px;margin:0 auto;border-radius:0 0 16px 16px;overflow:hidden}
.notif-h{display:flex;justify-content:space-between;align-items:center;
  padding:12px 15px;border-bottom:1px solid var(--line)}
.notif-h b{font-size:14px;font-weight:800}
.notif-h button{font-size:12.5px;font-weight:700;color:var(--muted);min-height:32px;padding:0 8px}
.notif-item{display:block;width:100%;text-align:right;padding:11px 15px;
  border-bottom:1px solid var(--line)}
.notif-item:active{background:#F7F3EA}
.notif-item .ni-t{font-size:14px;font-weight:800;letter-spacing:-.2px}
.notif-item .ni-s{font-size:12px;color:var(--muted);font-weight:600;margin-top:2px}
.notif-empty{padding:20px 15px;text-align:center;font-size:13px;color:var(--muted);font-weight:600}
.notif-all{display:block;width:100%;min-height:46px;font-size:13.5px;font-weight:800;color:var(--accent)}

/* פעמון התראות בסרגל העליון */
.bell-btn{position:relative;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;
  background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);color:#fff;flex:0 0 auto}
.bell-badge{position:absolute;top:-4px;left:-4px;background:#DC2626;color:#fff;font-size:10.5px;
  font-weight:800;min-width:18px;height:18px;border-radius:99px;display:grid;place-items:center;
  padding:0 4px;border:2px solid #012E58}

/* נוכחות אימון — שלושה מצבים בשורה צפופה */
.tr-pick{display:flex;gap:4px;flex:0 0 auto}
.tr-pick button{min-height:34px;padding:0 9px;border-radius:8px;border:1.5px solid var(--line2);
  background:var(--surface);font-size:12px;font-weight:800;color:var(--muted);white-space:nowrap}
.tr-pick button.on.here{background:#15803D;border-color:#15803D;color:#fff}
.tr-pick button.on.absent{background:#B91C1C;border-color:#B91C1C;color:#fff}
.tr-pick button.on.kitchen{background:#B45309;border-color:#B45309;color:#fff}

/* דירוג 1–10 */
.rate-row{display:flex;gap:4px;margin-top:10px}
.rate-row button{flex:1;min-width:0;min-height:40px;border-radius:8px;border:1.5px solid var(--line2);
  background:var(--surface);font-size:13px;font-weight:800;color:var(--muted);font-variant-numeric:tabular-nums}
.rate-row button.lt{background:#DBEAFE;border-color:#93C5FD;color:#1D4ED8}
.rate-row button.on{background:#1D4ED8;border-color:#1D4ED8;color:#fff}
.rate-row button:disabled{opacity:.5}

/* ---- גאנט שנתי ----
   סדר-יום אנכי לפי חודשים, לא רשת אופקית: בטלפון רשת של 365
   עמודות אינה קריאה. פס הצבע בצד מקודד את סוג האירוע. */
.gnt-month{background:var(--surface);border:1px solid var(--line);border-radius:16px;
  overflow:hidden;margin-bottom:12px}
.gnt-mh{padding:12px 15px 10px;border-bottom:1px solid var(--line);display:flex;
  justify-content:space-between;align-items:baseline}
.gnt-mh .m{font-size:15.5px;font-weight:800;letter-spacing:-.2px}
.gnt-mh .c{font-size:12px;color:var(--muted);font-weight:600;font-variant-numeric:tabular-nums}
.gnt-ev{display:flex;align-items:flex-start;gap:11px;padding:10px 15px;
  border-bottom:1px solid var(--line);position:relative}
.gnt-ev:last-child{border-bottom:none}
.gnt-ev::before{content:"";position:absolute;right:0;top:8px;bottom:8px;width:3.5px;
  border-radius:0 3px 3px 0;background:var(--accent)}
.gnt-ev.shabbat::before{background:var(--amber)}
.gnt-ev.holiday::before{background:var(--clay)}
.gnt-ev.today{background:#FDF6E7}
.gnt-when{flex:0 0 78px;text-align:center;padding-top:1px}
.gnt-when .d{font-size:13.5px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.2px}
.gnt-when .r{font-size:10.5px;color:var(--faint);font-weight:700;margin-top:1px}
.gnt-what{flex:1;min-width:0;padding-top:1px}
.gnt-what .t{font-size:14px;font-weight:700;letter-spacing:-.2px;line-height:1.35}
.gnt-what .s{font-size:11.5px;color:var(--muted);font-weight:600;margin-top:2px}
.gnt-now{display:flex;align-items:center;gap:8px;padding:4px 15px;color:var(--accent);
  font-size:11px;font-weight:800;letter-spacing:.4px}
.gnt-now::before,.gnt-now::after{content:"";flex:1;height:2px;border-radius:99px;background:var(--accent)}

@media (prefers-reduced-motion:reduce){.kx *{animation:none!important;transition:none!important}}

/* ---- צירוף תמונה לדיווח תקלה ---- */
/* ⚠ הסלקטור נושא את .fld: הכפתור הוא <label> בתוך שדה, ו-
   ".fld label" (0,1,1) גובר על ".file-drop" (0,1,0) וממעך אותו
   חזרה ל-display:block עם גופן התווית. */
.fld label.file-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;
  min-height:104px;border:1.5px dashed var(--line2);border-radius:12px;background:var(--bg);
  color:var(--muted);font-size:14px;font-weight:700;letter-spacing:0;margin:0;cursor:pointer;
  transition:border-color .15s,color .15s}
.fld label.file-drop:active{border-color:var(--accent);color:var(--accent)}
.fld label.file-drop input{display:none}
.photo-pick{display:block;border-radius:12px;overflow:hidden;border:1px solid var(--line2)}
.photo-pick img{display:block;width:100%;max-height:220px;object-fit:cover}
.photo-pick .btn{width:100%;border-radius:0;border:none;border-top:1px solid var(--line)}
.thumb{flex:0 0 auto;width:42px;height:42px;border-radius:9px;overflow:hidden;
  border:1px solid var(--line2);background:var(--bg)}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}

/* ---- כרטיסי השיבוץ של החניך ----
   צבע לכל קטגוריה, מתוך אותה פלטה של המערכת: כחול הסמל
   לענף, ירוק לוועדה, חימר לסדרה וענבר לקבוצה. */
/* ⚠ הסלקטור נושא את .kx: הכרטיס הוא <button> במסך הבית,
   ו-".kx button" (0,1,1) גובר על ".pl-lead" (0,1,0) ומאפס לו
   את הרקע והצבע. אותה מלכודת כמו בבורר התמונה. */
.kx .pl-lead{position:relative;display:block;width:100%;text-align:right;border:none;
  border-radius:20px;padding:20px 20px 18px;margin:2px 0 18px;
  background:linear-gradient(145deg,#0A4478 0%,#012E58 100%);color:#fff;
  box-shadow:0 10px 26px rgba(1,46,88,.22);overflow:hidden}
.kx .pl-lead::after{content:"";position:absolute;left:-40px;top:-40px;width:150px;height:150px;
  border-radius:50%;background:rgba(255,255,255,.06)}
.kx .pl-lead-k{font-size:11.5px;font-weight:800;letter-spacing:.6px;opacity:.75;margin-bottom:5px}
.kx .pl-lead-n{font-family:'Suez One',Heebo,serif;font-size:29px;line-height:1.15}
.kx .pl-lead-h{margin-top:9px;display:inline-block;background:rgba(255,255,255,.14);
  border-radius:999px;padding:5px 12px;font-size:13.5px;font-weight:800}
.kx .pl-lead-s{margin-top:9px;font-size:12.5px;font-weight:700;opacity:.8}

/* ---- פירוט שיבוץ במסך המנהל ---- */
.pd-head{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.pd-k{font-size:11.5px;font-weight:800;color:var(--muted);letter-spacing:.4px;margin:10px 0 4px}
.pd-text{font-size:13.5px;line-height:1.75;color:var(--ink);white-space:pre-wrap;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.pd-text.open{display:block;-webkit-line-clamp:none;overflow:visible}

.guide-h{display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;
  padding:0;text-align:right;cursor:pointer;color:inherit}

.kx .pl-lead.pl-committee{background:linear-gradient(145deg,#2E7D57 0%,#1B5638 100%);
  box-shadow:0 10px 26px rgba(31,107,69,.22)}
.kx .pl-lead.pl-series{background:linear-gradient(145deg,#B4442F 0%,#8A2E1F 100%);
  box-shadow:0 10px 26px rgba(158,54,38,.22)}
.kx .pl-lead.pl-group{background:linear-gradient(145deg,#A6702A 0%,#7A4E17 100%);
  box-shadow:0 10px 26px rgba(138,90,30,.22)}
/* כשיש כמה כרטיסים ברצף — מרווח קטן יותר ביניהם */
.pl-stack .pl-lead{margin:0 0 10px}

/* ---- תקציב המטבח ---- */
.bg-nav{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.bg-nav select{flex:1;min-height:46px;background:var(--surface);border:1px solid var(--line2);
  border-radius:11px;padding:0 13px;font-size:15px;font-weight:700;outline:none;text-align:center}
.bg-nav .btn{flex:0 0 46px;min-height:46px;padding:0}
.bg-total{border-radius:20px;padding:20px;margin-bottom:12px;text-align:center;color:#fff;
  background:linear-gradient(145deg,#0A4478 0%,#012E58 100%);
  box-shadow:0 10px 26px rgba(1,46,88,.2)}
.bg-total-k{font-size:11.5px;font-weight:800;letter-spacing:.6px;opacity:.75}
.bg-total-v{font-family:'Suez One',Heebo,serif;font-size:36px;line-height:1.2;margin:4px 0 2px}
.bg-total-s{font-size:12.5px;font-weight:700;opacity:.85}
.bg-head{display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:10px 14px}
.bg-head input{flex:1;min-height:42px;background:var(--bg);border:1px solid var(--line2);
  border-radius:10px;padding:0 12px;font-size:15px;outline:none;text-align:center}
.bg-row{display:flex;align-items:center;gap:10px;padding:7px 0;font-size:13.5px;font-weight:700}
.bg-row+.bg-row{border-top:1px solid var(--line)}
.bg-day{flex:0 0 46px;display:flex;flex-direction:column;align-items:center;line-height:1.25}
.bg-day b{font-size:13.5px}
.bg-day span{font-size:11px;color:var(--faint);font-weight:700}
.bg-calc{display:flex;align-items:center;justify-content:space-between;gap:10px;
  background:var(--bg);border-radius:11px;padding:11px 13px;margin-bottom:12px;
  font-size:13.5px;font-weight:700;color:var(--muted)}
.bg-calc b{font-size:17px;color:var(--ink)}
.pick.pick-wrap{flex-wrap:wrap}

.bg-bar{height:5px;border-radius:99px;background:var(--line);margin-top:7px;overflow:hidden}
.bg-bar span{display:block;height:100%;border-radius:99px;background:var(--accent)}

/* ---- רשת חודש הגאנט ----
   ⚠ שמות האירועים יושבים בתוך התאים ולא כנקודות: הרשת אמורה
     להחליף את הגיליון, ונקודה בלי שם מחייבת לחיצה על כל יום. */
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;direction:rtl;margin-bottom:14px}
.cal-dow{text-align:center;font-size:11px;font-weight:800;color:var(--faint);padding:2px 0 4px}
.cal-cell{position:relative;min-height:74px;border-radius:9px;background:var(--surface);
  border:1px solid var(--line);display:flex;flex-direction:column;align-items:stretch;
  gap:2px;padding:4px 3px 3px;cursor:pointer;color:inherit;overflow:hidden}
.cal-cell.empty{background:none;border:none;cursor:default}
.cal-cell.sat{background:var(--bg)}
.cal-cell.today{border-color:var(--accent);border-width:2px;padding:3px 2px 2px}
.cal-cell.open{outline:2px solid var(--accent);outline-offset:-2px}
.cal-n{font-size:12px;font-weight:800;line-height:1;text-align:center;color:var(--muted)}
.cal-cell.today .cal-n{color:var(--accent)}
.cal-evs{display:flex;flex-direction:column;gap:2px;min-width:0}
.cal-chip{display:block;font-style:normal;font-size:9px;font-weight:700;line-height:1.25;
  border-radius:4px;padding:2px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  background:var(--accent-soft);color:var(--accent)}
.cal-chip.shabbat{background:var(--amber-soft);color:var(--amber)}
.cal-chip.holiday{background:var(--clay-soft);color:var(--clay)}
.cal-chip.more{background:none;color:var(--faint);padding:0 3px}
.cal-day{margin-bottom:14px}
.cal-day-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.cal-day-h b{font-size:15px}
.cal-day-h button{background:none;border:none;color:var(--muted);font-size:12.5px;
  font-weight:700;cursor:pointer;padding:4px}
.cal-day-empty{font-size:13.5px;color:var(--muted);font-weight:600;text-align:center;padding:6px 0}

/* מסך רחב — תאים גבוהים יותר וטקסט קריא יותר */
@media (min-width:600px){
  .cal{gap:5px}
  .cal-cell{min-height:104px;padding:6px 5px 5px}
  .cal-n{font-size:13.5px}
  .cal-chip{font-size:11px;padding:3px 5px}
}

/* ---- לו״ז יומי מהיומן ---- */
.ag-day{background:var(--surface);border:1px solid var(--line);border-radius:16px;
  padding:12px 14px;margin-bottom:10px}
.ag-day.today{border-color:var(--accent);box-shadow:0 6px 18px rgba(1,46,88,.08)}
.ag-day-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid var(--line)}
.ag-day-h b{font-size:14.5px}
.ag-day-h span{font-size:12px;color:var(--faint);font-weight:700}
.ag-ev{display:flex;gap:11px;padding:7px 0;align-items:flex-start}
.ag-ev+.ag-ev{border-top:1px solid var(--line)}
.ag-time{flex:0 0 50px;display:flex;flex-direction:column;line-height:1.3;padding-top:1px}
.ag-time b{font-size:13.5px;font-weight:800}
.ag-time span{font-size:11px;color:var(--faint);font-weight:700}
.ag-allday{font-size:11px;color:var(--accent);font-weight:800}
.ag-body{flex:1;min-width:0}
.ag-name{font-size:14px;font-weight:700;line-height:1.4}
.ag-loc{display:flex;align-items:center;gap:4px;font-size:11.5px;color:var(--muted);
  font-weight:600;margin-top:2px}
.ag-empty{font-size:13px;color:var(--muted);font-weight:600;text-align:center;padding:8px 0}
.ag-more{font-size:12px;color:var(--accent);font-weight:800;text-align:center;
  padding-top:8px;margin-top:4px;border-top:1px solid var(--line)}
.kx .ag-card{display:block;width:100%;text-align:right;border:1px solid var(--line);
  cursor:pointer;margin-bottom:14px}

/* ---- תקציב: שני ראשים וקניות ---- */
.bg-spend{display:flex;gap:8px;margin-bottom:12px}
.bg-spend>div{flex:1;background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:10px 8px;text-align:center}
.bg-spend b{display:block;font-size:16px;font-weight:800;line-height:1.2}
.bg-spend span{display:block;font-size:11px;color:var(--muted);font-weight:700;margin-top:2px}
.bg-spend.over>div:last-child{background:var(--clay-soft);border-color:var(--clay)}
.bg-spend.over>div:last-child b{color:var(--clay)}
.bg-type{padding:11px 13px;border-bottom:1px solid var(--line)}
.bg-type:last-child{border-bottom:none}
.bg-type-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px}
.bg-type-h b{font-size:14.5px}
.bg-type-h span{font-size:12px;color:var(--muted);font-weight:700}
.bg-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.bg-f{display:flex;flex-direction:column;gap:3px}
.bg-f span{font-size:10.5px;color:var(--faint);font-weight:700;text-align:center}
.bg-f input{width:100%;min-height:38px;background:var(--bg);border:1px solid var(--line2);
  border-radius:9px;padding:0 6px;font-size:14px;text-align:center;outline:none}
.bg-f input:focus{border-color:var(--accent)}

.bg-fields.two-up{grid-template-columns:repeat(2,1fr)}
.bg-fixed{font-size:11px;color:var(--muted);font-weight:600;line-height:1.55;
  background:var(--bg);border-radius:9px;padding:7px 9px;margin-top:7px}

/* ---- מסלול בקשת יציאה: מדריך → ראש מכינה ----
   ⚠ שתי שורות לכל תחנה: פס עם הנקודה, ומתחתיו הטקסט. הקו
     המחבר נמתח בתוך הפס בלבד ולכן אינו יכול לחצות שם. */
.rq-track{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:11px;
  padding-top:11px;border-top:1px solid var(--line)}
.trk{min-width:0}
.trk-rail{position:relative;height:9px;margin-bottom:7px}
.trk-dot{position:absolute;right:0;top:0;width:9px;height:9px;border-radius:50%;
  background:var(--line2)}
/* מימין לשמאל: הקו יוצא משמאל לנקודה הראשונה וחוצה את המרווח */
.trk:first-child .trk-rail::after{content:"";position:absolute;top:3px;
  right:15px;left:-12px;height:2px;background:var(--line);border-radius:2px}
.trk b{display:block;font-size:12.5px;font-weight:800;line-height:1.35;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk-note{display:block;font-size:10.5px;font-weight:700;color:var(--faint);
  line-height:1.45;margin-top:1px}
.trk-now .trk-dot{background:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.trk-now b{color:var(--accent)}
.trk-ok .trk-dot{background:var(--ok)}
.trk-no .trk-dot{background:var(--clay)}
.trk-skip .trk-dot{background:transparent;border:2px dashed var(--line2);box-sizing:border-box}
.trk-skip b,.trk-wait b{color:var(--faint);font-weight:700}
/* ⚠ צבע הדירוג לפי הציון ולא לפי המקור — ברשימה ארוכה המספר
   לבדו לא נקרא. המקור נשאר גלוי בכוכב ובשורת המטא. */
.pill.sc{font-weight:800;letter-spacing:.2px}
.sc-top{background:var(--ok-soft);color:var(--ok)}
.sc-good{background:var(--accent-soft);color:var(--accent)}
.sc-ok{background:var(--amber-soft);color:var(--amber)}
.sc-low{background:var(--clay-soft);color:var(--clay)}
/* ⚠ תאריך השיעור מודגש משאר שורת המטא — הוא השאלה שנשאלת
   על חוות דעת, ולא מי כתב אותה או מתי. */
/* פרטי הקשר עם המרצה — כרטיס מתקפל בראש הגיליון.
   ⚠ סגור כברירת מחדל: נכנסים לגיליון כדי לסמן מפגשים. */
/* בוררי החודשים בקנייה רב-חודשית.
   ⚠ רשת ולא select multiple — בחירה מרובה במגע נשברת. */
/* תיבת "לשבץ גם ביום שישי" — מוצגת רק ביום שלישי. */
/* תמונת "אחרי התיקון" מסומנת, כדי שלא תיקרא כתמונת הבעיה. */
/* "תורנות מטבח" ליד שם החניך בסימון האימון — עובדה על היום,
   נגזרת מלוח התורניות ואינה סימון של האימון. */
/* התראות לטלפון */
.pn-b{font-size:13px;line-height:1.6;color:var(--ink);font-weight:600}
.pn-s{font-size:12px;font-weight:800;color:var(--muted);margin-top:9px}
.pn-w{font-size:12px;line-height:1.65;font-weight:700;color:var(--amber);
  background:var(--amber-soft);border-radius:var(--r-sm);padding:9px 11px;margin-top:9px}
.pn-w code{font-family:ui-monospace,monospace;font-size:11px;direction:ltr;display:inline-block}
.pn-p{font-size:11.5px;line-height:1.6;color:var(--faint);font-weight:600;
  border-top:1px solid var(--line);margin-top:11px;padding-top:9px}

/* מסך שנתקל בתקלה — במקום דף לבן.
   ⚠ דף לבן הוא הכשל הגרוע ביותר: אין בו הודעה, אין ממנו
   יציאה, ואי אפשר לדווח עליו כי אין מה לתאר. */
.eb{background:var(--surface);border:1px solid var(--line2);border-radius:var(--r-lg);
  padding:18px 16px;margin:8px 0;box-shadow:var(--sh-1)}
.eb-t{font-size:16px;font-weight:800;color:var(--clay);letter-spacing:-.2px}
.eb-b{font-size:13px;font-weight:600;color:var(--muted);line-height:1.6;margin-top:6px}
.eb-m{font-size:11px;font-weight:600;color:var(--faint);background:var(--bg);
  border-radius:var(--r-sm);padding:8px 10px;margin-top:10px;direction:ltr;
  text-align:left;word-break:break-word;font-family:ui-monospace,monospace}

/* מפת ההרשאות */
.ac-note{font-size:12px;line-height:1.7;color:var(--muted);font-weight:600;
  background:var(--bg);border-radius:var(--r-md);padding:11px 13px;margin-bottom:12px}
.ac-c{margin-bottom:10px}
.ac-h{display:flex;align-items:center;gap:9px}
.ac-h b{font-size:15px;font-weight:800;letter-spacing:-.2px;flex:0 0 auto}
.ac-h span{flex:1;font-size:11px;font-weight:700;color:var(--faint);text-align:left}
.kx .ac-btn{width:100%;background:none;text-align:right;padding:0}
.ac-note-s{font-size:11.5px;line-height:1.6;color:var(--amber);background:var(--amber-soft);
  border-radius:var(--r-sm);padding:8px 10px;margin-top:8px;font-weight:700}
.ac-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}
.ac-l{list-style:none;margin:10px 0 0;padding:0}
.ac-l li{display:flex;align-items:flex-start;gap:7px;font-size:12.5px;font-weight:600;
  line-height:1.55;padding:4px 0;color:var(--ink)}
.ac-l li svg{flex:0 0 auto;margin-top:2px}
.ac-l li.yes svg{color:var(--ok)}
.ac-l li.no{color:var(--muted)}
.ac-l li.no svg{color:var(--clay)}
.ac-open{margin-top:10px;border-top:1px solid var(--line);padding-top:10px}
.ac-sub{font-size:10.5px;font-weight:800;color:var(--faint);margin:8px 0 4px}
.ac-body{font-size:13px;line-height:1.7;color:var(--ink);white-space:pre-wrap}

/* מרצים של סדרה, וסיכום סדרה */
.tm-note{font-size:12px;line-height:1.65;color:var(--muted);font-weight:600;
  background:var(--bg);border-radius:var(--r-md);padding:10px 12px;margin-bottom:12px}
.tm-lect{margin-bottom:10px}
.tm-lect-h{display:flex;align-items:center;gap:8px;justify-content:space-between}
.tm-lect-h b{font-size:15px;font-weight:800;letter-spacing:-.2px}
.tm-lect-m{display:flex;gap:5px;flex-wrap:wrap;font-size:11.5px;font-weight:700;
  color:var(--muted);margin-top:3px}
.tm-lect-o{font-size:13px;line-height:1.6;color:var(--ink);white-space:pre-wrap;margin-top:8px}
.tm-lect-f{display:flex;align-items:center;gap:6px;margin-top:8px;
  font-size:11px;font-weight:700;color:var(--faint)}
.tm-lect-f>span:first-child{flex:1}
.tm-sum-l{background:var(--bg);border-radius:var(--r-md);padding:10px 12px;margin-bottom:10px}
.tm-sum-l i{display:block;font-style:normal;font-size:10.5px;font-weight:800;
  color:var(--faint);margin-bottom:4px}
.tm-sum-l span{display:inline-block;font-size:12.5px;font-weight:700;
  background:var(--surface);border-radius:6px;padding:3px 8px;margin:0 0 4px 4px}

/* בורר ימים מרובה בעורך הצ׳ק ליסט */
.ch-dsel{display:flex;gap:5px;flex-wrap:wrap}
.kx .ch-dsel-b{width:34px;height:34px;border-radius:9px;border:2px solid var(--line2);
  background:var(--surface);font-size:13px;font-weight:800;color:var(--muted)}
.kx .ch-dsel-b.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
.ch-hint{font-size:11px;font-weight:700;color:var(--faint);margin-top:5px}
.ch-task-a{font-style:normal;font-size:9.5px;font-weight:800;background:var(--bg);
  color:var(--muted);padding:2px 6px;border-radius:5px;flex:0 0 auto}

/* דוח תשלום למרצים — אותה שפה של תקציב המטבח */
.pay-warn{font-size:11.5px;font-weight:700;color:var(--amber);background:var(--amber-soft);
  border-radius:var(--r-md);padding:9px 12px;margin:-4px 0 12px;line-height:1.6}
.kx .pay-m{display:flex;align-items:center;gap:9px;width:100%;padding:12px 13px;
  border-bottom:1px solid var(--line);background:none;text-align:right}
.kx .pay-m:last-child{border-bottom:none}
.pay-m-n{font-size:14px;font-weight:800;flex:0 0 auto}
.pay-m-f{flex:1;display:flex;gap:5px;flex-wrap:wrap}
.kx .pay-m b{font-size:15px;font-weight:800;letter-spacing:-.3px}
.pay-r{padding:11px 13px;border-bottom:1px solid var(--line)}
.pay-r:last-child{border-bottom:none}
.pay-r-t{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.pay-r-t b{font-size:14.5px;font-weight:800}
.pay-r-t span{font-size:15px;font-weight:800;letter-spacing:-.3px}
.pay-r-m{display:flex;gap:6px;flex-wrap:wrap;font-size:11.5px;font-weight:700;
  color:var(--muted);margin-top:4px}
.pay-miss{color:var(--clay)}
.pay-pend{color:var(--amber)}
.pay-r-note{font-size:12px;color:var(--muted);margin-top:5px;line-height:1.5}
.pay-p{display:flex;align-items:center;gap:10px;padding:9px 13px;
  border-bottom:1px solid var(--line)}
.pay-p:last-child{border-bottom:none}
.pay-p-n{flex:1;min-width:0;font-size:13.5px;font-weight:700;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.kx .pay-p input{flex:0 0 108px;background:var(--surface);border:1px solid var(--line2);
  border-radius:9px;padding:7px 9px;font-size:13.5px;font-weight:700;outline:none;
  text-align:center;font-family:inherit}

/* דף המובילויות */
.ld{margin-bottom:10px;padding:0;overflow:hidden}
.kx .ld-h{display:flex;align-items:center;gap:9px;width:100%;padding:12px 13px;
  background:none;text-align:right}
.ld-t{flex:1;min-width:0}
.ld-t b{display:block;font-size:15px;font-weight:800;letter-spacing:-.2px}
.ld-t span{display:block;font-size:11.5px;color:var(--muted);font-weight:600;margin-top:2px}
.ld-b{padding:0 13px 13px}
.ld-with{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px}
.ld-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:8px}
.ld-facts>div{background:var(--bg);border-radius:var(--r-sm);padding:9px 7px;text-align:center}
.ld-facts b{display:block;font-size:17px;font-weight:800;letter-spacing:-.4px}
.ld-facts span{display:block;font-size:10px;font-weight:700;color:var(--muted);margin-top:2px}
.ld-gap{font-size:11.5px;font-weight:700;color:var(--amber);background:var(--amber-soft);
  border-radius:var(--r-sm);padding:7px 10px;margin-bottom:8px}
.ld-abs{font-size:11.5px;font-weight:700;color:var(--muted);display:flex;gap:6px;
  flex-wrap:wrap;margin-bottom:8px}
.ld-abs span{background:var(--bg);border-radius:5px;padding:2px 6px}
.ld-note{font-size:12.5px;line-height:1.6;color:var(--ink);margin-bottom:8px}
.ld-note i{display:block;font-style:normal;font-size:10.5px;font-weight:800;
  color:var(--faint);margin-bottom:2px}
.ld-text{font-size:13.5px;line-height:1.65;color:var(--ink);white-space:pre-wrap;
  background:var(--bg);border-radius:var(--r-sm);padding:10px 12px}
.ld-text.ld-empty{color:var(--faint);font-weight:600}
.ld-by{font-size:11px;font-weight:700;color:var(--faint);margin-top:4px;text-align:left}
.kx .ld-b textarea{width:100%;background:var(--surface);border:1px solid var(--line2);
  border-radius:11px;padding:9px 12px;font-size:14px;outline:none;
  font-family:inherit;resize:vertical}

/* צ׳יפים של שבועות ההובלה בבורר התאריך */
.lw-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.kx .lw-chip{padding:7px 10px;border-radius:9px;border:2px solid var(--line2);
  background:var(--surface);font-size:12px;font-weight:800;color:var(--muted);
  display:flex;flex-direction:column;align-items:center;line-height:1.25}
.kx .lw-chip.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
.lw-chip i{font-style:normal;font-size:9.5px;font-weight:700;opacity:.75}
.lw-out{margin-top:8px;font-size:11.5px;font-weight:700;color:var(--clay);
  background:var(--clay-soft);border-radius:var(--r-sm);padding:8px 10px;line-height:1.5}

/* מיונים ושיבוצים */
.ty-note{font-size:12px;line-height:1.65;color:var(--muted);font-weight:600;
  background:var(--bg);border-radius:var(--r-md);padding:10px 12px;margin-bottom:12px}
.ty-card{margin-bottom:10px}
.ty-top{display:flex;align-items:center;gap:8px;justify-content:space-between}
.ty-top b{font-size:15px;font-weight:800;letter-spacing:-.2px}
.ty-meta{font-size:11.5px;color:var(--muted);font-weight:700;margin-top:3px;
  display:flex;gap:5px;flex-wrap:wrap}
.ty-note-b{font-size:13px;line-height:1.6;color:var(--ink);white-space:pre-wrap;margin-top:7px}
.ty-status{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px}
.ty-row{padding:11px 13px;border-bottom:1px solid var(--line)}
.ty-row:last-child{border-bottom:none}
.ty-row-n{font-size:14px;font-weight:800;display:flex;align-items:center;gap:7px;
  justify-content:space-between}
.ty-row-f{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
.ty-row-l{font-size:11.5px;color:var(--muted);font-weight:600;margin-top:4px}

/* ---- השיבוץ לצה״ל: חיל אחד, ופירוט תפקיד לצידו ----
   הכרטיס פתוח כשקוראים וסגור כשעורכים: מי שכבר שובץ רואה
   שורה אחת, ומי שטרם — רואה בדיוק את מה שחסר. */
.ty-pl{margin-bottom:12px}
.ty-pl-h{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ty-pl-v{font-size:15px;font-weight:800;letter-spacing:-.2px;margin-top:3px}
.ty-pl-v span{font-weight:600;color:var(--muted);font-size:13px}
/* "טרם שובצתי" הוא מצב, ולא שדה ריק — ולכן מעומעם ולא נעדר. */
.ty-pl-none{color:var(--muted);font-weight:700;font-size:13.5px}

/* ---- הרישום הישן מהפרופיל ----
   מעומעם בכוונה: הוא נשמר כדי שלא יאבד, ואינו מה שקוראים. */
.ty-old{background:var(--bg);border-radius:var(--r-md);padding:11px 13px}
.ty-old-r{display:flex;gap:8px;align-items:baseline;margin-top:6px;font-size:13px}
.ty-old-r span{color:var(--muted);font-weight:700;font-size:11.5px;min-width:52px}
.ty-old-r b{font-weight:700;line-height:1.5}
.tr-duty{display:inline-block;font-style:normal;font-size:9.5px;font-weight:800;
  background:var(--amber-soft);color:var(--amber);padding:1px 5px;
  border-radius:5px;margin-inline-start:6px;vertical-align:middle}
.thumb-done{position:relative}
.thumb-done i{position:absolute;inset-inline-end:2px;bottom:2px;font-style:normal;
  font-size:9px;font-weight:800;background:var(--ok);color:#fff;
  padding:1px 5px;border-radius:5px}
.kx .ch-mirror{display:flex;align-items:flex-start;gap:9px;margin-top:10px;
  padding:10px 11px;background:var(--bg);border-radius:var(--r-sm);
  font-size:13px;font-weight:700;color:var(--ink);cursor:pointer}
.ch-mirror input{width:19px;height:19px;flex:0 0 19px;margin-top:1px;accent-color:var(--accent)}
.ch-mirror i{display:block;font-style:normal;font-size:11px;font-weight:600;
  color:var(--faint);margin-top:2px}
.mo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px}
.kx .mo-c{padding:9px 6px;border-radius:9px;border:2px solid var(--line2);
  background:var(--surface);font-size:12.5px;font-weight:700;color:var(--muted);
  min-height:42px}
.kx .mo-c.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
.lc{margin:0 0 12px}
.kx .lc-top{display:flex;align-items:center;gap:7px;width:100%;padding:9px 12px;
  background:var(--surface);border:1px solid var(--line2);border-radius:var(--r-md);
  font-size:13px;font-weight:800;color:var(--ink);text-align:right}
.lc-ttl{flex:1}
.lc-body{padding:11px 12px 12px;background:var(--surface);border:1px solid var(--line2);
  border-top:none;border-radius:0 0 var(--r-md) var(--r-md);margin-top:-8px;padding-top:16px}
.kx .lc-row{display:flex;align-items:center;gap:9px;padding:8px 0;
  border-bottom:1px solid var(--line);text-decoration:none;color:inherit}
.kx .lc-row:last-of-type{border-bottom:none}
.lc-k{font-size:11.5px;font-weight:700;color:var(--muted);flex:0 0 54px}
.lc-v{font-size:14px;font-weight:700;color:var(--accent)}
.lc-note{font-size:13px;line-height:1.6;color:var(--ink);white-space:pre-wrap;margin-top:8px}
.ev-date{font-weight:800;color:var(--ink)}
.kx .ev-del{flex:0 0 auto;color:var(--clay)}
.ev-note{font-size:11px;font-weight:700;color:var(--muted);line-height:1.55;
  background:var(--bg);border-radius:9px;padding:7px 9px;margin:2px 0 8px}
.rq-skip{font-size:11px;font-weight:700;color:var(--amber);line-height:1.5;
  background:var(--amber-soft);border-radius:9px;padding:7px 9px;margin-top:10px}

/* ============================================================
   שכבת ההרמה
   ------------------------------------------------------------
   ⚠ יושבת בסוף בכוונה: היא דורסת כללים שמעליה בלי לגעת בהם,
     וכך אפשר להסיר אותה בבלוק אחד אם משהו נשבר.

   העיקרון: אותה זהות חמה — קרם, נייבי, חימר — אבל עם עומק
   במקום קווים. עד היום כל משטח הוגדר על ידי מסגרת 1px; מסגרת
   מפרידה, צל מרים. מה שהוחלף:

     מסגרת קשה  →  צל דו-שכבתי + מסגרת כמעט שקופה
     רדיוס 16   →  20 לכרטיס, 14 לאלמנט פנימי
     בלי מעבר   →  120ms על ease-out לכל דבר לחיץ

   ⚠ המסגרת לא הוסרה לגמרי אלא הוחלשה. בלעדיה משטח לבן על רקע
     קרם בהיר מאבד את הקצה במסכים חיוורים ובאור שמש.
   ============================================================ */

.kx .card{border-radius:var(--r-lg);border:1px solid rgba(211,201,182,.5);
  box-shadow:var(--sh-1);padding:16px 17px}

/* ---- אריח האייקון ----
   ⚠ הלב של השדרוג. ריבוע מעוגל בגוון הקטגוריה עם האייקון בדיו
     שלה — מה שהופך רשימה של שמות לרשימה שאפשר לסרוק בעין. */
.tile{width:46px;height:46px;border-radius:var(--r-md);display:grid;place-items:center;
  flex:0 0 auto;font-size:21px;line-height:1;font-weight:800;
  background:var(--t-s,var(--accent-soft));color:var(--t,var(--accent));
  transition:transform .12s var(--ease)}
.tile.sm{width:38px;height:38px;border-radius:11px;font-size:17px}
.tile.lg{width:54px;height:54px;border-radius:16px;font-size:25px}
.tile svg{width:22px;height:22px}
.tile.sm svg{width:18px;height:18px}

/* גוונים. ⚠ --t ו---t-s נקבעים על ההורה, כדי שגם הכותרת,
   הפס והתגית באותו כרטיס יירשו את אותו צבע. */
.tone-1{--t:var(--t1);--t-s:var(--t1-s)}
.tone-2{--t:var(--t2);--t-s:var(--t2-s)}
.tone-3{--t:var(--t3);--t-s:var(--t3-s)}
.tone-4{--t:var(--t4);--t-s:var(--t4-s)}
.tone-5{--t:var(--t5);--t-s:var(--t5-s)}
.tone-6{--t:var(--t6);--t-s:var(--t6-s)}
.tone-7{--t:var(--t7);--t-s:var(--t7-s)}
.tone-8{--t:var(--t8);--t-s:var(--t8-s)}

/* ---- כרטיס שיבוץ ----
   ⚠ פס הגוון בקצה הימני הוא מה שנותן לרשימה את התחושה החיה:
     בסריקה מהירה רואים ענפים לעומת ועדות בלי לקרוא מילה. */
.kx .pl-card{position:relative;overflow:hidden;padding:0;
  transition:transform .12s var(--ease),box-shadow .12s var(--ease)}
.kx .pl-card::before{content:"";position:absolute;top:0;bottom:0;right:0;width:4px;
  background:var(--t,var(--accent))}
.kx .pl-card{margin-bottom:11px}
/* ⚠ הכרטיס השנתי הוא כפתור שלם. text-align מפורש כי .kx button
   יורש מרכוז מהדפדפן וזה הופך את השם למרוכז. */
.kx button.pl-card{width:100%;text-align:right;display:block}
.kx button.pl-card:active{transform:translateY(1px);box-shadow:var(--sh-1)}
.pl-head{display:flex;align-items:center;gap:12px;padding:14px 17px 12px}
.pl-card.one .pl-head{padding-bottom:11px}
/* בכרטיס השנתי המד הוא הקצה התחתון — בלי מרווח מתחתיו */
.pl-card.one .cap-bar{margin-bottom:0;border-radius:0;height:4px}
.pl-nm{flex:1;min-width:0}
.pl-nm b{display:block;font-size:16px;font-weight:800;letter-spacing:-.3px;line-height:1.25}
.pl-sub{font-size:11.5px;font-weight:700;color:var(--muted);margin-top:2px}
.pl-cap{font-size:11px;font-weight:800;color:var(--t,var(--accent));background:var(--t-s,var(--accent-soft));
  padding:4px 9px;border-radius:999px;white-space:nowrap;flex:0 0 auto}

/* מד תפוסה: כמה מהמכסה מלאה. ⚠ עדיף פס על מספר — "4/6" דורש
   חישוב, פס נקרא במבט. */
.cap-bar{height:5px;background:var(--line);border-radius:99px;overflow:hidden;margin:0 17px 12px}
.cap-fill{height:100%;border-radius:99px;background:var(--t,var(--accent));
  transition:width .4s var(--ease)}
.cap-bar.full .cap-fill{background:var(--ok)}
.cap-bar.over .cap-fill{background:var(--clay)}

.pl-sem{width:100%;text-align:right;display:flex;align-items:center;gap:11px;
  padding:11px 17px;border-top:1px solid rgba(211,201,182,.45);
  transition:background .12s var(--ease)}
.pl-sem:active{background:var(--t-s,#F7F3EA)}
.pl-sem .pl-who{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--muted);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-sem .pl-n{font-size:15px;font-weight:900;letter-spacing:-.5px;flex:0 0 auto;
  font-variant-numeric:tabular-nums;color:var(--t,var(--accent))}
.pl-sem .pl-n.over{color:var(--clay)}
.pl-semnm{font-size:12.5px;font-weight:800;flex:0 0 auto}

/* ---- כותרת מקטע עם תווית מעל ----
   השאלה מ-busly: תווית קטנה בצבע מעל הכותרת. היא נותנת
   היררכיה בלי להגדיל עוד גופן. */
.eyebrow{font-size:10.5px;font-weight:900;letter-spacing:1.2px;color:var(--t,var(--accent));
  margin:20px 2px 5px;text-transform:uppercase}
.eyebrow + .screen-title{margin-top:0}

/* ---- הרמות ומעברים ---- */
.kx .stat-tile{border-radius:var(--r-lg);border:1px solid rgba(211,201,182,.5);
  box-shadow:var(--sh-1);transition:transform .12s var(--ease),box-shadow .12s var(--ease)}
.kx .stat-tile:active{transform:translateY(1px) scale(.985);box-shadow:var(--sh-1)}
.kx .dash-card,.kx .attn-row{border-radius:var(--r-lg);border:1px solid rgba(211,201,182,.5);
  box-shadow:var(--sh-1);transition:transform .12s var(--ease),background .12s var(--ease)}
.kx .dash-card:active,.kx .attn-row:active{transform:translateY(1px)}
.dash-ico{border-radius:var(--r-md)}

/* ---- הבורר ---- */
.seg{background:rgba(211,201,182,.34);border-radius:var(--r-md);padding:4px}
.seg button{border-radius:11px;transition:color .12s var(--ease),background .12s var(--ease),
  box-shadow .12s var(--ease)}
.seg button.on{box-shadow:0 1px 2px rgba(47,38,22,.06),0 4px 12px -6px rgba(47,38,22,.28)}

/* ---- כפתורים ----
   ⚠ הראשי מקבל שיפוע עדין ולא צבע שטוח. שני גוונים של אותו
     נייבי — מספיק כדי שייראה מואר, לא מספיק כדי לצעוק. */
.kx .btn{border-radius:var(--r-md);transition:transform .12s var(--ease),
  box-shadow .12s var(--ease),opacity .12s var(--ease)}
.kx .btn-primary{background:linear-gradient(135deg,#012E58 0%,#0A4478 100%);
  box-shadow:0 2px 4px rgba(0,36,84,.16),0 10px 24px -12px rgba(0,36,84,.6)}
.kx .btn-primary:active{transform:translateY(1px);
  box-shadow:0 1px 2px rgba(0,36,84,.2)}
.kx .btn-sm{border-radius:11px}

/* ---- תגיות ---- */
.pill{border-radius:999px;padding:3px 9px;letter-spacing:.2px}

/* ---- שדות ---- */
.kx .fld input,.kx .fld select,.kx .fld textarea,.kx .search{
  border-radius:var(--r-md);transition:border-color .12s var(--ease),box-shadow .12s var(--ease)}
.kx .fld input:focus,.kx .fld select:focus,.kx .fld textarea:focus,.kx .search:focus{
  border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}

/* ---- מסך הבית ----
   ⚠ האייקון יושב מעל המספר ולא לצידו: המספר הוא העיקר באריח
     הזה, ואייקון בשורה אחת איתו היה גוזל ממנו רוחב. */
.stat-tile .tile{margin-bottom:9px}
.kx .stat-tile{padding:14px 15px 13px}
.stat-tile .sv{color:var(--t,var(--accent))}
/* ⚠ מצב שדורש טיפול גובר על גוון התחום — לשם הוא נועד. */
.kx .stat-tile.warn .sv{color:var(--clay)}
.kx .stat-tile.good .sv{color:var(--ok)}

.kx .nav-tile{border-radius:var(--r-lg);border:1px solid rgba(211,201,182,.5);
  box-shadow:var(--sh-1);transition:transform .12s var(--ease),box-shadow .12s var(--ease)}
.kx .nav-tile:active{transform:translateY(1px) scale(.99)}
.nav-ico{border-radius:11px;background:var(--t-s,var(--accent-soft));color:var(--t,var(--accent))}

/* ---- המשטחים שחוזרים בכל מסך ----
   ⚠ אלה נעשים ביחד ולא מסך-מסך: כרטיס עם צל במסך אחד וכרטיס
     עם מסגרת במסך שכן נראה כמו תקלה, לא כמו עיצוב. */
.kx .ledger,.kx .rows,.kx .rq,.kx .alert,.kx .grp{
  border-radius:var(--r-lg);border:1px solid rgba(211,201,182,.5);box-shadow:var(--sh-1)}
.kx .rq{padding:15px 17px}

/* תווית מקטע — קטנה, מרווחת ובצבע.
   ⚠ ההשראה מ-busly: תווית זעירה מעל הכותרת נותנת היררכיה בלי
     להגדיל עוד גופן ובלי להוסיף עוד שורה גדולה למסך. */
.sec-label{font-size:10.5px;font-weight:900;letter-spacing:1.3px;color:var(--accent);
  opacity:.62;margin:24px 3px 10px}

/* כותרת המסך: קו גוון קצר מתחתיה במקום כלום.
   ⚠ ::after ולא border-bottom — קו על כל הרוחב היה מחלק את
     המסך לשניים; קו קצר רק מדגיש את הכותרת. */
.screen-title{position:relative;padding-bottom:9px;margin-bottom:15px}
.screen-title::after{content:"";position:absolute;bottom:0;right:2px;width:34px;height:3px;
  border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--t,#0A4478))}

/* הסרגל העליון — צל רך במקום קצה חד */
.top{box-shadow:0 2px 18px -6px rgba(0,20,50,.45)}

/* שורות ברשימות — מעבר רך במקום קפיצה */
.st-row{transition:background .12s var(--ease)}
.tick{transition:all .12s var(--ease)}

/* ---- עומק ברקע ----
   ⚠ שלושה כתמי אור רכים מאחורי הכול, בגוונים של הזהות עצמה —
     נייבי, חימר, ירוק — כל אחד ב-4%-5% שקיפות. רקע קרם שטוח
     על מסך גדול נראה כמו נייר; הכתמים נותנים לו נפח בלי
     שאיש שם לב שהם שם.

   ⚠ fixed ולא scroll: הכתמים נשארים במקומם בזמן גלילה, ולכן
     הם קוראים כתאורה של החדר ולא כחלק מהתוכן שזז. */
/* ⚠ :not(.kx-login) — מסך הכניסה מגדיר לעצמו רקע תמונה באותה
   דרגת ספציפיות, והכלל הזה יושב אחריו בקובץ ולכן היה גובר
   עליו. התוצאה: התמונה נעלמה והמסך נשאר קרם ריק. */
.kx:not(.kx-login){
  background:
    /* ⚠ שלוש תחנות ולא שתיים. מעבר ישיר מצבע לשקוף על שטח
       גדול יוצר טבעות גלויות — הבהוב של פסים שנראה כמו תקלה
       ולא כמו תאורה. תחנת ביניים מרככת את הנפילה. */
    radial-gradient(46% 32% at 88% 4%, rgba(0,36,84,.05), rgba(0,36,84,.018) 45%, transparent 72%),
    radial-gradient(42% 30% at 4% 24%, rgba(158,54,38,.038), rgba(158,54,38,.014) 45%, transparent 72%),
    radial-gradient(52% 34% at 62% 94%, rgba(31,107,69,.036), rgba(31,107,69,.013) 45%, transparent 74%),
    var(--bg);
  background-attachment:fixed;
}

/* ---- רצועת סיכום ----
   ⚠ המספרים שמסכמים מסך יושבים על כהה ולא על לבן. זו ההשראה
     הישירה מ-busly: רצועה כהה עם זוהר עדין מלמעלה עוצרת את
     העין ואומרת "זו התמונה הגדולה", לפני שיורדים לרשימה. */
.band{position:relative;overflow:hidden;border-radius:var(--r-lg);
  background:linear-gradient(162deg,#012E58 0%,#0A3A66 100%);
  color:#fff;padding:15px 17px;margin-bottom:14px;
  box-shadow:0 14px 34px -18px rgba(0,36,84,.8)}
.band::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(72% 130% at 50% -28%,rgba(126,178,232,.22),transparent 62%)}
.band-grid{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:8px}
.band-c{text-align:center;min-width:0}
/* ⚠ קו מפריד ולא רווח: שלושה מספרים בשורה בלי הפרדה נקראים
   כמספר אחד ארוך. */
.band-c + .band-c{border-right:1px solid rgba(255,255,255,.16)}
.band-n{font-family:'Suez One',Heebo,serif;font-size:25px;line-height:1.15;
  font-variant-numeric:tabular-nums}
.band-n.warn{color:#FFC4B4}
.band-n.ok{color:#A8E6C4}
.band-l{font-size:10.5px;font-weight:700;opacity:.72;margin-top:2px;line-height:1.3}
.band-h{position:relative;font-size:11px;font-weight:800;letter-spacing:.9px;
  opacity:.6;margin-bottom:11px}

/* ---- מצב ריק ----
   ⚠ מצב ריק אמיתי מקבל אייקון רגוע. כשל טעינה נשאר באנר אדום
     ונפרד — שני מסכים שונים, תמיד (עיקרון 6). */
.empty{text-align:center;padding:34px 18px}
.empty .e-ico{width:52px;height:52px;border-radius:17px;margin:0 auto 12px;
  display:grid;place-items:center;background:var(--t-s,var(--accent-soft));
  color:var(--t,var(--accent))}
.empty .e-ico svg{width:24px;height:24px}

/* ---- שלד טעינה ----
   ⚠ עדיף על "טוען…": השלד מראה את הצורה שתגיע, והמסך לא קופץ
     כשהנתונים נכנסים. */
@keyframes shim{from{background-position:100% 0}to{background-position:-100% 0}}
.skel{border-radius:var(--r-md);background:linear-gradient(90deg,
  rgba(211,201,182,.22) 25%,rgba(211,201,182,.42) 50%,rgba(211,201,182,.22) 75%);
  background-size:200% 100%;animation:shim 1.25s linear infinite}
.skel-card{height:74px;border-radius:var(--r-lg);margin-bottom:10px}
.skel-line{height:13px;margin-bottom:9px}
.skel-line.w60{width:60%}
.skel-line.w40{width:40%}

/* ---- מד קטן לשורה ----
   ⚠ אותו רעיון של מד התפוסה בשיבוצים: כמות מול מפתח נקראת
     כפס, לא כחישוב בראש. */
.mini-bar{height:3px;border-radius:99px;background:var(--line);overflow:hidden;
  margin-top:6px;max-width:150px}
.mini-fill{height:100%;border-radius:99px;background:var(--ok);transition:width .4s var(--ease)}
.mini-bar.low .mini-fill{background:var(--clay)}
.mini-bar.mid .mini-fill{background:var(--amber)}

/* ---- רשימות ---- */
.kx .rows{overflow:hidden}
.st-row{border-bottom-color:rgba(211,201,182,.45)}
.led-item{border-bottom-color:rgba(211,201,182,.45)}

/* ---- מסך הכניסה ----
   ⚠ הרושם הראשון של המערכת, והמסך היחיד שאינו על קרם. התמונה
     נשארת; מה שהשתנה הוא מה שיושב עליה. */
.kx-login{background:
  linear-gradient(178deg,rgba(1,32,62,.86) 0%,rgba(4,52,96,.72) 42%,rgba(1,28,56,.94) 100%),
  url(/photos/login.jpg) center/cover no-repeat #0A4478;
  background-attachment:fixed}
/* זוהר רך מאחורי הכרטיס — מפריד אותו מהתמונה בלי מסגרת */
.kx-login::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(58% 42% at 50% 46%,rgba(126,178,232,.16),transparent 68%)}
.kx-login .wrap{position:relative;z-index:1}
.kx-login .login-mark{width:150px;height:150px;
  filter:drop-shadow(0 14px 36px rgba(0,0,0,.45))}
.kx-login .login-title{font-family:'Suez One',Heebo,serif;font-size:27px;font-weight:400;
  letter-spacing:0;margin-top:6px;text-shadow:0 2px 14px rgba(0,16,40,.5)}
.kx-login .login-sub{color:rgba(255,255,255,.72);font-size:13px;font-weight:600;
  margin:5px 0 20px;letter-spacing:.2px}

/* ⚠ הכרטיס מזוגג ולא אטום: התמונה נראית מבעדו והוא עדיין
   קריא לחלוטין. backdrop-filter לא נתמך בכל דפדפן, ולכן
   מתחתיו יושב לבן ב-92% שעומד בפני עצמו. */
.kx-login .card{background:rgba(255,255,255,.92);
  -webkit-backdrop-filter:blur(14px) saturate(1.1);backdrop-filter:blur(14px) saturate(1.1);
  border:1px solid rgba(255,255,255,.5);border-radius:22px;padding:20px 18px;
  box-shadow:0 24px 60px -24px rgba(0,14,34,.85)}
.kx-login .seg{background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18);
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-radius:15px}
.kx-login .seg button.on{background:#fff;color:#012E58;
  box-shadow:0 3px 12px rgba(0,10,30,.32)}
.kx-login .fld label{color:var(--muted)}
.kx-login .fld input{background:var(--bg);border-color:var(--line2)}
.kx-login .btn-primary{margin-top:2px}

/* שורת הסיום — מי בנה ולמי. שקטה, ורק כדי שהמסך לא ייגמר
   בכפתור באוויר. */
.kx-login .login-foot{position:relative;z-index:1;text-align:center;
  color:rgba(255,255,255,.55);font-size:11.5px;font-weight:600;
  padding:18px 12px calc(10px + env(safe-area-inset-bottom))}

/* ---- אירועי בטיחות ----
   ⚠ "ממתין לדיווח" הוא מטלה פתוחה מול גורם חיצוני, ולכן שורה
     משלו בצבע ולא עוד תגית אפורה בתוך שורת המטא. */
.sf-pend{margin-top:6px;font-size:11px;font-weight:800;color:var(--amber);
  background:var(--amber-soft);border-radius:8px;padding:4px 8px;display:inline-block}

/* ---- גאנט: צבע לכל אירוע ----
   ⚠ .act לוקח את הגוון מהמחלקה tone-N שלצידו. שבת וחג שומרים
     על הצבע הקבוע שלהם ולא עוברים דרך כאן. */
.cal-chip.act{background:var(--t-s,var(--accent-soft));color:var(--t,var(--accent))}
.cal-cell{border-color:rgba(211,201,182,.55);transition:transform .12s var(--ease)}
.cal-cell:not(.empty):active{transform:scale(.97)}
.cal-cell.today{box-shadow:0 0 0 3px var(--accent-soft)}
.gnt-ev{border-bottom-color:rgba(211,201,182,.45)}
/* נקודת צבע בתחילת שורת אירוע ברשימת היום */
.gnt-ev .gnt-what::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;
  background:var(--t,var(--accent));margin-left:7px;vertical-align:middle}

/* ---- שדות ובוררים ----
   ⚠ שדה טופס הוא המקום שבו המשתמש עוצר וחושב. עד היום הוא
     נראה כמו קלט של דפדפן; עכשיו יש לו רקע רך, מסגרת שמגיבה
     ומיקוד עם טבעת. */
.kx .fld input,.kx .fld select,.kx .fld textarea{
  background:var(--bg);border:1.5px solid transparent;border-radius:var(--r-md);
  transition:background .12s var(--ease),border-color .12s var(--ease),box-shadow .12s var(--ease)}
.kx .fld input:hover,.kx .fld textarea:hover{background:#F1ECE0}
.kx .fld input:focus,.kx .fld select:focus,.kx .fld textarea:focus{
  background:var(--surface);border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.kx .fld input::placeholder,.kx .fld textarea::placeholder{color:var(--faint)}
.fld label{color:var(--ink);opacity:.72}
/* ⚠ חץ ה-select של הדפדפן נעלם ב-appearance:none, ולכן הוא
   מצויר כאן — אחרת אין שום סימן שאפשר לפתוח את השדה. */
.kx .fld select{appearance:none;-webkit-appearance:none;padding-left:34px;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' stroke='%236B6455' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='M5 8l5 5 5-5'/></svg>");
  background-repeat:no-repeat;background-position:left 10px center}

.pick button{border-radius:var(--r-md);border:1.5px solid var(--line);background:var(--bg);
  transition:all .12s var(--ease)}
.pick button:active{transform:translateY(1px)}
/* ⚠ הבורר לוקח את גוון ההקשר אם ניתן לו, ונופל לנייבי אחרת —
   כך "דחוף" אדום ו"רגיל" כחול בלי כלל נפרד לכל מסך. */
.pick button.on{background:var(--t,var(--accent));border-color:var(--t,var(--accent));color:#fff;
  box-shadow:0 3px 10px -4px var(--t,var(--accent))}

.search{border-radius:var(--r-md);transition:border-color .12s var(--ease),box-shadow .12s var(--ease)}
.search:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}

.tick{border-radius:9px;transition:all .12s var(--ease)}

/* ---- טבלאות ורשימות ----
   ⚠ כותרת קבוצה נדבקת בגלילה. ברשימה של 89 פריטי ציוד אי אפשר
     לזכור באיזה תחום נמצאים אחרי שלוש גלילות. */
.grp-h{position:sticky;top:0;z-index:2;background:var(--bg);
  padding:8px 4px 7px;margin:0;backdrop-filter:blur(6px)}
.kx .rows .st-row:last-child{border-bottom:none}
/* ⚠ ריחוף בלבד ולא פס זברה: זברה על רשימה ארוכה מוסיפה רעש
   ויזואלי בדיוק במקום שבו צריך לסרוק בשקט. */
@media (hover:hover){
  .kx .st-row:hover{background:rgba(211,201,182,.16)}
  .kx .led-item:hover{background:rgba(211,201,182,.16)}
}

/* ---- כפתורים משניים ---- */
.kx .btn-ghost{border-radius:var(--r-md);border:1.5px solid var(--line);
  background:var(--surface);transition:all .12s var(--ease)}
.kx .btn-ghost:active{transform:translateY(1px);background:var(--bg)}

/* ---- מודאל ---- */
.sheet{border-radius:24px 24px 0 0;box-shadow:0 -18px 50px -20px rgba(47,38,22,.5)}

/* ---- מד כמות ----
   ⚠ הכמות בטקסט חופשי ("40 חבילות של 10"), ולכן המד מציג את
     הטקסט המלא ולא רק מספר. הוא נגזר לרוחב ולא נשבר לשתי
     שורות — שורת ציוד חייבת להישאר בגובה אחיד. */
.qstep{display:flex;align-items:center;gap:2px;padding:0 13px 11px;
  margin-top:-4px}
.kx .qs-btn{width:34px;height:34px;border-radius:11px;flex:0 0 auto;
  background:var(--bg);border:1.5px solid var(--line);
  font-size:19px;font-weight:800;line-height:1;color:var(--accent);
  display:grid;place-items:center;transition:all .12s var(--ease)}
.kx .qs-btn:active{transform:translateY(1px);background:var(--accent-soft)}
.kx .qs-btn:disabled{opacity:.4}
.qs-n{flex:1;min-width:0;text-align:center;font-size:13.5px;font-weight:800;
  color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  padding:0 6px}

/* ---- הוספה בעורך ---- */
.qadd{background:var(--accent-soft);border-radius:var(--r-md);padding:11px 12px;
  margin-bottom:13px}
.qadd label{color:var(--accent);opacity:1}
.qadd-row{display:flex;gap:6px}
.kx .qadd-row input{flex:1;min-width:0;background:var(--surface)}
.kx .qa-plus,.kx .qa-minus{flex:0 0 auto;min-height:48px;padding:0 15px;
  border-radius:var(--r-md);font-size:14px;font-weight:800;
  transition:all .12s var(--ease)}
.kx .qa-plus{background:var(--accent);color:#fff}
.kx .qa-minus{background:var(--surface);color:var(--clay);border:1.5px solid var(--line2)}
.kx .qa-plus:active,.kx .qa-minus:active{transform:translateY(1px)}
.kx .qa-plus:disabled,.kx .qa-minus:disabled{opacity:.42}
.qadd-hint{font-size:11px;font-weight:700;color:var(--muted);margin-top:7px;line-height:1.5}

/* ---- כותרת פרופיל חניך ---- */
.sd-head{display:flex;align-items:center;gap:13px;margin:2px 2px 15px}
.sd-av{width:56px;height:56px;border-radius:19px;flex:0 0 auto;display:grid;place-items:center;
  background:linear-gradient(145deg,#012E58,#0A4478);color:#fff;
  font-family:'Suez One',Heebo,serif;font-size:21px;line-height:1;
  box-shadow:0 10px 24px -12px rgba(0,36,84,.8)}
.sd-who{min-width:0}
.sd-who b{display:block;font-family:'Suez One',Heebo,serif;font-size:24px;font-weight:400;
  line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sd-who span{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-top:3px}

/* ---- לו״ז יומי ----
   ⚠ קו זמן ולא רשימה. שעה, נקודה על ציר, ואירוע — כך רואים
     מיד מה קרוב ומה רחוק, ולא רק מה בא אחרי מה. */
.ag-ev{position:relative;padding:9px 0 9px 0;gap:13px}
.ag-ev+.ag-ev{border-top:none}
.ag-time{flex:0 0 46px;align-items:flex-end;text-align:left}
.ag-time b{font-size:14px;color:var(--ink)}
/* הציר: קו דק שעובר בין הנקודות */
.ag-body{position:relative;padding-right:17px}
.ag-body::before{content:"";position:absolute;top:6px;right:0;width:9px;height:9px;
  border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.ag-ev:not(:last-child) .ag-body::after{content:"";position:absolute;top:18px;bottom:-18px;
  right:4px;width:1.5px;background:var(--line)}
.ag-name{font-size:14.5px;font-weight:800;letter-spacing:-.2px}
.ag-allday{background:var(--amber-soft);color:var(--amber);border-radius:99px;
  padding:2px 8px;white-space:nowrap}
/* ⚠ האירוע שקורה עכשיו מסומן. זה המידע היחיד שמשתנה תוך כדי
   שמסתכלים על המסך. */
.ag-ev.now .ag-body::before{background:var(--ok);box-shadow:0 0 0 3px var(--ok-soft)}
.ag-ev.now .ag-name{color:var(--ok)}
.kx .ag-day{border-radius:var(--r-lg);border:1px solid rgba(211,201,182,.5);
  box-shadow:var(--sh-1);padding:14px 16px}
.kx .ag-day.today{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft),var(--sh-1)}
.ag-day-h{padding-bottom:9px;margin-bottom:4px;border-bottom:1px solid rgba(211,201,182,.45)}
.ag-day-h b{font-size:15px;font-weight:800}
.ag-day-h span{background:var(--accent-soft);color:var(--accent);border-radius:99px;
  padding:2px 9px;font-size:11px}

/* ---- ניצול תקציב ----
   ⚠ --u הוא צבע המצב, ונקבע ברכיב לפי האחוז. הוא צובע את
     המספר, את הפס ואת התגית ביחד — כדי שלא ייווצר מצב שבו
     הפס אדום והמספר ירוק. */
.util{background:var(--surface);border:1px solid rgba(211,201,182,.5);
  border-radius:var(--r-lg);box-shadow:var(--sh-1);padding:15px 17px 14px;margin-bottom:14px}
.util-h{font-size:10.5px;font-weight:900;letter-spacing:1.1px;color:var(--faint);
  margin-bottom:10px}
.util-top{display:flex;align-items:baseline;gap:11px;margin-bottom:11px}
.util-pct{font-family:'Suez One',Heebo,serif;font-size:40px;line-height:1;
  color:var(--u);font-variant-numeric:tabular-nums}
.util-side{display:flex;flex-direction:column;gap:2px;min-width:0}
/* ⚠ המילה היא חלק מהמידע ולא קישוט: מי שאינו מבחין בין ירוק
   לאדום קורא אותה במקום את הצבע. */
.util-tag{font-size:12.5px;font-weight:900;color:var(--u)}
.util-sub{font-size:11px;font-weight:700;color:var(--faint)}

.util-bar{position:relative;height:10px;border-radius:99px;background:var(--line);
  overflow:hidden;margin-bottom:12px}
.util-fill{position:absolute;inset:0 auto 0 0;right:0;border-radius:99px;
  background:var(--u);transition:width .5s var(--ease)}
/* ⚠ החריגה היא פס אלכסוני בקצה ולא פס ארוך יותר: מסלול שגולש
   מעצמו אינו קריא, וטקסטורה נקראת גם בהדפסה ובעיוורון צבעים. */
.util-over{position:absolute;top:0;bottom:0;left:0;width:26%;
  background:repeating-linear-gradient(135deg,var(--u) 0 4px,rgba(255,255,255,.55) 4px 8px)}
.util-legs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.util-legs>div{min-width:0}
.util-legs b{display:block;font-size:14px;font-weight:800;letter-spacing:-.3px}
.util-legs span{display:block;font-size:10.5px;font-weight:700;color:var(--faint);margin-top:1px}

/* ---- גרף חודשי ---- */
.chart{background:var(--surface);border:1px solid rgba(211,201,182,.5);
  border-radius:var(--r-lg);box-shadow:var(--sh-1);padding:13px 12px 10px;margin-bottom:14px}
.chart-legend{display:flex;gap:14px;justify-content:flex-end;margin-bottom:11px;
  font-size:11px;font-weight:700;color:var(--muted)}
.chart-legend span{display:flex;align-items:center;gap:5px}
.chart-legend{flex-wrap:wrap;gap:10px 13px}
.chart-legend i{width:10px;height:10px;border-radius:3px;display:block;flex:0 0 auto}

/* ⚠ העמודות דקות ובעלות קצה מעוגל, ומעוגנות לבסיס. הרווח
   ביניהן הוא רקע ולא קו — שני מילוי צמודים נקראים כמילוי אחד. */
.chart-plot{display:flex;align-items:flex-end;gap:2px;height:132px;
  direction:rtl}
.kx .cbar{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;
  align-items:center;justify-content:flex-end;gap:4px;padding:0;background:none;
  position:relative;transition:opacity .12s var(--ease)}
.kx .cbar:active{opacity:.7}
/* ⚠ הפלחים נערמים מלמטה למעלה, עם רווח של 2px ביניהם. שני
   מילויים צמודים נקראים כמילוי אחד — הרווח הוא מה שהופך אותם
   לשלושה. הקצה העליון מעוגל, השאר ישר. */
.cbar-stack{width:100%;max-width:26px;display:flex;flex-direction:column-reverse;
  gap:2px;overflow:hidden;border-radius:4px 4px 0 0;transition:height .5s var(--ease)}
.cseg{width:100%;display:block;transition:height .5s var(--ease)}
.cbar.hot .cbar-stack{box-shadow:0 0 0 2px var(--surface),0 0 0 3.5px var(--accent)}
.cbar-over{position:absolute;top:-2px;font-size:11px;font-weight:900;color:#B02A1F}
.cbar-x{font-size:9.5px;font-weight:700;color:var(--faint);white-space:nowrap}

.chart-tip{margin-top:10px;background:var(--bg);border-radius:var(--r-md);
  padding:9px 11px;display:flex;flex-direction:column;gap:2px}
.chart-tip b{font-size:13px;font-weight:800}
.chart-tip span{font-size:11.5px;font-weight:700;color:var(--muted);
  display:flex;align-items:center;gap:6px}
.chart-tip i{width:9px;height:9px;border-radius:3px;flex:0 0 auto}
.tip-over{color:#B02A1F !important;font-weight:900}

/* ---- נוכחות אימונים ---- */
.st-train{display:flex;align-items:center;gap:7px;margin-top:5px}
.st-train-k{font-size:10.5px;font-weight:700;color:var(--faint)}
.tr-card{display:flex;align-items:center;gap:16px;margin-bottom:14px}
.tr-pct{font-family:'Suez One',Heebo,serif;font-size:34px;line-height:1;flex:0 0 auto;
  font-variant-numeric:tabular-nums}
.tr-legs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;flex:1;text-align:center}
.tr-legs b{display:block;font-size:16px;font-weight:800}
.tr-legs span{display:block;font-size:10.5px;font-weight:700;color:var(--faint);margin-top:1px}

/* ---- מסך התפקידים ----
   ⚠ התפקיד הוא הכרטיס, לא החניך. השאלה שנשאלת כאן היא "מי
     אחראי על X", ולא "אילו תפקידים יש ל-Y" — ולכן הרשימה
     מסודרת לפי תפקידים ובחירת החניכים יושבת בתוך כל אחד. */
.kx .rl-card{padding:0;overflow:hidden;position:relative;margin-bottom:11px}
.kx .rl-card::before{content:"";position:absolute;top:0;bottom:0;right:0;width:4px;
  background:var(--t,var(--accent))}
.kx .rl-head{width:100%;text-align:right;display:flex;align-items:center;gap:12px;
  padding:14px 17px 11px}
.rl-nm{flex:1;min-width:0}
.rl-nm b{display:block;font-size:16px;font-weight:800;letter-spacing:-.3px}
.rl-nm span{display:block;font-size:11.5px;font-weight:700;color:var(--muted);margin-top:2px}
.rl-n{font-size:19px;font-weight:900;color:var(--t,var(--accent));flex:0 0 auto;
  font-variant-numeric:tabular-nums}
.rl-who{display:flex;flex-wrap:wrap;gap:6px;padding:0 17px 13px}
.rl-chip{font-size:12px;font-weight:800;background:var(--t-s,var(--accent-soft));
  color:var(--t,var(--accent));border-radius:99px;padding:4px 11px}
.rl-none{font-size:12px;font-weight:700;color:var(--faint)}
.rl-body{padding:0 17px 15px;border-top:1px solid rgba(211,201,182,.45);padding-top:13px}
.rl-k{font-size:10.5px;font-weight:900;letter-spacing:1px;color:var(--faint);
  margin:14px 0 6px}
.rl-k:first-child{margin-top:0}
/* ⚠ pre-line: הטקסט של המכינה מכיל שורות ריקות שמפרידות בין
   חלקי התפקיד, והן חלק מהמשמעות. */
.rl-desc{font-size:13px;font-weight:600;line-height:1.7;color:var(--ink);
  white-space:pre-line}
.rl-perms{list-style:none;display:flex;flex-direction:column;gap:6px}
.rl-perms li{font-size:12.5px;font-weight:700;color:var(--muted);line-height:1.5;
  padding-right:18px;position:relative}
.rl-perms li::before{content:"";position:absolute;right:5px;top:7px;width:6px;height:6px;
  border-radius:50%;background:var(--t,var(--accent))}
/* ⚠ ספציפיות גבוהה מ-".kx .rows{overflow:hidden}" שבשכבת
   ההרמה. בלעדיה overflow:hidden גובר, והרשימה של 33 החניכים
   נחתכת בלי שאפשר לגלול אליה — היא נראית כאילו יש בה שמונה
   חניכים בלבד. */
.kx .rows.rl-pick{max-height:44vh;overflow-y:auto;-webkit-overflow-scrolling:touch;
  margin-top:8px}

/* ---- תיאור המוביל״ש ---- */
.ld-info{white-space:pre-line;font-size:13px;font-weight:600;line-height:1.7}
.ld-tasks{list-style:none;display:flex;flex-direction:column;gap:9px;margin-top:10px}
.ld-tasks li{font-size:12.5px;font-weight:600;line-height:1.6;color:var(--muted);
  padding-right:18px;position:relative}
.ld-tasks li::before{content:"";position:absolute;right:5px;top:7px;width:6px;height:6px;
  border-radius:50%;background:var(--accent)}

/* ---- פילוח בוגרים ---- */
.brw{display:flex;align-items:center;gap:10px;padding:5px 0}
.brw-k{flex:0 0 86px;font-size:12.5px;font-weight:700;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.brw-bar{flex:1;height:8px;background:var(--line);border-radius:99px;overflow:hidden}
.brw-bar>span{display:block;height:100%;background:var(--accent);border-radius:99px;
  transition:width .5s var(--ease)}
.brw b{flex:0 0 auto;font-size:13px;font-weight:800;min-width:20px;text-align:left}

/* ⚠ אותה מלכודת גם כאן. */
.kx .rows.scroll-y{max-height:40vh;overflow-y:auto;-webkit-overflow-scrolling:touch}

/* ---- כרטיסיית מנה ----
   ⚠ הכרטיס כולו לחיץ, והבחירה מסומנת בשלושה סימנים ביחד: וי,
     מסגרת וגוון. סימן יחיד על כרטיס גדול קל לפספס. */
.dish-grid{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.kx .dish-card{width:100%;text-align:right;display:block;background:var(--surface);
  border:1.5px solid rgba(211,201,182,.55);border-radius:var(--r-lg);
  box-shadow:var(--sh-1);padding:14px 16px;
  transition:border-color .12s var(--ease),box-shadow .12s var(--ease),
    transform .12s var(--ease)}
.kx .dish-card:active{transform:translateY(1px)}
.kx .dish-card.on{border-color:var(--accent);
  box-shadow:0 0 0 3px var(--accent-soft),var(--sh-1)}
.dish-top{display:flex;align-items:center;gap:11px}
.dish-nm{flex:1;min-width:0}
.dish-nm b{display:block;font-size:16px;font-weight:800;letter-spacing:-.3px}
.dish-nm span{display:block;font-size:11.5px;font-weight:700;color:var(--muted);margin-top:2px}
.dish-card.on .dish-nm b{color:var(--accent)}

/* המצרכים כשבבים — נקראים במבט ולא כרשימה שצריך לרוץ עליה */
.dish-items{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px;
  padding-top:11px;border-top:1px solid rgba(211,201,182,.45)}
.dish-it{display:inline-flex;align-items:baseline;gap:5px;font-size:11.5px;
  font-weight:700;color:var(--muted);background:var(--bg);border-radius:99px;
  padding:4px 10px}
.dish-it b{font-size:12px;font-weight:900;color:var(--ink);
  font-variant-numeric:tabular-nums}
.dish-card.on .dish-it{background:var(--accent-soft);color:var(--accent)}
.dish-card.on .dish-it b{color:var(--accent)}

/* ⚠ הוראות ההכנה נחתכות לשלוש שורות. הן שייכות לכרטיס, אבל
   כרטיס שגובהו תלוי באורך ההוראות הופך רשימה לבלתי נסרקת. */
.dish-how{margin-top:9px;font-size:11.5px;font-weight:600;color:var(--faint);
  line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;
  overflow:hidden;white-space:pre-line}

/* ---- מצרכים ----
   ⚠ שלושה מצבים לשורת מצרך: יש · חסר · לא נמצא במלאי.
     "לא נמצא" אינו "חסר" — ייתכן שהוא במלאי בשם אחר. */
.ing{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:8px 0;border-bottom:1px solid rgba(211,201,182,.45)}
.ing:last-child{border-bottom:none}
.ing-n{flex:1;min-width:0;font-size:13.5px;font-weight:700;display:flex;
  align-items:center;gap:7px;flex-wrap:wrap}
.ing b{flex:0 0 auto;font-size:13.5px;font-weight:800}
.ing-have{font-size:11px;font-weight:700;color:var(--faint)}
.ing.short .ing-n{color:var(--clay)}
.ing.unk .ing-n{color:var(--amber)}
.ing-prev{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ing-prev span{font-size:11px;font-weight:700;background:var(--bg);border-radius:99px;
  padding:3px 9px;color:var(--muted)}
.ing-prev b{font-weight:900;color:var(--ink)}

/* ---- כניסה מדורגת, במסך הבית בלבד ----
   ⚠ רק על שתי הרשתות של מסך הבית ולא על כל כרטיס באפליקציה.
     רשימה של שלושים ימי תקציב שנכנסת בהנפשה נראית איטית, לא
     חיה — וזה גם המסך שמשתמשים בו הכי הרבה במהלך היום. מסך
     הבית נפתח פעם בכניסה, ושם זה שווה.

   ⚠ both כדי שהמצב ההתחלתי יחול לפני ההשהיה — בלעדיו האריחים
     מהבהבים בגודל מלא לרגע ואז קופצים. */
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.stat-grid>*,.navgrid>*{animation:rise .34s var(--ease) both}
.stat-grid>*:nth-child(2),.navgrid>*:nth-child(2){animation-delay:.03s}
.stat-grid>*:nth-child(3),.navgrid>*:nth-child(3){animation-delay:.06s}
.stat-grid>*:nth-child(4),.navgrid>*:nth-child(4){animation-delay:.09s}
.stat-grid>*:nth-child(5),.navgrid>*:nth-child(5){animation-delay:.12s}
.stat-grid>*:nth-child(n+6),.navgrid>*:nth-child(n+6){animation-delay:.15s}

/* ============================================================
   קופסת פריט בהשאלה
   ------------------------------------------------------------
   ⚠ קופסה לכל פריט ולא שורה בתיבת טקסט. הכמות שיצאה והכמות
     שחזרה הן שני מדים נפרדים באותה קופסה, כי השאלה שנשאלת
     היא ההפרש ביניהם.

   ⚠ שלושה סימנים למצב ולא רק צבע: מילים ("נותרו 5 בחוץ"),
     מילוי הפס, וגוון הקופסה. עיקרון 3 — צבע לבדו לעולם לא.
   ============================================================ */
.li{background:var(--surface);border:1.5px solid var(--line);border-radius:var(--r-md);
  padding:10px 11px 11px;margin-bottom:9px;transition:border-color .16s var(--ease),
  background .16s var(--ease)}
.li-part{border-color:var(--amber);background:var(--amber-soft)}
.li-done{border-color:var(--ok);background:var(--ok-soft)}
.li-h{display:flex;gap:6px;align-items:center;margin-bottom:8px}
.kx .li-n{flex:1;min-width:0;min-height:42px;font-weight:800;font-size:14.5px;
  background:var(--bg);margin:0}
.kx .li-u{flex:0 0 62px;min-width:0;min-height:42px;text-align:center;
  font-size:12.5px;font-weight:700;background:var(--bg);margin:0}
.kx .li-x{flex:0 0 auto;width:36px;height:42px;border-radius:11px;font-size:22px;
  line-height:1;color:var(--faint);background:transparent}
.kx .li-x:active{background:var(--clay-soft);color:var(--clay)}
.li-g{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.li-f{background:var(--bg);border-radius:11px;padding:6px 2px 0}
.li-l{display:block;text-align:center;font-size:10px;font-weight:900;
  letter-spacing:.7px;color:var(--faint)}
.li-step{padding:0 4px 5px;margin-top:0}
.li-step .qs-n{font-size:16px;color:var(--ink)}
.kx .li-step .qs-btn{width:30px;height:30px;font-size:17px;background:var(--surface)}
.li-bar{height:6px;border-radius:99px;background:var(--line);overflow:hidden;margin:9px 0 6px}
.li-bar>span{display:block;height:100%;border-radius:99px;background:var(--ok);
  transition:width .35s var(--ease)}
.li-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
.li-s{font-size:11.5px;font-weight:800;color:var(--muted)}
.li-s.part{color:var(--amber)}
.li-s.ok{color:var(--ok)}
.kx .li-all{font-size:11.5px;font-weight:800;color:var(--accent);
  background:transparent;padding:3px 7px;border-radius:8px;min-height:0}
.kx .li-all:active{background:var(--accent-soft)}
.li-empty{font-size:12.5px;font-weight:700;color:var(--faint);text-align:center;
  padding:16px 10px;border:1.5px dashed var(--line2);border-radius:var(--r-md);
  margin-bottom:9px}
.li-tot{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;
  font-weight:700;color:var(--muted);padding:2px 3px 9px}
.li-tot .ok{color:var(--ok);font-weight:800}
.li-acts{display:flex;gap:7px;margin-bottom:13px}
.li-acts>*{flex:1}
.li-close{display:flex;align-items:center;justify-content:space-between;gap:9px;
  background:var(--bg);border-radius:var(--r-md);padding:10px 12px;margin-bottom:13px;
  font-size:12.5px;font-weight:700;color:var(--muted)}
.li-close.on{background:var(--ok-soft);color:var(--ok);font-weight:800}
/* ⚠ הטקסט שנכתב לפני הפיצול לפריטים. לקריאה בלבד. */
.li-legacy{background:var(--bg);border-radius:var(--r-md);padding:10px 12px;margin-bottom:13px}
.li-legacy-h{font-size:10px;font-weight:900;letter-spacing:.8px;color:var(--faint);
  margin-bottom:4px}
.li-legacy-b{font-size:12.5px;font-weight:600;color:var(--muted);white-space:pre-wrap;
  line-height:1.5}

/* ---- הכנסות מאירוח ----
   ⚠ "התקבל" גדול ו"צפוי" מעומעם לידו. שני המספרים גלויים תמיד,
     כי ההפרש ביניהם הוא כל מה שמעניין. */
.money{background:var(--surface);border:1px solid rgba(211,201,182,.55);
  border-radius:var(--r-lg);padding:15px 16px 12px;margin-bottom:12px;box-shadow:var(--sh-1)}
.money-top{display:flex;align-items:center;gap:14px}
.money-c{flex:1;min-width:0}
.money-sep{width:1px;align-self:stretch;background:var(--line)}
.money-n{font-family:'Suez One',Heebo,serif;font-size:26px;line-height:1.1;
  color:var(--ink);letter-spacing:-.5px}
.money-n.soft{color:var(--faint);font-size:22px}
.money-l{font-size:10.5px;font-weight:800;letter-spacing:.8px;color:var(--faint);margin-top:3px}
.money-f{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;padding-top:10px;
  border-top:1px solid var(--line);font-size:11.5px;font-weight:700;color:var(--muted)}
.money-f .warn{color:var(--amber);font-weight:800}

/* ---- שורת תקופה ---- */
.per{display:flex;align-items:center;justify-content:space-between;gap:11px;
  padding:10px 0;border-bottom:1px solid var(--line)}
.per:last-child{border-bottom:none}
.per-l{min-width:0}
.per-t{font-size:14px;font-weight:800;letter-spacing:-.2px}
.per-s{font-size:11.5px;font-weight:600;color:var(--muted);margin-top:2px}
.per-r{text-align:left;flex:0 0 auto}
.per-n{font-size:15.5px;font-weight:900;letter-spacing:-.3px}
.per-x{font-size:10.5px;font-weight:700;color:var(--faint);margin-top:1px}

/* ---- מד פיקוד וקצונה ----
   ⚠ מתחת לאחוז כתוב תמיד מכמה הוא מחושב. אחוז ערום על שישה
     בוגרים נראה בדיוק כמו אחוז על שישים. */
.dial{background:var(--surface);border:1px solid rgba(211,201,182,.55);
  border-radius:var(--r-md);padding:13px 14px;box-shadow:var(--sh-1)}
.dial-h{font-size:10.5px;font-weight:900;letter-spacing:.9px;color:var(--faint);
  margin-bottom:7px}
.dial-n{font-family:'Suez One',Heebo,serif;font-size:30px;line-height:1;
  color:var(--accent);letter-spacing:-1px}
.dial-n small{font-size:15px;margin-right:1px}
.dial-n.none{color:var(--line2)}
.dial-bar{height:7px;border-radius:99px;background:var(--line);overflow:hidden;margin:8px 0 5px}
.dial-bar>span{display:block;height:100%;border-radius:99px;background:var(--accent);
  transition:width .5s var(--ease)}
.dial-s{font-size:11px;font-weight:700;color:var(--muted)}
.dial-p{font-size:10.5px;font-weight:700;color:var(--amber);margin-top:2px}

/* ---- גרף הכנסות ----
   ⚠ ציר אחד. הפספוס מבדיל בין "התקבל" ל"צפוי" גם למי שאינו
     מבחין בין הגוונים — עיקרון 3. */
.inc{background:var(--surface);border:1px solid rgba(211,201,182,.55);
  border-radius:var(--r-lg);padding:14px 14px 11px;margin-bottom:12px;box-shadow:var(--sh-1)}
.inc-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;
  font-size:10.5px;font-weight:900;letter-spacing:.9px;color:var(--faint);margin-bottom:12px}
.inc-max{font-weight:800;letter-spacing:0}
.inc-plot{display:grid;gap:6px;direction:rtl;overflow-x:auto;padding-bottom:2px;
  scrollbar-width:none}
.inc-plot::-webkit-scrollbar{display:none}
.inc-col{min-width:0;display:flex;flex-direction:column;align-items:center}
.inc-v{font-size:10px;font-weight:800;color:var(--muted);height:13px;
  white-space:nowrap;overflow:hidden}
.inc-track{width:100%;height:104px;display:flex;align-items:flex-end;
  border-bottom:1.5px solid var(--line2);margin-bottom:5px}
.inc-bar{width:100%;border-radius:6px 6px 0 0;overflow:hidden;display:flex;
  flex-direction:column;min-height:2px;transition:height .45s var(--ease)}
.inc-got{background:var(--accent);width:100%}
/* ⚠ פספוס ולא רק גוון בהיר יותר. */
.inc-exp{width:100%;background:repeating-linear-gradient(135deg,
  var(--accent-soft) 0 4px, transparent 4px 8px);
  border:1.5px dashed var(--line2);border-bottom:none;box-sizing:border-box}
.inc-x{font-size:10px;font-weight:700;color:var(--faint);text-align:center;
  line-height:1.25;word-break:break-word}
.inc-key{display:flex;gap:14px;margin-top:9px;padding-top:9px;
  border-top:1px solid var(--line);font-size:11px;font-weight:700;color:var(--muted)}
.inc-key span{display:flex;align-items:center;gap:5px}
.inc-key i{width:11px;height:11px;border-radius:3px;flex:0 0 auto}
.inc-key .k-got{background:var(--accent)}
.inc-key .k-exp{background:repeating-linear-gradient(135deg,
  var(--accent-soft) 0 3px, transparent 3px 6px);border:1.5px dashed var(--line2)}

/* ---- התנגשות עם הגאנט ----
   ⚠ טקסט ולא רק גוון: הסיבה היא כל העניין. */
.clash{font-size:11.5px;font-weight:800;color:var(--amber);margin-top:3px}
/* ⚠ מבוטל בגיליון: מעומעם, לא אדום. זו אינה בעיה — זה מידע. */
.kx .st-row.st-off{background:var(--bg);border-color:var(--line);opacity:.72}
.kx .st-row.st-off .st-n{font-weight:700;text-decoration:line-through;
  text-decoration-color:var(--line2);text-decoration-thickness:1.5px}
.st-why{font-size:11.5px;font-weight:700;color:var(--faint);margin-top:3px}
/* ⚠ השעה בולטת מיתר המטא: היא מה שמסדר את היום. */
.st-m .hh{background:var(--accent-soft);color:var(--accent);font-weight:800;
  padding:1px 6px;border-radius:6px;font-size:11.5px}
.clash-note{font-size:12px;font-weight:600;color:var(--muted);line-height:1.55;
  background:var(--amber-soft);border-radius:var(--r-md);padding:10px 12px;
  margin-bottom:10px}

/* ---- שבבי בחירה ----
   ⚠ הצ׳יפים נמדדים לפי הטקסט ולא נמתחים לרוחב שווה. ארבע־עשרה
     זרועות ב-flex:1 יצרו קיר של ריבועים באותו גודל שאי אפשר
     לסרוק בעין — "חי״ר" ו"סיירות חי״ר וקומנדו" אינם באותו
     אורך, ואין סיבה שייראו כך.

   ⚠ הנבחר מסומן גם בווי ולא רק במילוי — עיקרון 3. */
.pick.pick-chips{flex-wrap:wrap;gap:7px}
.kx .pick.pick-chips button{flex:0 1 auto;min-height:40px;padding:0 13px;
  border-radius:99px;font-size:13.5px;font-weight:700;
  background:var(--surface);border:1.5px solid var(--line);color:var(--muted);
  display:inline-flex;align-items:center;gap:6px;white-space:nowrap;
  transition:background .14s var(--ease),border-color .14s var(--ease),
    color .14s var(--ease),transform .1s var(--ease),box-shadow .14s var(--ease)}
.kx .pick.pick-chips button:active{transform:translateY(1px)}
.kx .pick.pick-chips button.on{background:var(--accent);border-color:var(--accent);
  color:#fff;font-weight:800;box-shadow:0 2px 8px -2px rgba(47,38,22,.32)}
/* הווי — נכנס רק כשנבחר, ולא תופס מקום כשלא */
.kx .pick.pick-chips button::before{content:"";width:0;overflow:hidden;
  font-size:12px;font-weight:900;line-height:1;
  transition:width .14s var(--ease)}
.kx .pick.pick-chips button.on::before{content:"¹3";width:11px}

/* ============================================================
   פאנל ההתראות
   ------------------------------------------------------------
   ⚠ הצבע מסמן תחום ולעולם אינו נושא את המידע לבדו: לכל שורה
     יש גם תווית תחום כתובה וגם סימן. עיקרון 3.
   ============================================================ */
.notif-panel{position:sticky;top:0;z-index:39;background:var(--surface);
  border-bottom:1px solid var(--line);
  box-shadow:0 14px 34px -18px rgba(47,38,22,.42);
  max-height:66vh;overflow-y:auto;-webkit-overflow-scrolling:touch;
  animation:ndrop .22s var(--ease)}
@keyframes ndrop{from{opacity:0;transform:translateY(-8px)}}
.notif-h{display:flex;justify-content:space-between;align-items:center;
  padding:13px 15px;border-bottom:1px solid var(--line);
  position:sticky;top:0;background:var(--surface);z-index:2}
.nh-l{display:flex;align-items:baseline;gap:8px}
.notif-h b{font-size:15px;font-weight:800;letter-spacing:-.3px}
.nh-c{font-size:11.5px;font-weight:800;color:var(--faint);
  background:var(--bg);border-radius:99px;padding:2px 8px}
.kx .notif-h button{min-height:34px;width:34px;border-radius:10px;
  color:var(--faint);display:grid;place-items:center}
.kx .notif-h button:active{background:var(--bg)}

.kx .notif-item{display:flex;align-items:flex-start;gap:11px;width:100%;
  text-align:right;padding:12px 15px;border-bottom:1px solid var(--line);
  position:relative;transition:background .12s var(--ease)}
.kx .notif-item:last-child{border-bottom:none}
.kx .notif-item:active{background:var(--bg)}
/* הפס בצד — סימן התחום */
.notif-item::before{content:"";position:absolute;top:0;bottom:0;right:0;width:3px;
  background:var(--nt,var(--accent));opacity:.85}
.notif-item.n-accent{--nt:var(--accent)}
.notif-item.n-clay{--nt:var(--clay)}
.notif-item.n-amber{--nt:var(--amber)}
.notif-item.n-green{--nt:var(--ok)}
.ni-dot{flex:0 0 auto;width:30px;height:30px;border-radius:10px;
  display:grid;place-items:center;font-size:13px;line-height:1;
  background:color-mix(in srgb,var(--nt) 13%,transparent);color:var(--nt)}
.ni-main{flex:1;min-width:0;display:block}
.ni-k{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:900;
  letter-spacing:.8px;color:var(--nt);margin-bottom:2px}
.ni-hot{font-size:9.5px;font-weight:900;letter-spacing:.6px;color:#fff;
  background:var(--clay);border-radius:4px;padding:1px 5px}
.ni-t{display:block;font-size:14px;font-weight:800;letter-spacing:-.2px;
  line-height:1.35;color:var(--ink)}
.ni-s{display:block;font-size:12px;color:var(--muted);font-weight:600;
  margin-top:2px;line-height:1.45;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap}
.ni-go{flex:0 0 auto;color:var(--line2);margin-top:9px}
/* ⚠ "חדש" — נקודה ולא רק רקע, כדי שתיראה גם בלי צבע */
.notif-item.fresh .ni-t::after{content:"";display:inline-block;width:6px;height:6px;
  border-radius:99px;background:var(--nt);margin-right:6px;vertical-align:middle}

.notif-empty{padding:22px 15px;text-align:center;font-size:13px;
  color:var(--muted);font-weight:600}
.notif-calm{padding:24px 18px;text-align:center}
.notif-calm b{display:block;font-size:15px;font-weight:800;color:var(--ok)}
.notif-calm span{display:block;font-size:12.5px;color:var(--muted);
  font-weight:600;margin-top:4px;line-height:1.5}

.kx .bell-btn.on{background:var(--accent-soft);color:var(--accent)}
.bell-badge.hot{background:var(--clay)}

/* ============================================================
   שכבת ההרמה השנייה
   ------------------------------------------------------------
   ההשראה מ-busly/signup. מה שנלקח משם, ומה שלא:

   ✓ פס גוון בקצה העליון של הכרטיס — הכרטיס מקבל זהות בלי
     כותרת צבעונית ובלי מסגרת עבה.
   ✓ כפתור ראשי עם שיפוע **וזוהר בצבעו** מתחתיו. הזוהר הוא מה
     שמרים אותו מהדף; בלעדיו שיפוע הוא רק צבע.
   ✓ שדות גבוהים יותר עם מילוי רך וטבעת מיקוד ברורה.
   ✓ מסילת שלבים ממוספרת עם קו מקשר.
   ✓ קשת מנוקדת עם נקודת אור — תנועה ברקע בלי אנימציה.

   ✗ הפלטה הכהה. לאפליקציה יש זהות קרם־נייבי שעובדת, והחלפה
     שלה בנייבי כהה הייתה עיצוב אחר ולא עיצוב טוב יותר.
   ============================================================ */

/* ---- כרטיס מורם ----
   ⚠ הפס בקצה ולא מסגרת מסביב: מסגרת צבעונית סוגרת את הכרטיס
     ומקטינה אותו, פס עליון פותח אותו כלפי מטה. */
.kx .card{border-radius:var(--r-lg);box-shadow:var(--sh-1);
  border-color:rgba(211,201,182,.55)}
.kx .card.lift{position:relative;overflow:hidden;padding-top:19px;
  box-shadow:var(--sh-2)}
.kx .card.lift::before{content:"";position:absolute;top:0;right:0;left:0;height:4px;
  background:linear-gradient(90deg,var(--accent) 0%,#0A4478 42%,var(--t1) 100%)}

/* ---- כפתור ראשי ----
   ⚠ הזוהר בצבע הכפתור ולא באפור. צל אפור מתחת לכפתור כחול
     נראה כמו שכבה זרה; זוהר בצבעו נראה כמו שהכפתור מאיר. */
.kx .btn-primary{
  background:linear-gradient(100deg,#012E58 0%,#0A4478 55%,#0D5490 100%);
  box-shadow:0 2px 4px rgba(0,36,84,.18),
    0 12px 28px -10px rgba(10,68,120,.55),
    inset 0 1px 0 rgba(255,255,255,.14);
  letter-spacing:-.1px}
.kx .btn-primary:active{transform:translateY(1.5px);
  box-shadow:0 1px 2px rgba(0,36,84,.22),0 4px 12px -8px rgba(10,68,120,.5)}
.kx .btn-primary:disabled{box-shadow:none;opacity:.5}
/* החץ זז קדימה בלחיצה — תזוזה של 2px שמרגישים ולא רואים */
.kx .btn-primary svg{transition:transform .14s var(--ease)}
.kx .btn-primary:active svg{transform:translateX(-2px)}

.kx .btn-ghost{background:var(--surface);border:1.5px solid var(--line);
  box-shadow:0 1px 2px rgba(47,38,22,.04);transition:all .12s var(--ease)}
.kx .btn-ghost:active{background:var(--bg);border-color:var(--line2);
  transform:translateY(1px)}

/* ---- שדות ----
   ⚠ מילוי רך ולא לבן: שדה לבן על כרטיס לבן מסתמך על המסגרת
     בלבד, ומסגרת דקה נעלמת בשמש. */
.kx .fld input,.kx .fld select,.kx .fld textarea,.kx .search{
  min-height:52px;background:var(--bg);border-color:transparent;
  box-shadow:inset 0 0 0 1.5px var(--line);
  padding-right:14px;padding-left:14px;font-weight:600}
.kx .fld textarea{padding-top:13px;padding-bottom:13px;line-height:1.55}
.kx .fld input::placeholder,.kx .fld textarea::placeholder{color:var(--faint);font-weight:500}
.kx .fld input:focus,.kx .fld select:focus,.kx .fld textarea:focus,.kx .search:focus{
  background:var(--surface);border-color:transparent;
  box-shadow:inset 0 0 0 1.5px var(--accent),0 0 0 4px var(--accent-soft)}
.kx .fld label{font-size:12px;font-weight:800;letter-spacing:.3px;
  color:var(--muted);margin-bottom:6px}

/* ---- מסילת שלבים ----
   ⚠ המספר בעיגול והקו שמחבר ביניהם. הקו הוא מה שהופך שלוש
     שורות לרצף אחד — בלעדיו זו רשימה, לא תהליך. */
.steps{position:relative;padding:2px 0}
.step-row{position:relative;display:flex;gap:12px;padding:0 0 16px}
.step-row:last-child{padding-bottom:0}
.step-n{position:relative;z-index:1;flex:0 0 30px;height:30px;border-radius:99px;
  display:grid;place-items:center;font-size:13px;font-weight:900;
  background:var(--surface);color:var(--faint);
  box-shadow:inset 0 0 0 2px var(--line)}
.step-row.on .step-n{background:var(--accent);color:#fff;box-shadow:none}
.step-row.done .step-n{background:var(--ok);color:#fff;box-shadow:none}
/* הקו — מהעיגול הזה לעיגול הבא */
.step-row:not(:last-child)::before{content:"";position:absolute;top:30px;bottom:2px;
  right:14px;width:2px;background:var(--line);border-radius:99px}
.step-row.done::before{background:var(--ok);opacity:.45}
.step-b{flex:1;min-width:0;padding-top:4px}
.step-t{font-size:14.5px;font-weight:800;letter-spacing:-.2px;line-height:1.3}
.step-s{font-size:12px;font-weight:600;color:var(--muted);margin-top:2px;line-height:1.5}

/* ---- קשת הרקע ----
   ⚠ SVG בתוך data-uri ולא תמונה: 300 בתים, לא בקשת רשת, ולא
     קובץ שצריך לזכור לפרוס. */
.band{isolation:isolate}
.band::after{content:"";position:absolute;top:-40%;left:-12%;width:74%;height:180%;
  pointer-events:none;opacity:.5;
  background:
    radial-gradient(closest-side,rgba(120,200,190,.5),transparent 70%) -6% 30%/34px 34px no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'%3E%3Cpath d='M-10 110 C 40 20, 150 10, 220 46' fill='none' stroke='%237ED0C4' stroke-width='2' stroke-dasharray='5 7' stroke-linecap='round' opacity='.55'/%3E%3C/svg%3E") center/contain no-repeat}

/* ---- מפריד עם מילה ---- */
.or{display:flex;align-items:center;gap:12px;margin:15px 0;
  font-size:11.5px;font-weight:800;color:var(--faint)}
.or::before,.or::after{content:"";flex:1;height:1px;background:var(--line)}

/* ---- אריחים ----
   ⚠ שיפוע עדין מלמעלה למטה ונגיעת אור פנימית בקצה העליון.
     משטח שטוח נראה מודפס; שכבת אור דקה נותנת לו חומר. */
.kx .nav-tile,.kx .stat-tile{
  background:linear-gradient(180deg,#fff 0%,#FDFBF7 100%);
  box-shadow:0 1px 2px rgba(47,38,22,.05),0 10px 24px -14px rgba(47,38,22,.24),
    inset 0 1px 0 rgba(255,255,255,.9)}
.kx .nav-tile:active,.kx .stat-tile:active{
  box-shadow:0 1px 2px rgba(47,38,22,.07),0 4px 10px -8px rgba(47,38,22,.22)}
.nav-ico{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--t,var(--accent)) 12%,transparent)}

/* ---- שורות ורשימות ---- */
.kx .rows{background:var(--surface)}
.kx .st-row{position:relative}
/* הפס בצד הופך גוון שקוף לסימן ברור */
.kx .st-row[class*="tone-"]::after{content:"";position:absolute;top:10px;bottom:10px;
  right:0;width:3px;border-radius:99px;background:var(--t,var(--accent));opacity:.5}

/* ---- כותרת מסך ---- */
.screen-title::after{height:4px;width:40px}

/* ---- טבלאות ---- */
.kx table{border-radius:var(--r-md);overflow:hidden}
.kx thead th{background:var(--bg);font-size:11.5px;font-weight:900;
  letter-spacing:.5px;color:var(--muted)}

/* ---- שדות זהות ---- */
.pw{position:relative}
.kx .pw input{padding-left:46px}
.kx .pw-eye{position:absolute;top:50%;left:6px;transform:translateY(-50%);
  width:36px;height:36px;border-radius:10px;display:grid;place-items:center;
  color:var(--faint);transition:all .12s var(--ease)}
.kx .pw-eye:active{background:var(--accent-soft);color:var(--accent)}
/* ⚠ שדה קוד — ספרות גדולות ומרווחות, כי מקלידים אותן ממייל
   ומשווים תו-תו. */
.kx .code-in{text-align:center;font-size:26px;font-weight:900;
  letter-spacing:10px;padding-right:0;padding-left:0;
  font-variant-numeric:tabular-nums;min-height:60px}
.kx .code-in::placeholder{letter-spacing:8px;font-weight:700}
.fld-hint{font-size:11.5px;font-weight:600;color:var(--faint);margin-top:5px;line-height:1.45}
/* ⚠ "חובה" ליד התווית — כתוב, לא רק כוכבית. */
.kx .fld label .req{font-size:10px;font-weight:900;letter-spacing:.5px;
  color:var(--clay);background:var(--clay-soft);border-radius:5px;
  padding:1px 6px;margin-right:5px}
.fld-bad{font-size:11.5px;font-weight:800;color:var(--clay);margin-top:5px}

/* מד חוזק — ⚠ מילה ולא רק פס צבעוני. */
.pwm{display:flex;align-items:center;gap:9px;margin-top:7px}
.pwm-bar{flex:1;height:5px;border-radius:99px;background:var(--line);overflow:hidden}
.pwm-bar>i{display:block;height:100%;border-radius:99px;
  transition:width .25s var(--ease),background .25s var(--ease)}
.pwm-t{font-size:11px;font-weight:800;white-space:nowrap}
.pwm.weak .pwm-bar>i{background:var(--clay)} .pwm.weak .pwm-t{color:var(--clay)}
.pwm.mid  .pwm-bar>i{background:var(--amber)} .pwm.mid .pwm-t{color:var(--amber)}
.pwm.good .pwm-bar>i{background:var(--ok)}   .pwm.good .pwm-t{color:var(--ok)}

.kx .link-btn{display:block;width:100%;min-height:44px;margin-top:9px;
  font-size:13.5px;font-weight:800;color:var(--accent);border-radius:var(--r-md)}
.kx .link-btn:active{background:var(--accent-soft)}
/* ⚠ ההסבר על הכניסה הראשונה — שלוש שורות ולא אחת. חניך וצוות
   מקלידים דברים שונים, ושורה אחת שמנסה לכסות את שניהם לא
   קוראת לאף אחד מהם. */
.login-note{font-size:12px;font-weight:700;color:var(--muted);text-align:center;
  background:var(--bg);border-radius:var(--r-md);padding:10px 11px;
  margin:-4px 0 13px;line-height:1.55;
  display:flex;flex-direction:column;gap:1px}
.login-note b{color:var(--ink2);font-size:12.5px;margin-bottom:2px}
.login-note .dim{color:var(--faint);font-weight:600;margin-top:4px;font-size:11.5px}
.login-lead{font-size:13.5px;font-weight:600;color:var(--muted);
  line-height:1.6;margin-bottom:15px}
.login-done{text-align:center;padding:8px 4px 18px}
.ld-mark{width:48px;height:48px;margin:0 auto 11px;border-radius:99px;
  display:grid;place-items:center;font-size:23px;font-weight:900;
  background:var(--ok-soft);color:var(--ok)}
.login-done b{display:block;font-size:16px;font-weight:800}
.login-done span{display:block;font-size:13px;color:var(--muted);
  font-weight:600;margin-top:6px;line-height:1.6}
.kx .login-alt{display:block;width:100%;min-height:44px;margin-top:14px;
  font-size:12.5px;font-weight:700;color:rgba(255,255,255,.72)}
.kx-login .link-btn{color:var(--accent)}
.kx-login .fld-hint{color:var(--muted)}

/* ---- מחזורים ---- */
.cy-lead{font-size:13px;font-weight:600;color:var(--muted);line-height:1.65;
  background:var(--surface);border:1px solid rgba(211,201,182,.55);
  border-radius:var(--r-lg);padding:13px 15px;margin-bottom:14px;box-shadow:var(--sh-1)}
.cy-lead b{color:var(--ink);font-weight:800}
.tile.cy-on{background:var(--ok-soft);color:var(--ok)}
.kx .step-mark{margin-top:7px;font-size:11.5px;font-weight:800;color:var(--accent);
  background:var(--accent-soft);border-radius:8px;padding:5px 10px;min-height:0}
.kx .step-mark:active{opacity:.7}
.cy-boards{display:flex;flex-direction:column;gap:1px}
.cy-b{display:flex;justify-content:space-between;gap:10px;padding:7px 0;
  border-bottom:1px solid var(--line);font-size:12px}
.cy-b:last-child{border-bottom:none}
.cy-bp{font-weight:700;color:var(--muted)}
.cy-bi{font-weight:800;color:var(--faint)}
/* ⚠ ההבטחה ש"פתיחה אינה מחליפה כלום" — ירוקה, לא אדומה. */
.cy-safe{font-size:12.5px;font-weight:600;color:var(--ok);line-height:1.6;
  background:var(--ok-soft);border-radius:var(--r-md);padding:11px 13px;margin-bottom:14px}
.cy-safe b{font-weight:900}
.cy-warn{display:flex;gap:10px;align-items:flex-start;font-size:13px;font-weight:600;
  color:var(--clay);line-height:1.6;background:var(--clay-soft);
  border-radius:var(--r-md);padding:12px 13px;margin-bottom:13px}
.cy-warn b{font-weight:900}
.cy-warn svg{flex:0 0 auto;margin-top:2px}
.cy-block{font-size:13px;font-weight:600;color:var(--amber);line-height:1.6;
  background:var(--amber-soft);border-radius:var(--r-md);padding:12px 13px}
.cy-note{font-size:11.5px;font-weight:600;color:var(--faint);margin-top:7px;
  text-align:center;line-height:1.5}

/* ---- בדיקת מייל ----
   ⚠ סימן ומילה ולא רק צבע. */
.mc-row{display:flex;align-items:center;gap:10px;padding:9px 0;
  border-bottom:1px solid var(--line);font-size:13px}
.mc-row:last-child{border-bottom:none}
.mc-mark{flex:0 0 22px;height:22px;border-radius:99px;display:grid;place-items:center;
  font-size:12px;font-weight:900}
.mc-row.ok .mc-mark{background:var(--ok-soft);color:var(--ok)}
.mc-row.bad .mc-mark{background:var(--clay-soft);color:var(--clay)}
.mc-l{flex:1;font-weight:800;font-family:ui-monospace,monospace;font-size:12px}
.mc-v{font-weight:700;color:var(--muted);font-size:12.5px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:52%}
.mc-via{font-size:13px;font-weight:900;color:var(--accent);
  background:var(--accent-soft);border-radius:var(--r-md);
  padding:9px 12px;margin-bottom:11px;text-align:center}
.mc-note{font-size:12px;font-weight:600;color:var(--amber);line-height:1.6;
  background:var(--amber-soft);border-radius:var(--r-md);padding:10px 12px;margin-top:11px}
/* השגיאה כלשונה — במונוספייס, כדי שאפשר יהיה להשוות תו-תו */
.mc-err{font-family:ui-monospace,monospace;font-size:11.5px;direction:ltr;
  text-align:left;background:rgba(0,0,0,.05);border-radius:8px;padding:8px 10px;
  margin-top:6px;line-height:1.5;word-break:break-word}
.mc-fix{font-weight:800;margin-top:8px;line-height:1.6}

/* ---- ייבוא נתוני מחזור ---- */
.step-acts{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
.kx .step-go{font-size:12px;font-weight:900;color:#fff;
  background:linear-gradient(100deg,#012E58,#0A4478);border-radius:9px;
  padding:6px 12px;min-height:0;
  box-shadow:0 4px 12px -6px rgba(10,68,120,.6)}
.kx .step-go:active{transform:translateY(1px)}

.imp-sum{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;font-weight:700;
  color:var(--muted);padding-bottom:11px;border-bottom:1px solid var(--line);
  margin-bottom:11px}
.imp-sum b{font-size:16px;font-weight:900;color:var(--ink)}
.imp-sum .ok b{color:var(--ok)}
.imp-sum .bad b{color:var(--clay)}

.imp-rows{max-height:44vh;overflow-y:auto;-webkit-overflow-scrolling:touch}
.imp-r{display:flex;align-items:center;gap:9px;padding:7px 0;
  border-bottom:1px solid var(--line);font-size:12.5px}
.imp-r:last-child{border-bottom:none}
.imp-n{flex:0 0 24px;font-size:10.5px;font-weight:800;color:var(--faint)}
.imp-c{color:var(--muted);font-weight:600;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.imp-c.first{flex:1;min-width:0;font-weight:800;color:var(--ink)}

/* ⚠ מה שלא נקלט — עם הסיבה, ולא נעלם */
.imp-bad{margin-top:12px;background:var(--clay-soft);border-radius:var(--r-md);
  padding:11px 12px}
.imp-bad-h{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:900;
  color:var(--clay);margin-bottom:8px}
.imp-b{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;
  font-size:11.5px;padding:5px 0;border-top:1px solid rgba(158,54,38,.14)}
.imp-b:first-of-type{border-top:none}
.imp-bl{flex:0 0 auto;font-weight:800;color:var(--clay);opacity:.75}
.imp-bt{flex:1;min-width:0;font-family:ui-monospace,monospace;font-size:11px;
  color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.imp-bw{flex:0 0 auto;font-weight:800;color:var(--clay)}
.imp-none{font-size:12.5px;font-weight:700;color:var(--faint);
  text-align:center;padding:12px}

/* ---- מה שכבר בפנים, וניתן לתיקון ---- */
.imp-e{display:flex;align-items:stretch;gap:6px;
  border-bottom:1px solid var(--line)}
.imp-e:last-child{border-bottom:none}
.kx .imp-e-main{flex:1;min-width:0;text-align:right;padding:10px 2px;
  display:block;border-radius:8px;transition:background .12s var(--ease)}
.kx .imp-e-main:active{background:var(--bg)}
.imp-e-n{display:block;font-size:14px;font-weight:800;letter-spacing:-.2px}
.imp-e-f{display:block;font-size:11.5px;font-weight:600;color:var(--muted);
  margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kx .imp-e-x{flex:0 0 auto;width:34px;border-radius:9px;color:var(--faint);
  display:grid;place-items:center}
.kx .imp-e-x:active{background:var(--clay-soft);color:var(--clay)}
.imp-edit{flex:1;padding:12px 0}
.imp-acts{display:flex;gap:7px}
.imp-acts>*{flex:1}

/* ---- הפרופיל שלי ---- */
/* ---------- סימון קנייה ----------
   ⚠ ה-✓ **חייב אלמנט שנשאר במקומו** כדי לפעול. שורה שעוברת
     מיד לרשימת "נקנו" מתפרקת ונבנית מחדש, ואלמנט חדש אינו
     מבצע מעבר — הלחיצה נראתה כאילו לא נקלטה. ראו setStatus
     ב-Equipment.jsx, שמשהה את המעבר ב-FLASH_MS. */
@keyframes tick-pop{
  0%   {transform:scale(.55);}
  55%  {transform:scale(1.18);}
  100% {transform:scale(1);}
}
@keyframes tick-draw{
  from {opacity:0;transform:scale(.4) rotate(-12deg);}
  to   {opacity:1;transform:scale(1) rotate(0);}
}
.tick.pop{animation:tick-pop .34s var(--ease) both}
.tick.pop svg{animation:tick-draw .3s .06s var(--ease) both;
  stroke-dasharray:24;stroke-dashoffset:0}

/* השורה עצמה נסוגה החוצה אחרי הסימון */
.st-row.leaving{opacity:.5;transform:translateX(-6px);
  transition:opacity .3s var(--ease) .1s,transform .3s var(--ease) .1s}
.st-row.leaving .st-n{text-decoration:line-through;color:var(--faint)}

/* ⚠ מי שביקש "פחות תנועה" במערכת ההפעלה מקבל את הצבע בלי
   הקפיצה. הסימון עדיין נראה — רק לא זז. */
@media (prefers-reduced-motion:reduce){
  .tick.pop,.tick.pop svg,.st-row.leaving{animation:none;transition:none}
}

/* ---------- שווי מלאי ----------
   ⚠ פס ולא כרטיס: זו שורת הקשר לרשימה שמתחתיה, ולא נתון
     שעומד בפני עצמו. */
.valbar{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:12px 15px;margin-bottom:12px;border-radius:14px;
  background:var(--sand);border:1px solid var(--line)}
.val-n{display:block;font-size:19px;font-weight:800;letter-spacing:-.02em}
.val-l{display:block;font-size:12px;color:var(--ink3);margin-top:2px}

/* ---------- ייצוא לגיליונות ----------
   ⚠ כתובת חשבון השירות בשורה משלה וניתנת להעתקה. מי שיקליד
     אותה ביד יטעה, וההודעה שיקבל תהיה "הגיליון לא שותף" בלי
     לומר במה. */
.acct{display:flex;align-items:center;gap:8px;margin-top:7px;flex-wrap:wrap;
  background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:7px 10px}
.acct .num{flex:1;min-width:0;font-size:12px;font-weight:700;direction:ltr;
  text-align:left;overflow-wrap:anywhere}
.acct .btn{width:auto;min-height:34px;padding:0 12px;font-size:13px}
.link-inline{display:inline-flex;align-items:center;gap:5px;font-weight:800;
  color:var(--navy);text-decoration:underline}

/* ---------- התיק של החניך ----------
   ⚠ שורת בקשה ולא כרטיס: זו רשימה שנסרקת בעין, ומסגרת לכל
     שורה הייתה הופכת עשר בקשות לעשרה עצמים נפרדים. */
.dos-req{padding:11px 14px;border-bottom:1px solid var(--line)}
.dos-req:last-child{border-bottom:none}
.dos-req-t{display:flex;align-items:center;gap:8px;justify-content:space-between}
.dos-req-t b{font-size:14.5px;font-weight:700}
.dos-req-m{font-size:12.5px;color:var(--ink3);margin-top:2px}
.dos-req-d{font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.45}

/* ---------- טבלת המרה ---------- */
.conv{width:100%;border-collapse:collapse;font-size:14px}
.conv th{text-align:right;font-size:12px;font-weight:700;color:var(--ink3);
  padding:8px 10px;border-bottom:1px solid var(--line2)}
.conv td{padding:9px 10px;border-bottom:1px solid var(--line)}
.conv tr:last-child td{border-bottom:none}
.conv .num{font-variant-numeric:tabular-nums;white-space:nowrap}
.conv-grp{font-size:12px;font-weight:700;color:var(--ink3);
  background:var(--sand);padding:6px 10px}
.conv tr.conv-on td{background:var(--sand)}
/* ⚠ תג "נערך" מבדיל בין ערך מובנה לערך שנקבע ידנית. בלעדיו
   כפתור "איפוס" נראה כמו מחיקה של הפריט. */
.conv-tag{margin-inline-start:6px;font-size:10.5px;font-weight:700;
  color:var(--ink3);background:var(--line);border-radius:5px;padding:1px 5px}
.conv-in{width:78px;padding:5px 7px;border-radius:8px;border:1.5px solid var(--navy);
  font-size:14px;text-align:center;font-variant-numeric:tabular-nums}
.conv-edit{font-size:12.5px;font-weight:700;color:var(--navy);padding:3px 6px}
.conv-act{display:inline-flex;gap:8px}
.conv-act button{font-size:12.5px;font-weight:700;color:var(--navy);padding:3px 4px}
.conv-act button.bad{color:var(--clay)}

.pf-head{display:flex;align-items:center;gap:13px;margin-bottom:16px}
.pf-av{width:52px;height:52px;border-radius:17px;flex:0 0 auto;display:grid;
  place-items:center;background:var(--accent-soft);color:var(--accent)}
.pf-name{font-family:'Suez One',Heebo,serif;font-size:19px;line-height:1.2;
  letter-spacing:-.3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-kind{font-size:11.5px;font-weight:800;letter-spacing:.6px;color:var(--faint);
  margin-top:3px}
.pf-row{display:flex;align-items:baseline;gap:10px;padding:9px 0;
  border-bottom:1px solid var(--line)}
.pf-row:last-of-type{border-bottom:none}
.pf-l{flex:0 0 88px;font-size:12.5px;font-weight:800;color:var(--muted)}
.pf-v{flex:1;font-size:15px;font-weight:800;letter-spacing:.3px}
.pf-n{font-size:11px;font-weight:700;color:var(--faint)}
/* ⚠ אומר למי לפנות, ולא רק "אי אפשר לשנות". */
.pf-note{font-size:11.5px;font-weight:600;color:var(--faint);line-height:1.55;
  margin-top:9px;padding-top:9px;border-top:1px solid var(--line)}

/* ⚠ מי שביקש פחות תנועה מקבל פחות תנועה. */
@media (prefers-reduced-motion:reduce){
  .kx *{transition-duration:.01ms !important;animation-duration:.01ms !important}
}

/* ============================================================
   מרכז התפקיד
   ------------------------------------------------------------
   ⚠ נכתב **אחרי** שכבת ההרמה השנייה. כל דבר שנכתב לפניה
     נדרס בשקט — ".kx .card" מוגדרת שם בפעם השלישית.

   ⚠ ו-".kx button" מאפסת background ו-border בסגוליות (0,1,1).
     כל כפתור כאן נכתב כ-".kx .שם" כדי לגבור עליה. המלכודת הזו
     כבר תפסה שלוש פעמים בקובץ הזה.
   ============================================================ */

/* ---------- בורר האחריות ----------
   ⚠ שורה גוללת ולא רשת: חניך עם חמש אחריות בטלפון היה מקבל
     שתי שורות שנשברות באמצע מילה. */
.kx .duty-bar{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;
  scrollbar-width:none;-webkit-overflow-scrolling:touch}
.kx .duty-bar::-webkit-scrollbar{display:none}
.kx .duty-chip{flex:0 0 auto;display:flex;align-items:center;gap:8px;
  padding:9px 14px;border-radius:99px;border:1.5px solid var(--line);
  background:var(--surface);font-weight:800;font-size:14px;color:var(--ink2);
  transition:all .12s var(--ease);min-height:0}
.kx .duty-chip .dot{width:9px;height:9px;border-radius:99px;background:var(--t)}
.kx .duty-chip.on{background:var(--t-s);border-color:var(--t);color:var(--t)}
.kx .duty-chip .n{font-size:12px;font-weight:900;opacity:.75}

/* ---------- כותרת האחריות ----------
   רצועה בגוון האחריות. ⚠ הגוון נגזר מהשם ואינו נשמר — תפקיד
   חדש שיתווסף בלוח מקבל צבע מעצמו. */
.duty-hero{position:relative;overflow:hidden;border-radius:var(--r-lg);
  background:linear-gradient(135deg,var(--t) 0%,color-mix(in srgb,var(--t) 78%,#000) 100%);
  color:#fff;padding:18px 18px 16px;margin-bottom:14px;box-shadow:var(--sh-2)}
.duty-hero::after{content:"";position:absolute;inset:-40% -20% auto auto;
  width:220px;height:220px;border-radius:99px;background:rgba(255,255,255,.09)}
.duty-hero-t{display:flex;align-items:center;gap:11px;position:relative;z-index:1}
.duty-hero-i{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;
  background:rgba(255,255,255,.18);flex:0 0 42px}
.duty-hero-n{font-size:20px;font-weight:900;letter-spacing:-.03em;line-height:1.15}
.duty-hero-s{font-size:12.5px;font-weight:600;opacity:.85;margin-top:2px}
.duty-nums{display:flex;gap:0;margin-top:15px;position:relative;z-index:1}
.duty-num{flex:1;text-align:center;padding:0 4px;
  border-inline-start:1px solid rgba(255,255,255,.22)}
.duty-num:first-child{border:none}
.duty-num b{display:block;font-size:23px;font-weight:900;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums}
.duty-num span{display:block;font-size:11px;font-weight:700;opacity:.82;margin-top:1px}
.duty-num.warn b{color:#FFD9D2}

/* ---------- קיצורי דרך למסכים ---------- */
.duty-links{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
.kx .duty-link{display:flex;align-items:center;gap:10px;padding:13px 14px;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);
  box-shadow:var(--sh-1);font-weight:800;font-size:14.5px;color:var(--ink);
  text-align:start;transition:transform .12s var(--ease)}
.kx .duty-link:active{transform:scale(.98)}
.duty-link .ic{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;
  background:var(--t-s);color:var(--t);flex:0 0 32px}
@media(min-width:600px){.duty-links{grid-template-columns:repeat(3,1fr)}}

/* ---------- מסמך החפיפה ----------
   ⚠ מתקפל. המסמך ארוך, והוא הדבר שקוראים פעם אחת — פתוח
     תמיד היה דוחף את המשימות מתחת לקו הקיפול לתמיד. */
.doc{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  box-shadow:var(--sh-1);overflow:hidden;margin-bottom:14px}
.kx .doc-head{display:flex;align-items:center;gap:11px;width:100%;padding:14px 16px;
  text-align:start;background:var(--surface)}
.doc-head .ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;
  background:var(--amber-soft);color:#8A5A1E;flex:0 0 34px}
.doc-head b{font-size:15px;font-weight:800;display:block}
.doc-head span{font-size:12px;color:var(--muted);font-weight:600}
.doc-body{padding:0 16px 16px;border-top:1px solid var(--line)}
.doc-sec{margin-top:14px}
.doc-sec h4{font-size:12.5px;font-weight:900;color:var(--t,var(--navy));
  letter-spacing:.02em;margin-bottom:5px}
.doc-sec p{font-size:14px;line-height:1.65;color:var(--ink2);white-space:pre-line}
.doc-by{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;
  padding-top:12px;border-top:1px dashed var(--line2);font-size:12.5px;color:var(--muted)}
.doc-by a{font-weight:800;color:var(--navy);direction:ltr}
.doc-read{display:flex;align-items:center;gap:7px;margin-top:12px;
  font-size:12.5px;font-weight:800;color:var(--ok)}

/* ---------- משימות ----------
   ⚠ ".kx .rows{overflow:hidden}" חותכת רשימה גוללת בלי לרמוז
     שהיא נחתכה. הרשימה כאן אינה בתוך .rows. */
.task-add{display:flex;gap:7px;margin-bottom:10px}
.kx .task-add input{flex:1;min-height:46px}
.kx .task-add button{width:auto;min-height:46px;padding:0 16px;flex:0 0 auto}
.task-list{display:flex;flex-direction:column;gap:7px}
.kx .task{display:flex;align-items:flex-start;gap:11px;width:100%;text-align:start;
  padding:12px 14px;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-md);box-shadow:var(--sh-1);transition:all .14s var(--ease)}
.kx .task.done{background:var(--bg);box-shadow:none;opacity:.72}
.kx .task.late{border-color:#EFCEC7}
/* ⚠ **".kx .task-box" ולא ".task-box".** תיבת הסימון היא
   <button>, ו-".kx button" (סגוליות 0,1,1) מאפסת background
   ו-border. בלי הקידומת התיבה נעלמת לגמרי — וזו בדיוק
   המלכודת שמתועדת שלוש פעמים בקובץ הזה. */
.kx .task-box{width:24px;height:24px;border-radius:8px;border:2px solid var(--line2);
  flex:0 0 24px;display:grid;place-items:center;margin-top:1px;padding:0;
  background:var(--surface);color:transparent;min-height:0;
  transition:all .14s var(--ease)}
.kx .task.done .task-box{background:var(--ok);border-color:var(--ok);color:#fff}
.kx .task-box:active{transform:scale(.9)}
.task-b{flex:1;min-width:0}
.task-t{font-size:14.5px;font-weight:700;line-height:1.4}
.task.done .task-t{text-decoration:line-through;color:var(--faint)}
.task-m{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px;
  font-size:12px;color:var(--muted);font-weight:600}
.task-m .due{font-variant-numeric:tabular-nums}
.task-m .due.late{color:var(--clay);font-weight:800}
.kx .task-x{width:auto;min-height:0;padding:4px;color:var(--faint);flex:0 0 auto}
.kx .task-x:hover{color:var(--clay)}

/* ---------- הצפות מהצוות ----------
   ⚠ נראות כמו הודעה שהגיעה, ולא כמו משימה שהוקצתה. ההבחנה
     הזו היא כל הגבול: הצוות מציף, החניך מחליט. */
.msg{background:var(--surface);border:1px solid var(--line);border-inline-start:3px solid var(--amber);
  border-radius:var(--r-md);box-shadow:var(--sh-1);padding:13px 15px;margin-bottom:9px}
.msg-h{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.msg-h b{font-size:14.5px;font-weight:800}
.msg-h span{font-size:11.5px;color:var(--faint);font-weight:700}
.msg-b{font-size:13.5px;line-height:1.6;color:var(--ink2);margin-top:5px;white-space:pre-line}
.msg-reply{margin-top:10px;padding:10px 12px;background:var(--ok-soft);
  border-radius:10px;font-size:13px;line-height:1.55;color:#194B32}
.msg-reply b{display:block;font-size:11.5px;font-weight:900;margin-bottom:3px;opacity:.8}
.msg-form{display:flex;gap:7px;margin-top:10px}
.kx .msg-form input{flex:1;min-height:42px;font-size:14px}
.kx .msg-form button{width:auto;min-height:42px;padding:0 14px;flex:0 0 auto;font-size:14px}

/* ---------- מצב ריק של האחריות ---------- */
.duty-none{text-align:center;padding:26px 18px}
.duty-none .e-ico{width:56px;height:56px;margin:0 auto 12px;border-radius:18px;
  display:grid;place-items:center;background:var(--sand);color:var(--muted)}
.duty-none b{display:block;font-size:16px;font-weight:800}
.duty-none span{display:block;font-size:13.5px;color:var(--muted);margin-top:4px;line-height:1.5}


/* ============================================================
   לוח הנוכחות השנתי — רשת חודשים
   ------------------------------------------------------------
   ⚠ החליף שורה של ריבועים זעירים בלי מספרים, שנשברה
     באמצע החודש ושהמידע היחיד בה היה title — שאינו עובד במגע.

   ⚠ **direction:rtl במפורש** על הרשת, כמו ב-".cal" של הגאנט.
     בלעדיו יום ראשון נוחת בצד שמאל.

   ⚠ ו-".kx .yr2-c" ולא ".yr2-c": התא הוא <button>, ו-".kx button"
     מאפסת background ו-border בסגוליות גבוהה יותר.
   ============================================================ */
.yr2{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:560px){.yr2{grid-template-columns:1fr 1fr}}
@media(min-width:900px){.yr2{grid-template-columns:repeat(3,1fr)}}

.yr2-mon{background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-md);box-shadow:var(--sh-1);padding:12px 12px 13px}
.yr2-lab{font-size:13.5px;font-weight:900;letter-spacing:-.02em;
  margin-bottom:9px;color:var(--ink)}
.yr2-dow,.yr2-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;
  direction:rtl}
.yr2-dow{margin-bottom:5px}
.yr2-dow span{text-align:center;font-size:10.5px;font-weight:800;color:var(--faint)}
.yr2-pad{aspect-ratio:1}

.kx .yr2-c{aspect-ratio:1;min-height:0;padding:0;display:grid;place-items:center;
  border-radius:8px;font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums;
  border:1px solid transparent;background:var(--bg);color:var(--muted);
  transition:transform .1s var(--ease)}
.kx .yr2-c:active{transform:scale(.9)}
.kx .yr2-c.dim{opacity:.32}
.kx .yr2-c.sel{outline:2.5px solid var(--navy);outline-offset:1px;z-index:1}

/* המצבים. ⚠ הצבע לעולם לא לבדו — יש מספר בכל תא ושורת פירוט
   בלחיצה, כדי שמי שאינו מבחין בין ירוק לאדום יוכל לקרוא. */
.kx .yr2-c.present{background:#DCF3E5;color:#12603A;border-color:#BFE6D0}
.kx .yr2-c.sick{background:#FBDDD8;color:#8E2318;border-color:#F2C4BC}
.kx .yr2-c.just{background:#FAECD2;color:#7A4B08;border-color:#EEDCB8}
.kx .yr2-c.vac{background:#D8E4F7;color:#1D4ED8;border-color:#C0D3EF}
.kx .yr2-c.off{background:var(--sand);color:var(--faint);border-color:transparent}
/* ⚠ יום שהמכינה לא התקיימה בו — נבדל מ"חופשה" בעין, כי הוא
   מצב אחר: לא תוכנן, אלא התגלה. */
.kx .yr2-c.noroutine{background:var(--sand);color:var(--faint);
  border-color:var(--line2);border-style:dashed}
.kx .yr2-c.future{background:var(--bg);color:var(--line2);border-color:transparent}
.kx .yr2-c.unmarked{background:#fff;color:var(--muted);border-color:var(--line2)}
/* ⚠ תאריך שאינו בלוח השנה — נבדל גם מ-off וגם מריפוד ריק */
.kx .yr2-c.missing{background:repeating-linear-gradient(45deg,
  var(--bg),var(--bg) 3px,var(--line) 3px,var(--line) 4px);
  color:transparent;border-color:transparent}

/* ---------- שורת הפירוט ---------- */
.yr2-det{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:12px;
  padding:11px 14px;background:var(--sand);border-radius:var(--r-md);
  border:1px solid var(--line)}
.yr2-det b{font-size:15px;font-weight:900;font-variant-numeric:tabular-nums}
.yr2-det span{font-size:13px;color:var(--muted);font-weight:600}

/* ---------- מקרא ---------- */
.yr2-key{display:flex;flex-wrap:wrap;gap:10px 14px;margin-top:14px;
  font-size:12px;color:var(--muted);font-weight:700}
.yr2-key i{display:flex;align-items:center;gap:6px;font-style:normal}
/* ⚠ גודל קבוע במקרא. aspect-ratio על .yr2-c היה מנפח אותו. */
.yr2-key b{width:13px;height:13px;aspect-ratio:auto;border-radius:4px;
  display:block;font-size:0}

/* ============================================================
   ניהול צוותים — ועדות וסדרות
   ------------------------------------------------------------
   ⚠ **כל כלל כאן מתחיל ב-.kx** — כרטיס המשימה, הלשונית והשבב
     הם button, ו-.kx button מאפסת background ו-border בסגוליות
     גבוהה יותר (0,1,1). אותה מלכודת תפסה כבר את .task-box
     ואת .yr2-c.

   ⚠ ואין בקטיקים בקובץ הזה. הוא template literal אחד, ובקטיק
     בהערה סוגר אותו — ואז vite build **מדווח הצלחה** בעוד
     הדפדפן נשבר.
   ============================================================ */
.tm-sub{font-size:13.5px;color:var(--muted);font-weight:600;
  margin:-8px 2px 16px;line-height:1.55}

/* ---------- רשימת הצוותים ---------- */
.tm-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
.kx .tm-card{display:block;width:100%;text-align:right;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r-lg);padding:15px 16px 13px;
  box-shadow:var(--sh-1);transition:transform .12s var(--ease),box-shadow .12s var(--ease);
  position:relative;overflow:hidden}
/* ⚠ פס הגוון בקצה, כמו ב-.card.lift — הוא מה שמבדיל ועדה
   מוועדה ברשימה של תריסר. */
.kx .tm-card::before{content:"";position:absolute;inset-inline:0;top:0;height:3px;
  background:var(--t)}
.kx .tm-card:hover{transform:translateY(-2px);box-shadow:var(--sh-2)}
.kx .tm-card:active{transform:translateY(0)}
.tm-card-h{display:flex;align-items:center;justify-content:space-between;gap:12px}
.tm-card-n{font-family:Heebo,sans-serif;font-size:17px;font-weight:800;
  line-height:1.35;margin-bottom:4px}
.tm-card-s{font-size:12.5px;color:var(--muted);font-weight:700;line-height:1.5}
.tm-card-f{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}

/* ---------- טבעת ההתקדמות ---------- */
.tm-ring{flex:0 0 auto;overflow:visible}
.tm-ring-bg{fill:none;stroke:var(--line2);stroke-width:6}
.tm-ring-fg{fill:none;stroke:var(--t,var(--accent));stroke-width:6;stroke-linecap:round;
  transition:stroke-dasharray .5s var(--ease)}
.tm-ring-t{text-anchor:middle;dominant-baseline:central;font-size:15px;font-weight:800;
  fill:var(--ink);font-family:Heebo,sans-serif}

/* ---------- הכותרת ---------- */
.tm-hero{display:flex;align-items:center;justify-content:space-between;gap:16px;
  background:linear-gradient(140deg,var(--t-s),var(--surface) 78%);
  border:1px solid var(--line);border-radius:var(--r-lg);
  padding:18px 18px 16px;box-shadow:var(--sh-1);margin-bottom:12px}
.tm-hero-m{min-width:0}
.tm-hero-c{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.4px;
  color:var(--t);background:var(--surface);border:1px solid var(--line2);
  border-radius:999px;padding:3px 10px;margin-bottom:8px}
.tm-hero h2{font-family:Heebo,sans-serif;font-size:22px;font-weight:800;
  margin:0 0 8px;line-height:1.25}
.tm-hero-p{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;
  color:var(--muted);font-weight:700}
.tm-band{margin-bottom:12px}

/* ---------- אזהרה ---------- */
/* ⚠ הגדרה חסרה נראית אחרת ממצב ריק (עיקרון 6), ולכן זו
   רצועה ולא טקסט אפור בשוליים. */
.note-warn{display:flex;align-items:flex-start;gap:9px;font-size:13px;font-weight:700;
  line-height:1.6;color:#8A5A1E;background:#FBF3E4;
  border:1px solid var(--line2);border-radius:var(--r-md);padding:11px 13px;margin-bottom:10px}
.note-warn svg{flex:0 0 auto;margin-top:2px}

/* ---------- לשוניות ומסננים ---------- */
.tm-tabs{display:flex;gap:8px;margin:14px 0 12px}
.kx .tm-tab{display:flex;align-items:center;gap:7px;flex:1;justify-content:center;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);
  padding:11px 12px;font-size:13.5px;font-weight:800;color:var(--muted);
  box-shadow:var(--sh-1);transition:all .12s var(--ease)}
.kx .tm-tab.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.tm-filters{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;
  scrollbar-width:none}
.tm-filters::-webkit-scrollbar{display:none}
.kx .tm-chip{display:flex;align-items:center;gap:6px;flex:0 0 auto;
  background:var(--surface);border:1px solid var(--line);border-radius:999px;
  padding:7px 13px;font-size:12.5px;font-weight:800;color:var(--muted);
  transition:all .12s var(--ease)}
.kx .tm-chip.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.tm-chip i{font-style:normal;font-weight:900;opacity:.65;font-size:11.5px}
.kx .tm-add{width:100%;margin-bottom:14px;display:flex;align-items:center;
  justify-content:center;gap:8px}

/* ---------- קבוצת שלב ---------- */
.tm-group{margin-bottom:18px}
.tm-group-h{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;
  color:var(--muted);letter-spacing:.3px;margin:0 2px 8px}
.tm-group-h::after{content:"";flex:1;height:1px;background:var(--line2)}
.tm-group-h i{font-style:normal;order:-1;background:var(--sand);border-radius:999px;
  padding:1px 8px;font-size:11.5px}

/* ---------- כרטיס משימה ---------- */
/* ⚠ .kx .tm-task ולא .tm-task. ראו הכותרת. */
.kx .tm-task{display:flex;align-items:flex-start;gap:11px;width:100%;text-align:right;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);
  padding:12px 14px;margin-bottom:8px;box-shadow:var(--sh-1);
  transition:transform .12s var(--ease),box-shadow .12s var(--ease),opacity .2s}
.kx .tm-task:hover{transform:translateY(-1px);box-shadow:var(--sh-2)}
.kx .tm-task.done{opacity:.62;background:var(--sand)}
/* ⚠ האיחור הוא פס בקצה **ומילה**, ולא צבע לבד — מי שאינו
   מבחין בין ירוק לאדום עדיין רואה את התאריך מודגש (4ו). */
.kx .tm-task.late{border-inline-start:3px solid var(--clay)}
.tm-task-m{flex:1;min-width:0}
.tm-task-t{font-size:14.5px;font-weight:800;line-height:1.45;margin-bottom:6px}
.kx .tm-task.done .tm-task-t{text-decoration:line-through;text-decoration-thickness:1.5px}
.tm-task-s{display:flex;flex-wrap:wrap;align-items:center;gap:5px 9px;font-size:12px;
  font-weight:700;color:var(--muted)}
.tm-st{background:var(--sand);border-radius:999px;padding:2px 9px;font-size:11.5px}
.tm-st.on{background:#E3F1E8;color:#177A45}
.tm-own{display:flex;align-items:center;gap:4px}
.tm-own::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--accent)}
.tm-own.none{opacity:.6}
.tm-own.none::before{background:var(--line2)}
.tm-due{display:flex;align-items:center;gap:4px}
.tm-due.late{color:var(--clay);font-weight:800}
.tm-has{display:flex;opacity:.5}
.tm-task-n{font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.55;
  margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  overflow:hidden}
.tm-done-mark{flex:0 0 auto;width:22px;height:22px;border-radius:50%;
  background:#177A45;color:#fff;display:flex;align-items:center;
  justify-content:center;margin-top:1px}

/* ---------- עורך ---------- */
.tm-editor{margin-bottom:10px}
.tm-row2{display:grid;gap:0 12px;grid-template-columns:1fr 1fr}
@media (max-width:520px){.tm-row2{grid-template-columns:1fr}}
.tm-editor-f{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.kx .tm-editor-f .tm-del{margin-inline-start:auto;color:var(--clay)}
.tm-meta{display:flex;gap:6px;flex-wrap:wrap;font-size:11.5px;color:var(--faint);
  font-weight:600;margin-top:10px}

/* ---------- לפי אדם ---------- */
.tm-people{display:grid;gap:9px}
.tm-person{background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-md);padding:12px 14px;box-shadow:var(--sh-1)}
.tm-person.none{background:var(--sand);border-style:dashed}
.tm-person-h{display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin-bottom:8px}
.tm-person-h b{font-size:14.5px;font-weight:800;display:flex;align-items:center;gap:7px}
.tm-person-h span{font-size:13px;font-weight:800;color:var(--muted);
  font-variant-numeric:tabular-nums}
.tm-person-f{display:flex;gap:12px;font-size:12px;font-weight:700;color:var(--muted);
  margin-top:7px}
.tm-faint{color:var(--faint)}
.tm-bad{color:var(--clay);font-weight:800}

/* ---------- הפסקה הסוגרת ---------- */
/* ⚠ הפוכה במכוון לזו שבמרכז התפקיד. ראו ההערה בראש
   src/Teams.jsx: אם שני המסכים ייקראו אותו דבר, ההבטחה
   שבמרכז התפקיד תיקרא כשקר. */
.tm-note{font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.75;
  background:var(--sand);border:1px solid var(--line2);border-radius:var(--r-md);
  padding:13px 15px;margin-top:22px}
.tm-note b{color:var(--ink);font-weight:800}

@media (prefers-reduced-motion:reduce){
  .kx .tm-card,.kx .tm-task{transition:none}
  .tm-ring-fg{transition:none}
}

/* ---------- הצפות בתוך הוועדה ---------- */
.tm-esc{background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-lg);padding:16px 17px;box-shadow:var(--sh-1)}
.tm-esc-h{font-size:15px;font-weight:800;margin-bottom:12px}
.tm-esc p{font-size:13.5px;color:var(--muted);font-weight:600;
  line-height:1.7;margin:0 0 14px}
.tm-esc-n{font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.7;
  background:var(--sand);border-radius:var(--r-sm);padding:11px 13px;margin-top:14px}
.tm-esc-n b{color:var(--ink);font-weight:800}

/* ============================================================
   הצפה — הרכיב שיושב בתוך כל הקשר
   ------------------------------------------------------------
   ⚠ כל כלל על כפתור מתחיל ב-.kx: הכלל .kx button מאפס
     background ו-border בסגוליות (0,1,1). ואין בקטיקים בקובץ.
   ============================================================ */
.esc{margin-bottom:4px}
.esc-c{margin:-2px 0 14px}
.esc-h{font-size:15px;font-weight:800;margin-bottom:11px}
.kx .esc-open{width:100%;display:flex;align-items:center;justify-content:center;
  gap:8px;border:1px dashed var(--line2);background:var(--sand);color:var(--muted)}
.kx .esc-open:hover{border-color:var(--accent);color:var(--accent)}
.esc-form{background:var(--sand);border:1px solid var(--line2);
  border-radius:var(--r-md);padding:13px 14px 11px}
.esc-f{display:flex;gap:8px;margin-top:2px}
.esc-n{font-size:12px;color:var(--muted);font-weight:600;line-height:1.7;
  margin-top:11px;padding-top:11px;border-top:1px solid var(--line2)}
.esc-n b{color:var(--ink);font-weight:800}
.esc-ro{font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.7;
  background:var(--sand);border-radius:var(--r-sm);padding:11px 13px}
.esc-ro b{color:var(--ink);font-weight:800}
.esc-err{margin-bottom:10px}

/* ---------- מה כבר נשלח ---------- */
.esc-list{margin-top:12px}
.esc-lh{font-size:11.5px;font-weight:800;color:var(--muted);letter-spacing:.3px;
  margin:0 2px 7px}
.esc-item{background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-sm);padding:10px 12px;margin-bottom:7px}
.esc-it{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.esc-it b{font-size:13.5px;font-weight:800;line-height:1.45}
.kx .esc-del{flex:0 0 auto;width:24px;height:24px;border-radius:6px;
  color:var(--faint);display:flex;align-items:center;justify-content:center}
.kx .esc-del:hover{background:var(--sand);color:var(--clay)}
.esc-ib{font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.6;
  margin-top:5px}
.esc-im{font-size:11px;color:var(--faint);font-weight:700;margin-top:6px}
/* ⚠ התשובה נראית אחרת מההצפה: היא הדבר היחיד שזורם פנימה,
   והיא מגיעה מהחניך ולא מהצוות. */
.esc-reply{display:flex;gap:8px;margin-top:9px;padding:9px 11px;
  background:var(--sand);border-radius:var(--r-sm);
  border-inline-start:3px solid var(--accent)}
.esc-reply svg{flex:0 0 auto;margin-top:2px;color:var(--accent)}
.esc-reply div{min-width:0}
.esc-reply div>div{font-size:12.5px;font-weight:600;line-height:1.6}
.esc-reply span{display:block;font-size:11px;color:var(--faint);
  font-weight:700;margin-top:4px}

/* ---------- לשוניות הצוותים ---------- */
/* ⚠ .seg ולא .tm-tab: בתוך מסך הצוות כבר יש שורת לשוניות,
   ושתי שורות באותו מראה בשני מפלסים נקראות כמו אותה בחירה. */
.tm-seg button{display:flex;align-items:center;justify-content:center;gap:7px}
.seg-n{font-style:normal;font-size:11px;font-weight:900;opacity:.6;
  background:rgba(0,0,0,.06);border-radius:999px;padding:1px 7px;
  font-variant-numeric:tabular-nums}
.seg button.on .seg-n{opacity:.8}
.tm-form-h{font-family:Heebo,sans-serif;font-size:17px;font-weight:800;
  margin-bottom:14px}

/* ---------- כרטיס "הצוות נוצר" ---------- */
/* ⚠ לא קפיצה אוטומטית אל הצוות החדש: מטמון השרת בן 30
   שניות ויושב פר-מופע, והבקשה הבאה עלולה לנחות על מופע אחר
   ולומר "הצוות אינו נמצא" על צוות שזה עתה נוצר. */
.tm-made{margin-bottom:14px}
.tm-made-h{font-size:16px;font-weight:800;color:#177A45;margin-bottom:8px}
.tm-made p{font-size:13px;color:var(--muted);font-weight:600;
  line-height:1.75;margin:0 0 14px}
.tm-made p b{color:var(--ink);font-weight:800}

/* ---------- חשבון צפייה בלבד ---------- */
/* ⚠ רצועה ולא tooltip: ההגבלה חלה בכל מסך, ומי שלא יראה
   אותה יסיק שהמערכת שבורה. */
.ro-bar{background:#FBF3E4;color:#8A5A1E;font-size:12.5px;font-weight:700;
  text-align:center;padding:7px 14px;line-height:1.5;
  border-bottom:1px solid var(--line2)}
.ro-bar b{font-weight:900}

/* ---------- אלרגיה — מובלטת ולא שורה ---------- */
/* ⚠ הנתון היחיד בתיק שיש לו משמעות מיידית. שורה אפורה בין
   שמונה שורות אפורות אינה נקראת בזמן שמבשלים. */
.pf-alert{display:flex;flex-direction:column;gap:3px;margin-top:10px;
  padding:11px 13px;border-radius:var(--r-sm);
  background:#FBF3E4;border-inline-start:3px solid #8A5A1E}
.pf-alert b{font-size:11.5px;font-weight:800;color:#8A5A1E;letter-spacing:.2px}
.pf-alert span{font-size:14px;font-weight:700;line-height:1.5}

/* ============================================================
   לוח נוכחות — חודש אחד, בגדול
   ------------------------------------------------------------
   ⚠ **החליף את רשת עשרת החודשים.** שם כל תא היה שישה פיקסלים:
     קריא כרשת, בלתי קריא כתאריך. כאן תא אחד תופס את מה שהוא
     צריך, והדפדוף עושה את השאר.

   ⚠ **.kx .mv-c ו-.kx .mv-nav** — שניהם <button>, ו-
     .kx button מאפסת background ו-border בסגוליות (0,1,1).
     אותה מלכודת תפסה כבר את .task-box, את .yr2-c ואת
     .tm-task.

   ⚠ ואין בקטיקים בקובץ הזה.
   ============================================================ */
.mv{background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-lg);padding:14px 14px 16px;box-shadow:var(--sh-1);
  direction:rtl;margin-bottom:12px}

/* ---------- הכותרת והחצים ---------- */
.mv-head{display:flex;align-items:center;justify-content:space-between;
  gap:10px;margin-bottom:14px}
.mv-lab{text-align:center;min-width:0;flex:1}
.mv-lab b{display:block;font-family:'Suez One',Heebo,serif;font-size:20px;
  font-weight:400;line-height:1.25}
.mv-lab span{display:block;font-size:11px;color:var(--faint);font-weight:700;
  margin-top:3px;font-variant-numeric:tabular-nums}
/* ⚠ עיגול מלא ולא חץ עירום: שטח נגיעה של 40px, וקצה שנראה לחיץ. */
.kx .mv-nav{flex:0 0 auto;width:40px;height:40px;border-radius:50%;
  background:var(--sand);border:1px solid var(--line2);color:var(--ink);
  display:flex;align-items:center;justify-content:center;
  transition:all .12s var(--ease)}
.kx .mv-nav:hover:not(:disabled){background:var(--accent);color:#fff;
  border-color:var(--accent);transform:scale(1.06)}
.kx .mv-nav:active:not(:disabled){transform:scale(.96)}
/* ⚠ מושבת ולא מוסתר — כפתור שנעלם מזיז את הכותרת בכל דפדוף. */
.kx .mv-nav:disabled{opacity:.32;cursor:default}

/* ---------- הרשת ---------- */
.mv-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;
  margin-bottom:6px;direction:rtl}
.mv-dow span{text-align:center;font-size:11px;font-weight:800;
  color:var(--faint);letter-spacing:.3px}
.mv-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;direction:rtl}
.mv-pad{aspect-ratio:1}
.kx .mv-c{aspect-ratio:1;display:flex;align-items:center;justify-content:center;
  border-radius:var(--r-sm);font-size:15px;font-weight:800;
  border:1px solid transparent;font-variant-numeric:tabular-nums;
  transition:transform .1s var(--ease),box-shadow .1s var(--ease)}
.kx .mv-c:hover{transform:scale(1.06);box-shadow:var(--sh-1);z-index:1}
.kx .mv-c.sel{outline:2px solid var(--ink);outline-offset:1px}
/* ⚠ מעמעם ולא מסיר — יום מחוץ למחצית שנבחרה נשאר במקומו,
   אחרת נפער חור באמצע החודש שנראה כמו תאריך שאינו קיים. */
.kx .mv-c.dim{opacity:.3}

.kx .mv-c.present{background:#E3F1E8;color:#177A45}
.kx .mv-c.sick{background:#FBF3E4;color:#8A5A1E}
.kx .mv-c.just{background:#E7EEF7;color:#2A4E7E}
.kx .mv-c.vac{background:#F3E8F5;color:#6B3D7A}
.kx .mv-c.off{background:var(--sand);color:var(--faint)}
/* ⚠ "לא התקיימה" נבדל מ"חופשה": חופשה מתוכננת, וזה מתגלה
   בדיעבד. מקווקו ולא צבע אחר — הצבעים תפוסים למצבי החניך. */
.kx .mv-c.noroutine{background:var(--sand);color:var(--faint);
  border-color:var(--line2);border-style:dashed}
.kx .mv-c.unmarked{background:var(--surface);border-color:var(--line2)}
.kx .mv-c.future{background:transparent;color:var(--line2)}
/* ⚠ המצב החמישי: תאריך שאין לו שורה בלוח כלל. בלי מצב משלו
   הוא נראה כמו "יום ללא פעילות" — טענה שגויה על הנתונים. */
.kx .mv-c.missing{background:transparent;color:var(--line2);opacity:.45}

/* ---------- פירוט ומקרא ---------- */
.mv-det{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;
  background:var(--sand);border-radius:var(--r-md);padding:11px 14px;
  margin-bottom:12px;font-size:13.5px;font-weight:700}
.mv-det b{font-size:15px;font-weight:800}
.mv-det span{color:var(--muted)}
.mv-key{display:flex;flex-wrap:wrap;gap:8px 14px;font-size:11.5px;
  font-weight:700;color:var(--muted)}
.mv-key i{display:flex;align-items:center;gap:6px;font-style:normal}
/* ⚠ גודל קבוע במקרא. aspect-ratio על .mv-c היה מנפח אותו. */
.mv-key b{width:13px;height:13px;aspect-ratio:auto;border-radius:4px;
  display:block;font-size:0;flex:0 0 auto}

@media (prefers-reduced-motion:reduce){
  .kx .mv-c,.kx .mv-nav{transition:none}
  .kx .mv-c:hover,.kx .mv-nav:hover:not(:disabled){transform:none}
}

/* ============================================================
   תורניות
   ------------------------------------------------------------
   ⚠ כל כלל על כפתור מתחיל ב-.kx — .kx button מאפסת background
     ו-border בסגוליות (0,1,1). ואין בקטיקים בקובץ הזה.
   ============================================================ */
.ch-tabs{overflow-x:auto;scrollbar-width:none}
.ch-tabs::-webkit-scrollbar{display:none}
.kx .ch-tabs .tm-tab{flex:0 0 auto;min-width:110px}
.ch-seg{margin-top:2px}
.ch-note{font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.7;
  background:var(--sand);border-radius:var(--r-md);padding:11px 13px;margin:0 0 12px}
.ch-note b{color:var(--ink);font-weight:800}

/* ---------- מובילי השבוע ---------- */
.ch-leadbar{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;
  line-height:1.6;color:#6B3D7A;background:#F3E8F5;border-radius:var(--r-md);
  padding:10px 13px;margin-bottom:12px}
.ch-leadbar b{font-weight:900}
.ch-leadbar svg{flex:0 0 auto}
.kx .ch-lead{display:inline-flex;align-items:center;gap:5px;background:#F3E8F5;
  color:#6B3D7A;font-size:11px;font-weight:800;white-space:nowrap}

/* ---------- כרטיס גזרה ---------- */
.ch-sec{margin-bottom:10px;padding:0;overflow:hidden}
.kx .ch-sec-h{display:flex;align-items:center;gap:11px;width:100%;text-align:right;
  padding:14px 15px}
.ch-sec-n{flex:1;min-width:0}
.ch-sec-n b{display:block;font-size:15.5px;font-weight:800;line-height:1.4}
.ch-sec-n span{display:block;font-size:12.5px;color:var(--muted);font-weight:600;
  margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ch-sec-c{flex:0 0 auto;font-size:20px;font-weight:800;color:var(--accent);
  font-variant-numeric:tabular-nums}
.ch-sec-b{padding:0 15px 15px}
.ch-detail{font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.7;
  background:var(--sand);border-radius:var(--r-sm);padding:10px 12px;margin:0 15px 12px;
  white-space:pre-wrap}
/* ⚠ **.kx .rows.ch-pick ולא .ch-pick.**
   .kx .rows{overflow:hidden} בשכבת ההרמה היא (0,2,0), ומחלקה
   בודדת היא (0,1,0) — כלומר overflow:hidden גובר גם כשהכלל
   שלנו מאוחר יותר בקובץ, והרשימה של 33 החניכים נחתכת בשמונה
   בלי שום רמז שאפשר לגלול.

   זו הפעם השלישית שהמלכודת הזו תופסת: .rl-pick ו-.scroll-y
   כבר נתקלו בה. **רשימה גוללת חדשה בתוך .rows חייבת את
   הקידומת המלאה, או להשתמש ב-.scroll-y הקיימת.** */
.kx .rows.ch-pick{max-height:44vh;overflow-y:auto;
  -webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.ch-cap{font-size:12px;font-weight:800;color:var(--muted);margin-bottom:8px}
.ch-cap.over{color:var(--clay)}

/* ---------- ההמלצה ---------- */
/* ⚠ שתי רמות שנראות שונה: "מומלץ" עם גוון, "הכי מאחור" בלי.
   שתיהן באותו מראה היו הופכות את החזקה לרעש. */
.ch-sugg{display:flex;align-items:flex-start;gap:8px;font-size:12.5px;font-weight:600;
  line-height:1.7;color:var(--muted);padding:0 15px 12px}
.ch-sugg.strong{color:#8A5A1E}
.ch-sugg svg{flex:0 0 auto;margin-top:2px;opacity:.7}
.ch-sugg b{font-weight:800;color:var(--ink)}
.ch-sugg.strong b{color:#8A5A1E}
.ch-sugg b + b::before{content:" · ";font-weight:400;color:var(--line2)}
.ch-sugg b span{font-weight:700;opacity:.7}

/* ---------- יום תורנות ---------- */
.ch-day{margin-bottom:8px;padding:0;overflow:hidden}
.ch-day.has{border-color:var(--line2)}
.kx .ch-day-h{display:flex;align-items:center;gap:12px;width:100%;text-align:right;
  padding:12px 14px}
.ch-day-d{flex:0 0 auto;width:44px;text-align:center}
.ch-day-d b{display:block;font-size:17px;font-weight:800;line-height:1.1}
.ch-day-d span{display:block;font-size:11px;color:var(--faint);font-weight:700;margin-top:2px;
  font-variant-numeric:tabular-nums}
.ch-day-n{flex:1;min-width:0;font-size:13.5px;font-weight:700;line-height:1.5}
.ch-day-empty{color:var(--faint);font-weight:600}
.ch-day-from{display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:5px;
  font-size:11px;font-weight:700;color:var(--faint)}
.ch-day-from .hot{color:var(--clay);font-weight:800}
.ch-crowd{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;
  color:#8A5A1E;background:#FBF3E4;padding:8px 14px;line-height:1.5}
.ch-crowd svg{flex:0 0 auto}

/* ---------- טבלת המעקב ---------- */
.ch-tally-s{margin-bottom:16px}
.ch-tally-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  margin:0 2px 8px}
.ch-tally-h b{font-size:14.5px;font-weight:800}
.ch-tally-h span{font-size:11.5px;color:var(--faint);font-weight:700}
.ch-tally-none{font-size:12.5px;color:var(--faint);font-weight:600;
  background:var(--sand);border-radius:var(--r-sm);padding:10px 12px}
.ch-cells{display:grid;gap:5px;grid-template-columns:repeat(auto-fill,minmax(78px,1fr))}
.ch-cell{border-radius:var(--r-sm);padding:7px 6px;text-align:center;min-width:0;
  border:1px solid transparent}
.ch-cell b{display:block;font-size:17px;font-weight:800;line-height:1.1;
  font-variant-numeric:tabular-nums}
.ch-cell span{display:block;font-size:10.5px;font-weight:700;margin-top:3px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85}
/* ⚠⚠ אדום כאן אינו "בעיה" אלא "תורו". המקרא אומר את זה במילים,
   כי הצבע לבדו הפוך לאינטואיציה בכל שאר המערכת. */
.t-over{background:#E3F1E8;color:#177A45}
.t-near{background:#FBF3E4;color:#8A5A1E}
.t-under{background:#F7E4E1;color:#B02A1F}
.ch-key{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:11.5px;font-weight:700;
  color:var(--muted);margin-top:4px}
.ch-key i{display:flex;align-items:center;gap:6px;font-style:normal}
.ch-key-em{color:#B02A1F;font-weight:800}
.ch-dot{width:13px;height:13px;border-radius:4px;display:block;font-size:0;flex:0 0 auto}

/* ---------- צ׳ק ליסט ---------- */
.ch-duty{display:flex;align-items:baseline;gap:10px;background:var(--ink);color:#fff;
  border-radius:var(--r-md);padding:11px 14px;margin-bottom:12px;font-size:13.5px}
.ch-duty b{font-size:11.5px;font-weight:800;opacity:.72;flex:0 0 auto}
.ch-duty span{font-weight:700}
.ch-ro{font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.7;
  background:var(--sand);border-radius:var(--r-md);padding:11px 13px;margin-bottom:12px}
.ch-grp{margin-bottom:16px}
.ch-grp-h{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;
  color:var(--muted);letter-spacing:.3px;margin:0 2px 7px}
.ch-grp-h::after{content:"";flex:1;height:1px;background:var(--line2)}
.ch-grp-h i{font-style:normal;order:-1;background:var(--sand);border-radius:999px;
  padding:1px 8px;font-size:11px;font-variant-numeric:tabular-nums}
.kx .ch-task{display:flex;align-items:center;gap:11px;width:100%;text-align:right;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);
  padding:11px 13px;margin-bottom:6px;font-size:13.5px;font-weight:700;line-height:1.5}
.kx .ch-task span{flex:1;min-width:0}
.kx .ch-task.done{opacity:.6;background:var(--sand)}
.kx .ch-task.done span{text-decoration:line-through;text-decoration-thickness:1.5px}
.kx .ch-task:disabled{cursor:default}
.ch-task-d{font-style:normal;flex:0 0 auto;font-size:10.5px;font-weight:800;
  color:var(--faint);background:var(--sand);border-radius:999px;padding:2px 8px}

/* ---------- הגדרות ---------- */
.ch-set{margin-bottom:9px}
.ch-set-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.ch-set-h b{display:block;font-size:15px;font-weight:800}
.ch-set-h span{display:block;font-size:12px;color:var(--muted);font-weight:700;margin-top:2px}
.ch-set .ch-detail{margin:10px 0 0}
.ch-form{padding:2px}
.ch-chk{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;font-weight:600;
  color:var(--muted);line-height:1.6;margin:2px 0 14px;cursor:pointer}
.ch-chk input{margin-top:3px;flex:0 0 auto}
.ch-adj{display:grid;gap:7px;margin-top:10px}
.ch-adj-r{display:flex;align-items:center;gap:11px;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r-md);padding:10px 12px}
.ch-adj-r > div{flex:1;min-width:0;font-size:13px;font-weight:700}
.ch-adj-r span{display:block;font-size:11.5px;color:var(--faint);font-weight:600;margin-top:2px}
.ch-adj-r b{flex:0 0 auto;font-size:16px;font-weight:800;width:34px;text-align:center;
  font-variant-numeric:tabular-nums}
.ch-adj-r b.up{color:#177A45}
.ch-adj-r b.down{color:var(--clay)}

/* ---------- בלוק טקסט נערך ---------- */
.tb{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:15px 16px;box-shadow:var(--sh-1);margin-bottom:10px}
.tb-h{display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin-bottom:10px}
.tb-h b{font-size:15.5px;font-weight:800}
.kx .tb-pen{display:flex;align-items:center;gap:6px;flex:0 0 auto;font-size:12px;
  font-weight:800;color:var(--muted);background:var(--sand);border-radius:999px;
  padding:5px 11px}
.kx .tb-pen:hover{color:var(--accent)}
/* ⚠ pre-wrap: הטקסט נשמר עם שבירות שורה שמישהו כתב בכוונה,
   ורינדור שמוחק אותן הופך רשימה של תשעה סעיפים לפסקה אחת. */
.tb-body{font-size:13.5px;font-weight:600;line-height:1.85;color:var(--muted);
  white-space:pre-wrap}
.tb-by{font-size:11px;color:var(--faint);font-weight:700;margin-top:12px;
  padding-top:10px;border-top:1px solid var(--line2)}
.tb-f{display:flex;gap:8px}
.tb-edit textarea{font-family:inherit;line-height:1.8}

/* ---------- עריכת צוות ומחיקתו ---------- */
.tm-top{display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin-bottom:14px}
/* ⚠ אישור מחיקה בתוך המסך ולא confirm() של הדפדפן: הוא
   נראה זר, ובחלק מהדפדפנים במובייל הוא נחסם — כלומר הכפתור
   פשוט לא עושה כלום. */
.tm-danger{background:#F8E6E2;border:1px solid #EFCEC7;border-radius:var(--r-md);
  padding:13px 14px;margin-top:12px}
.tm-danger b{display:block;font-size:14px;font-weight:800;color:#9E3626;
  margin-bottom:5px}
.tm-danger span{display:block;font-size:12.5px;color:var(--muted);font-weight:600;
  line-height:1.7;margin-bottom:12px}
.kx .tm-del-go{background:#9E3626;box-shadow:none}
.kx .tm-del-go:hover{background:#8A2F21}

/* ---------- עריכת רשימת המטלות ---------- */
/* ⚠ באותו מסך שבו רואים את הרשימה, ולא בלשונית נפרדת: מי
   שקורא מטלה ורוצה לנסח אותה מחדש לא צריך לעבור מסך, למצוא
   אותה שוב ברשימה של 33, ולזכור מה רצה לשנות. */
.ch-edit{margin-top:6px}
.ch-days{display:flex;gap:5px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;
  scrollbar-width:none}
.ch-days::-webkit-scrollbar{display:none}
.kx .ch-dayb{display:flex;align-items:center;gap:5px;flex:0 0 auto;min-width:52px;
  justify-content:center;background:var(--sand);border:1px solid var(--line2);
  border-radius:999px;padding:7px 12px;font-size:13px;font-weight:800;
  color:var(--muted);transition:all .12s var(--ease)}
.kx .ch-dayb.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.ch-dayb i{font-style:normal;font-size:10.5px;font-weight:900;opacity:.6;
  font-variant-numeric:tabular-nums}
.ch-erow{display:flex;align-items:center;gap:9px;padding:9px 0;
  border-bottom:1px solid var(--line2)}
.ch-erow:last-of-type{border-bottom:none}
.ch-erow-m{flex:1;min-width:0}
.ch-erow-m b{display:block;font-size:13.5px;font-weight:700;line-height:1.5}
.ch-erow-m span{display:block;font-size:11px;color:var(--faint);font-weight:700;
  margin-top:2px}
.ch-eform{width:100%}
.ch-eadd{margin-top:14px;padding-top:14px;border-top:1px solid var(--line2)}
.ch-sec-t{padding:0 15px 4px}
/* ⚠ הטבלה הדחוסה בתוך הגזרה — תאים קטנים יותר, כי היא
   יושבת בתוך כרטיס ולא כמסך שלם. */
.ch-tally.compact .ch-cells{grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:4px}
.ch-tally.compact .ch-cell{padding:5px 4px}
.ch-tally.compact .ch-cell b{font-size:14px}
.ch-tally.compact .ch-cell span{font-size:9.5px}
.ch-tally.compact .ch-tally-s{margin-bottom:6px}

/* ---------- רצועת לשוניות שנגללת ---------- */
/* ⚠ לשונית שנבלעת אינה קיימת: רצועה עם overflow-x:auto
   נראית שלמה כשהיא נחתכת, ואין פס גלילה במגע. החצים הם
   הרמז היחיד שיש עוד. */
.stabs{position:relative;margin-bottom:12px}
.stabs-in{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;
  scroll-behavior:smooth;padding-bottom:2px;margin-bottom:0}
.stabs-in::-webkit-scrollbar{display:none}
.stabs-in > *{flex:0 0 auto}
/* ============================================================
   WARN **הפעם הרביעית שמלכודת הסגוליות הזו מכה.**

   .seg button הוא (0,1,1) ו-.stabs-in > * הוא (0,1,0) —
   כלומר flex:1 של הרצועה הרגילה **גובר** על flex:0 0 auto
   של הרצועה הנגללת, גם כשהאחרון מאוחר יותר בקובץ. התוצאה:
   ScrollTabs עם המחלקה "seg" לעולם אינו נגלל, הלשוניות נדחסות,
   וטקסט ארוך כמו "ספטמבר 2026" גולש החוצה ומזיז את כל המסך.

   הכלל, כמו ב-4ק: כלל על ילד של רצועה חייב סגוליות **גבוהה
   מזו של הרצועה עצמה** — כאן (0,2,1).
   ============================================================ */
.stabs-in.seg > button{flex:0 0 auto;padding:0 14px;white-space:nowrap}
/* ⚠ החץ צף מעל הרצועה עם דהייה מאחוריו — בלי הדהייה
   הוא יושב על טקסט של לשונית וקשה לקרוא את שניהם. */
.kx .stabs-a{position:absolute;top:0;bottom:2px;width:44px;z-index:2;
  display:flex;align-items:center;border-radius:var(--r-md);
  color:var(--ink);background:none}
.kx .stabs-a.start{right:0;justify-content:flex-start;padding-right:2px;
  background:linear-gradient(to left,var(--bg) 45%,transparent)}
.kx .stabs-a.end{left:0;justify-content:flex-end;padding-left:2px;
  background:linear-gradient(to right,var(--bg) 45%,transparent)}
.kx .stabs-a svg{background:var(--surface);border:1px solid var(--line2);
  border-radius:50%;width:28px;height:28px;padding:5px;box-shadow:var(--sh-1)}
.kx .stabs-a:hover svg{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ⚠ הרצועות שבתוך .stabs מאבדות את המרווח התחתון שלהן —
   הוא עבר ל-.stabs עצמו, אחרת יש רווח כפול. */
.stabs .tm-tabs,.stabs .seg,.stabs .tm-seg{margin-bottom:0}
.stabs .seg{overflow-x:auto}

/* ⚠ duty-bar בתוך .stabs — המרווח והגלילה עוברים למעטפת. */
.stabs .duty-bar{margin-bottom:0;overflow-x:auto}

/* ---------- ניווט בין שבועות ---------- */
/* ⚠ החץ מושבת ולא מוסתר בקצוות — כפתור שנעלם מזיז את
   הכותרת בכל דפדוף, וזה נראה כמו קפיצה. */
.ch-wnav{display:flex;align-items:center;gap:10px;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r-md);padding:8px 10px;
  margin-bottom:12px;box-shadow:var(--sh-1)}
.ch-wnav-m{flex:1;min-width:0;text-align:center}
.ch-wnav-m b{display:block;font-size:14.5px;font-weight:800;line-height:1.3}
.ch-wnav-m span{display:block;font-size:11px;color:var(--faint);font-weight:700;
  margin-top:2px;font-variant-numeric:tabular-nums}
.kx .ch-wnav .mv-nav{width:34px;height:34px}
.kx .ch-now{flex:0 0 auto;padding:0 12px;min-height:34px}

/* ---------- שעות בבקשת יציאה ---------- */
.rq-times{display:grid;gap:0 12px;grid-template-columns:1fr 1fr}
@media (max-width:420px){.rq-times{grid-template-columns:1fr}}
/* ⚠ input[type=time] ב-RTL מציג את השעות הפוך בלי dir=ltr,
   ו-19:30 נראה 30:19. */
.rq-times input{font-variant-numeric:tabular-nums}
.rq-when{display:flex;gap:8px;font-size:11.5px;font-weight:700;color:var(--faint);
  margin-top:4px;font-variant-numeric:tabular-nums}

/* ---------- ניהול תוכן ---------- */
.cn-row{display:flex;align-items:flex-start;gap:11px;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r-md);padding:13px 14px;
  margin-bottom:8px;box-shadow:var(--sh-1)}
.cn-m{flex:1;min-width:0}
.cn-m b{display:block;font-size:14.5px;font-weight:800;line-height:1.4}
.cn-m > span{display:block;font-size:11.5px;color:var(--faint);font-weight:700;
  margin-top:3px;line-height:1.5}
/* ⚠ תצוגה מקדימה של שתי שורות בלבד: הרשימה היא מפה, לא
   מקום לקרוא בו נוהל של 5,600 תווים. */
.cn-prev{font-size:12px;color:var(--muted);font-weight:600;line-height:1.6;
  margin-top:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  overflow:hidden}
.cn-side{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:7px}
.cn-form{width:100%}
.kx .cn-reset{margin-inline-start:auto;color:var(--muted)}

/* ⚠ המקור מסומן: תיאור שנערך ותיאור שהמכינה מסרה הם שני
   דברים, ומי שקורא צריך לדעת מה מולו. */
.rl-edited{font-size:10px;font-weight:800;color:var(--muted);
  background:var(--sand);border-radius:999px;padding:1px 7px;margin-inline-start:7px}

/* ⚠ בלוק שלא נכתב אינו מוצג בכלל — הרכיב מחזיר null. הכלל
   כאן נוגע רק למרווח כשהוא כן קיים. */
.scr-note{margin-bottom:14px}

`;
