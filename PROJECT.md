# Apotheek Vansuyt — website

Buurtapotheek, Nieuwpoortstraat 29, 8600 Pervijze · 051 55 52 64 · vansuytapotheek@gmail.com
Live: https://apotheek.netlify.app (Netlify, gekoppeld aan een GitHub-repo)

## Opbouw (sinds oktober 2026)

Zie README.md. Kort: broncode in `src/`, afbeeldingen in `public/assets/`,
serverfunctie in `netlify/functions/api.mjs`. Netlify bouwt bij elke push naar
GitHub (`npm run build`) en publiceert `dist/`. Elke pagina heeft een eigen
adres (`/diensten/`, `/contact/`, ...) met de inhoud al in de HTML. De oude
samengevoegde `index.html` van 2,8 MB is weg: Google las die niet verder dan
2 MB en toonde "Error: missing bundle data".

Lettertypen: Source Serif 4 (serif, cursieve accenten) + Geist (sans) + Geist Mono (labels).

## Functionaliteit

**Openingsuren** (Chrome.jsx `HOURS`): ma/di/do/vr 8:30–12:00 & 14:00–19:00, wo en za 8:30–12:00, zo gesloten. Header toont live open/gesloten.

**Sluitingsperiodes / vakantie** — `/beheer/`. De code wordt enkel op de server gecontroleerd (`/api/login`): env-variabele `BEHEER_CODE` op Netlify, zonder die variabele kan niemand bewaren. De app "Post maken" gebruikt dezelfde waarde als `WEBSITE_CODE`. Periodes worden centraal bewaard via `/api/closures` (Netlify Blobs) en zijn wereldwijd zichtbaar. Tijdens een periode: rode balk op elke pagina, aftelklok op de onthaalpagina, link naar de officiële wachtdienst. Periodes binnen 30 dagen worden vooraf aangekondigd. localStorage dient enkel als cache.

**Vaccinatieagenda** (Catalog.jsx): de site bewaart zelf niets meer. Data komen van de tablet-app van de eigenaar via `VACC_API` / `fetchVacc`; de site toont ze alleen. "Plaats reserveren" opent de externe boekingspagina:
- Covid → https://apotheekformulier.netlify.app/boeken.html?vaccin=covid
- Griep → https://apotheekformulier.netlify.app/boeken.html?vaccin=griep
Covid: vaste dagen, afspraak noodzakelijk. Griep: op zaterdag, andere dagen mits afspraak. Teksten over terugbetaling, bijwerkingen en misvattingen staan onder de griepkaart (aangeleverd door de eigenaar — niet herschrijven).

**Wachtdienst**: officieel portaal https://www.apotheek.be/pharmacysearch + 0903 99 000, huisarts van wacht 1733, spoed 112. De eigen "wachtwijzer" (apotheekvanwacht.netlify.app) is bewust van de site gehaald — die wil de eigenaar commercialiseren; nooit opnieuw toevoegen.

**Diensten**: elke dienstkaart heeft een actie met pijl (naar agenda, reservatie, bellen, of contactpagina).

**Reservatieformulier** (Other.jsx): verstuurt via Netlify Forms (formulier `bestelling`). Form detection en e-mailmelding moeten op Netlify aanstaan.

**Nieuws**: berichten uit de posting-app via `POST /api/berichten` (zie README.md); ook te beheren op `/beheer/`.

## Bewuste keuzes (niet terugdraaien)

- Geen erkenningsnummer, geen BTW-nummer, geen coördinaten in de footer.
- Maïté enkel als teamkaart onderaan de onthaalpagina; nergens anders vermeld.
- Portretten Sabine & Maïté: statische plaatshouders (initiaal) tot de echte foto's er zijn. Geen uploadslots voor bezoekers.
- Hero: witte achtergrond, interieurfoto (`assets/interieur-web.jpg`), geen stockfoto.
- Producten-pagina staat geparkeerd (code in Catalog.jsx, niet in navigatie).
- Semantische HTML (header/nav/main/section/article/footer, h-hiërarchie, aria-labels), toetsenbord-focus zichtbaar.

## Nog open

- Volledige naam en functie van Maïté (nu "Apotheker")
- Portretfoto's Sabine en Maïté
- Reservatieformulier aansluiten (e-mail + bevestiging naar patiënt)
- Pagina "Vervallen geneesmiddelen" (eigenaar levert inhoud/pictogrammen aan; eigen layout en stijl)
- Producten-pagina afwerken
- Eigen domeinnaam → dan canonical/Open Graph/Schema-URL's in index.html aanpassen
