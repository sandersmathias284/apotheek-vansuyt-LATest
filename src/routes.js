// Eén adres per pagina. `id` is de interne naam die de componenten gebruiken
// (setPage("diensten")), `path` is het echte adres op de website.

export const ROUTES = {
  home: {
    path: "/",
    title: "Apotheek Vansuyt — buurtapotheek in Pervijze",
    description: "Buurtapotheek in Pervijze (Diksmuide). Voorschriften klaargemaakt terwijl u wacht, thuislevering in Veurne, Diksmuide en Nieuwpoort. Bel 051 55 52 64.",
  },
  diensten: {
    path: "/diensten/",
    title: "Diensten & vaccinaties — Apotheek Vansuyt",
    description: "Griep- en covidvaccinatie, thuislevering, inname-begeleiding, attestbeheer, thuiszorgmateriaal en fytotherapie bij Apotheek Vansuyt in Pervijze.",
  },
  reservatie: {
    path: "/reservatie/",
    title: "Bestelling plaatsen — Apotheek Vansuyt",
    description: "Stuur uw voorschrift door en haal het af in de apotheek, of laat het aan huis bezorgen in Pervijze en omstreken.",
  },
  wachtdienst: {
    path: "/wachtdienst/",
    title: "Apotheek van wacht — Apotheek Vansuyt",
    description: "Apotheek van wacht: apotheek.be of 0903 99 000. Huisarts van wacht: 1733. Levensgevaar: 112. Antigifcentrum: 070 245 245.",
  },
  links: {
    path: "/nuttige-links/",
    title: "Nuttige links — Apotheek Vansuyt",
    description: "Betrouwbare Belgische bronnen over geneesmiddelen, gezondheid, sport en reizen, geselecteerd door Apotheek Vansuyt.",
  },
  info: {
    path: "/contact/",
    title: "Contact & openingsuren — Apotheek Vansuyt",
    description: "Apotheek Vansuyt, Nieuwpoortstraat 29, 8600 Pervijze. Tel. 051 55 52 64. Open ma, di, do, vr 8:30–12:00 en 14:00–19:00, wo en za 8:30–12:00.",
  },
  sorteerwijzer: {
    path: "/sorteerwijzer/",
    title: "Sorteerwijzer vervallen geneesmiddelen — Apotheek Vansuyt",
    description: "Wat brengt u terug naar de apotheek, wat doet u thuis en wat hoort er niet bij? De sorteerwijzer voor oude en vervallen medicatie.",
  },
  beheer: {
    path: "/beheer/",
    title: "Beheer — Apotheek Vansuyt",
    description: "Beheerpagina van Apotheek Vansuyt.",
    noindex: true,
  },
};

export const PAGE_IDS = Object.keys(ROUTES);

export const hrefOf = (id) => (ROUTES[id] ? ROUTES[id].path : "/");

// Zoekt de pagina bij een adres. Onbekende adressen geven null (= 404).
export const pageFromPath = (pathname) => {
  const clean = (pathname || "/").replace(/\/index\.html$/, "/").replace(/\/?$/, "/");
  const hit = PAGE_IDS.find((id) => ROUTES[id].path === clean);
  return hit || null;
};
