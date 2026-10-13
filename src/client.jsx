// Start in de browser. De HTML staat al klaar (vooraf gegenereerd); React
// neemt het daarna over voor de live onderdelen (open/gesloten, klok, nieuws).
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.jsx";
import { PAGE_IDS, hrefOf, pageFromPath } from "./routes.js";

// Oude links zoals /#diensten of /#info doorsturen naar het nieuwe adres.
const oudeHash = window.location.hash.slice(1);
if (oudeHash && PAGE_IDS.includes(oudeHash) && window.location.pathname === "/") {
  window.history.replaceState({}, "", hrefOf(oudeHash));
}

const page = pageFromPath(window.location.pathname) || "404";
createRoot(document.getElementById("root")).render(<App initialPage={page} />);
