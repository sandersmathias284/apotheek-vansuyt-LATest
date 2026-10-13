// Enkel gebruikt tijdens het bouwen: zet elke pagina om naar gewone HTML.
import React from "react";
import { renderToString } from "react-dom/server";
import { App } from "./app.jsx";

export const renderPage = (page) => renderToString(<App initialPage={page} />);
