Apotheek Vansuyt — deploy
=========================

Deze map bevat maar een handvol bestanden. Alle styling en code zit in dat
ene index.html-bestand, dus er kan bijna niets meer ontbreken.

  index.html                     de volledige website
  robots.txt + sitemap.xml       voor Google
  assets/                        logo, favicon, Google-logo, deelafbeelding
  netlify.toml                   instellingen
  package.json                   nodig voor de serverfunctie
  netlify/functions/closures.mjs de serverfunctie voor de vakantieperiodes

Online zetten
-------------
1. github.com → New repository → naam "apotheek-vansuyt" → Create
2. "uploading an existing file" → sleep ALLES uit deze map erin
   (index.html, robots.txt, sitemap.xml, netlify.toml, package.json,
    de map assets én de map netlify) → Commit
3. Netlify → Add new site → Import an existing project → GitHub →
   kies de repo → Deploy
4. Build command en Publish directory leeg laten, Base directory leeg laten.

Beheer
------
  <uw-site>/#beheer     code: vansuyt29
  Hier beheert u zowel de vakantieperiodes als de Covid- en griepagenda.
  Beide worden centraal bewaard (API: /api/closures en /api/vacc).

Wijzigt u de code, dan moet ze op twee plaatsen gelijk zijn:
  - in index.html (zoek op BEHEER_PIN)
  - in netlify/functions/closures.mjs (bovenaan, CODE)
Netter: zet op Netlify onder Site configuration → Environment variables een
variabele BEHEER_CODE met uw code; de functie gebruikt dan die.

Belangrijk
----------
Deze index.html is een samengevoegde versie. Wijzigingen aan de website maak
ik in de bronmap (site/) en daarna maak ik dit bestand opnieuw — dit bestand
zelf is niet handmatig aan te passen.
