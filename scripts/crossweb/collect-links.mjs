// Krok 1: zbiera linki do wszystkich wydarzeń cyklu Toruń JUG z crossweb.pl.
//
//   node scripts/crossweb/collect-links.mjs
//
// Wynik: data/crossweb/events-list.json – lista { url, slug, title, date, type, number },
// gdzie `number` to numer spotkania (null dla warsztatów, afterparty, networkingu itp.).
import { BASE_URL, LIST_FILE, LIST_URL, decodeEntities, fetchText, meetingNumber, slugFromUrl, stripTags, writeJson } from "./lib.mjs";

const html = await fetchText(LIST_URL);

// Lista jest pogrupowana w bloki miesięcy z nagłówkiem roku („monthbox-year”), a każde
// wydarzenie to wiersz „tab-row” z linkiem. Idziemy po dokumencie po kolei, żeby wiedzieć,
// w którym roku jest dany wiersz (w wierszu jest tylko dzień i miesiąc).
const tokens = /monthbox-year"><span>&nbsp;<\/span>(\d{4})|<div class="tab-row[^"]*">\s*<a class="clearfix[^"]*" href="([^"]+)">([\s\S]*?)<\/a>/g;

let year = null;
const events = new Map();
for (const match of html.matchAll(tokens)) {
  if (match[1]) {
    year = Number(match[1]);
    continue;
  }
  const url = new URL(match[2], BASE_URL).href;
  const row = match[3];
  const dayMonth = row.match(/<div class="num fl">\s*(\d{2})\.(\d{2})\s*</);
  const title = stripTags((row.match(/<div class="colTab title[^"]*">([\s\S]*?)<div class="topics/) || [])[1] ?? "");
  const type = stripTags((row.match(/<div class="colTab type[^"]*">([\s\S]*?)<\/div>/) || [])[1] ?? "");

  if (events.has(url)) continue;
  events.set(url, {
    url,
    slug: slugFromUrl(url),
    // Tytuł na liście bywa ucięty („…”); pełny tytuł pobiera krok 2.
    title: decodeEntities(title),
    date: dayMonth && year ? `${year}-${dayMonth[2]}-${dayMonth[1]}` : null,
    type: type || null,
    number: meetingNumber(title),
  });
}

const list = [...events.values()].sort(
  (a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || String(a.date).localeCompare(String(b.date)),
);
await writeJson(LIST_FILE, list);

const numbered = list.filter((event) => event.number !== null);
const numbers = new Set(numbered.map((event) => event.number));
const max = Math.max(...numbers);
const missing = [];
for (let n = 1; n <= max; n++) if (!numbers.has(n)) missing.push(n);

console.log(`Zapisano ${list.length} wydarzeń do ${LIST_FILE}`);
console.log(`Numerowane spotkania: ${numbered.length} (#${Math.min(...numbers)}–#${max})`);
console.log(`Brak w Crossweb: ${missing.length ? missing.map((n) => `#${n}`).join(", ") : "–"}`);
console.log(`Pozostałe wydarzenia (warsztaty, afterparty itp.): ${list.length - numbered.length}`);
