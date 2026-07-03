# DivideYou — Brief projektowy (wytyczne dla oprawy wizualnej)

Ten dokument opisuje, **czym jest aplikacja**, **jakie ma poziomy (role) i części**,
oraz **wszystkie ekrany, komponenty i stany** — tak, aby na jego podstawie można było
zaprojektować pełną, spójną oprawę wizualną (design system + makiety ekranów).

Językiem interfejsu jest **polski**. Waluta wewnętrzna: **JR** (jednostka rozliczeniowa),
prezentowana zawsze razem z równowartością w **PLN**.

---

## 1. Czym jest DivideYou

DivideYou to **platforma oszczędnościowo‑zakupowa**. Użytkownik:

1. **doładowuje portfel** wirtualną walutą **JR** (kupuje ją za PLN),
2. **kupuje programy** (np. karnet na siłownię, kurs językowy) oferowane w konkretnych
   **lokalizacjach**, oraz **bonusy**,
3. płaci **miesięczny abonament** ze środków JR,
4. **poleca innych** i zarabia **prowizje partnerskie**,
5. może **wypłacić** JR z powrotem na pieniądze po okresie karencji.

Całość obsługuje **panel administracyjny (CMS)** zarządzający użytkownikami, katalogiem,
płatnościami, prowizjami, treściami i statystykami.

**Charakter marki:** produkt finansowy → musi budzić **zaufanie i poczucie
bezpieczeństwa**, ale jednocześnie być **przyjazny i zrozumiały** dla zwykłego
konsumenta (nie bankowo‑korporacyjny chłód). Kluczowe emocje: *bezpieczeństwo,
przejrzystość, kontrola nad pieniędzmi, nagroda za polecanie*.

---

## 2. Architektura — „poziomy” aplikacji

Aplikacja składa się z **dwóch odrębnych interfejsów** + wspólnego API:

| Część | Odbiorca | Adres | Charakter wizualny |
|-------|----------|-------|--------------------|
| **Platforma konsumenta** (`front`) | Klient końcowy | `/` | Przyjazny, lekki, „produktowy”, dużo białej przestrzeni, mobile‑first |
| **Panel CMS** (`cms`) | Administrator / back‑office | `/cms` | Gęsty, „narzędziowy”, tabele, filtry, sprawność pracy > efekt |
| API (`server`) | — | `/api/*` | brak UI |

To dwie różne skóry tego samego systemu — **spójne logo/kolory marki**, ale różna
gęstość i priorytety (konsument = emocje i prostota; CMS = dane i efektywność).

---

## 3. Poziomy / role użytkowników

Design musi rozróżniać wizualnie te role (odznaki, dostępne akcje, komunikaty):

### Po stronie konsumenta
- **Klient demo (nieopłacony dostęp)** — konto na próbę, ograniczone czasowo
  (np. 14 dni). Widzi **baner odliczający** dni i wezwanie do wykupienia pełnego
  dostępu (opłata za dostęp). Nie może jeszcze kupować.
- **Klient z pełnym dostępem** — pełne możliwości (kupno JR, programów, bonusów).
- **Klient prywatny vs firmowy** — różne dane (PESEL vs NIP, imię/nazwisko vs nazwa
  firmy). Firma ma dodatkowo obsługę **prowizji/faktur**.
- **Partner** — klient, który przystąpił do **programu partnerskiego**: ma link
  polecający, „downline”, prowizje, materiały marketingowe.
- Stany specjalne: **konto zablokowane**, **brak zaakceptowanych zgód**, **zaległe
  płatności/abonament**, **niewystarczające środki** — każdy generuje inny **baner
  ostrzegawczy** (patrz §7).

### Po stronie CMS
- **Super administrator** — pełne uprawnienia.
- **Administrator z uprawnieniami** — dostęp per‑moduł na dwóch poziomach:
  **Podgląd (1)** / **Edycja (2)**. Moduły uprawnień: Zarządzanie użytkownikami,
  Dane użytkownika, Płatności użytkownika, Programy użytkownika, Partnerstwo
  użytkownika, Płatności, Programy, Bonusy, Lokalizacje, Ustawienia, Regulaminy,
  FAQ, Statystyki, Aktualności, Pliki. → menu i przyciski muszą **wygaszać/ukrywać**
  elementy bez uprawnień.

---

## 4. Waluta, liczby, język

- **JR** — zawsze widoczne jako liczba + „JR”, obok **równowartość w PLN**
  (np. `450,00 JR (≈ 450,00 zł)`). Kurs: `1 JR = X PLN` (konfigurowalny).
- Formatowanie: **pl‑PL** (przecinek dziesiętny, spacja jako separator tysięcy),
  2 miejsca po przecinku.
- **Sześć „kubełków” portfela** (kluczowy element wizualny, patrz §7.1):
  `aktywne`, `oczekujące`, `nieaktywne`, `do wypłaty`, `środki prowizyjne`,
  `zablokowane`.
- Ton komunikatów: **rzeczowy, uprzejmy, bez żargonu**, forma bezosobowa/imperatyw
  („Doładuj portfel”, „Wprowadź kwotę”).

---

## 5. Platforma konsumenta — ekrany

Układ ramowy: **górny pasek (top‑bar)** + **menu boczne** + **obszar ostrzeżeń** +
**breadcrumbs** + treść. Menu i pasek pokazują: **Mój ID** i **link polecający**
(kopiowalne), oraz **saldo JR**.

### 5.1 Publiczne (bez logowania)
| Ekran | Cel / elementy |
|-------|----------------|
| **Logowanie** | e‑mail + hasło; linki do rejestracji i odzyskiwania hasła |
| **Rejestracja** | formularz + akceptacja regulaminów (checkboxy, RODO); wariant z ID polecającego w URL |
| **Odzyskiwanie hasła / reset** | prośba o e‑mail, ustawienie nowego hasła |
| **Potwierdzenie e‑mail** | komunikat statusu |
| **404** | nie znaleziono |

### 5.2 Po zalogowaniu (panel)
| Ekran | Cel | Kluczowe elementy |
|-------|-----|-------------------|
| **Aktualności** (start) | Feed ogłoszeń | Karty news (zdjęcie, data, tytuł, treść) w układzie masonry |
| **Profil / Pulpit** | Przegląd konta | Widżety: programy, partnerzy, ostatnie transakcje, zgody, „porada” z FAQ, widżet wypłaty |
| **Portfel — Stan** | Serce finansów | **6 kafli sald** (JR + PLN, z tooltipami), przyciski **Kup JR** i **Wypłata** |
| **Portfel — Płatności** | Historia transakcji | Lista z ikoną wg typu, kwotą ±, statusem, datą; klik → PDF podsumowania |
| **Portfel — Zamrożone** | Środki zablokowane | Lista transakcji „zabezpieczenie” |
| **Portfel — Zwroty** | Wnioski o zwrot | Lista + formularz zgłoszenia zwrotu (pieniądze / JR) |
| **Programy — Dostępne / Moje / Obserwowane** | Przeglądanie katalogu | Kafle programów + wyszukiwarka + **mapa Google**; paginacja |
| **Programy VIP** | Jak wyżej, ale bramkowane min. saldem JR | odznaka „VIP” |
| **Program (szczegóły)** | Opis + lista lokalizacji | Filtry: adres, promień (km), cena od‑do; lista/mapa |
| **Lokalizacja (szczegóły)** | Zakup | Galeria zdjęć, opis, załączniki, umowy, **opłaty (wstępna, abonament)**, przycisk **Kreatora**, obserwuj/rezygnuj |
| **Kreator (konfigurator)** | Budowa zakupu | Pełny ekran: drzewo atrybutów → karty atrybutów → **panel podsumowania** (opłaty, wybrane atrybuty z ceną JR, kwota blokowana, czas umowy) |
| **Bonusy — Dostępne / Moje / szczegóły** | Jak programy, ale prostsze | zakup przez kreator |
| **Partnerstwo** | Program poleceń | Ekran wejścia (zostań partnerem) → link polecający, zaproszenia e‑mail, lista „downline”, prowizje, materiały marketingowe, rezygnacja |
| **Partnerstwo — historia partnera** | Filtrowana historia poleconego | filtry dat i kwot |
| **FAQ** | Pomoc | Akordeon pytań/odpowiedzi; deep‑link do pytania |
| **Ustawienia — Dane** | Dane osobowe/firmowe | Przełącznik prywatny/firma, adres, konto bankowe, zmiana hasła, usunięcie konta |
| **Ustawienia — Zgody** | RODO | Tabela zgód: akceptacja/wycofanie, pobieranie dokumentów |

### 5.3 Ścieżka użytkownika (do zilustrowania w projekcie)
Rejestracja → potwierdzenie e‑mail → (demo, baner odliczający) → uzupełnienie danych +
zgody → **Kup JR** → przeglądaj programy → wybierz lokalizację → **Kreator** → zakup i
e‑podpis umów → płać abonament → śledź w **Portfelu** → **poleć znajomych** →
zarabiaj prowizje → **wypłać**.

---

## 6. Panel CMS — ekrany

Układ: **ciemny sidebar** (logo + nawigacja z ikonami, wygaszana wg uprawnień) +
górny pasek (e‑mail admina, wyloguj) + treść (głównie tabele z filtrami i paginacją).

| Ekran | Zarządza | Kluczowe akcje |
|-------|----------|----------------|
| **Logowanie** | — | e‑mail + hasło |
| **Użytkownicy** | Lista klientów | Szukaj, filtry (typ konta, data rejestracji, saldo JR, liczba programów, status płynności), odznaki statusu płatności (zielony/pomarańczowy/czerwony) |
| **Użytkownik (szczegóły)** | Jedno konto | Pasek akcji: blokuj, usuń, potwierdź e‑mail/dostęp, „tylko płatności”, **dodaj JR**, przypisz partnera. Zakładki: Dane, Płatności, Programy, Bonusy, Partnerstwo, Faktury |
| **Administratorzy (Users‑CMS)** | Konta CMS | Dodaj admina + **macierz uprawnień** (Podgląd/Edycja) |
| **Płatności — Wpłaty / Wypłaty / Zwroty** | Przepływy | Ustaw status (Oczekująca/Opłacona/Odrzucona), akceptuj zwrot |
| **Programy** | Katalog | Lista + **Dodaj/Edytuj/Usuń/Podgląd**, historia zakupów |
| **Program (edycja)** | Jeden program | Zdjęcie, galeria, załączniki, nazwa, opis, okres umowy, opłata wstępna/startowa, cena abonamentu, min. abonamentów, **VIP**, widoczność, marker na mapie, umowy pisemne + elektroniczne |
| **Lokalizacje** | Pod program | CRUD, marker/mapa, widoczność, limit zakupów, **atrybuty** |
| **Atrybuty** | Konfigurator oferty | Typy: prosty / wybieralny / liczbowy / końcowy; ceny (opłata, abonament), jednostka, wielokrotny wybór, wymagany |
| **Bonusy** | Jak programy (flaga bonus) | + min. JR |
| **Parametry** | Ustawienia globalne | Dni dostępu, min. JR (VIP/bonus), wartość JR, opłata za dostęp, okres ochrony/wypłaty JR, **progi prowizji**, linki afiliacyjne |
| **Regulaminy** | Zgody rejestracyjne | CRUD (nazwa, treść, wymagany), generowanie PDF |
| **FAQ** | Pomoc | CRUD pytań/odpowiedzi |
| **Aktualności** | Treści | CRUD (tytuł, treść, zdjęcie) |
| **Statystyki** | Dashboard analityczny | Liczniki + wykresy (rejestracje, źródła, zakupy programów/bonusów/JR, popularne lokalizacje, logi), filtr dat, **eksport XLS** |
| **Partnerzy systemowi** | Afiliacja | Statystyki partnerów, prowizje domyślne/niestandardowe, listy poleconych, faktury |
| **Pliki** | Biblioteka mediów | Drzewo folderów + pliki, upload, usuń, wybór (picker) do programów/news |

---

## 7. Kluczowe komponenty i wzorce UI (do zaprojektowania)

### 7.1 Kafle sald portfela (najważniejszy komponent konsumenta)
Sześć stanów środków — każdy potrzebuje **własnego koloru/ikony** i **tooltipa**:

| Kubełek | Znaczenie | Sugerowane skojarzenie |
|---------|-----------|------------------------|
| **Aktywne** | dostępne do wydania | pozytywne / główny akcent |
| **Oczekujące** | z niezaksięgowanych płatności | neutralne / w toku |
| **Nieaktywne** | już wydane | wygaszone / szare |
| **Do wypłaty** | JR gotowe do wypłaty | sukces / „można wypłacić” |
| **Środki prowizyjne** | z poleceń | wyróżnik partnerski |
| **Zablokowane** | zabezpieczenie aktywnych zakupów | ostrzegawcze / „zamrożone” |

Każdy kafel: wartość JR (duża), równowartość PLN (mniejsza), etykieta, ikona, „i”.

### 7.2 Lista transakcji — słownik typów (spójne ikony/kolory)
Typy (kierunek: + wpływ / − wydatek):
JR: doładowanie (+), doładowanie online (+); zakup programu (−), zakup bonusu (−);
darowizna na konto/uznanie admina (+); opłata abonamentowa (−); opłata za dostęp (−);
prowizja partnerska (+); wypłata (−); wypłata prowizji (−); wniosek o zwrot / zwrot;
zabezpieczenie zamrożone; anulowanie. Każdy status: **Oczekująca / Zaakceptowana /
Odrzucona / Anulowana** → spójne odznaki (kolor + tekst).

### 7.3 Kafel programu / bonusu
Zdjęcie, nazwa, krótki opis, opłata wstępna + cena abonamentu (JR/PLN), odznaki
(VIP / polecany / obserwowany), CTA. Widok siatki **oraz** markery na mapie.

### 7.4 Kreator (konfigurator zakupu)
Pełnoekranowy, wieloetapowy: intro → drzewo atrybutów (breadcrumbs) → karty
wyboru (przewijane poziomo) → **przyklejony panel podsumowania** (opłaty, wybrane
atrybuty z ceną, kwota blokowana, czas umowy, przycisk „Dalej”). To najbardziej
„premium” moment produktu — wart wyróżnienia wizualnego.

### 7.5 Banery ostrzegawcze (kontekstowe, nad treścią)
Warianty: **demo wygasa** (odliczanie), **brak zgód**, **zaległe płatności**,
**niewystarczające środki**, **oczekujące płatności**. Potrzebują hierarchii:
info / ostrzeżenie / krytyczny, z CTA.

### 7.6 Pozostałe wzorce
- **Wyszukiwarka + mapa** (Google Maps, markery, filtr promienia/ceny/adresu).
- **Paginacja** + wybór liczby na stronę (domyślnie 12).
- **Tutoriale onboardingowe** (modale ze slajdami per sekcja: Programy, Portfel,
  Bonusy, Partnerstwo).
- **Kopiuj do schowka** (link polecający, Mój ID) — z potwierdzeniem toast.
- **Galeria zdjęć**, **załączniki i umowy** (pobieranie PDF), **e‑podpis umów**.
- **Popup płatności** (iframe bramki) + ekran powrotu.
- **Toale/snackbary** (5 s), **modale potwierdzeń** (np. rezygnacja z programu).
- CMS: **tabele** z sortowaniem/filtrami, **macierz uprawnień**, **wykresy**,
  **drzewo plików**, **eksport XLS**.

---

## 8. Stany do zaprojektowania (dla każdego ekranu)
- **Ładowanie** (skeleton/spinner), **pusto** (brak wyników vs brak wyszukiwania —
  różne komunikaty i ilustracje), **błąd** (komunikat + ponów), **sukces** (toast),
  **brak uprawnień** (CMS — ukrycie/wygaszenie).

## 9. Responsywność
- Konsument: **mobile‑first** (menu boczne zwijane do hamburgera, kafle w 1 kolumnę,
  kreator dostosowany do dotyku, mapy pełnej szerokości).
- CMS: głównie desktop; tabele z przewijaniem poziomym na węższych ekranach.

## 10. Dostępność i motywy
- Kontrast WCAG AA, czytelne etykiety pól, focus states, obsługa klawiatury.
- Rozważyć **tryb jasny/ciemny** (CMS naturalnie ciemniejszy sidebar).
- Kolory statusów muszą działać także dla daltonistów (kolor + ikona + tekst).

## 11. Elementy marki do dostarczenia przez projekt
- Logo „DivideYou” (wariant na jasnym i ciemnym tle), sygnet/favicon.
- Paleta: kolor **główny (marka)**, **akcent/sukces**, **ostrzeżenie**, **błąd**,
  **neutralne (szarości)** + kolory 6 kubełków portfela i statusów transakcji.
- Typografia (nagłówki + tekst + liczby/monospace dla kwot).
- Ikonografia (spójny zestaw: portfel, program, bonus, partner, prowizja, wypłata,
  lokalizacja, umowa, transakcje wg typu).
- System komponentów: przyciski (primary/secondary/danger), pola formularzy,
  karty, kafle sald, odznaki statusów, tabele, modale, banery, toasty, zakładki,
  paginacja, tooltipy.

## 12. Stan obecny (punkt wyjścia)
Aplikacja jest w pełni funkcjonalna, ale ma **minimalną, roboczą stylizację**
(proste CSS, `front/src/styles.css`, `cms/src/styles.css`). Celem projektu jest
**podniesienie oprawy wizualnej** do spójnego design systemu, bez zmiany struktury
ekranów i logiki. Interfejs jest po **polsku**; wszystkie kwoty w **JR + PLN**.

---

### Skrót dla projektanta
> Zaprojektuj **jeden system, dwie skóry**: przyjazną, mobilną **platformę
> konsumenta** (emocje, prostota, portfel jako bohater) i sprawny, gęsty
> **panel CMS** (dane, tabele, uprawnienia). Motyw przewodni: **zaufanie +
> przejrzystość finansów + nagroda za polecanie**. Najważniejsze komponenty:
> 6 kafli sald portfela, lista transakcji ze słownikiem typów/statusów, kafel
> programu, kreator zakupu, banery ostrzegawcze.
