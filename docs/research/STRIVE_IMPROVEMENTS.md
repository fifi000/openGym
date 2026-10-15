# Inspiracje ze Strive dla openGym

Analiza z 15 października 2026, dla brancha `codex/strive-sbs`.

Najwięcej dają usprawnienia podczas treningu: jawne kopiowanie wartości między seriami,
zapisane zamienniki ćwiczeń i rozróżnienie deloadu w analizie postępów.

## Co sprawdziłem

- Pobrałem XAPK ze [Strive na APKPure](https://apkpure.net/gym-workout-tracker-strive/com.koalasoft.gymnasium/download).
  Paczka zawiera Strive **2.0.6**, build **125**, package `com.koalasoft.gymnasium`.
- Rozpakowałem base APK i split ARM64. Manifest Androida potwierdza wersję.
- Uruchomiłem JADX 1.5.6 w trybie `simple`. Powstało 12 027 plików Java oraz zdekodowane
  zasoby Androida. Proces zgłosił 56 błędów i zakończył się kodem 3, więc dekompilacja jest częściowa.
- Strive używa Fluttera. JADX obejmuje kod Androida, nie odtwarza źródeł Dart z `libapp.so`.
  Dla tej części sprawdziłem teksty z binarnego ARM64, nazwy modułów i dołączone zasoby,
  w tym `assets/schema.dbml`, deklarujący schemat bazy w wersji 85.
- Porównałem wyniki z kodem tego brancha, nie tylko z upstreamowym README.
- Nie uruchamiałem Strive na telefonie ani emulatorze. Obecność modelu lub tekstu w APK
  potwierdza zawartość paczki, ale nie dowodzi dostępności funkcji w każdym wariancie UI lub abonamentu.
- Nie kopiowałem kodu, bazy ćwiczeń, filmów ani grafik Strive do openGym.

[Opis autora w Google Play](https://play.google.com/store/apps/details?id=com.koalasoft.gymnasium&hl=en)
niezależnie opisuje placeholdery, personalizowany dashboard i klawiaturę do edycji serii.

## Proponowana kolejność

Koszt jest względnym szacunkiem zakresu, bez estymacji godzin.

| Priorytet | Improvement | Co zmienić w openGym | Koszt |
| --- | --- | --- | --- |
| 1 | Jawne kopiowanie wartości między seriami | Akcje „Z poprzedniej serii”, „Z poprzedniego treningu”, „Do pozostałych serii roboczych” dla aktywnego pola | Mały/średni |
| 2 | Zapisane zamienniki w slocie planu | Krótka lista alternatyw wybieranych podczas sesji, z osobną historią ciężaru każdego ćwiczenia | Średni |
| 3 | Deload widoczny w historii i trendach | Osobna etykieta deloadu i wybór uwzględniania go w trendzie, przy zachowaniu faktycznej objętości | Średni |
| 4 | Podsumowanie czterotygodniowego cyklu SBS | Wykonane sesje, rekordy, zmiana e1RM i training maxów, decyzje Coacha oraz zebrany RIR | Średni |
| 5 | Wybrane statystyki na Home | Przypięcie wykresu konkretnego ćwiczenia, tygodniowej objętości lub postępu cyklu | Średni |
| 6 | Kalibracja nowego planu | Jawne ustalenie ciężarów dla ćwiczeń bez historii przed rozpoczęciem cyklu | Średni |

### 1. Kopiowanie wartości i szybsze wprowadzanie danych

Strive ma teksty opisujące akcję ustawiania wartości w seriach tego samego typu lub we wszystkich
seriach. W schemacie `routine_exercise_sets` są osobne blokady ciężaru, powtórzeń i RPE.
To wskazuje na rozróżnienie wartości planowanych i pól, których automatyczna zmiana nie powinna dotknąć.

openGym już kopiuje całą serię i automatycznie przenosi zmianę ciężaru do kolejnych odziedziczonych
serii. `setField` w `frontend/src/views/Workout.jsx` wywołuje `cascadeWeight`, a ta funkcja
w `frontend/src/lib/history.js` respektuje ręczne wyjątki. Brakuje analogicznej, jawnej akcji
kopiowania wybranego pola, szczególnie powtórzeń i RIR/RPE.

Proponowany pierwszy zakres: przy edycji pola pokazać trzy nazwane akcje z tabeli.
Domyślnie zmieniać tylko nieukończone serie robocze, z możliwością Undo. Nie nadpisywać
rozgrzewek, dropów ani odrębnych celów SBS. Przy kopiowaniu poprzedniego wyniku zachować istniejące
rozróżnienie tej samej rutyny i pozycji serii.

Pełną własną klawiaturę warto rozważyć później. Same akcje dają część korzyści bez budowania
obsługi kursora, lokalnych separatorów dziesiętnych i dostępności od nowa.

### 2. Alternatywy i placeholdery ćwiczeń

W APK są `placeholder_exercise_sets`, `exercises.alts` i opis wyboru ćwiczenia według listy,
kategorii lub partii dopiero podczas treningu.

openGym ma już `swapActiveWorkoutExercise` w `frontend/src/sheets.jsx`, podpowiedzi podobnych
ćwiczeń i zastępowanie w edytorze rutyny. Zapisane alternatywy na slot są też na roadmapie
w części „Cardio, alternatives, groups”. Nowością byłaby trwała krótka lista przypisana do planu.

Przykład: slot „wiosłowanie” z trzema wybranymi wariantami. Na siłowni wybierasz wolne stanowisko.
Serie i cel slotu pozostają, ale ciężar i rekordy pochodzą z historii wybranego wariantu.
Ciężaru ze sztangi nie należy automatycznie przepisywać na wyciąg.

Dla Twojego SBS zacząłbym od zamienników akcesoriów. Zamiana głównego boju wymaga osobnej decyzji
programowej i nie powinna dziedziczyć procentów training maxa innego ruchu.

### 3. Deload jako informacja analityczna

Strive przechowuje `routine_exercise_logs.is_deload`. Teksty wykresów opisują szare tygodnie
deloadu i pomijanie ich przy wyznaczaniu trendu.

openGym już ma deloady w progression oraz `noProg`, zapisywane przez
`frontend/src/lib/finish-workout.js`. `noProg` służy jednak także do innych wyłączeń z progression,
więc nie wystarcza jako etykieta deloadu. `e1rmSeries` w `frontend/src/lib/onerm.js` nie ma
osobnego filtra deloadów.

Propozycja: zapisywać powód sesji lub ćwiczenia jako deload, pokazywać go na wykresie i pozwolić
pominąć go w trendzie siły. Faktyczna objętość i frekwencja nadal mają obejmować wykonaną pracę.
W SBS oznaczać odpowiednie ćwiczenia z szablonu, nie zakładać, że cały czwarty tydzień jest deloadem.

### 4. Podsumowanie cyklu SBS

W Strive są modele planów wielotygodniowych i teksty podsumowania planu, trendu siły, objętości
oraz RIR. Są też zasoby rocznego Wrapped.

Twój branch ma już cykle SBS i historię decyzji w `frontend/src/components/SbsPanel.jsx`.
Bardziej przydatne od rocznego Wrapped byłoby podsumowanie po ukończeniu czterech tygodni:
co wykonano, które wyniki wzrosły, jak zmieniły się training maxy i jakie decyzje podjął Coach.
Przy małej liczbie porównywalnych sesji pokazywać wyniki, bez deklarowania wiarygodnego trendu.

Nie kopiowałbym bezpośrednio sumy e1RM wszystkich ćwiczeń używanej w tekstach Strive jako
„strength index”. Zmiana zestawu ćwiczeń utrudnia interpretację takiej sumy. Dla SBS czytelniejsze
są osobne wyniki stałych bojów, wraz z datą i serią źródłową.

### 5. Wybrane karty na Home

Tabela `widgets` Strive przechowuje typ, rozmiar, kolejność, stronę i parametry karty.
Nazwy modułów wskazują karty ćwiczenia, rutyny, objętości partii i postępu planu.

Home w openGym ma stały układ i kilka przełączników widoczności w Settings.
Wystarczy zacząć od przypinania jednej lub dwóch istniejących kart statystyk, bez edytora dashboardu.
Dla tego brancha sensowną kartą jest też postęp bieżącego tygodnia i cyklu SBS.

### 6. Kalibracja ciężarów

Strive ma `plans.calibration_enabled` oraz teksty opisujące tydzień zerowy dla ćwiczeń bez
ustalonego ciężaru. Ćwiczenia z już wpisanym ciężarem traktuje jako skalibrowane.

To przydatne przy nowym planie lub nowej maszynie. W Twoim branchu są już historia treningów,
zaimportowane szablony i edytowalne training maxy, więc priorytet jest niższy.
Kalibracja nie powinna nadpisywać znanych ciężarów ani przeliczać całego SBS po jednej serii.

## Czego nie proponuję jako nowych funkcji

- Kolumna Previous, historia po kliknięciu nazwy i rekordy dla konkretnej liczby powtórzeń już są
  w personalnym branchu. Opisuje je `docs/PERSONAL_SBS.md`.
- Progression, RIR/RPE, supersety, timery per ćwiczenie, planowane deloady, pomiary i Health Connect
  mają już implementacje w openGym.
- Podsumowanie po treningu już pokazuje „Last time and next time” w `frontend/src/sheets.jsx`.
  Inspiracją może być edycja celów następnej sesji z tego miejsca, ale nie sam podgląd.
  Nie dodawałbym obowiązkowego zatwierdzania do obecnego automatycznego Coacha SBS.
- Własne motywy, ikony, karty do social mediów i roczne Wrapped mają niższy priorytet niż edycja serii.
- Importu starego backupu nie należy powtarzać nad nowymi treningami. Migracja jest już opisana
  w `docs/PERSONAL_SBS.md` i nie jest częścią tej analizy.

## Ślady analizy

Pliki robocze są w `/tmp/strive-research/`, poza repozytorium. Katalog tymczasowy może zostać usunięty.

- `xapk/manifest.json`: metadane paczki.
- `jadx-out/resources/AndroidManifest.xml`: zdekodowany manifest Androida.
- `jadx-out/sources/com/koalasoft/gymnasium/`: częściowo zdekompilowana integracja Androida,
  w tym receivery widgetów następnego treningu i kalendarza.
- `base/assets/flutter_assets/assets/schema.dbml`: schemat bazy dołączony do aplikacji.
- `dart-strings.txt`: teksty wyodrębnione z ARM64 `libapp.so`.
  Dowody obejmują linie 74675 dla bulk edit, 71010 dla placeholderów, 58768 dla deloadów
  w trendach i 11641 dla kalibracji.
- `jadx.log`: przebieg dekompilacji i liczba błędów.

SHA-256 XAPK: `3741d7c4d573fa684aa8f4a64c77343ea493fa5856a3c34046364b33b9c3781a`.

SHA-256 base APK: `4070d1b4a63cecad862b8064a4b771c7fd425dba9efdcd1ad865d45eeff5a922`.

Nie zmieniałem kodu aplikacji. Nie uruchamiałem buildu ani testów openGym, ponieważ analiza
nie zmienia jej działania.

## Dodatkowe inspiracje sprawdzone po pierwszym raporcie

Google Play opisuje aktualizację Strive z 5 października 2026 oraz jej ostatnie zmiany: [Strive w Google Play](https://play.google.com/store/apps/details?id=com.koalasoft.gymnasium&hl=en). Oficjalna [strona Strive](https://strive-workout.com/) potwierdza szybką klawiaturę z kopiowaniem i powtarzaniem wartości, cele przypięte przy seriach, porównywanie ćwiczeń na wspólnym wykresie, filtrowanie po reps i konfigurowany dashboard.

| Inspiracja | Co potwierdza źródło | Stan w openGym | Decyzja |
| --- | --- | --- | --- |
| Udostępnianie planu linkiem lub tekstem | Nowości Google Play | Plan można już eksportować do pliku i drukować. Linku nie ma. | Dodać link zawierający dane planu, bez serwera stron trzecich. |
| Karty osiągnięć treningowych | Nowości Google Play | Jest już obraz podsumowania treningu i lista PR. | Rozszerzyć bieżącą kartę o wyróżnienie osiągnięcia zamiast tworzyć drugi format. |
| Porównanie ćwiczeń | Strona produktu pokazuje serie ćwiczeń na wspólnym wykresie | Są wykresy dla wybranego ćwiczenia, ale nie widać porównania dwóch naraz. | Dodać porównanie tylko dla zgodnych metryk i jednostek. |
| Filtrowanie wykresu po zakresie powtórzeń | Strona produktu deklaruje filtr po zakresie reps | Stats ma zakres dat i kilka rodzajów metryk; sprawdzę, czy per-rep history wystarcza przed implementacją filtra. | W tej specyfikacji nie rozszerzać filtrów, jeśli ten widok nie potwierdzi brakującej decyzji treningowej. |
| Cel przypięty przy serii | Strona produktu opisuje wyświetlenie celu przy każdym wpisie | openGym pokazuje target i progression guidance w sesji. | Istniejący cel wykorzystać, nie dublować jako nowego panelu. |
| Łatwiejsze sterowanie progresją i deloadem | Nowości Google Play | Progresja i deload są już częścią progression engine; brak osobnej etykiety sesji deload na wykresie. | Zachować logikę treningową, dodać jawne oznaczenie do historii. |
| Plany z wcześniejszą datą i ich podsumowanie | Nowości Google Play | openGym pozwala poprawić historię i przenieść trening na datę; plan dnia jest już edytowalny. | Nie kopiować osobnego mechanizmu bez wykrytej luki w przepływie. |
| Gesty do wpisywania cyfr, zmiana ikony i trasa biegu na karcie | Nowości Google Play | Gesty i app icon są natywne dla Android/iOS; trasy są poza zakresem obecnego openGym. | Pominięte. Rozszerzyłyby task o natywne funkcje i nie poprawiają najważniejszej ścieżki na telefonie. |

## Głębsza dekompilacja Fluttera

`libapp.so` z paczki ARM64 to stripped ELF AArch64. JADX 1.5.6 zdekompilował kod Androida i zasoby, ale nie kod AOT Dart. Wyodrębniłem teksty z `libapp.so` i sprawdziłem dołączony `schema.dbml`, listy planów, katalog ćwiczeń oraz wymagane uprawnienia Androida.

Sprawdziłem możliwość użycia [Blutter](https://github.com/worawit/blutter), narzędzia do analizy ARM64 Flutter AOT. README projektu wymaga kompilatora C++20, CMake, Ninja, ICU i Capstone. Na tym serwerze jest g++ 14 i ICU, brakuje CMake, Ninja i libcapstone; nie zainstalowałem globalnych zależności. Blutter może wyciągnąć symbole i obiekty z puli Dart, ale sam projekt zaznacza ograniczenia dla obfuskowanego kodu. Nie uruchomiłem APK na urządzeniu: jedyny widoczny przez ADB telefon jest offline. Głębsze odtworzenie logiki Dart wymagałoby przygotowania lokalnego toolchainu albo działającego Androida.

Metadane z paczki potwierdzają wersję **2.0.6 (build 125)**. SHA-256 paczki i base APK są w sekcji „Ślady analizy” powyżej. Obrazów, katalogu ćwiczeń ani kodu Strive nie kopiowałem do openGym.
