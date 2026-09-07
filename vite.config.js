import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* ------------------------------------------------------------
   מריץ את הפונקציות שב-api/ מקומית, בפורמט של Vercel.
   בפרודקשן Vercel מריצה אותן בעצמה — התוסף הזה לא רץ שם כלל,
   ולכן אותם קבצים עובדים בשתי הסביבות בלי שינוי.
   ------------------------------------------------------------ */
function localApi() {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/")) return next();

        const url = new URL(req.url, "http://localhost");
        const name = url.pathname.slice("/api/".length);
        if (!/^[a-z0-9-]+$/i.test(name)) return next();

        // משלים את מה ש-Vercel מספקת לפונקציה
        req.query = Object.fromEntries(url.searchParams);
        res.status = (code) => { res.statusCode = code; return res; };
        /* ⚠ שומר על שליחה כפולה. בלי זה, שגיאה שצפה **אחרי**
           שהתשובה נשלחה מפילה את ה-catch עצמו ב-write-after-end,
           ואז הלקוח מקבל HTML במקום JSON ואומר "שגיאה 500"
           בלי הסיבה — כלומר ההודעה המועילה היחידה אובדת. */
        res.json = (body) => {
          if (res.writableEnded) return;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(body));
        };

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          await mod.default(req, res);
        } catch (e) {
          /* ⚠ ה-stack ולא ה-message בלבד. כשהכשל הוא בטעינת
             מודול (למשל export כפול בקובץ shared/*-ids.js),
             ה-message לבדו אינו אומר **איזה** קובץ שבר. */
          server.config.logger.error(`[api/${name}] ${e.stack || e.message}`);
          res.status(500).json({
            error: `[api/${name}] ${e.message}`,
            where: String(e.stack || "").split("\n")[1]?.trim() || null,
          });
        }
      });
    },
  };
}

/* ------------------------------------------------------------
   חותמת הגרסה בעמוד עצמו
   ------------------------------------------------------------
   ⚠ נוסף אחרי מקרה שבו תיקון בצד השרת נדחף, ולא הייתה שום דרך
     לדעת אם הוא כבר באוויר: חבילת הלקוח אינה משתנה כששינוי הוא
     בשרת בלבד, ולכן השוואת גיבוב הקובץ אינה עוזרת.

   ⚠ התג יושב ב-HTML ולא בתשובת API, כדי שאפשר יהיה לקרוא אותו
     **בלי להתחבר**. מזהה קומיט אינו סוד ואינו פותח דבר.
   ------------------------------------------------------------ */
function buildStamp() {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);
  return {
    name: "build-stamp",
    transformIndexHtml: (html) =>
      html.replace("</head>", `  <meta name="build" content="${sha}" />
  </head>`),
  };
}

export default defineConfig({
  plugins: [react(), localApi(), buildStamp()],
  server: { port: 5173 },
});
