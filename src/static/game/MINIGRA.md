# Minigra „Piernikowy Quest” — specyfikacja easter egga

## 1. Cel

Na stronie Toruń JUG powstanie ukryta, niewielka gra przeglądarkowa w stylu klasycznych gier RPG Maker. Bohaterem będzie postać znana z favicony strony. Zadaniem gracza będzie poruszanie się po kafelkowej mapie 2D i zebranie 10 pierników, które przy każdym rozpoczęciu rozgrywki pojawią się w losowych, osiągalnych miejscach.

Gra ma pozostać easter eggiem: strona nie będzie prezentować przycisku ani instrukcji prowadzącej do jej uruchomienia.

## 2. Stan obecny strony

- Strona jest statyczna i nie korzysta z bundlera ani frameworka frontendowego.
- Wspólna logika znajduje się w `script.js`, a wspólne style w `styles.css`.
- Logo navbara ma klasę `.brand-logo` i znajduje się wewnątrz `.site-header .brand`.
- `script.js` jest używany na stronie głównej, stronie listy spotkań oraz podstronach spotkań i wydarzeń.
- Logo ma już obsługę animacji po najechaniu kursorem (`logo_mini.png` jest chwilowo zamieniane na `logo_mini_animated.gif`). Mechanizm uruchamiający grę może działać obok tej animacji.
- Mobilny układ nawigacji zaczyna się przy szerokości `960px`, dlatego minigra powinna uznawać za desktop ekran od `961px` wzwyż.
- Źródłem wyglądu bohatera jest `static/media/favicon.ico`.

## 3. Ustalone zachowanie użytkownika

1. Użytkownik korzysta z urządzenia desktopowego.
2. Najeżdża kursorem na logo w navbarze i trzyma go na nim nieprzerwanie przez 10 sekund.
3. Przez pierwsze 5 sekund logo zachowuje zwykły wygląd.
4. Po 5 sekundach jego obramowanie staje się paskiem postępu, który przez następne 5 sekund wypełnia się zgodnie z ruchem wskazówek zegara od 0 do 100%.
5. Po upływie pełnych 10 sekund natychmiast pojawia się pełnoekranowa warstwa ładowania.
6. Dopiero w tym momencie przeglądarka rozpoczyna pobieranie kodu gry, jej stylów i dodatkowych grafik.
7. Po załadowaniu zasobów ekran ładowania przechodzi w trzysekundowy ekran tytułowy „Piernikowy Quest”.
8. Litery napisu zjeżdżają kolejno z góry ekranu; „Piernikowy” znajduje się w pierwszym wierszu, a „Quest” w drugim, przesuniętym w prawo.
9. Po 3 sekundach ekran tytułowy znika i odsłania ekran startowy z krótką instrukcją.
10. Gracz rozpoczyna rozgrywkę i porusza bohaterem po mapie.
11. Zebranie dziesiątego piernika kończy grę i pokazuje ekran zwycięstwa z czasem rozgrywki.
12. Gracz może rozpocząć nową grę albo zamknąć easter egg i wrócić do strony w stanie sprzed jego uruchomienia.

Easter egg będzie dostępny na każdej podstronie, która używa wspólnego `script.js` i ma logo w nagłówku. Selektor musi wskazywać wyłącznie logo navbara (`.site-header .brand-logo`), a nie podobne logo w stopce.

## 4. Warunek „desktop”

Nie należy rozpoznawać desktopu tylko na podstawie `window.innerWidth`. Warunek powinien łączyć szerokość strony z faktycznymi możliwościami urządzenia wskazującego:

```js
window.matchMedia(
  "(min-width: 961px) and (hover: hover) and (pointer: fine)"
)
```

Dzięki temu gra nie uruchomi się na telefonie lub tablecie, nawet gdy urządzenie raportuje szeroki viewport. Zdarzenie inicjujące powinno dodatkowo pochodzić od myszy (`pointerType === "mouse"`).

Timer 10 sekund:

- startuje przy `pointerenter` nad logo w navbarze;
- po 5 sekundach uruchamia wizualny wskaźnik oparty na `conic-gradient`, aktualizowany przez `requestAnimationFrame` od 0 do 100% w ciągu kolejnych 5 sekund;
- jest anulowany przy `pointerleave`, utracie fokusu okna, ukryciu karty albo utracie zgodności z warunkiem desktopowym;
- anulowanie usuwa obramowanie postępu i zeruje jego wartość;
- po anulowaniu kolejna próba zaczyna pełne odliczanie od początku;
- uruchamia grę najwyżej raz w danej chwili, aby wielokrotne eventy nie utworzyły kilku warstw;
- nie jest zapisywany w `localStorage` ani `sessionStorage`, więc easter egg można odkryć ponownie podczas następnej wizyty;
- nie blokuje zwykłego kliknięcia logo ani istniejącej animacji hover.

## 5. Ładowanie na żądanie

Do głównego `script.js` trafi wyłącznie mały loader odpowiedzialny za wykrycie hoveru i stworzenie początkowej warstwy ładowania. Nie należy wcześniej używać `preload`, `prefetch`, service workera ani ukrytego pobierania assetów gry.

Po 10 sekundach loader powinien:

1. utworzyć pełnoekranowy ekran ładowania z minimalnymi stylami osadzonymi przez loader;
2. zablokować przewijanie dokumentu;
3. utworzyć iframe wskazujący na `static/game/game.html`;
4. pozwolić dokumentowi w iframe wczytać lokalny klasyczny build LittleJS, arkusz stylów, skrypty gry i grafikę;
5. czekać na komunikat `ready` wysłany przez grę przez `postMessage()`;
6. zamienić ekran ładowania na grę dopiero po przygotowaniu wszystkich wymaganych obrazów;
7. w razie błędu lub przekroczenia limitu czasu pokazać czytelny komunikat oraz przycisk „Wróć do strony”.

Adres dokumentu gry powinien być wyznaczany względem adresu głównego `script.js`, a nie względem bieżącego dokumentu. Jest to ważne, ponieważ ten sam skrypt działa zarówno w katalogu głównym, jak i na zagnieżdżonych podstronach.

Przykładowy kierunek implementacji po stronie głównego `script.js`:

```js
const siteScriptUrl = new URL(document.currentScript.src);

// Wykonywane dopiero po spełnieniu warunku 10 sekund.
const gameFrame = document.createElement("iframe");
gameFrame.src = new URL("./static/game/game.html", siteScriptUrl).href;
gameFrame.title = "Piernikowy Quest";
gameFrame.className = "tjug-game-frame";
loadingOverlay.append(gameFrame);
```

Minimalny loader jest częścią strony od początku, ale dokument gry, LittleJS i assety zaczynają się pobierać dopiero po utworzeniu iframe. Nie należy wcześniej umieszczać niewidocznego iframe w DOM-ie ani dodawać `preload`, `prefetch` lub `modulepreload` dla plików gry.

## 6. Proponowana struktura plików

```text
static/
  game/
    game.html        # izolowany dokument ładowany do iframe
    game.js          # inicjalizacja LittleJS i cykl życia rozgrywki
    game-core.js     # czysta logika mapy, kolizji i losowania
    game.css         # interfejs wewnątrz iframe
    map.js           # definicja kafelków oraz mapy
    vendor/
      littlejs.min.js     # klasyczny build LittleJS 1.18.21
      LITTLEJS-LICENSE.txt # licencja MIT biblioteki
    littlejs-adapter.js   # przestrzeń nazw nad globalnym API klasycznego buildu
```

Kod inicjujący easter egg pozostanie w `script.js`. Klasy elementów dodawanych do dokumentu strony mają prefiks `tjug-game-`. Style wewnątrz iframe są odizolowane i mogą używać prostszych nazw.

Podział `game.js` / `game-core.js` umożliwia testowanie reguł gry bez DOM-u i canvasa. Warstwę techniczną gry obsługuje **LittleJS 1.18.21**. Jest użyty do pętli gry, canvasa, obiektów, kolizji kafelkowych, wejścia z klawiatury i ładowania favicony. Reguły domenowe — wyznaczanie osiągalnych pól i losowanie pierników — pozostają we własnym, niezależnym od silnika module.

Biblioteka jest przechowywana w repozytorium, a nie pobierana z CDN-u podczas gry. Zapewnia to przewidywalną wersję, działanie bez zależności od zewnętrznego hosta i łatwiejszą kontrolę polityki bezpieczeństwa. Używany jest oficjalny klasyczny build `littlejs.min.js`, ładowany przed skryptami mapy i gry. Dzięki temu rozwiązanie nie wymaga bundlera ani serwera HTTP i może zostać uruchomione bezpośrednio przez `file://`; moduły ESM są w tym trybie blokowane przez politykę CORS przeglądarki.

Iframe jest częścią rekomendacji, a nie opcjonalnym dodatkiem. LittleJS instaluje input na swoim `document`, utrzymuje własny canvas oraz pętlę i nie udostępnia pełnego `shutdown()`. Osobny dokument ogranicza te efekty do gry. Usunięcie iframe niszczy cały kontekst JavaScript, canvasy i listenery, dzięki czemu zwykła strona wraca do stanu sprzed uruchomienia easter egga.

## 7. Bohater i styl graficzny

- Bohater ma jednoznacznie przedstawiać postać z `favicon.ico`.
- Dla pierwszej wersji można użyć statycznej postaci z favicony, przeskalowanej bez wygładzania.
- Docelowo warto przygotować `hero.png` jako mały sprite sheet inspirowany faviconą: cztery kierunki, po trzy klatki chodu na kierunek.
- Zalecany rozmiar jednej klatki to `32 × 32 px`.
- Należy zachować przezroczyste tło oraz charakterystyczną sylwetkę i kolory postaci.
- Grafika ma być wyświetlana z `image-rendering: pixelated`, bez filtrów rozmywających piksele.
- Pierniki powinny mieć czytelną sylwetkę i subtelną dwu- lub trzyklatkową animację, ale bez zmiany pola zajmowanego na siatce.

Całość powinna wizualnie nawiązywać do 16-bitowych gier RPG: ograniczona paleta, wyraźne kafelki, proste cienie i brak efektów 3D.

## 8. Mapa

Rekomendowany rozmiar logiczny:

- siatka `24 × 16` pól;
- kafelek `32 × 32 px`;
- wewnętrzna rozdzielczość canvasa `768 × 512 px`;
- skalowanie całego canvasa do dostępnej przestrzeni z zachowaniem proporcji i ostrych pikseli.

Gra ma cztery ręcznie zaprojektowane plansze, zdefiniowane w `static/game/map.js`. Przy każdej rozgrywce (także pierwszej) plansza jest losowana; przy restarcie losowanie pomija poprzednią planszę. Motywy plansz:

- **Piernikowy ogród** — trawa, ścieżki, staw i krzaki;
- **Lochy pod Starówką** — kamienne płyty, czerwony chodnik, lawa i ceglane ściany z pochodniami;
- **Podniebne chmury** — chmury, tęczowe mosty, dziury w niebo i burzowe chmury;
- **Gotyckie miasto** — chodniki, ulice, fontanna i czerwone dachy kamienic.

Wszystkie plansze używają tego samego alfabetu kafelków, a motyw zmienia jedynie ich wygląd. Każda plansza powinna zawierać:

- trawę i ścieżki jako pola dostępne;
- drzewa, wodę, płoty lub budynki jako przeszkody;
- pojedynczy punkt startowy bohatera;
- wystarczająco dużo alternatywnych tras, aby zbieranie przedmiotów nie było liniowe;
- dekoracje kojarzące się z Toruniem, o ile nie pogarszają czytelności kolizji.

Definicja mapy MVP używa prostych symboli tekstowych (`.`, `:`, `#`, `~`). Jedna funkcja `isWalkable()` określa dostępność pola, a na jej podstawie powstaje warstwa `TileCollisionLayer`; logika kolizji nie zależy od koloru piksela. Przy przejściu na docelowy tileset warto rozdzielić podłoże, przeszkody i dekoracje na osobne warstwy wizualne.

## 9. Losowanie pierników

Przy każdej nowej rozgrywce należy:

1. obliczyć wszystkie pola osiągalne z punktu startowego (BFS/flood fill po polach bez kolizji);
2. odrzucić pole startowe oraz pola bezpośrednio z nim sąsiadujące;
3. przetasować pozostałe pola algorytmem Fishera–Yatesa;
4. wybrać pierwszych 10 różnych pól;
5. przypisać po jednym pierniku do każdego pola.

Takie rozwiązanie gwarantuje, że:

- wszystkie pierniki da się zebrać;
- dwa pierniki nie znajdą się na jednym polu;
- piernik nie pojawi się w przeszkodzie;
- nowa rozgrywka różni się od poprzedniej.

Jeżeli mapa z powodu błędu ma mniej niż 10 poprawnych pól, gra powinna przerwać start i pokazać błąd deweloperski zamiast wejść w niemożliwy do ukończenia stan.

## 10. Sterowanie i model ruchu

- Ruch: strzałki oraz `W`, `A`, `S`, `D`.
- Zamknięcie/pauza: `Escape`.
- Bohater porusza się wyłącznie w czterech kierunkach.
- Stan bohatera zawsze odpowiada jednemu polu siatki.
- Przy przytrzymaniu klawisza kolejne kroki następują w stałym rytmie, około jednego pola co `120–150 ms`.
- Między polami można zastosować krótką interpolację pozycji, ale kolizje oraz zebranie przedmiotu są rozstrzygane logicznie na siatce.
- Należy wyłączyć domyślne przewijanie strony przez strzałki tylko wtedy, gdy gra jest aktywna.
- Po ukryciu karty pętla gry i pomiar czasu są pauzowane.

Sterowanie należy oprzeć na stanie klawiszy udostępnianym przez LittleJS (`keyIsDown`, `keyWasPressed`, `keyWasReleased`), a nie na częstotliwości automatycznego powtarzania `keydown`. Silnik identyfikuje klawisze przez `KeyboardEvent.code`, dlatego strzałki powinny być sterowaniem podstawowym, niezależnym od układu klawiatury, a WASD wygodnym wariantem dodatkowym.

LittleJS powinien działać z `setInputPreventDefault(false)`. Zapobiega to blokowaniu klawisza `Tab` wewnątrz iframe i pozwala przejść fokusem do przycisku zamknięcia należącego do nadrzędnego dialogu. Przewijanie dokumentu strony i tak jest zablokowane przez modal, a dokument gry nie ma przewijalnej treści.

## 11. Renderowanie i pętla gry

Gra powinna używać elementu `<canvas>`. DOM pozostaje odpowiedzialny za nagłówek, licznik, ekrany startu/zwycięstwa i przyciski.

Kolejność rysowania jednej klatki:

1. podłoże;
2. dolne dekoracje;
3. pierniki;
4. bohater;
5. dekoracje znajdujące się optycznie przed bohaterem.

Pętlę zapewni LittleJS. Silnik używa `requestAnimationFrame` i aktualizacji o stałym kroku `1/60 s`, dzięki czemu logika nie przyspiesza na monitorach 120 Hz lub 144 Hz. Ruch kafelkowy powinien być rozstrzygany w `gameUpdate()` lub metodzie `update()` bohatera, a renderowanie nie może zmieniać stanu gry.

W MVP mapa jest niewielka i rysowana z prostych prymitywów canvasa w `gameRender()`, a kolizje przechowuje osobny `TileCollisionLayer`. Pierniki i bohater są obiektami dynamicznymi. Gdy pojawi się docelowy tileset lub kilka map, statyczne kafelki warto przenieść do prerenderowanego `TileLayer`. HUD pozostaje w DOM-ie dokumentu gry.

## 12. Pełnoekranowy interfejs

Warstwa gry:

- jest natywnym elementem `<dialog>` otwieranym przez `showModal()`;
- zawiera iframe zajmujący dostępną powierzchnię oraz przycisk zamknięcia należący do dokumentu nadrzędnego;
- `position: fixed; inset: 0; z-index` wyższy od nagłówka;
- zakrywa całą stronę i blokuje jej przewijanie;
- ma ciemne tło pasujące do obecnej palety strony;
- używa `100dvh` z bezpiecznym fallbackiem;
- zawiera licznik `Pierniki: 0/10`, czas oraz zawsze widoczny przycisk zamknięcia;
- nie używa natywnego Fullscreen API, więc nie wymaga dodatkowego kliknięcia ani uprawnień przeglądarki.

Stany UI:

```text
IDLE -> LOADING -> TITLE (3 s) -> READY -> PLAYING -> WON
                   |                       |
                   +-------> CLOSED <------+ 
```

Proponowane komunikaty:

- ładowanie: „Rozgrzewamy piec…”;
- ekran tytułowy: „Piernikowy” w pierwszej linii oraz przesunięte w prawo „Quest” w drugiej;
- start: „Piernikowy Quest” oraz „Zbierz 10 pierników”;
- instrukcja: „Ruch: strzałki lub WASD · Esc: wyjście”;
- zwycięstwo: „Wszystkie pierniki zebrane!”;
- akcje: „Zagraj ponownie” i „Wróć do strony”.

Loader nie powinien prezentować zmyślonych procentów. Dokument iframe wysyła do rodzica komunikat `booting`, a po zakończeniu `engineInit()` komunikat `ready`. Wystarczy wskaźnik nieokreślonego postępu wraz z opisem aktualnego etapu.

Ekran tytułowy używa fontu **Press Start 2P** pobieranego przez Google Fonts CSS API z `display=swap`. Każda litera jest osobnym elementem animowanym z góry ekranu z niewielkim opóźnieniem względem poprzedniej. Sekwencja rozpoczyna się dopiero po odsłonięciu iframe, trwa 3 sekundy i przez ten czas właściwy interfejs gry pozostaje oznaczony jako `inert`. Brak połączenia z Google Fonts nie może zablokować gry — po krótkim limicie czasu używany jest awaryjny font monospace.

## 13. Dostępność

Mimo że gra jest easter eggiem, warstwa nie może pogarszać obsługi strony:

- należy użyć natywnego `<dialog>`, zamiast ręcznie odtwarzać `role="dialog"`; przeglądarka zapewni modalność, unieruchomienie tła, ograniczenie fokusu i obsługę `Escape`;
- dialog otrzyma nazwę przez `aria-label`, a widoczny tytuł znajdzie się zarówno w loaderze, jak i w dokumencie gry;
- iframe otrzyma opisowy `title="Piernikowy Quest"`;
- po otwarciu fokus przejdzie do przycisku rozpoczęcia albo kontenera gry;
- fokus pozostanie wewnątrz otwartej warstwy;
- po zamknięciu wróci do linku z logo;
- `Escape` zawsze pozwoli wyjść, a widoczny przycisk zapewni alternatywę dla klawiatury;
- komunikaty o liczbie zebranych pierników nie będą ogłaszane co klatkę; wystarczy dyskretny region `aria-live="polite"` aktualizowany po zebraniu przedmiotu;
- ustawienie `prefers-reduced-motion` wyłączy przejścia i animacje dekoracyjne, ale nie zablokuje samej gry;
- przy `prefers-reduced-motion` ekran tytułowy nadal trwa 3 sekundy, lecz wszystkie litery są od razu widoczne bez zjazdu;
- dźwięk, jeśli zostanie dodany później, powinien być domyślnie wyłączony i wymagać świadomego włączenia.

Zdarzenie klawiatury z iframe nie musi dotrzeć do dokumentu nadrzędnego. Dlatego obsługa `Escape` wewnątrz gry powinna wysłać komunikat `close` przez `postMessage()`. Widoczny przycisk zamknięcia pozostaje w nadrzędnym dialogu i nie zależy od działania silnika.

## 14. Zamykanie i sprzątanie stanu

Zamknięcie gry musi:

- opcjonalnie wykonać `setPaused(true)` przed rozpoczęciem sprzątania;
- usunąć iframe, co kończy jego `requestAnimationFrame`, timery, audio i globalne listenery dokumentu gry;
- usunąć listener `message` dodany przez stronę nadrzędną;
- zamknąć i usunąć dialog gry z DOM-u;
- przywrócić poprzednią wartość `overflow` na elemencie `body`;
- przywrócić fokus na logo;
- pozostawić stronę i istniejącą animację logo w działającym stanie.

Po zamknięciu użytkownik może ponownie przytrzymać kursor przez 10 sekund. Powstanie nowy iframe i świeża instancja silnika, natomiast pobrane wcześniej pliki pozostaną w cache przeglądarki.

## 15. Odporność na błędy

- Brak logo, brak obsługi `<dialog>`/iframe lub niespełniony warunek desktopowy oznacza ciche niewłączanie easter egga; zwykła strona nadal działa.
- Błąd wczytania skryptu lub assetu nie może pozostawić pustej, niezamykalnej warstwy.
- Błąd powinien pokazać komunikat „Nie udało się uruchomić gry” i przycisk powrotu.
- Kod gry nie może modyfikować globalnych styli bez prefiksu ani nadpisywać istniejących handlerów strony.
- Rodzic musi akceptować komunikaty tylko wtedy, gdy `event.source === gameFrame.contentWindow`, a typ wiadomości należy sprawdzać względem zamkniętej listy: `booting`, `ready`, `completed`, `close`, `error`.
- Opcjonalne zdarzenia analityczne mogą obejmować `easter_egg_opened` i `easter_egg_completed`, ale nie są wymagane do działania i nie powinny zawierać danych osobowych.

## 16. Plan wdrożenia

### Etap 1 — działające MVP

- loader i warunek 10 sekund;
- pełnoekranowy ekran ładowania;
- izolowany dokument `game.html` uruchamiany w iframe;
- lokalna, przypięta kopia LittleJS 1.18.21 wraz z licencją MIT;
- canvas z kafelkową mapą i kolizjami;
- statyczny bohater bezpośrednio oparty na faviconie;
- 10 losowanych, osiągalnych pierników;
- licznik, pomiar czasu, zwycięstwo, restart i zamknięcie;
- obsługa błędów oraz przywracanie strony.

### Etap 2 — oprawa

- sprite sheet bohatera z kierunkami i animacją chodu;
- dopracowany tileset i toruńskie detale mapy;
- animacja zebrania piernika;
- lepsze przejścia między ekranami z uwzględnieniem `prefers-reduced-motion`.

### Etap 3 — testy i optymalizacja

- testy jednostkowe czystej logiki mapy, kolizji i losowania;
- testy ręczne na wszystkich typach podstron;
- pomiar wielkości lazy-loadowanego pakietu i czasu startu;
- sprawdzenie obsługi klawiatury, fokusu oraz czytnika ekranu.

## 17. Scenariusze testowe

1. Hover trwa krócej niż `5 s` — wskaźnik postępu pozostaje niewidoczny.
2. Po `5 s` pojawia się obramowanie z postępem `0%`, które do `10 s` płynnie wypełnia się do `100%`.
3. Hover trwa `9,9 s` — wskaźnik jest prawie pełny, ale gra się nie ładuje.
4. Hover trwa co najmniej `10 s` — wskaźnik osiąga `100%`, pojawia się ekran ładowania i dopiero wtedy żądania zasobów gry.
5. Kursor opuszcza logo w trakcie odliczania — postęp znika; kolejna próba zaczyna pełne 10 sekund od początku.
6. Karta zostaje ukryta w trakcie odliczania — timer i wskaźnik zostają anulowane.
7. Urządzenie ma szerokość poniżej `961px` — trigger jest nieaktywny.
8. Urządzenie dotykowe raportuje szeroki viewport, ale nie ma precyzyjnego wskaźnika — trigger jest nieaktywny.
9. Każda nowa gra umieszcza dokładnie 10 pierników na różnych dostępnych polach.
10. Flood fill potwierdza osiągalność każdego wylosowanego piernika.
11. Bohater nie może wejść w przeszkodę ani wyjść poza mapę.
12. Po zebraniu dziesiątego piernika pojawia się ekran zwycięstwa i zatrzymuje się czas.
13. `Escape` oraz przycisk zamknięcia przywracają przewijanie i fokus strony.
14. Awaria ładowania dowolnego assetu pozwala bezpiecznie zamknąć warstwę.
15. Istniejąca animacja logo nadal działa przed i po zamknięciu gry.
16. Gra uruchamia się poprawnie zarówno z `/index.html`, jak i z podstrony w `/spotkania/` lub `/wydarzenia/`.

## 18. Kryteria akceptacji

Rozwiązanie jest gotowe, gdy:

- uruchamia się wyłącznie na desktopie po nieprzerwanym 10-sekundowym hoverze nad logo navbara;
- od 5. do 10. sekundy hoveru pokazuje obwodowy postęp od 0 do 100%, resetowany po przerwaniu interakcji;
- przed spełnieniem warunku nie pobiera kodu, CSS-u ani grafik gry;
- prezentuje pełnoekranowy, zamykalny ekran ładowania;
- po załadowaniu pokazuje przez 3 sekundy ekran „Piernikowy Quest” w foncie Press Start 2P, z dwoma wierszami i animacją liter z góry;
- pozwala poruszać postacią z favicony po kafelkowej mapie w czterech kierunkach;
- losuje dokładnie 10 różnych i osiągalnych pozycji pierników;
- poprawnie rozpoznaje zebranie wszystkich przedmiotów i pokazuje zwycięstwo;
- nie psuje nawigacji, animacji logo, przewijania ani działania podstron;
- daje się w pełni obsłużyć klawiaturą i zawsze pozwala wrócić do strony;
- po zamknięciu usuwa iframe wraz z pętlą, listenerami i całym stanem silnika;
- korzysta z lokalnej kopii LittleJS bez zależności runtime od CDN-u i bez procesu budowania.

## 19. Research bibliotek JavaScript

Research wykonano 23 września 2026 r. na podstawie oficjalnych dokumentacji, repozytoriów i metadanych pakietów. Porównanie dotyczy małej gry 2D osadzonej jako zamykany easter egg w istniejącej statycznej stronie, a nie samodzielnej rozbudowanej gry. Pominięto porównywanie rozmiaru bibliotek zgodnie z ustaleniem projektowym.

W szerszym przeglądzie uwzględniono także KAPLAY, rot.js, Phaser i PixiJS. KAPLAY i Phaser oferują wygodny, lecz niepotrzebnie szeroki model aplikacji dla jednego ekranu gry. rot.js jest ukierunkowany na roguelike i generowanie lochów, a PixiJS jest przede wszystkim rendererem, więc pozostawiłby po stronie projektu większość zasad ruchu i kolizji. Do finałowego porównania zakwalifikowano LittleJS i Kontra.js.

### Krytyczne porównanie LittleJS i Kontra.js

| Kryterium | LittleJS 1.18.21 | Kontra.js 10.0.2 | Wniosek dla projektu |
| --- | --- | --- | --- |
| Model pracy | Spójny silnik z własnym canvasem, stałą pętlą, obiektami i ustawieniami kamery. | Zestaw niezależnych modułów składanych przez aplikację. | LittleJS szybciej tworzy kompletny świat gry; Kontra daje drobniejszą kontrolę nad integracją. |
| Mapa i kolizje | Ma natywny `TileCollisionLayer`, `TileLayer` oraz narzędzia do współrzędnych świata. | `TileEngine` dobrze obsługuje warstwy kafelkowe i zapytania o kafelki. | Obie biblioteki wystarczą, ale model LittleJS lepiej pasuje do dalszej rozbudowy mapy RPG. |
| Ruch i czas | Pętla o stałym kroku, stan klawiszy i `EngineObject` są częścią jednego API. | `GameLoop`, klawiaturę i sprite’y trzeba jawnie połączyć. | LittleJS wymaga mniej kodu spinającego w samej grze. |
| Cykl życia | Silnik instaluje globalny input dokumentu, tworzy canvas i nie udostępnia pełnego `shutdown()`. | Pętla ma jawne `start()`/`stop()`, a moduły łatwiej wyrejestrować. | Kontra jest bezpieczniejsza przy osadzaniu gry bezpośrednio w dokumencie strony. |
| Izolacja w iframe | Usunięcie iframe kończy cały runtime, więc brak `shutdown()` przestaje być praktycznym problemem. | Iframe też działa, ale nie daje równie istotnej korzyści architektonicznej. | Przy obowiązkowym iframe główna wada LittleJS zostaje skutecznie odizolowana. |
| Możliwość rozwoju | Wbudowane warstwy, obiekty, kamera, audio, efekty i dodatkowe systemy tworzą naturalną ścieżkę rozwoju. | Bardzo dobra do małych gier, lecz przy większym zakresie więcej systemów trzeba dobrać lub napisać. | LittleJS zapewnia lepszy zapas na animacje, efekty, kolejne mapy i dźwięk. |

### Rekomendacja

W tym projekcie należy użyć **LittleJS 1.18.21**, ale wyłącznie wewnątrz osobnego iframe. Użytkownik trafnie wskazał, że LittleJS lepiej odpowiada charakterowi gry RPG: daje wspólny model świata, obiektów, stałej pętli, kamery i kolizji kafelkowych. Koszt tej wygody to silniejsze przejęcie dokumentu przez silnik. Iframe jest więc warunkiem rekomendacji, ponieważ zamienia usunięcie jednego elementu DOM w pełny i pewny cleanup runtime’u.

**Kontra.js pozostaje lepszym wyborem tylko w wariancie bez iframe**, gdy gra musiałaby współdzielić dokument, canvas i cykl życia z resztą strony. Jej bardziej modułowe API ułatwia kontrolowane uruchamianie i zatrzymywanie poszczególnych elementów, ale w przyjętej architekturze ta przewaga ma mniejsze znaczenie niż spójność LittleJS.

W MVP używane są `engineInit()`, `EngineObject`, `TileCollisionLayer`, stan klawiatury, stała pętla oraz ustawienia canvasa i kamery. Reguły domenowe nie są delegowane do biblioteki: `game-core.js` zachowuje własny BFS i losowanie bez powtórzeń. Biblioteka oraz jej licencja są przechowywane lokalnie w `static/game/vendor/`; produkcyjne działanie gry nie zależy od CDN-u ani bundlera.

## 20. Dobre praktyki potwierdzone researchem

### Ładowanie zasobów

- Właściwą granicą lazy loadingu jest dynamicznie utworzony iframe. Dopiero jego dokument ładuje klasyczny build LittleJS, skrypty gry, CSS oraz faviconę. Nie należy dodawać `preload` ani `prefetch`, ponieważ złamałoby to wymaganie pobierania gry dopiero po 10 sekundach.
- Najpierw trzeba pokazać lekki ekran ładowania tworzony przez główny skrypt, a następnie utworzyć iframe. Start gry następuje dopiero po komunikacie `ready` wysłanym po zakończeniu `engineInit()`.
- Zasoby powinny mieć długie cache’owanie zapewniane przez GitHub Pages; przy zmianie grafiki można zmienić nazwę pliku albo dodać wersję do URL-a.
- W panelu Network trzeba potwierdzić, że przed spełnieniem warunku hoveru nie ma żadnego żądania do `static/game/`.

### Pętla, czas i pauza

- Aktualizacja stanu musi być oddzielona od renderowania. Stały krok LittleJS zapewnia deterministyczny ruch, a renderer może działać z częstotliwością monitora.
- Nie należy opierać prędkości na liczbie wywołań `requestAnimationFrame`; MDN ostrzega, że bez użycia czasu animacja przyspiesza na ekranach o wysokim odświeżaniu.
- `requestAnimationFrame` zwykle jest wstrzymywany w tle, ale dodatkowo należy reagować na `visibilitychange`: zatrzymać pętlę i zegar rozgrywki oraz wznowić je bez dużego skoku czasu.
- Po zamknięciu należy usunąć iframe, co kończy jego pętlę, timery i subskrypcje. Rodzic osobno usuwa listener `message`, timeout loadera oraz dialog.

### Canvas i pixel art

- Canvas ma stałą, małą rozdzielczość logiczną. CSS skaluje go do największego całkowitego mnożnika mieszczącego się w viewportcie, a niewykorzystane miejsce tworzy letterbox.
- Należy ustawić `image-rendering: pixelated` oraz `ctx.imageSmoothingEnabled = false`. Pozycje i rozmiary sprite’ów w canvasie pozostają całkowite, aby uniknąć rozmycia i nierównych pikseli.
- Statyczne kafelki warto prerenderować poza główną klatką. MDN zaleca pomocniczy canvas dla wielokrotnie rysowanych elementów i ograniczanie zmian stanu kontekstu.
- HUD, przyciski i tekst powinny pozostać w DOM-ie. Zapewnia to ostrą typografię i dostępność, a canvas odpowiada wyłącznie za świat gry.
- Canvas otrzyma krótkie `aria-label` i tekst fallbackowy, ale pełny stan oraz akcje użytkownika muszą być dostępne w semantycznym DOM-ie.

### Sterowanie

- `keydown` ustawia stan klawisza, `keyup` go czyści, a `update()` odczytuje stan. Nie należy polegać na zależnym od systemu autorepeat `keydown`.
- `preventDefault()` dotyczy strzałek i klawiszy ruchu tylko podczas aktywnej rozgrywki; `Tab`, skróty systemowe i działanie strony poza grą pozostają nietknięte.
- Utrata fokusu lub ukrycie strony czyści stan wszystkich wciśniętych klawiszy, aby bohater nie kontynuował ruchu po powrocie.
- Strzałki są podstawowym, niezależnym od układu klawiatury sterowaniem. Dla WASD obsługiwane są `KeyboardEvent.code` oraz rozsądny fallback przez `event.key`.

### Modalność i dostępność

- Natywny `<dialog>` z `showModal()` jest preferowany względem własnej imitacji modala. Standardowy element automatycznie unieruchamia tło, zarządza fokusem i obsługuje `Escape`.
- Dialog musi mieć widoczny tytuł, dostępny przycisk zamknięcia i logiczny fokus początkowy. Po zamknięciu fokus wraca do logo, które wywołało grę.
- Wewnątrz dialogu nie wolno tworzyć „pułapki” bez wyjścia; przycisk „Wróć do strony” pozostaje widoczny w stanach ładowania, błędu, gry i zwycięstwa.
- `prefers-reduced-motion` ogranicza animacje przejść, migotanie i kołysanie przedmiotów, ale nie usuwa funkcjonalności ani nie zmienia zasad gry.

### Dźwięk

- Hover nie jest wystarczającym gestem do niezawodnego uruchomienia Web Audio. Kontekst audio wolno utworzyć lub wznowić dopiero po kliknięciu „Zagraj”.
- Dźwięk pozostaje domyślnie wyłączony i ma jawny przełącznik. Gra musi być w pełni zrozumiała bez dźwięku.
- Krótkie efekty można ładować jako bufory dopiero wraz z resztą assetów; muzyka tła nie jest potrzebna w MVP.

### Testowalność i utrzymanie

- `game-core.js` nie importuje LittleJS ani nie korzysta z DOM-u. Przyjmuje funkcję sprawdzającą dostępność pola i funkcję RNG, dzięki czemu testy mogą użyć stałego ziarna.
- Testy jednostkowe obejmują BFS, wybór 10 unikalnych pól, kolizję, zebranie przedmiotu i przejścia stanów. Testy przeglądarkowe obejmują lazy loading, fokus dialogu, cleanup i ponowne otwarcie.
- Mapa wizualna i mapa kolizji są osobnymi warstwami, ale test sprawdza ich zgodność dla wszystkich przeszkód.
- Najpierw należy zmierzyć wydajność; offscreen canvas, ograniczenie repaintów i dalsze optymalizacje wdraża się tam, gdzie pomiar pokaże koszt.

## 21. Stan implementacji MVP

MVP zostało zaimplementowane zgodnie z przyjętą architekturą:

- `script.js` wykrywa 10 sekund nieprzerwanego hoveru myszy nad logo navbara przy aktywnym warunku desktopowym; po pierwszych 5 sekundach uruchamia obwodowy wskaźnik, który przez pozostałe 5 sekund wypełnia się od 0 do 100%;
- po spełnieniu warunku tworzy natywny, pełnoekranowy `<dialog>`, loader i dopiero wtedy iframe z grą;
- `static/game/game.html` stanowi izolowaną granicę runtime’u i komunikuje stany `booting`, `ready`, `error`, `completed` oraz `close` przez `postMessage()`;
- `static/game/game.js` uruchamia lokalne LittleJS 1.18.21, mapę `24 × 16`, kolizje kafelkowe, ruch co osiem klatek, pomiar czasu, zbieranie i restart;
- przed ekranem startowym `game.js` odtwarza trzysekundową sekwencję tytułową, a `game.css` używa Press Start 2P oraz kaskadowej animacji liter;
- ustawienia LittleJS przekazują wartości zgodne z API silnika, w szczególności zerową grawitację jako `vec2(0, 0)`, ponieważ `setGravity()` oczekuje wektora, a nie liczby;
- `static/game/game-core.js` zawiera niezależny BFS oraz losowanie 10 unikalnych, osiągalnych pozycji algorytmem Fishera–Yatesa;
- `static/game/map.js` jest jednym źródłem definicji mapy i pól dostępnych dla bohatera;
- klasyczne skrypty mapy, reguł i gry działają we własnych IIFE oraz udostępniają tylko przestrzenie nazw `TjugGameMap`, `TjugGameCore` i `LittleJS`; zapobiega to kolizjom z globalnymi identyfikatorami silnika, takimi jak `formatTime`;
- bohater używa bezpośrednio `static/media/favicon.ico`, bez duplikowania grafiki;
- mapa i pierniki są w MVP rysowane programowo z prostych, pikselowych prymitywów. Osobny tileset i sprite sheet bohatera pozostają zakresem etapu oprawy;
- dźwięk jest wyłączony, a ukrycie karty pauzuje pętlę i zegar;
- zamknięcie dialogu usuwa iframe, listener wiadomości i timeout, odblokowuje stronę oraz zwraca fokus do linku z logo.

Pliki `littlejs.min.js` oraz `LITTLEJS-LICENSE.txt` są zapisane lokalnie w `static/game/vendor/`. Klasyczny build został wybrany celowo, aby poza GitHub Pages obsługiwać także lokalne otwieranie strony przez `file://`. Faviconę ładuje zwykły element `<img>` bez wymuszania CORS, a następnie przekazuje ją do `TextureInfo`. Dla `file://` wiadomości potomne używają `targetOrigin="*"`, ponieważ odbiorca ma nieprzezroczyste pochodzenie `null`; rodzic nadal weryfikuje `event.source`, znacznik źródła, dozwolony typ wiadomości oraz oczekiwane `event.origin === "null"`. Dla HTTP/HTTPS obowiązuje ścisłe pochodzenie strony. Rozwiązanie nie wymaga bundlera. Testy i proces budowania nie zostały uruchomione w ramach implementacji, zgodnie z dyspozycją użytkownika.

## 22. Źródła internetowe

### Biblioteki

- [Kontra.js — oficjalne repozytorium](https://github.com/straker/kontra)
- [Kontra.js 10.0.2 — metadane pakietu](https://raw.githubusercontent.com/straker/kontra/main/package.json)
- [Kontra.js — TileEngine i kolizje warstw](https://straker.github.io/kontra/api/tileEngine)
- [Kontra.js — GameLoop ze stałym krokiem](https://straker.github.io/kontra/api/gameLoop)
- [Kontra.js — sprite’y i animacje](https://straker.github.io/kontra/api/sprite)
- [Kontra.js — promise-based asset loader](https://straker.github.io/kontra/api/assets)
- [Kontra.js — rejestrowanie i usuwanie zdarzeń](https://straker.github.io/kontra/api/events)
- [Kontra.js — klawiatura i wyrejestrowywanie callbacków](https://straker.github.io/kontra/api/keyboard)
- [LittleJS — oficjalne repozytorium i zakres silnika](https://github.com/KilledByAPixel/LittleJS)
- [LittleJS — FAQ i cykl życia silnika](https://github.com/KilledByAPixel/LittleJS/blob/main/FAQ.md)
- [LittleJS — oficjalna dokumentacja API](https://killedbyapixel.github.io/LittleJS/docs/)
- [KAPLAY — oficjalne repozytorium](https://github.com/kaplayjs/kaplay)
- [KAPLAY — tilemapy przez `addLevel()`](https://kaplayjs.com/api/doc/ctx/addLevel/)
- [rot.js — oficjalne repozytorium](https://github.com/ondras/rot.js/)
- [Phaser 4.2.1 — oficjalne wydanie](https://phaser.io/download/release/v4.2.1)
- [Phaser 4 — dokumentacja TilemapLayer](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer)
- [PixiJS 8 — architektura renderera](https://pixijs.com/8.x/guides/concepts/architecture)
- [PixiJS 8 — status rendererów](https://pixijs.com/8.x/guides/components/renderers)

### Praktyki webowe

- [Google Fonts — użycie fontu przez arkusz CSS i `display=swap`](https://developers.google.com/fonts/docs/getting_started)
- [MDN — lazy loading i dzielenie kodu](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading)
- [MDN — komunikacja `window.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [MDN — `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN — optymalizacja canvasa](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [MDN — ostry pixel art przez `image-rendering`](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- [MDN — Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [MDN — `KeyboardEvent.code` w grach](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
- [W3C WAI — natywny modalny `<dialog>`](https://www.w3.org/WAI/WCAG22/Techniques/html/H102)
- [W3C WAI — wzorzec dostępnego modala](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN — Web Audio API: autoplay i kontrola użytkownika](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
