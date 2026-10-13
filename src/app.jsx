// App + router. Elke pagina heeft een echt adres (/diensten/, /contact/, ...);
// binnen de site wisselen we van pagina zonder herladen (history.pushState).
import React from "react";
import { ROUTES, hrefOf, pageFromPath } from "./routes.js";
import { Header, Footer } from "./components/Chrome.jsx";
import { ClosureBar } from "./components/Closure.jsx";
import { HomePage } from "./pages/Home.jsx";
import { DienstenPage } from "./pages/Catalog.jsx";
import { WachtdienstPage } from "./pages/Wachtdienst.jsx";
import { ReservatiePage, LinksPage, InfoPage } from "./pages/Other.jsx";
import { SorteerwijzerPage } from "./pages/Sorteerwijzer.jsx";
import { BeheerPage } from "./pages/Beheer.jsx";

const NotFoundPage = ({ setPage }) => (
  <div className="page">
    <section className="container page-head">
      <div>
        <nav className="breadcrumb" aria-label="Kruimelpad"><span>Apotheek</span> <span aria-hidden="true">/</span> <span aria-current="page">Niet gevonden</span></nav>
        <h1>Deze pagina<br/>bestaat <em>niet</em>.</h1>
      </div>
      <p className="intro">
        Misschien is de link verouderd.{" "}
        <a className="inline" href={hrefOf("home")} onClick={(e) => { e.preventDefault(); setPage("home"); }}>Naar de onthaalpagina →</a>
      </p>
    </section>
  </div>
);

export const App = ({ initialPage }) => {
  const [page, setPageState] = React.useState(initialPage);
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0, behavior: "instant" });
    const r = ROUTES[page];
    if (r) document.title = r.title;
  }, [page]);

  React.useEffect(() => {
    const onPop = () => setPageState(pageFromPath(window.location.pathname) || "404");
    // Oude links zoals #wachtdienst binnen de site: doorsturen naar /wachtdienst/
    const onHash = () => {
      const id = window.location.hash.slice(1);
      if (ROUTES[id]) {
        window.history.replaceState({}, "", ROUTES[id].path);
        setPageState(id);
      }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const setPage = (p) => {
    if (!ROUTES[p]) return;
    if (window.location.pathname !== ROUTES[p].path) window.history.pushState({}, "", ROUTES[p].path);
    setPageState(p);
  };

  let body;
  if (page === "home") body = <HomePage setPage={setPage} />;
  else if (page === "diensten") body = <DienstenPage setPage={setPage} />;
  else if (page === "reservatie") body = <ReservatiePage />;
  else if (page === "wachtdienst") body = <WachtdienstPage setPage={setPage} />;
  else if (page === "links") body = <LinksPage />;
  else if (page === "info") body = <InfoPage />;
  else if (page === "beheer") body = <BeheerPage setPage={setPage} />;
  else if (page === "sorteerwijzer") body = <SorteerwijzerPage setPage={setPage} />;
  else body = <NotFoundPage setPage={setPage} />;

  return (
    <div className="app">
      <a className="skip-link" href="#inhoud">Naar inhoud</a>
      {page === "beheer" ? null : <ClosureBar setPage={setPage} />}
      <Header page={page} setPage={setPage} />
      <main className="main" id="inhoud" key={page}>{body}</main>
      <Footer setPage={setPage} />
    </div>
  );
};
