# Propozycja: statyczne generowanie strony Toruń JUG

> Stan na 24.11.2026, po przejrzeniu repozytorium (commit `9c1282460`).

## TL;DR

**Eleventy (11ty) + istniejące pliki JSON + GitHub Actions jako źródło GitHub Pages.**

- Dane spotkań zostają w `data/meetings/*.json`, bo format jest już dobry.
- Z jednego zestawu danych generowane są: podstrony spotkań, kafelki „Ostatnie spotkania”, archiwum `/spotkania/`, nawigacja nowsze/starsze, `sitemap.xml`, statystyki, a później lista prelegentów i ich strony.
- Wygenerowanego HTML-a **nie trzymamy w repozytorium**. Buduje go GitHub Actions przy każdym `push` na `master` i od razu publikuje na Pages.
- Dodanie spotkania = jeden plik JSON (+ zdjęcie prelegenta) → commit → push. Nic więcej.

Jedna zależność (`@11ty/eleventy`), jeden plik konfiguracyjny, jeden plik workflow. Wszystkie dotychczasowe adresy URL zostają bez zmian.

---

## 1. Diagnoza: skąd się bierze chaos

Generator `scripts/generate-meeting.mjs` jest dobry (walidacja, Schema.org, escaping), ale tworzy **tylko jedną z czterech** rzeczy, które trzeba zaktualizować. Każde spotkanie wymaga dziś ręcznej edycji w kilku miejscach. Te same dane są skopiowane w wielu plikach, więc zaczynają się rozjeżdżać. Przykłady z obecnego stanu repozytorium:

| Miejsce | Problem |
|---|---|
| `index.html` – kafelek #91 | `<time datetime="2026-07-22">` przy tekście „28 października 2026” |
| `index.html` – lista | `<ol reversed start="90">`, a pierwsza pozycja to #91 |
| `spotkania/index.html` | brak spotkania #91 (archiwum kończy się na #90) |
| `spotkania/index.html` vs `index.html` | #90: „Nagrania jeszcze niedostępne” vs „2 nagrania” |
| `sitemap.xml` | brak `91-virtual-threads-private-ai-benchmarks.html` |
| `data/meetings/90-*.json` | `navigation.newer` trzeba dopisać ręcznie po dodaniu #91 |
| Statystyki w `index.html` | „90+ spotkań”, „150+ prelegentów” wpisane na sztywno |
| Zdjęcia prelegentów | generator wskazuje `static/speakers/`, Schema.org `static/media/`, a README każe wrzucać do `static/media` |
| Nagłówek i stopka | skopiowane w `index.html`, `spotkania/index.html`, 2 szablonach i `wydarzenia/*.html` (np. Google Analytics jest tylko w szablonie v2) |
| `data/youtube.json` | linki do nagrań istnieją osobno, niezależnie od `recordingUrl` w danych spotkań |

Wniosek: potrzebny jest **jeden build, który z danych generuje wszystko**, a nie kolejny skrypt do jednej podstrony.

---

## 2. Czy da się budować „przez GitHub Pages”?

Tak, na dwa sposoby:

1. **Wbudowany build Pages = tylko Jekyll.** Pages potrafi sam zbudować wyłącznie Jekylla, i to z ograniczoną listą wtyczek. Jekyll nie wygeneruje strony dla każdego rekordu z pliku JSON bez wtyczki spoza tej listy (np. `jekyll-datapage-generator`). Trzeba by przepisać spotkania na pliki Markdown z front matter w kolekcji `_meetings/` i lokalnie instalować Ruby. Do tego projektu się nie nadaje.
2. **GitHub Actions jako źródło Pages (zalecane).** W *Settings → Pages → Build and deployment → Source* wybieramy **GitHub Actions**. Workflow buduje stronę dowolnym narzędziem i publikuje artefakt. Nie ma gałęzi `gh-pages` ani commitowania wygenerowanych plików. Domena `torun.jug.pl` zostaje skonfigurowana w ustawieniach repozytorium.

Wygenerowanych plików **nie trzeba umieszczać w repozytorium**. W repo są tylko źródła: dane, szablony i zasoby.

---

## 3. Porównanie opcji

| Opcja | Plusy | Minusy | Ocena |
|---|---|---|---|
| **A. Eleventy 3** | Czyta JSON wprost; `pagination` tworzy stronę z każdego rekordu (spotkania, prelegenci); layouty i partiale usuwają duplikację nagłówka i stopki; serwer deweloperski z live reload; zero JS po stronie klienta; Node już jest w projekcie | 1 zależność npm; trzeba poznać składnię Nunjucks | ✅ **Rekomendacja** |
| B. Rozbudowa własnego `generate-meeting.mjs` | Zero zależności, pełna kontrola | Templating oparty na sklejaniu stringów rośnie szybko (index, archiwum, sitemap, prelegenci, partiale, dev server, watch); w praktyce powstaje własny mini-framework | Dobre wyjście awaryjne |
| C. Jekyll (natywny build Pages) | Brak CI | Patrz punkt 2: nie generuje stron z JSON-a; Ruby | ❌ |
| D. Hugo | Jeden plik binarny, bardzo szybki | Szablony Go są mniej przyjazne; strony z danych wymagają *content adapters*; obcy ekosystem dla obecnego kodu JS | Za dużo zmian naraz |
| E. Astro / Next | Komponenty, duży ekosystem | Za ciężkie jak na kilkanaście szablonów; dużo zależności | ❌ Przesada |

Eleventy jest najmniejszą zmianą, która rozwiązuje cały problem. Obecny HTML i CSS przenosimy do szablonów niemal 1:1. Walidację z `generate-meeting.mjs` przenosimy do loadera danych, więc błędny JSON zatrzymuje build i deploy.

---

## 4. Docelowa struktura repozytorium

```
.
├── .github/workflows/deploy.yml     # build + deploy na Pages
├── eleventy.config.js               # ~40 linii: katalogi, passthrough, filtry dat
├── package.json                     # "build", "start"
├── data/                            # ŹRÓDŁO PRAWDY – edytowane przez ludzi
│   ├── meetings/
│   │   ├── 91-virtual-threads-private-ai-benchmarks.json
│   │   └── ...
│   └── speakers/                    # (etap 3) jeden plik na prelegenta
│       ├── pawel-kowalski.json
│       └── ...
├── src/
│   ├── _data/
│   │   ├── meetings.js              # wczytuje data/meetings, waliduje, sortuje, liczy nav
│   │   ├── speakers.js              # (etap 3) wczytuje data/speakers + dołącza prelekcje
│   │   └── site.js                  # url, GA id, linki do social mediów
│   ├── _includes/
│   │   ├── layouts/base.njk         # <head>, nagłówek, stopka, GA – JEDEN raz
│   │   ├── layouts/meeting.njk
│   │   └── partials/meeting-card.njk
│   ├── index.njk                    # strona główna (kafelki z pętli)
│   ├── spotkania/
│   │   ├── index.njk                # archiwum – pełna lista z pętli
│   │   └── spotkanie.njk            # pagination → spotkania/<slug>.html
│   ├── prelegenci/                  # (etap 3)
│   │   ├── index.njk
│   │   └── prelegent.njk            # pagination → prelegenci/<id>.html
│   ├── wydarzenia/*.html            # na początku kopiowane bez zmian
│   ├── sitemap.njk                  # → sitemap.xml
│   ├── robots.txt, CNAME, styles.css, script.js
│   └── static/                      # media, speakers, game – passthrough
└── _site/                           # wynik buildu (w .gitignore)
```

Katalog `src/` jest potrzebny, bo Eleventy przetwarza pliki `.html` jako szablony. Oddzielenie źródeł od `scripts/`, `data/youtube*.json`, README itp. sprawia, że na stronę nie trafią przypadkowe pliki.

---

## 5. Kluczowe fragmenty

### 5.1 `package.json`

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "start": "eleventy --serve",
    "build": "eleventy"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.1.2"
  },
  "engines": { "node": ">=20" }
}
```

### 5.2 `eleventy.config.js`

```js
export default function (eleventyConfig) {
  for (const p of ["static", "styles.css", "script.js", "robots.txt", "CNAME", "wydarzenia"]) {
    eleventyConfig.addPassthroughCopy({ [`src/${p}`]: p });
  }

  const fmt = (opts) => (iso) =>
    new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", ...opts }).format(new Date(iso));
  eleventyConfig.addFilter("plDate", fmt({ day: "numeric", month: "long", year: "numeric" }));
  eleventyConfig.addFilter("plTime", fmt({ hour: "2-digit", minute: "2-digit", hour12: false }));
  eleventyConfig.addFilter("isoDay", (iso) => iso.slice(0, 10));
  eleventyConfig.addFilter("recordingsLabel", (n) =>
    n === 0 ? "Brak nagrań" : n === 1 ? "1 nagranie" : n < 5 ? `${n} nagrania` : `${n} nagrań`);

  return {
    dir: { input: "src", output: "_site" },
    htmlTemplateEngine: "njk",
  };
}
```

### 5.3 `src/_data/meetings.js`: dane, walidacja i wyliczenia w jednym miejscu

```js
import { readdir, readFile } from "node:fs/promises";
import { validateMeeting } from "../../scripts/lib/validate-meeting.js"; // wydzielone z generate-meeting.mjs

export default async function () {
  const dir = new URL("../../data/meetings/", import.meta.url);
  const files = (await readdir(dir)).filter((f) => /^\d+-.+\.json$/.test(f));
  const meetings = await Promise.all(
    files.map(async (f) => validateMeeting(JSON.parse(await readFile(new URL(f, dir), "utf8")), f)),
  );

  meetings.sort((a, b) => b.number - a.number); // najnowsze pierwsze
  meetings.forEach((m, i) => {
    m.newer = meetings[i - 1] ?? null;          // nawigacja wyliczana automatycznie
    m.older = meetings[i + 1] ?? null;
    m.recordings = m.talks.filter((t) => t.recordingUrl).length;
    m.speakerNames = m.talks.flatMap((t) => t.speakers.map((s) => s.name));
  });
  return meetings;
}
```

Pole `navigation` znika z JSON-ów. Nie trzeba też edytować poprzedniego spotkania po dodaniu nowego.

### 5.4 `src/spotkania/spotkanie.njk`: jedna podstrona na spotkanie

```njk
---
pagination:
  data: meetings
  size: 1
  alias: meeting
permalink: "spotkania/{{ meeting.slug }}.html"
layout: layouts/meeting.njk
eleventyComputed:
  title: "Toruń JUG #{{ meeting.number }} – {{ meeting.title }}"
---
```

Treść `layouts/meeting.njk` to obecny `templates/spotkanie-v2.html`, w którym `{{talks}}` zamieniamy na pętlę `{% for talk in meeting.talks %}`. Wybór v1/v2 może zostać jako pole w JSON-ie albo jako jeden wspólny wariant.

### 5.5 Kafelki na stronie głównej i w archiwum

```njk
<ol class="meetings-list" reversed start="{{ meetings[0].number }}">
  {% for meeting in meetings | head(10) %}
    <li>{% include "partials/meeting-card.njk" %}</li>
  {% endfor %}
</ol>
```

Ten sam partial działa w archiwum, bez `head(10)`. Liczniki statystyk to np. `{{ meetings[0].number }}`, a liczba prelegentów to `{{ speakers | length }}`.

### 5.6 `src/sitemap.njk`

```njk
---
permalink: sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://torun.jug.pl/</loc></url>
  <url><loc>https://torun.jug.pl/spotkania/</loc></url>
  {%- for m in meetings %}
  <url><loc>https://torun.jug.pl/spotkania/{{ m.slug }}.html</loc></url>
  {%- endfor %}
</urlset>
```

### 5.7 `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build          # błędny JSON = czerwony build = brak deployu
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Opcjonalnie można dodać drugi workflow na `pull_request`, który uruchamia tylko `npm run build`. Wtedy walidacja danych działa przed mergem.

---

## 6. Model danych prelegentów (etap 3)

Dziś bio i zdjęcie prelegenta są wpisane w prelekcję. Jeśli ktoś wystąpi drugi raz, dane się zduplikują i rozjadą. Proponuję wydzielić prelegentów:

`data/speakers/pawel-kowalski.json`
```json
{
  "name": "Paweł Kowalski",
  "bio": "Full-stack developer, ...",
  "photo": "pawel-kowalski.jpg",
  "links": { "linkedin": "https://...", "github": "https://..." }
}
```

Prelekcja w spotkaniu odwołuje się do prelegenta przez `id` (nazwę pliku):
```json
{ "title": "Virtual Threads: 101", "description": "...", "speakers": ["pawel-kowalski"], "recordingUrl": null }
```

`src/_data/speakers.js` wczytuje prelegentów i dołącza do każdego listę jego prelekcji (`talks: [{ meeting, title, recordingUrl }]`), przechodząc po `meetings`. Na tej podstawie powstają:

- `/prelegenci/`: lista alfabetyczna albo według liczby wystąpień,
- `/prelegenci/<id>.html`: bio, zdjęcie, linki, wszystkie prelekcje z nagraniami,
- link z podstrony spotkania do strony prelegenta,
- wiarygodna liczba „Prelegentów” w statystykach.

Migrację wykona jednorazowy skrypt: przejdzie po `data/meetings/*.json`, wyciągnie unikalnych prelegentów do `data/speakers/` i podmieni obiekty na `id`. `data/youtube.json` można przy okazji wykorzystać do uzupełnienia `recordingUrl` i usunąć.

Starsze spotkania (#1–#80) można dodawać stopniowo. Wystarczy minimalny JSON, bo strona generuje się z tego, co jest.

---

## 7. Plan wdrożenia (każdy etap da się osobno wdrożyć)

**Etap 0: szybkie poprawki (opcjonalnie, od razu)**
- poprawić `datetime` i `start` w kafelku #91, dodać #91 do archiwum i `sitemap.xml`. Po etapie 1 te poprawki i tak przestaną być potrzebne.

**Etap 1: build 1:1 (bez zmian wizualnych), ok. 1 wieczór**
1. `npm init`, instalacja Eleventy, `eleventy.config.js`, `_site/` w `.gitignore`.
2. Przeniesienie `index.html`, `styles.css`, `script.js`, `static/`, `wydarzenia/`, `CNAME`, `robots.txt` do `src/`.
3. Wydzielenie `layouts/base.njk` (head, nagłówek, stopka, GA) z obecnych stron.
4. `src/_data/meetings.js` + walidacja wydzielona z `generate-meeting.mjs`.
5. `spotkanie.njk` (pagination), partial kafelka, pętle w `index.njk` i `spotkania/index.njk`, `sitemap.njk`.
6. Kontrola: `npm start` lokalnie i porównanie `_site/` z obecnymi plikami (np. `git diff --no-index`).

**Etap 2: przełączenie deployu, ok. 15 min**
1. Dodanie `.github/workflows/deploy.yml`.
2. *Settings → Pages → Source: GitHub Actions*. Sprawdzić, czy domena `torun.jug.pl` nadal jest ustawiona.
3. Usunięcie z roota wygenerowanych plików (`spotkania/*.html`, stary `index.html` itp.), `templates/`, `scripts/generate-meeting.mjs`.
4. Aktualizacja README: „jak dodać spotkanie”.

**Etap 3: prelegenci**
- `data/speakers/`, skrypt migracyjny, `speakers.js`, strony `/prelegenci/`.

**Później (pomysły)**
- `"status": "scheduled"` → przycisk „Zobacz najbliższe spotkanie” prowadzi do konkretnego wydarzenia na Meetupie, a nie do listy.
- JSON Schema (`data/meeting.schema.json` + `"$schema"` w plikach), żeby VS Code podpowiadał pola i podkreślał błędy.
- Toruń JUG Day jako dane zamiast ręcznych stron w `wydarzenia/`.
- Generowanie obrazków OG per spotkanie (`@11ty/eleventy-img`).

---

## 8. Jak będzie wyglądało dodanie spotkania po zmianach

1. Skopiuj `data/meetings/meeting.example.json` do `data/meetings/92-<slug>.json` i uzupełnij dane.
2. Nowy prelegent: dodaj `data/speakers/<id>.json` i zdjęcie do `src/static/speakers/`.
3. Opcjonalnie podejrzyj zmiany lokalnie: `npm start` → http://localhost:8080.
4. `git commit` + `git push`. Po 1–2 minutach strona jest zaktualizowana: podstrona, kafelek na stronie głównej, archiwum, nawigacja, sitemap i statystyki.

Po spotkaniu wystarczy wpisać `recordingUrl` w JSON-ie i zrobić push.

---

## 9. Ryzyka i uwagi

- **Adresy URL**: `permalink` odtwarza dokładnie obecne ścieżki (`/spotkania/<slug>.html`, `/spotkania/`, `/wydarzenia/...`), więc SEO i linki z Meetupa nie ucierpią.
- **Minigra (`static/game/`)**: kopiowana bez przetwarzania (passthrough), działa jak dotąd.
- **Daty**: Node na runnerze GitHuba ma pełne ICU, więc formatowanie `pl-PL` i `Europe/Warsaw` działa tak samo jak lokalnie.
- **Edycja przez osoby nietechniczne**: plik JSON można edytować w przeglądarce na GitHubie (ikona ołówka → commit). Build i deploy uruchomią się same.
- **Rollback**: `git revert` + push albo ponowne uruchomienie poprzedniego workflow.
