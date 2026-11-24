// Krok 3: łączy dane z Crossweb (data/crossweb/events.json) i listę filmów z YouTube
// (data/youtube-videos-ytdlp.json, z `yt-dlp --flat-playlist -J`) w pliki spotkań
// data/meetings/<numer>-<slug>.json.
//
//   node scripts/import-meetings.mjs [--dry-run] [--overwrite-imported] [--only 1,32,57]
//
//   --dry-run             tylko raport, bez zapisywania plików spotkań
//   --overwrite-imported  nadpisz pliki wygenerowane wcześniej przez ten skrypt (z polem
//                         „importedFrom”); ręcznie przygotowanych plików skrypt nigdy nie zmienia
//   --only                tylko wybrane numery spotkań
//
// Raport z dopasowań, odrzuconych filmów i ostrzeżeń: data/meetings-import-report.md.
// Wygenerowane pliki to wersje robocze – warto je przejrzeć przed publikacją.
//
// ZASADA 1:1: tytuły i opisy prelekcji oraz bio prelegentów są przenoszone ze źródeł bez
// redakcji (bez skracania, poprawiania czy usuwania punktorów). Skrypt usuwa jedynie znaki
// będące częścią struktury źródła: cudzysłów otaczający tytuł, nagłówek „O prelegencie:”
// i imię z nazwiskiem otwierające bio („Imię Nazwisko – …”), bo nazwisko jest w polu „name”.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MEETINGS_DIR = path.join(root, "data", "meetings");
const CROSSWEB_FILE = path.join(root, "data", "crossweb", "events.json");
const YOUTUBE_FILE = path.join(root, "data", "youtube-videos-ytdlp.json");
const REPORT_FILE = path.join(root, "data", "meetings-import-report.md");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const overwriteImported = args.includes("--overwrite-imported");
const onlyIndex = args.indexOf("--only");
const only = onlyIndex === -1 ? null : args[onlyIndex + 1].split(",").map(Number);

// ---------------------------------------------------------------------------
// WIEDZA O KANALE YOUTUBE (@TorunJUG) – na podstawie przeglądu listy 198 filmów
// ---------------------------------------------------------------------------
//
// Formaty tytułów nagrań ze spotkań:
//   A) Toruń JUG #78 - "Flipper Zero: zabawka czy cyber broń?" - Krzysztof Polak      (2016–2025)
//   B) Toruń JUG #12 - Fork/Join Framework - Adam Chyła                              (#1–#24, bez cudzysłowu)
//   C) Toruń JUG #27 - "Software estimation tips" Wojciech Jaworski                  (#26–#28, bez myślnika)
//   D) Wielowątkowość | "Thread Pool i czas (...) - M. Nalepa | Toruń JUG #90         (od 2025, temat | tytuł | numer)
//   E) Toruń JUG #72 - JUG Day - "Inteligentny dom po taniości" - Mariusz Strzelecki  (JUG Day 2024 = spotkanie #72)
// Tytuły prelekcji bywają ucięte („...”, „(...)”), a prelegenci skróceni („M. Nalepa”,
// „Sz. Janikowski”) lub zdrobnieni („Arek”, „Sławek”, „Seba”).
//
// Nagranie ze spotkania = tytuł z „Toruń JUG #<numer>” (także „Torun JUG”) i żadna z reguł poniżej.
const MEETING_NUMBER = /\bToru[nń]\s*JUG\s*#\s*(\d{1,3})\b/i;

/** Filmy, które nie są nagraniami prelekcji ze spotkań. Kolejność bez znaczenia. */
const YOUTUBE_EXCLUDE_RULES = [
  { reason: "zapowiedź spotkania („X zaprasza na…”, „invites to…”)", test: (v) => /\bzaprasza\b|\binvites?\b|\bzaproszenie\b/i.test(v.title) },
  { reason: "trailer / zapowiedź (poniżej 3 minut)", test: (v) => (v.duration ?? 0) < 180 },
  { reason: "sesje projektu TorunJUG.getSrc()", test: (v) => /^\s*Toru[nń]JUG\.getSrc\(\)/i.test(v.title) },
  { reason: "Toruń Hackathorn – osobne wydarzenie", test: (v) => /hackath/i.test(v.title) },
  { reason: "Toruń JUG Day 2017 – osobne wydarzenie bez numeru (strona w src/wydarzenia)", test: (v) => /Toru[nń]\s*JUG\s*Day(?!\s*-)\s*(?:20\d\d|:)/i.test(v.title) },
  { reason: "prezentacja sponsora", test: (v) => /prezentacja\s+sponsora/i.test(v.title) },
  { reason: "podsumowanie działalności (wystąpienie organizatorów, nie prelekcja)", test: (v) => /podsumowanie\s+(?:\S+\s+){0,3}działalności/i.test(v.title) },
  // Uwaga: „Toruń JUG #24 - The Power of Networking” to prawdziwy lightning talk, dlatego
  // odrzucamy tylko wydarzenia „Toruń JUG Networking”, a nie każde słowo „networking”.
  { reason: "afterparty / networking / relacja", test: (v) => /after-?party|Toru[nń]\s*JUG\s+Networking|wideorelacja|relacja z/i.test(v.title) },
];

// ---------------------------------------------------------------------------
// WIEDZA O SPOTKANIACH
// ---------------------------------------------------------------------------

/** Spotkania opisane w Crossweb bez numeru albo z danymi, które trzeba nadpisać. */
const MEETING_OVERRIDES = {
  72: {
    title: "Toruń JUG Day 2024 – 10 lat Toruń JUG",
    startDate: "2024-05-18T14:00:00+02:00",
    endDate: "2024-05-18T23:00:00+02:00",
    location: { place: "Toruński Inkubator Technologiczny", address: "ul. Władysława Łokietka 5", city: "Toruń" },
    meetup: { url: "https://www.meetup.com/torun-jug/events/300358431", label: "Wydarzenie na Meetup" },
    crosswebUrl: "https://crossweb.pl/wydarzenia/torun-jug-day-24/",
    // Agenda 1:1 ze strony src/wydarzenia/torun-jug-day-2024.html (na YouTube tytuły są ucięte,
    // a prelekcja Jarka Pałki nie ma nagrania).
    agenda: [
      { title: "Niezapomniane przygody w krainie alokacji pamięci w JVM", speakers: ["Jarek Pałka"] },
      { title: "Zwinność nie jest pojęciem psychologicznym, a tworzenie softu nie jest sztuką", speakers: ["Adam Michalczyk"] },
      { title: "Inteligentny dom po taniości", speakers: ["Mariusz Strzelecki"] },
      { title: "10 lat ewolucji, czyli co Java ma wspólnego z ludzkim ciałem?", speakers: ["Szymon Stępniak"] },
    ],
  },
};

/** Sale, w których odbywały się spotkania (nazwy w Crossweb są niejednolite). */
const VENUES = [
  { test: /matematyki|wmii/i, place: "WMiI UMK", address: "ul. Chopina 12/18", city: "Toruń" },
  { test: /fizyki|wfaiis/i, place: "WFAiIS UMK", address: "ul. Grudziądzka 5/7", city: "Toruń" },
  { test: /inkubator/i, place: "Toruński Inkubator Technologiczny", address: "ul. Władysława Łokietka 5", city: "Toruń" },
];
// Gdy Crossweb podaje samo „Toruń”: do 2024 r. spotkania odbywały się na WMiI, od 2025 r. na WFAiIS.
const venueByDate = (date) => VENUES[date && date >= "2025-01-01" ? 1 : 0];

/** Zdrobnienia imion używane w tytułach filmów → pełne imię. */
const DIMINUTIVES = {
  arek: "Arkadiusz", sławek: "Sławomir", slawek: "Sławomir", seba: "Sebastian", tomek: "Tomasz",
  przemek: "Przemysław", wojtek: "Wojciech", jarek: "Jarosław", krzysiek: "Krzysztof",
  grzesiek: "Grzegorz", kuba: "Jakub", bartek: "Bartłomiej", maciek: "Maciej", michał: "Michał",
};

// ---------------------------------------------------------------------------
// Narzędzia
// ---------------------------------------------------------------------------

const fold = (text) =>
  text.toLowerCase().replaceAll("ł", "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const slugify = (text, max = 60) => {
  const slug = fold(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length <= max) return slug;
  return slug.slice(0, max).replace(/-[^-]*$/, "");
};
const words = (text) => fold(text).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((w) => w.length > 2);
const diacritics = (text) => (text.normalize("NFD").match(/[\u0300-\u036f]/g) ?? []).length + (text.match(/[łŁ]/g) ?? []).length;
const QUOTES = `"„“”«»`;
/** Usuwa wyłącznie cudzysłów otaczający cały tekst (np. tytuł z Crossweb lub YouTube). */
const unquote = (text) => text.trim().replace(new RegExp(`^[${QUOTES}]\\s*([\\s\\S]*?)\\s*[${QUOTES}]$`), "$1");
const isTruncated = (title) => /(\.\.\.|…|\(\.\.\.\))\s*\??$/.test(title) || /\(\.\.\.\)/.test(title);

/** Podobieństwo tytułów 0–1 (ucięty tytuł z YouTube porównywany z początkiem pełnego). */
function titleSimilarity(a, b) {
  const wa = words(a.replace(/\(\.\.\.\)|\.\.\.|…/g, " "));
  const wb = words(b);
  if (!wa.length || !wb.length) return 0;
  const sb = new Set(wb);
  const common = wa.filter((w) => sb.has(w)).length;
  return common / Math.min(wa.length, wb.length);
}

// ---------------------------------------------------------------------------
// Rejestr nazwisk: ujednolica „M. Nalepa”, „Arek Sokołowski”, „Artur Skowronski” itp.
// ---------------------------------------------------------------------------

const registry = new Map(); // klucz: nazwisko (fold) → Map(pełna nazwa → liczba wystąpień)
function registerName(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2 || /\.$/.test(parts[0]) || DIMINUTIVES[fold(parts[0])] && fold(parts[0]) !== "michał") return;
  const key = fold(parts.at(-1));
  if (!registry.has(key)) registry.set(key, new Map());
  const variants = registry.get(key);
  variants.set(name.trim(), (variants.get(name.trim()) ?? 0) + 1);
}

/** Zwraca pełne, ujednolicone imię i nazwisko. */
function resolveName(raw) {
  const name = raw
    .replace(/^([\p{Lu}][\p{Ll}]?\.)(?=[\p{Lu}])/u, "$1 ") // „J.Laskowski” → „J. Laskowski”
    .replace(/\s+/g, " ")
    .replace(/^[-–,\s]+|[-–,\s.]+$/g, "")
    .trim();
  const parts = name.split(" ");
  if (parts.length < 2) return name;
  let first = parts.slice(0, -1).join(" ");
  const last = parts.at(-1);
  first = DIMINUTIVES[fold(first)] ?? first;
  const variants = [...(registry.get(fold(last))?.entries() ?? [])];
  const initial = first.match(/^([\p{L}]{1,2})\.$/u)?.[1];
  const candidates = variants.filter(([full]) => {
    const f = fold(full.split(" ").slice(0, -1).join(" "));
    return initial ? f.startsWith(fold(initial)) : f === fold(first);
  });
  // Brak tej osoby w źródłach z pełnym imieniem – zostawiamy zapis 1:1 z tytułu filmu.
  if (candidates.length === 0) return name;
  // Ta sama osoba może być zapisana z polskimi znakami i bez – wybieramy wersję z większą
  // liczbą znaków diakrytycznych, a przy remisie najczęstszą.
  const distinct = new Set(candidates.map(([full]) => fold(full)));
  if (distinct.size > 1) return name;
  candidates.sort((a, b) => diacritics(b[0]) - diacritics(a[0]) || b[1] - a[1]);
  return candidates[0][0];
}

const splitSpeakers = (text) =>
  text
    .replace(/\b([\p{Lu}][\p{Ll}]?\.)(?=[\p{Lu}])/gu, "$1 ") // „J.Laskowski” → „J. Laskowski”
    .split(/\s*(?:&|,|\bi\b|\boraz\b|\band\b)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2);

// ---------------------------------------------------------------------------
// YouTube: filtr i parsowanie tytułów
// ---------------------------------------------------------------------------

function parseVideoTitle(title) {
  let rest = title.replace(/\s+/g, " ").trim();
  // Format D: „Temat | "Tytuł" - Prelegent | Toruń JUG #90”
  if (rest.includes("|")) {
    const parts = rest.split("|").map((p) => p.trim());
    rest = parts.find((p) => new RegExp(`^[${QUOTES}]`).test(p)) ?? parts[1] ?? rest;
  } else {
    rest = rest.replace(/^.*?Toru[nń]\s*JUG\s*#\s*\d+\s*[-–]?\s*/i, "");
  }
  rest = rest.replace(/^JUG Day\s*[-–]\s*/i, ""); // format E

  let talkTitle;
  let speakers;
  const quoted = rest.match(new RegExp(`^[${QUOTES}]\\s*(.+?)\\s*[${QUOTES}]\\s*(?:[-–]\\s*)?(.*)$`));
  if (quoted) {
    [, talkTitle, speakers] = quoted;
  } else if (new RegExp(`^[${QUOTES}]`).test(rest)) {
    // Niezamknięty cudzysłów: „"Thread Pool i czas czekania w kolejce (...) - M. Nalepa”
    const cut = rest.lastIndexOf(" - ");
    talkTitle = rest.slice(1, cut === -1 ? undefined : cut);
    speakers = cut === -1 ? "" : rest.slice(cut + 3);
  } else {
    const cut = rest.lastIndexOf(" - ");
    talkTitle = cut === -1 ? rest : rest.slice(0, cut);
    speakers = cut === -1 ? "" : rest.slice(cut + 3);
  }
  return { title: talkTitle.trim().replace(/[-–\s]+$/, ""), speakers: splitSpeakers(speakers) };
}

// ---------------------------------------------------------------------------
// Crossweb: wycinanie prelekcji z opisu
// ---------------------------------------------------------------------------

const TITLE_LINE = new RegExp(`^[•\\s]*[${QUOTES}]\\s*([^${QUOTES}]{3,200}?)\\s*(?:[${QUOTES}]\\s*[.!?]?)?\\s*$`);
const BIO_MARKER = /^O\s+prelegen(?:cie|tce|tach|tkach)\s*:?\s*(.*)$/i;

/** Dzieli opis na bloki prelekcji: { title, description, bio }. */
function parseDescription(text) {
  const blocks = [];
  let current = null;
  let pending = [];
  const close = () => {
    if (current) blocks.push(current);
    current = null;
  };
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const title = line.match(TITLE_LINE);
    const bio = line.match(BIO_MARKER);
    if (title && (!current || current.state === "bio" || current.desc.length > 0 || !current.title)) {
      close();
      current = { title: title[1].trim(), desc: [], bio: [], state: "desc" };
      pending = [];
    } else if (bio) {
      if (!current || current.state === "bio") {
        close();
        current = { title: null, desc: pending, bio: [], state: "desc" };
      }
      current.state = "bio";
      if (bio[1]) current.bio.push(bio[1]);
      pending = [];
    } else if (current) {
      current[current.state].push(line);
    } else {
      pending.push(line);
    }
  }
  close();
  // Tekst 1:1 – usuwamy tylko puste linie na początku i końcu bloku.
  const clean = (lines) => {
    const copy = [...lines];
    while (copy.length && !copy[0].trim()) copy.shift();
    while (copy.length && !copy.at(-1).trim()) copy.pop();
    return copy.join("\n");
  };
  return blocks.map((b) => ({ title: b.title, description: clean(b.desc), bio: clean(b.bio), hasBio: b.state === "bio" }));
}

/**
 * Agenda z początku opisu (nowsze spotkania): `• "Tytuł prelekcji" - Prelegent i Prelegent`.
 * Tytuł może zawierać własne cudzysłowy („software factory”), więc bierzemy wszystko do
 * ostatniego cudzysłowu przed myślnikiem.
 */
function parseAgenda(text) {
  const agenda = [];
  const pattern = new RegExp(`^[•\\s]*[${QUOTES}](.+)[${QUOTES}]\\s*[-–]\\s*(.+)$`);
  for (const line of text.split("\n")) {
    const match = line.trim().match(pattern);
    if (!match) continue;
    const speakers = splitSpeakers(match[2]);
    // Każdy „prelegent” musi wyglądać jak imię i nazwisko – odrzuca cytaty typu
    // „“I have stopped counting…” - was one of the responses to the tweet…”.
    const looksLikeNames = speakers.length > 0 && speakers.every((s) => /^(?:[\p{Lu}][\p{L}.-]*\s+){1,2}[\p{Lu}][\p{L}-]+$/u.test(s));
    if (looksLikeNames) agenda.push({ title: match[1].trim(), speakers });
  }
  return agenda;
}

/** Bio konkretnej osoby z sekcji „O prelegencie”: „Imię Nazwisko – bio”. */
function bioFor(name, bioText) {
  if (!bioText) return null;
  const surname = fold(name.split(" ").at(-1));
  const lines = bioText.split("\n");
  const startsPerson = (line) => /^[\p{Lu}][\p{L}-]+\s+[\p{Lu}][\p{L}-]+\s*[-–]/u.test(line.trim());
  const start = lines.findIndex((line) => fold(line.slice(0, 60)).includes(surname));
  if (start === -1) return null;
  // Bio tej osoby: od linii z jej nazwiskiem do linii, którą otwiera kolejna osoba („Imię Nazwisko –”).
  let end = start + 1;
  while (end < lines.length && !startsPerson(lines[end])) end++;
  const own = lines.slice(start, end);
  while (own.length && !own.at(-1).trim()) own.pop();
  // Jedyna zmiana: zdejmujemy „Imię Nazwisko – ” z początku, bo nazwisko jest w polu „name”.
  own[0] = own[0].replace(/^\s*(?:•\s*)?[^-–:]{3,60}?\s[-–:]\s*/, "");
  const text = own.join("\n");
  return text.trim() ? text : null;
}

const leadingName = (bioText) =>
  bioText?.match(/^\s*(?:•\s*)?([\p{Lu}][\p{L}-]+(?:\s+[\p{Lu}][\p{L}-]+){1,2})\s*[-–,(]/u)?.[1] ?? null;

// ---------------------------------------------------------------------------
// Wczytanie danych
// ---------------------------------------------------------------------------

// Część tytułów na YouTube (#61–#73) ma „ń” zapisane jako „n” + znak łączący (Unicode NFD),
// przez co nie pasują do wzorców – normalizujemy wszystko do NFC.
const readJsonNFC = async (file) =>
  JSON.parse(await readFile(file, "utf8"), (key, value) => (typeof value === "string" ? value.normalize("NFC") : value));
const crossweb = await readJsonNFC(CROSSWEB_FILE);
const youtube = (await readJsonNFC(YOUTUBE_FILE)).entries;

const existing = new Map(); // numer → { file, imported }
for (const file of await readdir(MEETINGS_DIR)) {
  const match = file.match(/^(\d+)-.+\.json$/);
  if (!match) continue;
  const data = JSON.parse(await readFile(path.join(MEETINGS_DIR, file), "utf8"));
  existing.set(Number(match[1]), { file, imported: Boolean(data.importedFrom) });
  if (!data.importedFrom) for (const talk of data.talks ?? []) for (const s of talk.speakers ?? []) registerName(s.name);
}
for (const event of crossweb) for (const s of event.speakers) registerName(s.name);

// Filtr YouTube
const excluded = [];
const videosByMeeting = new Map();
for (const video of youtube) {
  const number = Number(video.title.match(MEETING_NUMBER)?.[1]);
  const rule = YOUTUBE_EXCLUDE_RULES.find((r) => r.test(video));
  if (rule || !number) {
    excluded.push({ video, reason: rule?.reason ?? "brak numeru spotkania w tytule" });
    continue;
  }
  const parsed = parseVideoTitle(video.title);
  for (const s of parsed.speakers) registerName(s);
  if (!videosByMeeting.has(number)) videosByMeeting.set(number, []);
  videosByMeeting.get(number).push({ ...parsed, url: `https://www.youtube.com/watch?v=${video.id}`, rawTitle: video.title });
}

// ---------------------------------------------------------------------------
// Budowanie spotkań
// ---------------------------------------------------------------------------

const crosswebByNumber = new Map(crossweb.filter((e) => e.number).map((e) => [e.number, e]));
const numbers = [...new Set([...crosswebByNumber.keys(), ...videosByMeeting.keys(), ...Object.keys(MEETING_OVERRIDES).map(Number)])]
  .filter((n) => !only || only.includes(n))
  .sort((a, b) => a - b);

const report = { written: [], skipped: [], warnings: new Map() };
const warn = (number, message) => {
  if (!report.warnings.has(number)) report.warnings.set(number, []);
  report.warnings.get(number).push(message);
};

function meetingTitle(event, talks) {
  let title = event ? unquote(event.title) : "";
  title = title
    .replace(/^\s*\d+\.\s*(?:spotkanie\s+)?Toru[nń]\s*JUG\s*/i, "")
    .replace(/^\s*Toru[nń]\s*JUG\s*#\s*\d+\s*/i, "")
    .replace(/^[\s\-–:]+/, "")
    .replace(/^O\s+/, "")
    .replace(/\s+\+\s+/g, " i ")
    .trim();
  if (title.length >= 8 && !/[-–]\s*O$/.test(title)) return title.charAt(0).toUpperCase() + title.slice(1);
  const titles = talks.map((t) => t.title);
  if (titles.length <= 2) return titles.join(" i ");
  return `${titles.slice(0, 2).join(", ")} i ${titles.length - 2 === 1 ? "jedna prelekcja więcej" : `${titles.length - 2} kolejne prelekcje`}`;
}

for (const number of numbers) {
  const event = crosswebByNumber.get(number);
  const override = MEETING_OVERRIDES[number] ?? {};
  const videos = videosByMeeting.get(number) ?? [];
  const blocks = event ? parseDescription(event.descriptionText) : [];
  const knownSpeakers = (event?.speakers ?? []).map((s) => resolveName(s.name));

  // Agenda (tytuł + wszyscy prelegenci) z nadpisań albo z początku opisu w Crossweb.
  const agenda = override.agenda ?? (event ? parseAgenda(event.descriptionText) : []);
  const usedAgenda = new Set();
  const surnameOf = (name) => fold(name.split(" ").at(-1));
  const allBios = blocks.map((b) => b.bio).filter(Boolean).join("\n");
  /** Pozycja agendy pasująca do prelekcji – po tytule lub nazwisku prelegenta. */
  const takeAgenda = (title, names) => {
    let best = -1;
    let bestScore = 0;
    agenda.forEach((entry, index) => {
      if (usedAgenda.has(index)) return;
      const bySpeaker = names.some((n) => entry.speakers.some((s) => surnameOf(s) === surnameOf(n))) ? 0.6 : 0;
      const byTitle = title ? titleSimilarity(title, entry.title) : 0;
      if (bySpeaker + byTitle > bestScore) [best, bestScore] = [index, bySpeaker + byTitle];
    });
    if (bestScore < 0.5) return null;
    usedAgenda.add(best);
    return agenda[best];
  };
  const speakerEntries = (names, bio) =>
    names.map((name) => ({ name, bio: bioFor(name, bio) ?? bioFor(name, allBios) }));

  // 1. Prelekcje z nagrań, dopasowane do bloków opisu z Crossweb i do agendy.
  const usedBlocks = new Set();
  const talks = videos.map((video) => {
    let speakers = video.speakers.map(resolveName);
    let best = null;
    let bestScore = 0;
    blocks.forEach((block, index) => {
      if (usedBlocks.has(index)) return;
      const haystack = fold(`${block.bio}\n${block.description}`);
      const bySpeaker = speakers.some((s) => haystack.includes(surnameOf(s))) ? 0.6 : 0;
      const byTitle = block.title ? titleSimilarity(video.title, block.title) : 0;
      const score = bySpeaker + byTitle;
      if (score > bestScore) [best, bestScore] = [index, score];
    });
    const block = bestScore >= 0.5 ? blocks[best] : null;
    if (block) usedBlocks.add(best);
    const entry = takeAgenda(block?.title ?? video.title, speakers);
    // Agenda zna wszystkich współprelegentów (w tytule filmu bywa tylko jeden).
    if (entry && entry.speakers.length > speakers.length) speakers = entry.speakers.map(resolveName);
    // Tytuł 1:1: z opisu w Crossweb, potem z agendy, a na końcu z YouTube.
    const title = block?.title ?? entry?.title ?? video.title;
    if (!block?.title && !entry && isTruncated(title)) warn(number, `ucięty tytuł prelekcji z YouTube: „${title}”`);
    if (!speakers.length) warn(number, `nie rozpoznano prelegenta w tytule filmu: „${video.rawTitle}”`);
    return {
      title: unquote(title),
      description: block?.description || null,
      speakers: speakerEntries(speakers, block?.bio),
      recordingUrl: video.url,
    };
  });

  // Diagnostyka: DEBUG_MEETING=31 node scripts/import-meetings.mjs --dry-run --only 31
  if (Number(process.env.DEBUG_MEETING) === number) {
    console.error(JSON.stringify({ number, knownSpeakers, agenda, blocks, videos, usedBlocks: [...usedBlocks] }, null, 2));
  }

  // 2. Prelekcje opisane w Crossweb, ale bez nagrania.
  blocks.forEach((block, index) => {
    if (usedBlocks.has(index)) return;
    const taken = new Set(talks.flatMap((t) => t.speakers.map((s) => surnameOf(s.name))));
    let name = leadingName(block.bio);
    if (name) name = resolveName(name);

    // Blok „O prelegencie” osoby, która ma już prelekcję (np. współprelegent) – tylko uzupełniamy bio.
    if (!block.title && name && taken.has(surnameOf(name))) {
      for (const talk of talks) for (const s of talk.speakers) if (surnameOf(s.name) === surnameOf(name)) s.bio ??= bioFor(s.name, block.bio);
      return;
    }
    const entry = takeAgenda(block.title, name ? [name] : []);
    // Bez nagrania, bez agendy i bez sekcji „O prelegencie” to zwykle cytat lub lista (np. książek).
    if (!block.hasBio && !entry) {
      if (block.title) warn(number, `pominięto cytat z opisu bez sekcji „O prelegencie” i bez nagrania: „${block.title}”`);
      return;
    }
    const title = block.title ?? entry?.title;
    if (!title) {
      warn(number, `pominięto sekcję „O prelegencie” bez tytułu prelekcji${name ? ` (${name})` : ""}`);
      return;
    }
    let names = entry ? entry.speakers.map(resolveName) : name ? [name] : [];
    if (!names.length) {
      const free = knownSpeakers.filter((s) => !taken.has(surnameOf(s)));
      if (free.length === 1) names = free;
    }
    if (!names.length) {
      warn(number, `pominięto prelekcję bez rozpoznanego prelegenta: „${title}”`);
      return;
    }
    talks.push({
      title: unquote(title),
      description: block.description || null,
      speakers: speakerEntries(names, block.bio),
      recordingUrl: null,
    });
  });

  // 3. Prelekcje z agendy, których nie ma ani na YouTube, ani w szczegółach opisu.
  agenda.forEach((entry, index) => {
    if (usedAgenda.has(index)) return;
    talks.push({ title: unquote(entry.title), description: null, speakers: speakerEntries(entry.speakers.map(resolveName), ""), recordingUrl: null });
  });

  if (talks.length === 0) {
    report.skipped.push({ number, reason: "brak prelekcji w Crossweb i na YouTube" });
    continue;
  }

  const startDate = override.startDate ?? event?.startDate ?? null;
  let endDate = override.endDate ?? event?.endDate ?? null;
  if (startDate && !endDate) {
    // Crossweb nie podaje godziny zakończenia – spotkania trwają standardowo 2 godziny.
    const [, date, hour, rest] = startDate.match(/^(.*T)(\d{2})(:.*)$/);
    endDate = `${date}${String(Number(hour) + 2).padStart(2, "0")}${rest}`;
  }
  if (!startDate) warn(number, "brak daty spotkania (nie ma go w Crossweb) – uzupełnij startDate/endDate");

  const venue = override.location ?? (() => {
    if (!event?.location && !startDate) return null;
    const known = VENUES.find((v) => v.test.test(`${event?.location?.name ?? ""} ${event?.location?.street ?? ""}`)) ?? venueByDate(startDate);
    return { place: known.place, address: known.address, city: known.city };
  })();

  const title = override.title ?? meetingTitle(event, talks);
  const slug = `${number}-${slugify(title)}`;
  const crosswebUrl = override.crosswebUrl ?? event?.url ?? null;

  const meeting = {
    number,
    slug,
    title,
    description: `Toruń JUG #${number}: ${talks.map((t) => t.title).join(" · ")}`.slice(0, 300),
    ...(startDate ? { startDate, endDate } : {}),
    status: startDate && new Date(startDate) > new Date() ? "scheduled" : "completed",
    ...(venue ? { location: venue } : {}),
    ...(override.meetup ? { meetup: override.meetup } : crosswebUrl ? { meetup: { url: crosswebUrl, label: "Opis wydarzenia w Crossweb" } } : {}),
    talks: talks.map((talk) => ({
      title: talk.title,
      ...(talk.description ? { description: talk.description } : {}),
      speakers: talk.speakers.map((s) => ({ name: s.name, ...(s.bio ? { bio: s.bio } : {}) })),
      recordingUrl: talk.recordingUrl,
    })),
    importedFrom: {
      crossweb: crosswebUrl,
      youtube: videos.length,
      generatedAt: new Date().toISOString().slice(0, 10),
    },
  };

  const current = existing.get(number);
  if (current && !current.imported) {
    report.warnings.delete(number); // ręcznie przygotowanego pliku i tak nie zmieniamy
    report.skipped.push({ number, reason: `istnieje ręcznie przygotowany plik ${current.file}` });
    continue;
  }
  if (current && current.imported && !overwriteImported) {
    report.skipped.push({ number, reason: `istnieje wygenerowany plik ${current.file} (użyj --overwrite-imported)` });
    continue;
  }
  if (!dryRun) {
    if (current && current.file !== `${slug}.json`) {
      const { unlink } = await import("node:fs/promises");
      await unlink(path.join(MEETINGS_DIR, current.file));
    }
    await writeFile(path.join(MEETINGS_DIR, `${slug}.json`), `${JSON.stringify(meeting, null, 2)}\n`, "utf8");
  }
  report.written.push({ number, file: `${slug}.json`, talks: meeting.talks.length, recordings: talks.filter((t) => t.recordingUrl).length, blocks: blocks.length, matched: usedBlocks.size });
}

// ---------------------------------------------------------------------------
// Raport
// ---------------------------------------------------------------------------

const lines = [
  "# Raport importu spotkań",
  "",
  `Wygenerowano: ${new Date().toISOString().slice(0, 16).replace("T", " ")}${dryRun ? " (tryb --dry-run, bez zapisu plików)" : ""}`,
  "",
  `- zapisane spotkania: ${report.written.length}`,
  `- pominięte: ${report.skipped.length}`,
  `- odrzucone filmy z YouTube: ${excluded.length} z ${youtube.length}`,
  "",
  "## Zapisane spotkania",
  "",
  "| # | Plik | Prelekcje | Nagrania | Bloki opisu Crossweb (dopasowane) |",
  "|---|---|---|---|---|",
  ...report.written.map((w) => `| ${w.number} | ${w.file} | ${w.talks} | ${w.recordings} | ${w.blocks} (${w.matched}) |`),
  "",
  "## Ostrzeżenia do ręcznego sprawdzenia",
  "",
  ...([...report.warnings.entries()].sort((a, b) => a[0] - b[0]).flatMap(([n, list]) => list.map((m) => `- #${n}: ${m}`))),
  "",
  "## Pominięte spotkania",
  "",
  ...report.skipped.map((s) => `- #${s.number}: ${s.reason}`),
  "",
  "## Odrzucone filmy z YouTube",
  "",
  "| Powód | Film |",
  "|---|---|",
  ...excluded.map(({ video, reason }) => `| ${reason} | [${video.title.replaceAll("|", "\\|")}](https://www.youtube.com/watch?v=${video.id}) |`),
  "",
];
await writeFile(REPORT_FILE, lines.join("\n"), "utf8");

console.log(`Zapisane: ${report.written.length}, pominięte: ${report.skipped.length}, odrzucone filmy: ${excluded.length}/${youtube.length}`);
console.log(`Ostrzeżenia: ${[...report.warnings.values()].flat().length}. Raport: ${path.relative(root, REPORT_FILE)}`);
