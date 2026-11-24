// Krok 2: na podstawie data/crossweb/events-list.json pobiera szczegóły każdego wydarzenia.
//
//   node scripts/crossweb/fetch-details.mjs [--all] [--delay 5000] [--refresh] [--only 60,61]
//
//   --all       pobierz też wydarzenia bez numeru (warsztaty, afterparty, networking);
//               domyślnie tylko numerowane spotkania
//   --delay ms  przerwa między zapytaniami do crossweb.pl (domyślnie 5000 ms)
//   --refresh   pobierz strony ponownie, ignorując cache
//   --only      tylko wybrane numery spotkań
//
// Surowy HTML jest zapisywany w data/crossweb/cache/<slug>.html (poza gitem), więc ponowne
// uruchomienie – np. po poprawce parsera – nie odpytuje serwisu jeszcze raz.
// Wynik: data/crossweb/events.json.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  BASE_URL, CACHE_DIR, DETAILS_FILE, LIST_FILE, decodeEntities, fetchText, htmlToText,
  meetingNumber, readJson, sleep, stripTags, writeJson,
} from "./lib.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const includeAll = args.includes("--all");
const refresh = args.includes("--refresh");
const delay = Number(option("--delay") ?? 5000);
const only = option("--only")?.split(",").map(Number);

let list;
try {
  list = await readJson(LIST_FILE);
} catch {
  console.error(`Brak ${LIST_FILE}. Najpierw uruchom: node scripts/crossweb/collect-links.mjs`);
  process.exit(1);
}

const selected = list.filter((event) =>
  only ? only.includes(event.number) : includeAll || event.number !== null,
);

async function loadPage(event) {
  const cacheFile = path.join(CACHE_DIR, `${event.slug}.html`);
  if (!refresh) {
    try {
      return { html: await readFile(cacheFile, "utf8"), cached: true };
    } catch {
      // brak w cache – pobieramy
    }
  }
  const html = await fetchText(event.url);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cacheFile, html, "utf8");
  return { html, cached: false };
}

/** Wyciąga dane z JSON-LD typu Event osadzonego na stronie wydarzenia. */
function eventJsonLd(html) {
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === "Event") return data;
    } catch {
      // uszkodzony JSON-LD – pomijamy
    }
  }
  return null;
}

/** Zawartość elementu <div class="…marker…"> z uwzględnieniem zagnieżdżonych <div>. */
function divContent(html, marker) {
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const open = html.indexOf(">", start) + 1;
  let depth = 1;
  const tag = /<(\/?)div\b[^>]*>/g;
  tag.lastIndex = open;
  for (let match; (match = tag.exec(html)); ) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return html.slice(open, match.index);
  }
  return null;
}

function parseEvent(event, html) {
  const ld = eventJsonLd(html) ?? {};
  const title = decodeEntities(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] ?? ld.name ?? event.title));
  const descriptionHtml = (divContent(html, 'class="event-desc__body') ?? "").trim();

  const links = [...descriptionHtml.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
    text: stripTags(m[2]),
    href: decodeEntities(m[1]),
  }));
  // Linki wpisane w opis jako zwykły tekst, np. „(https://www.youtube.com/…)”.
  const textUrls = [...htmlToText(descriptionHtml).matchAll(/https?:\/\/[^\s)"'<>]+/g)].map((m) => m[0]);

  const speakers = [...html.matchAll(/<a class="event-person" href="([^"]+)">[\s\S]*?<span class="event-person__name">([\s\S]*?)<\/span>/g)]
    .map((m) => ({ name: stripTags(m[2]), profileUrl: new URL(m[1], BASE_URL).href }));
  const performers = (ld.performer ?? []).map((p) => ({ name: p.name, profileUrl: p.url ?? null }));

  return {
    number: meetingNumber(title) ?? event.number,
    title,
    url: event.url,
    slug: event.slug,
    type: stripTags((html.match(/<span class="event-hero__type">([\s\S]*?)<\/span>/) || [])[1] ?? "") || event.type,
    startDate: ld.startDate ?? null,
    endDate: ld.endDate ?? null,
    eventStatus: ld.eventStatus ?? null,
    location: ld.location
      ? {
          name: ld.location.name?.trim() ?? null,
          street: ld.location.address?.streetAddress?.trim() ?? null,
          city: ld.location.address?.addressLocality?.trim() ?? null,
        }
      : null,
    image: ld.image ?? null,
    speakers: speakers.length ? speakers : performers,
    descriptionText: htmlToText(descriptionHtml),
    descriptionHtml,
    links: [...new Map([...links.map((l) => [l.href, l]), ...textUrls.map((u) => [u, { text: u, href: u }])]).values()],
  };
}

const results = [];
const failures = [];
for (const [index, event] of selected.entries()) {
  const label = `[${index + 1}/${selected.length}] ${event.number ? `#${event.number}` : event.slug}`;
  try {
    const { html, cached } = await loadPage(event);
    const details = parseEvent(event, html);
    results.push(details);
    console.log(`${label} ${cached ? "(cache)" : "pobrano"} – ${details.speakers.length} prelegentów, ${details.title}`);
    if (!cached && index < selected.length - 1) await sleep(delay);
  } catch (error) {
    failures.push({ url: event.url, error: error.message });
    console.error(`${label} BŁĄD: ${error.message}`);
  }
}

results.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || String(a.startDate).localeCompare(String(b.startDate)));
await writeJson(DETAILS_FILE, results);
console.log(`\nZapisano ${results.length} wydarzeń do ${DETAILS_FILE}`);
if (failures.length) {
  console.error(`Nie udało się pobrać ${failures.length}:`);
  for (const failure of failures) console.error(`  ${failure.url}: ${failure.error}`);
  process.exitCode = 1;
}
