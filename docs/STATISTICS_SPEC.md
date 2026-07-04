# Statystyki DivideYou — katalog możliwych analiz (CMS → „Statystyki")

Cel: określić **maksymalny zakres statystyk** możliwych do pokazania w panelu CMS,
z **filtrowaniem** i **interaktywnymi wykresami**, w oparciu wyłącznie o dane, którymi
aplikacja realnie dysponuje (model Prisma). Dokument jest jednocześnie **backlogiem
wdrożeniowym** — każdy wskaźnik ma przypisane źródło danych, wymiar, miarę, typ wykresu
i dostępne filtry.

> Stan obecny (już wdrożone): liczniki, rejestracje w czasie, zakupy programów/bonusów/JR
> w czasie, popularne lokalizacje, lista użytkowników + eksport XLS. To ~5% poniższego zakresu.

---

## 1. Źródła danych (co mamy w bazie)

| Encja | Pola użyteczne statystycznie | Wymiary **wyprowadzone** |
|---|---|---|
| **User** | `type` (klient/admin), `emailConfirmed`, `blockedStatus`, `onlyPay`, `lastLoginAt`, `createdAt` | data rejestracji, aktywność (recency), status konta |
| **UserClient** | `type` (prywatny/firma), `personalNumber` (**PESEL**), `taxNumber` (NIP), `city`, `postalCode`, `phone`, `bankAccountNumber`, `accessFeePaid`, `accessPaidDate`, `demoExpired`, `detailDataConfirmed`, `anyProgramBought`, `partnerNumber`, `partnerOfId`, `partnershipTermAccepted`, `partnershipRegisterIp`, `paymentStatus`, `jrActive`, `jrNotActive`, `programsCount`, `programsVipCount`, `bonusCount`, `createdAt` | **wiek + płeć** (z PESEL), **województwo/region** (z miasta/kodu), segment (prywatny/firma), status dostępu, „kompletność profilu", jest-partnerem |
| **Program** | `name`, `vip`, `recommended`, `isBonus`, `visible`, `gracePeriod`, `entryFee`, `subscriptionPrice`, `amountBlocked`, `minimalJrForView`, `maxPurchases`, `createdAt` | kategoria (z nazwy), VIP/zwykły/bonus |
| **Location** | `city`, `postalCode`, `latitude`, `longitude`, `entryFee`, `subscriptionPrice`, `maxPurchases`, `programId`, `createdAt` | **geo (mapa/heatmapa)**, region, obłożenie (kupione/`maxPurchases`) |
| **ProgramAttribute** | `type`, `isFinal`, `name`, `startFee`, `subscriptionPrice` | wybór wariantu (Standard/Premium), dodatki |
| **Purchase** | `programId`, `locationId`, `isBonus`, `price`, `subscriptionFee`, `amountBlocked`, `active`, `finished`, `canceled`, `canceledByAdmin`, `activationDate`, `endDate`, `boughtDate`, `nextPaymentDate`, `createdAt` | status cyklu życia, „czas do zakupu", zaległości abonamentowe |
| **PurchaseAttribute** | `name`, `count`, `startFee`, `subscriptionPrice` | popularność wariantów i dodatków |
| **Transaction** | `type` (16 typów), `value` (JR), `plnEquivalent`, `cancelled`, `subscriptionMonths`, `timestamp`, `purchaseId`, `partnerId`, `clientRequestId`, `paymentId` | wolumeny JR/PLN wg typu, GMV, prowizje, wypłaty, zwroty |
| **Payment** | `type` (wpłata/wypłata/dostęp), `status` (init/oczek./zaakcept./odrzuc.), `value` (PLN), `createdAt`, `updatedAt` | konwersja płatności, **czas realizacji** (`updatedAt-createdAt`), skuteczność |
| **ClientRequest** | `type` (gotówka/JR/dostęp), `status`, `value`, `plnEquivalent`, `createdAt` | zwroty/reklamacje wg statusu |
| **PartnershipCommissionThreshold** | `lowLimit`, `highLimit`, `value`, `global`, `clientId` | progi prowizji, indywidualne stawki |
| **ObservedItem** | `programId`, `locationId`, `createdAt` | „wishlist" — obserwowane vs kupione (konwersja zainteresowania) |
| **Invitation** | `email`, `registered`, `clientId`, `createdAt` | skuteczność zaproszeń partnerskich (wysłane → zarejestrowani) |
| **Log** | `type`, `createdAt` | aktywność operacyjna w czasie |
| **Settings** | `jrExchangeRate`, `accessPrice`, `minJrForVip`… | parametry do przeliczeń JR↔PLN |
| **News / Faq / GdprAgreement / FileItem** | `createdAt`, statusy zgód | treści, zgody RODO, biblioteka |

### Wymiary wyprowadzone — jak liczyć
- **Wiek / grupa wiekowa** — z **PESEL** (`personalNumber`): cyfry 1–6 = data urodzenia (z kodowaniem stulecia w miesiącu). Grupy: **18–24 / 25–34 / 35–44 / 45–54 / 55–64 / 65+**. Dotyczy tylko klientów **prywatnych** (firmy mają NIP — brak wieku).
- **Płeć** — z PESEL (10. cyfra: parzysta = kobieta, nieparzysta = mężczyzna).
- **Region / województwo** — mapowanie **miasto → województwo** (pewne dla znanych miast) lub prefiks kodu pocztowego jako fallback. Przykład: Warszawa→mazowieckie, Kraków→małopolskie, Wrocław→dolnośląskie, Poznań→wielkopolskie, Gdańsk/Gdynia→pomorskie, Łódź→łódzkie, Katowice→śląskie, Szczecin→zachodniopomorskie, Lublin→lubelskie, Bydgoszcz→kujawsko‑pomorskie, Rzeszów→podkarpackie.
- **Kwota w JR ↔ PLN** — kurs z `Settings.jrExchangeRate` (obecnie 1 JR = 1 zł).
- **Kohorta** — miesiąc `createdAt` klienta (analiza retencji kohortowej).

---

## 2. Model filtrowania (globalny) i interaktywność

**Pasek filtrów globalnych** (wpływa na wszystkie kafle i wykresy):
- **Zakres dat** — presety (7/30/90 dni, ten miesiąc, kwartał, rok, cały okres) + zakres własny.
- **Granulacja** — dzień / tydzień / miesiąc / kwartał / rok.
- **Segment konta** — prywatny / firma / wszyscy.
- **Status dostępu** — demo / pełny / zablokowany / „tylko płatności".
- **Grupa wiekowa** i **płeć** (dla prywatnych).
- **Miasto** i **region/województwo** (multi‑select).
- **Program / kategoria / VIP / bonus**.
- **Źródło pozyskania** — organiczny vs partnerski (`partnerOfId != null`).
- **Partner / struktura** — zawężenie do downline wybranego partnera.
- **Status płatności** klienta (bezpieczny/ostrzeżenie/zaległość).

**Interaktywność wykresów:**
- **Cross‑filtering** — klik w segment (np. słupek „mazowieckie", wycinek „25–34", punkt na mapie) filtruje pozostałe wykresy.
- **Drill‑down** — region → miasto → lokalizacja; rok → miesiąc → dzień; program → lokalizacja → wariant.
- **Hover/tooltip** z wartościami (JR + PLN, % udziału, zmiana r/r).
- **Porównanie okresów** (bieżący vs poprzedni) i linie trendu.
- **Legenda klikalna** (włącz/wyłącz serie), zoom/brush na osi czasu, eksport (PNG/CSV/XLS).

---

## 3. KPI top‑line (kafle wskaźników)

Rząd kafli z wartością, zmianą r/r i mini‑sparkline:
- Klienci łącznie / nowi w okresie · Aktywni (login < 30 dni) · % z pełnym dostępem
- Wolumen doładowań JR (JR i PLN) · GMV zakupów (JR) · Przychód z opłat dostępu (PLN)
- MRR abonamentów (suma `subscriptionFee` aktywnych zakupów) · Aktywne zakupy · Współczynnik anulacji
- Partnerzy · Prowizje naliczone / wypłacone · Śr. wielkość struktury
- Płatności oczekujące (szt./PLN) · Zwroty (szt./PLN) · Skuteczność płatności (%)

---

## 4. Katalog statystyk (pogrupowany)

Legenda kolumn: **Wykres** — sugerowany typ; **Źródło** — pola/encje.

### A. Użytkownicy i demografia
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Piramida wieku i płci | grupa wiekowa × płeć | liczba klientów | piramida pozioma (diverging bar) | PESEL |
| Rozkład grup wiekowych | grupa wiekowa | liczba / % | słupki / donut | PESEL |
| Prywatni vs firmy | typ konta | liczba / % | donut | `UserClient.type` |
| Klienci wg miast (top N) | miasto | liczba | słupki poziome | `city` |
| Klienci wg regionów | województwo | liczba / % | mapa choropleth PL + słupki | miasto→region |
| Mapa klientów | geo | gęstość | mapa (markery/heat) | miasto→współrzędne |
| Kompletność profilu | `detailDataConfirmed` / bank / dane | % kompletnych | wskaźnik / lejek | UserClient |
| Wiek × wartość klienta | grupa wiekowa | śr. GMV / śr. saldo JR | słupki + linia | PESEL × Transaction |

### B. Pozyskanie i konwersja (funnel)
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Rejestracje w czasie | data | liczba | linia/area (z porównaniem okresu) | `User.createdAt` |
| Źródło pozyskania | organiczny/partnerski | liczba / % | słupki skumulowane | `partnerOfId` |
| **Lejek konwersji** | etap | liczba + % przejścia | funnel | rejestracja → `emailConfirmed` → `accessFeePaid` → 1. doładowanie JR → 1. zakup (`anyProgramBought`) → 1. abonament |
| Czas do zakupu dostępu | — | mediana dni (rejestracja→`accessPaidDate`) | histogram / box | UserClient |
| Skuteczność zaproszeń | — | wysłane → zarejestrowani (%) | funnel / słupki | `Invitation.registered` |
| Rejestracje wg regionu/wieku | region / wiek | liczba | mapa / słupki | User × dane demograficzne |

### C. Zaangażowanie i retencja
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Aktywni vs nieaktywni | recency logowania | liczba | donut / słupki (0–7/8–30/31–90/90+ dni) | `lastLoginAt` |
| Retencja kohortowa | kohorta rejestracji × miesiąc | % aktywnych | heatmapa kohortowa | `createdAt` × `lastLoginAt`/aktywność |
| Demo wygasłe vs opłacone | status | liczba / % | słupki | `demoExpired`, `accessFeePaid` |
| Konta zablokowane / „tylko płatności" | status | liczba | KPI + trend | `blockedStatus`, `onlyPay` |
| Churn zakupów | miesiąc | anulowane / zakończone / aktywne | linia skumulowana | Purchase statusy |

### D. Katalog i programy
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Zakupy programów w czasie | data | liczba / GMV | linia | `Purchase.boughtDate`, `price` |
| Top programy | program | liczba zakupów / GMV | słupki poziome | Purchase×Program |
| Zakupy wg kategorii | kategoria | liczba / % | treemap / donut | kategoria z nazwy |
| VIP vs zwykłe vs bonusy | typ | liczba / udział | słupki skumulowane | `vip`, `isBonus` |
| Popularne lokalizacje | lokalizacja | liczba zakupów | słupki / mapa | Purchase×Location |
| Obłożenie lokalizacji | lokalizacja | kupione / `maxPurchases` | bullet / heat na mapie | Location |
| Obserwowane vs kupione | program | konwersja zainteresowania (%) | słupki porównawcze | ObservedItem vs Purchase |
| Wybór wariantu | Standard/Premium | udział | donut | PurchaseAttribute |
| Popularność dodatków | atrybut | liczba wyborów | słupki | PurchaseAttribute |

### E. Finanse — JR i pieniądze
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Wolumen doładowań JR | data | JR + PLN | area z porównaniem | Transaction typ 10/11 |
| GMV (zakupy programów+bonusów) | data | JR | linia | Transaction typ 20/21 |
| Przychód z opłat dostępu | data | PLN | słupki | Payment typ 2 (dostęp) |
| MRR / abonamenty | miesiąc | suma `subscriptionFee` aktywnych | linia | Purchase aktywne |
| Struktura sald (6 kubełków) | kubełek | suma JR | słupki skumulowane / donut | agregat portfeli klientów |
| Wypłaty w czasie | data | JR + PLN | słupki | Transaction typ 60/61 |
| Zwroty w czasie | data | JR + PLN | słupki | ClientRequest / typ 62 |
| Śr. wartość klienta (ARPU) | segment/wiek/region | JR na klienta | słupki | Transaction / klienci |
| Rozkład wielkości doładowań | koszyk kwot | liczba transakcji | histogram | Transaction value |

### F. Płatności (operacyjnie)
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Wpłaty/Wypłaty/Zwroty | typ × data | liczba / PLN | słupki grupowane | Payment.type |
| Płatności wg statusu | status | liczba / % | donut (oczek./zaakcept./odrzuc.) | `Payment.status` |
| Skuteczność płatności | data | % zaakceptowanych | linia | Payment |
| Czas realizacji płatności | — | mediana godzin (`updatedAt-createdAt`) | histogram / box | Payment |
| Zaległości abonamentowe | klient/region | liczba z `nextPaymentDate` < dziś | KPI + tabela | Purchase |
| Status płynności klientów | bezpieczny/ostrz./zaległość | liczba | słupki | `paymentStatus` |

### G. Program partnerski
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Liczba partnerów w czasie | data | liczba | linia | `partnershipTermDate` |
| Rozkład wielkości struktur | koszyk (0/1–4/5–14/15+) | liczba partnerów | histogram | zliczenie `partnerOfId` |
| Prowizje naliczone vs wypłacone | data | JR | dwie serie / linia | Transaction typ 50 vs 61 |
| Top partnerzy | partner | prowizje / liczba poleconych | ranking (słupki) | Transaction×UserClient |
| Konwersja poleconych | partner | poleceni → z zakupem (%) | funnel | downline × Purchase |
| Progi prowizji — rozkład stawek | próg % | liczba partnerów | słupki | Threshold |

### H. Geografia (mapy)
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Choropleth regionów | województwo | klienci / GMV / zakupy | mapa PL | miasto→region |
| Heatmapa zakupów | geo | gęstość zakupów | mapa cieplna | Location lat/lng × Purchase |
| Top miasta wg GMV | miasto | JR | słupki | Purchase×miasto klienta |
| Gęstość lokalizacji vs popyt | region | lokalizacje vs zakupy | mapa + bąbelki | Location × Purchase |

### I. Treści / operacje
| Statystyka | Wymiar | Miara | Wykres | Źródło |
|---|---|---|---|---|
| Aktywność (logi) | data / typ | liczba zdarzeń | linia/heat | Log |
| Zgody RODO | typ zgody | % udzielonych | słupki | GdprAgreement |
| Publikacje treści | data | news/FAQ dodane | słupki | News/Faq |

---

## 5. Zestaw eksportów i tabel
- **Eksport XLS/CSV** dla każdego wykresu i dla przekrojowej tabeli użytkowników (już istnieje bazowo).
- **Tabela klientów z filtrami** (wiek, region, segment, saldo, status) — drill‑down z dowolnego wykresu.
- **Raport miesięczny** (PDF/XLS): KPI + kluczowe wykresy + top listy.

## 6. Prywatność i RODO (ważne)
- **PESEL to dane wrażliwe** — nigdy nie pokazywać indywidualnie w statystykach; używać wyłącznie **zagregowanych grup wiekowych/płci**.
- **Minimalna liczność koszyka** (np. ≥5) — nie renderować segmentów, które mogłyby zidentyfikować pojedynczą osobę.
- Statystyki oparte na **danych zanonimizowanych/zagregowanych**; PII (imię, e‑mail, telefon) tylko w tabeli operacyjnej dostępnej wg uprawnień `STATISTICS`/`USER_*`.
- Uprawnienia: sekcja gated rolą `STATISTICS` (podgląd/edycja), zgodnie z istniejącym systemem uprawnień CMS.

## 7. Priorytetyzacja (roadmap wdrożenia)
**Faza 1 (szybkie, największa wartość):** KPI top‑line · rejestracje/zakupy/JR w czasie z filtrami dat+granulacją · demografia (wiek, płeć, prywatni/firmy) · miasta/regiony (słupki + choropleth) · płatności wg statusu · lejek konwersji.
**Faza 2:** finanse (GMV, MRR, kubełki, wypłaty/zwroty) · program partnerski (struktury, prowizje, top) · obserwowane vs kupione · warianty/dodatki · mapy (heatmapa, choropleth GMV).
**Faza 3:** retencja kohortowa · ARPU wg segmentów · czas realizacji płatności · cross‑filtering + drill‑down + porównania okresów · raport miesięczny.

**Rekomendacja techniczna:** biblioteka wykresów interaktywnych (np. Recharts/ECharts) + warstwa API `/api/admin/statistics/*` przyjmująca wspólny obiekt filtrów `{ from, to, granularity, segment, ageGroup, gender, city, region, program, vip, source, partnerId, paymentStatus }`, zwracająca serie gotowe do wykresu. Agregacje po stronie SQL (grupowanie po dacie/mieście/typie) + wyliczenia demograficzne (PESEL→wiek/płeć, miasto→region) w warstwie serwisowej.
