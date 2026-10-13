# Apotheek Vansuyt — website

Buurtapotheek, Nieuwpoortstraat 29, 8600 Pervijze · 051 55 52 64

## Hoe het werkt

Elke upload (push) naar GitHub zet Netlify automatisch online. Netlify voert
`npm run build` uit (zie `netlify.toml`) en publiceert de map `dist/`.

De build maakt per pagina een eigen adres met de volledige inhoud al in de
HTML, zodat Google en Facebook alles meteen kunnen lezen:

| Pagina | Adres |
|---|---|
| Onthaal | `/` |
| Diensten & vaccinaties | `/diensten/` |
| Bestelling plaatsen | `/reservatie/` |
| Wachtdienst | `/wachtdienst/` |
| Nuttige links | `/nuttige-links/` |
| Contact | `/contact/` |
| Sorteerwijzer | `/sorteerwijzer/` |
| Beheer (niet in Google) | `/beheer/` |

Oude links zoals `/#diensten` sturen vanzelf door naar het nieuwe adres.

## Mappen

```
src/                 broncode (React)
  routes.js          adressen, titels en beschrijvingen per pagina
  components/        header, footer, sluitingen, nieuws, iconen
  pages/             de pagina's
  styles.css         alle opmaak
public/assets/       logo, favicons, foto's
netlify/functions/   api.mjs — serverfunctie (sluitingen, login, berichten)
build.mjs            bouwscript
```

Lokaal bouwen: `npm install` en daarna `npm run build`.

## Instellingen op Netlify

- **BEHEER_CODE** (Site configuration → Environment variables, als secret):
  de code voor `/beheer/` en voor de app "Post maken". Zonder deze variabele
  kan niemand iets bewaren. De app "Post maken" (Netlify-site `post-maken`)
  heeft dezelfde waarde nodig in **WEBSITE_CODE**.
- **Forms**: zet *form detection* aan (Forms → Enable). Stel onder
  Forms → bestelling → Notifications een e-mailmelding in, anders komen
  bestellingen enkel in het Netlify-dashboard terecht.

## Nieuws (berichten op de onthaalpagina)

De posting-app stuurt een bericht naar de website met:

```
POST /api/berichten
X-Beheer-Code: <BEHEER_CODE>
Content-Type: application/json

{
  "titel": "De griepprik kan weer",             (optioneel)
  "tekst": "Elke zaterdag, andere dagen op afspraak.",
  "foto": "data:image/jpeg;base64,...",          (optioneel: data-URL of https-link, max 4 MB)
  "fotoAlt": "Beschrijving van de foto",         (optioneel)
  "knop": { "label": "Plaats reserveren", "url": "https://..." },   (optioneel)
  "facebookUrl": "https://www.facebook.com/...",  (optioneel)
  "vastgezet": false,                             (optioneel: bovenaan houden)
  "verloopt": "2026-12-31T23:59:59"               (optioneel: daarna verdwijnt het)
}
```

- `GET /api/berichten` — wat de website toont (nieuwste eerst, vastgezette bovenaan)
- `DELETE /api/berichten/<id>` — bericht weghalen (met dezelfde header)

Zonder berichten toont de onthaalpagina geen nieuwsblok. Op `/beheer/` kan je
ook zelf berichten plaatsen en verwijderen.
