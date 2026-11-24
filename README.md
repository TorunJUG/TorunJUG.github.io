# Toruń JUG – strona internetowa

Strona [torun.jug.pl](https://torun.jug.pl) Toruń Java User Group. Jest statyczna i generuje ją [Eleventy (11ty)](https://www.11ty.dev/) z danych w plikach JSON.

**W skrócie:** dane spotkań leżą w `data/meetings/*.json`. Po `git push` na `master` GitHub Actions buduje stronę i publikuje ją na GitHub Pages. Wygenerowanego HTML-a nie trzymamy w repozytorium.

Z jednego pliku JSON spotkania powstają automatycznie:

- podstrona `spotkania/<slug>.html`,
- kafelek w karuzeli „Ostatnie spotkania” na stronie głównej (10 najnowszych),
- pozycja w archiwum `spotkania/`,
- linki „Nowsze/Starsze spotkanie” między podstronami,
- wpis w `sitemap.xml` i dane strukturalne Schema.org,
- licznik „Spotkań” w statystykach na stronie głównej,
- wpis prelegenta na stronie `prelegenci/` (TOP 3 i ranking według liczby wystąpień).

---

## Wymagania

- [Node.js](https://nodejs.org/) 20 lub nowszy (zalecany 22, tej wersji używa CI),
- npm (instalowany razem z Node.js).

Pierwsze uruchomienie po sklonowaniu repozytorium:

```shell
npm install
```

Nie usuwaj pliku `.npmrc` (`legacy-peer-deps=true`). Bez niego npm 11 zapisuje w `package-lock.json` wpisy (m.in. `fsevents` tylko dla macOS), przez które `npm ci` w GitHub Actions kończy się błędem `EBADPLATFORM`. Po każdej zmianie zależności commituj zaktualizowany `package-lock.json`.

## Praca lokalnie

| Polecenie | Co robi |
|---|---|
| `npm start` | Buduje stronę i uruchamia serwer deweloperski z automatycznym odświeżaniem: **http://localhost:8080**. Po zapisaniu JSON-a, szablonu lub CSS przeglądarka sama się przeładuje. |
| `npm run build` | Czyści katalog `_site/` i buduje stronę produkcyjną, dokładnie tak jak GitHub Actions. |
| `npm run clean` | Usuwa katalog `_site/`. |

Port można zmienić: `npm start -- --port 8081`.

### Sprawdzenie przed wysłaniem

1. Uruchom `npm run build`. Jeśli build lokalnie się nie powiedzie, na GitHubie też się nie powiedzie i strona nie zostanie zaktualizowana. Komunikat wskaże plik i pole z błędem, np.:
   ```
   [11ty] 92-moje-spotkanie.json: pole „startDate” musi zawierać strefę czasową, np. 2026-09-23T18:00:00+02:00
   ```
2. Obejrzyj stronę przez `npm start`. Możesz też podejrzeć gotowy wynik buildu bez serwera deweloperskiego, np. `npx serve _site`.
3. Linki kanoniczne, `og:*`, Schema.org i `sitemap.xml` zawierają absolutne adresy `https://torun.jug.pl/...`, więc lokalnie prowadzą na produkcję. Tak ma być. Nawigacja po stronie używa linków względnych i działa lokalnie.

## Struktura repozytorium

```
.
├── .github/workflows/
│   ├── deploy.yml            # push na master → build → publikacja na GitHub Pages
│   └── check.yml             # pull request → sam build (walidacja danych)
├── data/
│   ├── meetings/             # ŹRÓDŁO PRAWDY: jeden plik JSON na spotkanie
│   │   ├── 91-virtual-threads-private-ai-benchmarks.json
│   │   └── meeting.example.json   # wzór do kopiowania (nie trafia na stronę)
│   └── youtube*.json         # lista nagrań z YouTube (pomocnicze, nie trafia na stronę)
├── scripts/
│   ├── lib/meeting.js        # walidacja i przygotowanie danych spotkania
│   └── extract-youtube-videos.mjs
├── src/                      # wszystko, co trafia na stronę
│   ├── _data/
│   │   ├── meetings.js       # wczytuje data/meetings, waliduje, sortuje, liczy nawigację
│   │   ├── speakers.js       # prelegenci zebrani ze spotkań, ranking według liczby wystąpień
│   │   └── site.js           # adres strony, ID Google Analytics, liczba kafelków itp.
│   ├── _includes/
│   │   ├── layouts/base.njk  # wspólny <head> (z Google Analytics) i nagłówek strony
│   │   └── partials/         # header.njk, meeting-card.njk
│   ├── index.njk             # strona główna
│   ├── spotkania/
│   │   ├── index.njk         # archiwum spotkań
│   │   └── spotkanie.njk     # szablon podstrony spotkania (jedna strona na plik JSON)
│   ├── prelegenci/index.njk  # lista prelegentów
│   ├── sitemap.njk           # → sitemap.xml
│   ├── wydarzenia/           # strony Toruń JUG Day (kopiowane bez zmian)
│   ├── static/               # media/, speakers/, game/ (kopiowane bez zmian)
│   ├── styles.css, script.js, robots.txt, CNAME
├── eleventy.config.js        # konfiguracja Eleventy
└── _site/                    # wynik buildu (w .gitignore, nie commitujemy)
```

Szablonami są tylko pliki `.njk` ([Nunjucks](https://mozilla.github.io/nunjucks/templating.html)). Wszystkie inne pliki z `src/` są kopiowane 1:1, zgodnie z listą w `eleventy.config.js`. Nowy plik lub katalog w `src/` (poza `.njk`) trzeba dopisać do tej listy, żeby trafił na stronę.

W szablonach dane są automatycznie escapowane. Surowy HTML trzeba wstawić jawnie filtrem `| safe`.

## Dodawanie spotkania

1. Skopiuj `data/meetings/meeting.example.json` do `data/meetings/<numer>-<slug>.json`, np. `data/meetings/92-kotlin-i-spring.json`. **Nazwa pliku musi być równa polu `slug` + `.json`**, a slug zaczyna się od numeru spotkania.
2. Uzupełnij dane (opis pól poniżej). Opisy prelekcji skopiuj z wydarzenia na Meetupie.
3. Zdjęcia prelegentów (najlepiej kwadratowe, ok. 300 × 300 px) wrzuć do `src/static/speakers/`, a w JSON-ie podaj samą nazwę pliku.
4. Sprawdź lokalnie: `npm start`.
5. `git commit` + `git push`. Po 1–2 minutach zmiana jest na stronie.

Nie trzeba niczego edytować ręcznie w `index.html`, archiwum, `sitemap.xml` ani w poprzednim spotkaniu.

Po spotkaniu wystarczy wpisać `recordingUrl` przy prelekcjach, zmienić `status` na `completed` i zrobić push.

Plik JSON można też edytować w przeglądarce na GitHubie (ikona ołówka → *Commit changes*). Build i publikacja uruchomią się same.

### Pola pliku spotkania

| Pole | Wymagane | Opis |
|---|---|---|
| `number` | tak | Numer spotkania (liczba całkowita). Wyznacza kolejność na liście. |
| `slug` | tak | Adres podstrony: małe litery ASCII, cyfry, myślniki; zaczyna się od `<number>-`. |
| `title` | tak | Tytuł spotkania (nagłówek podstrony i kafelka). |
| `description` | tak | Opis do `<meta name="description">`. |
| `startDate`, `endDate` | tak | ISO 8601 ze strefą czasową, np. `2026-09-23T18:00:00+02:00`. Ten sam dzień. |
| `status` | nie | `scheduled` (domyślnie), `completed`, `cancelled`, `postponed`. Używane w Schema.org i na kafelku. |
| `location.place`, `.address`, `.city` | tak | Miejsce spotkania. |
| `meetup.url`, `meetup.label` | tak | Link i etykieta przycisku do wydarzenia na Meetupie. |
| `talks[]` | tak | Co najmniej jedna prelekcja: `title`, `description`, `speakers[]`, `recordingUrl`. |
| `talks[].speakers[]` | tak | Prelegenci: `name`, `bio`, `photo` (nazwa pliku z `src/static/speakers/`). |
| `talks[].recordingUrl` | nie | Link do filmu na YouTube albo `null`. |
| `template` | nie | `v1` (domyślnie, odtwarzacz `youtube-nocookie.com`) lub `v2` (dwie kolumny na desktopie, przycisk do nagrania na telefonie). |
| `cardTitle` | nie | Inny tytuł na kafelku niż na podstronie. |
| `pageTitle`, `ogDescription`, `ogImage` | nie | Nadpisanie `<title>` i danych Open Graph. |

Nawigacji między spotkaniami **nie wpisujemy**, bo jest wyliczana z numerów.

### Prelegenci

Strona `prelegenci/` powstaje automatycznie z prelekcji we wszystkich plikach spotkań. Prelekcja z dwoma prelegentami liczy się każdemu z nich.

- **TOP 3:** najwięcej wystąpień. Przy remisie wyżej jest ten, kto wystąpił **najdawniej** (wcześniejsze spotkanie, a na tym samym spotkaniu wcześniejsza prelekcja).
- **Pozostali:** w grupach według liczby wystąpień, a przy tej samej liczbie od **najnowszego** wystąpienia do najstarszego.
- Tekst wstępu (historia JUG-a, liczby) jest w `src/prelegenci/index.njk`. Liczba spotkań wylicza się z danych, a „ponad 150 prelegentów” jest wpisane ręcznie, tak jak na stronie głównej.

- **Prelegent jest rozpoznawany po imieniu i nazwisku** (pole `name`). Przy kolejnym wystąpieniu wpisz je dokładnie tak samo, łącznie z polskimi znakami. Inaczej na liście pojawią się dwie osoby.
- Zdjęcie i bio na stronie prelegentów pochodzą z jego **najnowszego** wystąpienia.
- Każdy prelegent ma kotwicę `prelegenci/index.html#<imie-nazwisko>`, np. `#michal-szynkiewicz`. Nazwiska na podstronach spotkań prowadzą do tej kotwicy.
- Ranking obejmuje tylko spotkania, które mają plik w `data/meetings/`. Dopisanie starszych spotkań automatycznie uzupełni liczniki.

Napis na kafelku zależy od danych: „2 nagrania”, „Nadchodzące spotkanie” (dla `scheduled` bez nagrań) albo „Nagranie niedostępne / Nagrania niedostępne”.

## Deployment (GitHub Pages)

Strona jest publikowana przez **GitHub Actions** (`.github/workflows/deploy.yml`):

1. `push` na `master` (albo ręczne uruchomienie: *Actions → Deploy to GitHub Pages → Run workflow*),
2. `npm ci` + `npm run build`. Błąd w danych zatrzymuje workflow i strona się nie zmienia,
3. katalog `_site/` jest publikowany jako artefakt GitHub Pages.

Dla pull requestów `.github/workflows/check.yml` uruchamia sam build, więc błędy w danych widać przed mergem.

### Jednorazowa konfiguracja repozytorium

W ustawieniach repozytorium na GitHubie: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Następnie sprawdź, czy w tej samej sekcji domena *Custom domain* nadal ma wartość `torun.jug.pl` (plik `CNAME` jest też kopiowany do `_site/`).

> ⚠️ Dopóki źródłem Pages jest gałąź (*Deploy from a branch*), GitHub publikuje surową zawartość repozytorium, a w katalogu głównym nie ma już `index.html`. **Najpierw przełącz źródło na GitHub Actions, potem zrób push tych zmian** (albo zrób to od razu po pushu i uruchom workflow ręcznie).

### Wycofanie zmian

`git revert <commit>` + `git push`. Możesz też w zakładce *Actions* ponownie uruchomić (*Re-run all jobs*) deploy z wcześniejszego, poprawnego commita.

## Edycja wyglądu i treści stron

- Wspólny `<head>` (Google Analytics) i nagłówek z menu: `src/_includes/layouts/base.njk`, `src/_includes/partials/header.njk`.
- Kafelek spotkania (strona główna i archiwum): `src/_includes/partials/meeting-card.njk`.
- Podstrona spotkania: `src/spotkania/spotkanie.njk`.
- Strona prelegentów: `src/prelegenci/index.njk` (dane: `src/_data/speakers.js`).
- Treść strony głównej (O nas, liderzy, partnerzy, stopka): `src/index.njk`.
- Style i skrypty: `src/styles.css`, `src/script.js`.
- Ustawienia globalne (ID Google Analytics, liczba kafelków na stronie głównej): `src/_data/site.js`.

## Minigra

Pliki minigry są w `src/static/game/` i są kopiowane bez przetwarzania. Szczegóły: `src/static/game/MINIGRA.md`.
