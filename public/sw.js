/* ============================================================
   Service Worker — התראות לטלפון, ועבודה לא מקוונת
   ------------------------------------------------------------
   ⚠⚠ **ההערה הקודמת כאן אמרה "אינו מטמין דבר, ובכוונה", והיא
     הייתה נכונה.** הסכנה שהיא תיארה אמיתית: SW שמטמין הופך כל
     דיפלוי לשאלה "איזו גרסה המשתמש רואה", ותקלה כזו אי אפשר
     לשחזר — אצל אחד עובד ואצל השני לא, ושניהם באותה כתובת.

   מה שהשתנה אינו ההערכה אלא **האסטרטגיה**: המטמון כאן הוא
   **רשת-קודם בלבד**, לעולם לא מטמון-קודם על תוכן. כלומר
   כשיש רשת המשתמש רואה תמיד את הגרסה החדשה, בדיוק כמו קודם,
   והמטמון נוגע רק כשהרשת **נכשלה**. הסכנה של "איזו גרסה"
   אינה קיימת כי אין מצב שבו מטמון גובר על רשת שעובדת.

   ------------------------------------------------------------
   ⚠⚠⚠ **ומה שאינו נעשה כאן, ובמפורש: כתיבה אינה נשמרת בתור.**

   זו הייתה ההשלמה המתבקשת — לסמן נוכחות בלי רשת ולשלוח אחר
   כך — והיא נדחתה. סימון שנשמר בתור נראה למשתמש כאילו נקלט,
   והוא עשוי להישלח כעבור שעות, אחרי שמישהו אחר כבר סימן את
   אותו יום. `?action=mark` **דורס** את רשימת הנוכחים (5א),
   ולכן תור היה מוחק נתון אמיתי בלי שאיש יידע.

   זו אותה שורה בדיוק של הסימון האופטימי (4י): מותר להראות
   מיד, **אבל חייבים לחזור אחורה ולומר כשזה נכשל**. בלי רשת
   אין מי שיאמר, ולכן העדיפות היא לחסום ולומר — ולא לשמור
   ולקוות.

   **מה שכן עובד בלי רשת: קריאה.** הכול נטען מהפעם האחרונה,
   ומסומן בגלוי כ"מוצג מהזיכרון, מ-HH:MM" (עיקרון 6 — נתון
   ישן שנראה כמו נתון עדכני הוא בדיוק מה שאסור).

   ------------------------------------------------------------
   ⚠ **הדחיפה מגיעה ריקה**, וה-SW הוא זה שפונה לשרת ושואל מה
     חדש. כך שום נתון של חניך אינו עובר דרך גוגל או אפל.

   ⚠ **ואם השליפה נכשלת — מוצגת הודעה כללית ולא כלום.** דפדפן
     שמקבל דחיפה ואינו מציג התראה עלול לבטל את ההרשאה, וגרוע
     מזה: המשתמש יודע שמשהו קרה ולא יודע מה.
   ============================================================ */

/* ⚠ **שם המטמון נושא גרסה.** שינוי הגרסה מוחק את הישן
   ב-`activate`, וזו הדרך היחידה לצאת ממטמון שהתקלקל בלי
   לבקש מכל משתמש לנקות את הדפדפן. */
const CACHE = "kx-v1";

/* ⚠ **רק GET, ורק את המסלולים האלה.** נקודת קצה שמחזירה נתון
   אישי מוטמנת אצל המשתמש שביקש אותה, וזה בסדר — היא בדפדפן
   שלו. מה שאינו כאן פשוט לא נשמר. */
const CACHE_API = /\/api\/(auth|students|attendance|lessons|kitchen|container|chores)\?/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => e.waitUntil((async () => {
  /* ⚠ מטמונים של גרסאות קודמות נמחקים — אחרת הם נשארים
     בטלפון לנצח ותופסים מקום על לא כלום. */
  for (const k of await caches.keys()) {
    if (k !== CACHE) await caches.delete(k);
  }
  await self.clients.claim();
})()));

/* ============================================================
   ⚠⚠ **רשת-קודם תמיד, ומטמון רק כשהרשת נכשלה.**

   ולא "מטמון-קודם למה שלא משתנה": קבצי ה-build נושאים גיבוב
   בשם, ולכן הם ממילא לא משתנים — ודף ה-HTML עצמו **כן**
   משתנה בכל דיפלוי. הטמנה שלו במטמון-קודם היא בדיוק התקלה
   שההערה בראש הקובץ מזהירה ממנה.

   ⚠ **התשובה מהמטמון נושאת כותרת שאומרת שהיא מהמטמון ומתי.**
     `src/api.js` קורא אותה ומסמן את הנתון כישן, והמסך אומר
     זאת. נתון ישן שנראה עדכני הוא הדבר היחיד כאן שגרוע
     מהיעדר נתון (עיקרון 6).
   ============================================================ */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  /* ⚠ כתיבה אינה נוגעת במטמון בשום צורה — ראו ההערה בראש. */
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isApi = CACHE_API.test(url.pathname + url.search);
  const isNav = req.mode === "navigate";
  const isAsset = /\.(js|css|png|jpg|jpeg|svg|webmanifest|woff2?)$/.test(url.pathname);
  if (!isApi && !isNav && !isAsset) return;

  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      /* ⚠ **רק תשובה תקינה נשמרת.** 401 ו-500 שנשמרים במטמון
         הם בדיוק המצב שבו המשתמש נתקע מנותק לנצח. */
      if (res && res.ok) {
        const cache = await caches.open(CACHE);
        const copy = new Response(res.clone().body, {
          status: res.status,
          statusText: res.statusText,
          headers: new Headers(res.headers),
        });
        copy.headers.set("x-kx-cached-at", new Date().toISOString());
        cache.put(req, copy).catch(() => {});
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req);
      if (hit) {
        /* ⚠ הכותרת עוברת ללקוח — היא כל ההבדל בין "מוצג
           מהזיכרון" לבין שקר. */
        const headers = new Headers(hit.headers);
        headers.set("x-kx-offline", "1");
        return new Response(hit.body, {
          status: hit.status, statusText: hit.statusText, headers,
        });
      }
      /* ⚠ ניווט בלי מטמון — מחזירים את דף הבית אם הוא שמור,
         כדי שהאפליקציה תיפתח ותציג את המצב הלא-מקוון בעצמה
         במקום את מסך השגיאה של הדפדפן. */
      if (isNav) {
        const shell = await caches.match("/");
        if (shell) return shell;
      }
      throw err;
    }
  })());
});

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let title = "מכינת ניר עוז";
    let body = "יש עדכון חדש במערכת";
    let count = 0;

    try {
      const r = await fetch("/api/auth?action=notify", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (r.ok) {
        const d = await r.json();
        const fresh = (d.notes || []).filter((n) => n.fresh);
        count = fresh.length;
        if (count === 1) {
          title = fresh[0].title || title;
          body = fresh[0].body || "";
        } else if (count > 1) {
          title = `${count} עדכונים חדשים`;
          body = fresh.slice(0, 3).map((n) => n.title).join(" · ");
        } else {
          /* ⚠ אין מה להציג — לא מציגים התראה ריקה. */
          return;
        }
      }
    } catch (e) {
      /* נשארים עם ההודעה הכללית */
    }

    await self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      dir: "rtl",
      lang: "he",
      /* ⚠ תג קבוע — התראה חדשה מחליפה את הקודמת ולא מצטברת
         לעשר התראות על אותו דבר. */
      tag: "mechina-notify",
      renotify: true,
      data: { count },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    /* ⚠ חלון פתוח מקבל מיקוד במקום להיפתח שוב — שתי לשוניות
       של אותה אפליקציה הן בדיוק מה שגורם לאנשים לאבד מה שהקלידו. */
    for (const c of all) {
      if (c.url.includes(self.location.origin)) return c.focus();
    }
    return self.clients.openWindow("/");
  })());
});
