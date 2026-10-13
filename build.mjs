// Bouwt de website naar dist/:
//   1. de code in één klein, geminimaliseerd bestand (productieversie van React)
//   2. per pagina een eigen index.html met de volledige inhoud al in de HTML,
//      zodat Google, Facebook en trage telefoons meteen alles zien
//   3. sitemap.xml, robots.txt, 404.html en de afbeeldingen
//
// Lokaal:   npm run build
// Netlify:  doet dit automatisch bij elke upload naar GitHub (zie netlify.toml).

import * as esbuild from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, "dist");
const TMP = join(ROOT, ".build");

// Netlify zet URL automatisch op het hoofdadres van de site. Koppelt u later
// apotheekvansuyt.be als hoofddomein, dan volgen canonical, sitemap en
// Open Graph vanzelf.
const SITE_URL = (process.env.SITE_URL || process.env.URL || "https://apotheek.netlify.app").replace(/\/+$/, "");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

await rm(DIST, { recursive: true, force: true });
await rm(TMP, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

// ---------- 1. Code + CSS voor de browser ----------
const client = await esbuild.build({
  entryPoints: { app: join(ROOT, "src/client.jsx"), styles: join(ROOT, "src/styles.css") },
  bundle: true,
  minify: true,
  format: "esm",
  target: ["es2019", "safari13"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  outdir: join(DIST, "assets"),
  entryNames: "[name]-[hash]",
  external: ["/assets/*"],
  metafile: true,
  logLevel: "warning",
});
const outputs = Object.keys(client.metafile.outputs).map((p) => "/" + p.replace(/\\/g, "/").replace(/^(.*\/)?dist\//, ""));
const appJs = outputs.find((p) => /\/assets\/app-[^/]+\.js$/.test(p));
const appCss = outputs.find((p) => /\/assets\/styles-[^/]+\.css$/.test(p));
if (!appJs || !appCss) throw new Error("Bundel niet gevonden: " + outputs.join(", "));

// ---------- 2. Pagina's vooraf genereren ----------
await esbuild.build({
  entryPoints: [join(ROOT, "src/server.jsx")],
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  packages: "external",
  outfile: join(TMP, "server.mjs"),
  logLevel: "warning",
});
const { renderPage } = await import(pathToFileURL(join(TMP, "server.mjs")).href);
const { ROUTES } = await import(pathToFileURL(join(ROOT, "src/routes.js")).href);

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Pharmacy",
      "@id": `${SITE_URL}/#apotheek`,
      name: "Apotheek Vansuyt",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/assets/logo-square.png`,
      image: `${SITE_URL}/assets/og-image.png`,
      telephone: "+32 51 55 52 64",
      email: "vansuytapotheek@gmail.com",
      priceRange: "€",
      address: { "@type": "PostalAddress", streetAddress: "Nieuwpoortstraat 29", postalCode: "8600", addressLocality: "Pervijze", addressRegion: "West-Vlaanderen", addressCountry: "BE" },
      geo: { "@type": "GeoCoordinates", latitude: 51.0938, longitude: 2.7869 },
      areaServed: ["Pervijze", "Diksmuide", "Veurne", "Nieuwpoort"],
      openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Thursday", "Friday"], opens: "08:30", closes: "12:00" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Thursday", "Friday"], opens: "14:00", closes: "19:00" },
        { "@type": "OpeningHoursSpecification", dayOfWeek: ["Wednesday", "Saturday"], opens: "08:30", closes: "12:00" },
      ],
    },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: "Apotheek Vansuyt", publisher: { "@id": `${SITE_URL}/#apotheek` }, inLanguage: "nl-BE" },
  ],
};

const page = ({ id, route, html }) => {
  const url = SITE_URL + route.path;
  const robots = route.noindex ? `\n<meta name="robots" content="noindex, nofollow" />` : "";
  const ld = id === "home" ? `\n<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>` : "";
  return `<!DOCTYPE html>
<html lang="nl-BE">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(route.title)}</title>
<meta name="description" content="${esc(route.description)}" />${robots}
${route.noindex ? "" : `<link rel="canonical" href="${esc(url)}" />\n`}<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
<link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192.png" />
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
<meta name="theme-color" content="#9E2C2C" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="nl_BE" />
<meta property="og:site_name" content="Apotheek Vansuyt" />
<meta property="og:title" content="${esc(route.title)}" />
<meta property="og:description" content="${esc(route.description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${SITE_URL}/assets/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />${ld}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300..700;1,8..60,300..700&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${appCss}" />
<script type="module" src="${appJs}"></script>
</head>
<body>
<div id="root">${html}</div>
</body>
</html>
`;
};

const written = [];
for (const [id, route] of Object.entries(ROUTES)) {
  const html = renderPage(id);
  const dir = join(DIST, route.path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), page({ id, route, html }));
  written.push(route.path);
}
await writeFile(
  join(DIST, "404.html"),
  page({ id: "404", route: { path: "/404", title: "Pagina niet gevonden — Apotheek Vansuyt", description: "Deze pagina bestaat niet.", noindex: true }, html: renderPage("404") }),
);

// ---------- 3. Sitemap, robots, afbeeldingen ----------
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.values(ROUTES).filter((r) => !r.noindex).map((r) => `<url><loc>${SITE_URL}${r.path}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`;
await writeFile(join(DIST, "sitemap.xml"), sitemap);
await writeFile(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /beheer/\nSitemap: ${SITE_URL}/sitemap.xml\n`);
await cp(join(ROOT, "public"), DIST, { recursive: true });

await rm(TMP, { recursive: true, force: true });

const size = async (p) => (await readFile(join(DIST, p))).length;
console.log(`Klaar voor ${SITE_URL}`);
console.log(`  ${written.length} pagina's: ${written.join(" ")}`);
console.log(`  ${appJs} (${Math.round((await size(appJs)) / 1024)} KB), ${appCss} (${Math.round((await size(appCss)) / 1024)} KB)`);
