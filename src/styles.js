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
.st-fig{display:flex;gap:4px;flex:0 0 auto}
.st-fig b{font-size:11px;font-weight:800;padding:3px 6px;border-radius:6px;font-variant-numeric:tabular-nums;
  min-width:22px;text-align:center}

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

/* ⚠ מי שביקש פחות תנועה מקבל פחות תנועה. */
@media (prefers-reduced-motion:reduce){
  .kx *{transition-duration:.01ms !important;animation-duration:.01ms !important}
}
`;
