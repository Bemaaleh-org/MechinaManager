import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
/* ⚠ **לפני הרינדור הראשון.** העדפה שמוחלת אחרי שהמסך צויר
   נראית כהבהוב לבן — וזה בדיוק מה שמצב לילה נועד למנוע. */
import { watch } from "./prefs.js";

watch();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
