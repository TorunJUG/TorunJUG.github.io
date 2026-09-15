# Toruń JUG – strona internetowa

Statyczna strona Toruń Java User Group.

## Generowanie podstrony spotkania

Generator działa lokalnie w Node.js 20 lub nowszym i nie wymaga instalowania żadnych paczek. Dane spotkania są oddzielone od HTML-a:

- `data/meetings/meeting.example.json` – komplet danych przykładowego spotkania,
- `templates/spotkanie.html` – pierwsza wersja szablonu podstrony,
- `templates/spotkanie-v2.html` – druga wersja: prelekcje w dwóch kolumnach na desktopie, standardowy odtwarzacz YouTube i mobilny przycisk do nagrania,
- `scripts/generate-meeting.mjs` – generator i walidacja danych.

### Użycie

1. Skopiuj plik `data/meetings/meeting.example.json` pod nową nazwą, np. `data/meetings/91-moje-spotkanie.json`.
2. Uzupełnij numer, slug, tytuł, datę, prelekcje, profile prelegentów, Meetup i nawigację. Opisy prelekcji skopiuj z wydarzenia na Meetup. Każda prelekcja przyjmuje tablicę `speakers`, więc może mieć jednego lub kilku prelegentów.
3. Zdjęcia prelegentów (najlepiej kwadratowe, około 300 × 300 px) umieść w `static/media` i podaj w JSON-ie same nazwy plików.
4. Uruchom z katalogu głównego projektu:

```shell
node scripts/generate-meeting.mjs data/meetings/91-moje-spotkanie.json
```

Gotowy plik zostanie zapisany jako `spotkania/<slug>.html`. Istniejący plik o tej samej nazwie zostanie nadpisany, co pozwala ponownie wygenerować stronę po zmianie danych.

Domyślnie generator korzysta z pierwszej wersji szablonu. Aby wygenerować stronę w wersji `v2`, dodaj przełącznik:

```shell
node scripts/generate-meeting.mjs data/meetings/91-moje-spotkanie.json --template v2
```

Wszystkie przygotowane spotkania można wygenerować w PowerShellu jedną pętlą:

```powershell
Get-ChildItem data/meetings/[0-9][0-9]-*.json | ForEach-Object {
  node scripts/generate-meeting.mjs $_.FullName
}
```

Do prób można wskazać inne miejsce docelowe:

```shell
node scripts/generate-meeting.mjs data/meetings/meeting.example.json --output tmp/meeting-preview.html
```

`recordingUrl` ustawione na `null` wyświetla informację o braku nagrania. Po dodaniu adresu filmu z YouTube wariant `v1` osadza odtwarzacz z domeny `youtube-nocookie.com`, a wariant `v2` korzysta ze standardowej domeny `youtube.com`. W `v2` na ekranach o szerokości do 780 px odtwarzacz jest zastępowany przyciskiem prowadzącym do nagrania. Pole `status` przyjmuje: `scheduled`, `completed`, `cancelled` albo `postponed` i jest używane w danych Schema.org.

Generator tworzy wyłącznie podstronę szczegółów. Po jej dodaniu trzeba jeszcze ręcznie dodać kafelek do `index.html`, adres do `sitemap.xml` oraz uzupełnić nawigację w danych sąsiedniego spotkania.
