# Sdílení odkazem — návrh

**Stav: hotovo a v kódu** (19. 8. 2026). Sepsáno téhož dne, `main` tehdy na
commitu `d25bd6c`. Co se při implementaci odchýlilo, je v §12.
Krok 3 z pořadí dohodnutého 18. 8. Bere se dřív než „uvolnit celé výsledky
ve hrách" (krok 2), protože ten čeká na čtvrteční tisk 20. 8.

Stav před zásahem: 460 testů, `GENERATOR_VERSION` 5, pět aktivit,
uložení a otevření `.sifra` hotové (`src/storage/sifra.ts`).

---

## 0. Verdikt na jednu obrazovku

Sdílení odkazem **není nový formát ani nová vrstva**. Je to čtvrtý konzument
téže serializace, kterou už `.sifra` používá: konfigurace → text → konfigurace.
Práce je tedy hlavně v obalu (kam se text schová v URL) a v UI (jedno tlačítko,
tři úrovně nouzového plánu).

Tři rozhodnutí, která návrh dělá:

1. **Konfigurace jde do fragmentu URL (`#s=…`), ne do dotazu (`?s=…`).**
   Fragment prohlížeč na server neposílá. Tajenka tak nikdy neopustí zařízení
   ani při běhu na Vercelu — nezapíše se do přístupových logů, které nikdo
   z nás nečte, ale existují.
2. **Odkaz nese tentýž JSON jako soubor `.sifra`.** Žádný zkrácený tvar. Stojí
   to délku (změřeno: **974 znaků** pro běžnou šifru), ušetří to druhý formát,
   druhý parser a druhou příležitost k rozejití.
3. **`navigator.share` s dvojím záložním plánem.** Na telefonu nativní nabídka,
   na desktopu schránka, a když ani to ne, pole s odkazem k ručnímu zkopírování.

Odhad: 1–2 hodiny. `GENERATOR_VERSION` se **nemění** — výstup generátoru
zůstává bit po bitu stejný, mění se jen cesta, kterou konfigurace přijde.

---

## 1. Co učitel udělá

Kolegyně v kabinetě: „pošli mi to bingo, co jsi ukazoval."

1. Karel má list na obrazovce, klikne **Sdílet**.
2. Na telefonu vyskočí systémová nabídka (Messenger, WhatsApp, mail, SMS),
   vybere kolegyni, odešle.
3. Kolegyně klikne na odkaz. Otevře se Šifromatika **s tím listem** —
   se stejnou tajenkou, stejným ročníkem, stejnými příklady. Může tisknout,
   nebo si sáhnout na ročník a udělat si svou variantu.

Na tom scénáři stojí rozhodnutí z 9. 8., že se sdílí **konkrétní list, a ne
odkaz na aplikaci**: odkaz na nástroj je informace, kterou kolegyně už má.

---

## 2. Rozhodnutí: fragment, ne dotaz

|  | `#s=…` (fragment) | `?s=…` (dotaz) |
|---|---|---|
| Odejde na server | ne, nikdy | ano, při každém načtení |
| Skončí v logu Vercelu | ne | ano, i s tajenkou |
| Délka | prakticky bez limitu | limit hlavičky (8 kB) |
| Čtení v kódu | `location.hash` | `URLSearchParams` |
| Nasdílení do Messengeru | funguje stejně | funguje stejně |

**Fragment.** Rozdíl je jediný a zásadní: Šifromatika o sobě tvrdí, že se nic
nikam neodesílá (README, první odstavec). Dotazový parametr by z toho udělal
polopravdu — tajenky by se tiše hromadily v access logu hostingu. Fragment to
tvrzení drží doslova, protože prohlížeč všechno za `#` serveru neposílá.

Prefix `s` je zároveň místo pro verzi kódování: kdyby někdy přibyla komprese,
bude to `#z=…` a stará aplikace nový odkaz poctivě odmítne místo toho, aby
z něj vyrobila nesmysl.

---

## 3. Rozhodnutí: odkaz nese tentýž JSON jako `.sifra`

Změřeno na běžné šifře (`POKLAD JE U BAZÉNU`, 4. třída, výchozí nastavení):

| varianta | délka odkazu | cena |
|---|---|---|
| **base64url z JSONu `.sifra`** | **974 znaků** | žádná |
| deflate + base64url | 625 znaků | asynchronní API, dvě kódování, záložní větev pro starší Safari |
| zkrácený tvar (jen `grade` místo celého profilu) | ~450 znaků | druhý formát, druhý parser, odkaz přestane být věrný souboru |

**Beru prvních 974 znaků.** Argument pro kompresi vypadá silně (třetina pryč),
ale nekupuje nic, co by učitel poznal: odkaz je nečitelný shluk znaků v obou
případech a nikdo ho nebude číst ani přepisovat. Kupuje jen dva kódovací
formáty a jednu větev navíc, která půjde rozbít.

Fragment se navíc na server neposílá, takže limit 8 kB na hlavičku ani limity
Vercelu tady vůbec neplatí — 974 znaků je daleko od čehokoli, co by praskalo.

Zkrácený tvar má horší vadu než délku: konfigurace nese celý profil obtížnosti
schválně, aby se dřív uložený list vytiskl stejně i po změně profilu ročníku.
Odkaz, který by nesl jen `grade`, by se za rok tiše rozešel — a šlo by o týž
list, jednou uložený, jednou odkázaný.

---

## 4. Rozhodnutí: Web Share a dvojí záložní plán

```
klik na „Sdílet"
   │
   ├── 'share' in navigator ────► systémová nabídka (Android, iOS, Windows)
   │                              zrušení uživatelem = ticho, žádná hláška
   │
   ├── jinak: navigator.clipboard ─► „Odkaz zkopírován do schránky."
   │                                 (desktopový Chrome, Firefox — HTTPS)
   │
   └── jinak: pole s odkazem ─────► označené k ručnímu zkopírování
                                    (http://localhost bez HTTPS, staré prohlížeče)
```

Sdílí se `{ title, url }` bez pole `text`. Messenger a WhatsApp jinak pošlou
dvě samostatné zprávy — popisek a pod ním odkaz — a vypadá to jako překlep.

Soubor `.sifra` se přes systémovou nabídku **neposílá**. Chrome na Androidu
povoluje jen vybrané MIME typy a `application/json` mezi nimi není; skončilo
by to tichým selháním v jednom prohlížeči z pěti.

Tlačítko je vedle **Uložit** a je nedostupné za téže podmínky (`canPrint`):
list, který neprošel kontrolou, se netiskne, neukládá **ani neposílá kolegyni**.

---

## 5. Co se stane při otevření odkazu

1. Aplikace při startu přečte `location.hash`. Není-li tam `s=`, nic se neděje.
2. Obsah se dekóduje a projde **týmž parserem jako soubor** — včetně kontroly
   formátu, verze schématu a validace payloadu aktivitou. Vstup z odkazu je
   stejně nedůvěryhodný jako vstup ze souboru; navíc ho lze upravit v adresním
   řádku, takže žádné `as` bez ověření.
3. Přepočítá se kontrolní součet. Nesedí-li, učitel dostane touž hlášku jako
   u souboru: list se otevře, ale s varováním, že ho tahle verze počítá jinak.
4. Nedá-li se odkaz přečíst vůbec, aplikace nastartuje prázdná a řekne proč.
   Prázdná Šifromatika je horší než sdílený list, ale nekonečně lepší než bílá
   obrazovka.

**Hash zůstane v adresním řádku, dokud učitel do formuláře nesáhne**; první
úpravou se uklidí (`history.replaceState`). Důvod: na telefonu se prohlížeč
běžně sám restartuje a obnovení stránky musí vrátit tentýž list, ne prázdný
formulář. Jakmile ale učitel začne měnit ročník nebo tajenku, ukazuje URL na
něco jiného, než co má na obrazovce — a to je přesně chvíle, kdy má zmizet.

Chybové hlášky dnes mluví o „souboru" („Tenhle soubor nepochází ze
Šifromatiky."). U odkazu by to znělo divně, takže parser dostane parametr
zdroje (`'file' | 'link'`), který vybere podstatné jméno. Pět hlášek,
jeden parametr — kódy chyb a překladová tabulka by tu byly nastřelování
z děla na komára.

---

## 6. V odkazu je i řešení

Kdo má odkaz, má tajenku. To se nedá obejít — celý smysl je, že kolegyně
dostane tentýž list — ale dá se to říct. Po úspěšném sdílení nebo zkopírování
se objeví jedna věta:

> Odkaz zkopírován. Je v něm i řešení — posílej ho kolegům, ne dětem.

Jednou, v běžném banneru, bez vykřičníku a bez modálního okna. Učitel to
potřebuje vědět jednou; podruhé už to ví a otravovalo by ho to.

---

## 7. Kód

Nové soubory:

```
src/storage/share-link.ts        kódování a dekódování odkazu
src/storage/share-link.test.ts   testy podle §8
```

Podpisy:

```ts
/** Konfigurace → celý odkaz včetně domény. */
export function buildShareLink(base: string, config: ProjectConfig, checksum: string): string

/** `location.hash` → výsledek parseru, nebo `null`, když v hashi žádný list není. */
export function readShareLink(hash: string): SifraParseResult | null
```

Zásahy do stávajícího:

| soubor | co se změní |
|---|---|
| `src/storage/sifra.ts` | vytáhne se `buildSifraFile()` a `parseSifraObject()`, aby soubor i odkaz sdílely **jeden** validátor; `parseSifra` dostane parametr zdroje pro znění hlášek |
| `src/features/editor/EditorPanel.tsx` | tlačítko **Sdílet** vedle Uložit, prop `onShare`, blokované stejně jako Uložit |
| `src/app/App.tsx` | `handleShare`, čtení hashe v inicializátoru stavu (ne v efektu — v App je dnes jediný `useEffect` a je na měření šířky okna), úklid hashe při první úpravě |
| `src/app/app.css` | styl pole s odkazem pro třetí úroveň záložního plánu |

`share-link.ts` nesahá na DOM: `TextEncoder`, `btoa`/`atob` jsou k dispozici
i v Node, takže modul jde testovat bez prohlížeče. Vrstvy podle
`.dependency-cruiser.cjs` zůstávají — `storage` volá `activities/registry`
stejně jako dnes, nic nového nepřibývá.

---

## 8. Testy

1. **Golden „konfigurace → odkaz → konfigurace"** pro všech pět aktivit:
   obnovený list má tentýž kontrolní součet i tytéž příklady. To je stejná
   záruka, jakou má dnes `.sifra` (DoD bod 8).
2. **Diakritika.** Tajenka `POKLAD JE U BAZÉNU` se vrátí znak po znaku —
   base64 přes `btoa` se na české Ú a Ě rozbije, když se mezi ně nevloží
   `TextEncoder`. Test to zamkne.
3. **Nedůvěryhodný vstup.** Prázdný hash, `#s=@@@`, base64 z cizího JSONu,
   base64 z konfigurace s neznámou aktivitou → pokaždé chybová hláška,
   nikdy výjimka a nikdy tichý převod na jinou aktivitu.
4. **Vlastnostní test** (fast-check už v projektu je): libovolný řetězec
   přežije zakódování a dekódování beze změny.
5. **Strop délky.** Nejdelší přípustná tajenka (24 písmen, `MESSAGE_LETTER_LIMITS.max`)
   ve všech pěti aktivitách dá odkaz do 1 500 znaků. Test je pojistka proti
   tomu, aby budoucí pole v konfiguraci délku nafoukla bez povšimnutí.

---

## 9. Co v tomhle kroku NEDĚLÁME

- **Posílání souboru `.sifra` přes systémovou nabídku** — viz §4.
- **Zkracovač odkazů.** Krátký odkaz znamená server, databázi a tajenky
  uložené u někoho jiného. Tím by padlo „nic se nikam neodesílá".
- **QR kód.** Dává smysl (promítnout na tabuli), ale je to samostatná věc
  s vlastní knihovnou a vlastním tiskovým místem. Až si o něj Karel řekne.
- **Odkaz jen na zadání, bez řešení.** Šlo by to (příznak v konfiguraci), ale
  znamenalo by to druhý druh odkazu a otázku „který jsem to poslal". Věta
  z §6 stojí nic a řeší tentýž problém.

---

## 10. Druhá půlka kroku 3: zapamatovat poslední nastavení

V dohodnutém pořadí je u kroku 3 i „zapamatovat poslední nastavení". Patří
k sobě, protože použije tutéž serializaci: do `localStorage` se uloží týž JSON
a při startu se načte, když v URL žádný odkaz není. Pořadí uvnitř kroku:

```
odkaz v URL   >   localStorage   >   výchozí formulář
```

Navrhuju to udělat **až po sdílení, jako samostatný commit**. Je to patnáct
řádků, ale má vlastní otázku k rozhodnutí: obnovovat i **seed** (učitel najde
přesně ten list, co měl včera), nebo jen nastavení (najde svou tajenku, ale
jinou variantu)? Doporučuju obnovovat i seed — kdo chce jiný, má tlačítko
Jiná varianta; kdo si list vytiskl a hledá ho zítra, ten druhou šanci nemá.

---

## 11. Plán práce a jak se to ověří

| # | krok | ověření |
|---|---|---|
| 1 | `share-link.ts` + testy §8 | `npm run check` |
| 2 | refaktor `sifra.ts` na sdílený validátor | `npm run check`, stávající testy `.sifra` musí projít beze změny |
| 3 | čtení odkazu při startu (`App.tsx`) | odkaz vložený do adresního řádku otevře týž list |
| 4 | tlačítko Sdílet a záložní plány | v prohlížeči na desktopu: schránka; DevTools → simulace mobilu na fallback nesáhne |
| 5 | nasazení a zkouška na telefonu | **tohle udělá Karel** — systémová nabídka jde vyzkoušet jen na skutečném telefonu přes HTTPS |

Krok 5 nejde odbýt v testech: `navigator.share` na desktopovém Chrome pod
Linuxem neexistuje, takže nativní cestou v tomhle prostředí neprojde ani
jeden řádek. Za hotové to prohlásíme, až odkaz doopravdy dorazí z telefonu
do Messengeru a otevře se z něj správný list.

---

## 12. Co se odchýlilo

**1. Hlášky jsou tabulka celých vět, ne jedno skloňované podstatné jméno.**
§5 sliboval parametr, který vybere slovo. Čeština si to nedala líbit:
„Souboru chybí…" a „Nastavení v odkazu je…" se liší pádem i stavbou věty.
V `sifra.ts` je proto `MESSAGES: Record<SifraSource, …>` se šesti větami pro
každý zdroj. Vedlejší přínos, se kterým se nepočítalo: všechny hlášky, které
učitel u souboru i odkazu uvidí, jsou teď vedle sebe na jedné obrazovce.

**2. Prázdný `#s=` je chyba, ne „žádný odkaz".** Návrh počítal jen s dvojicí
„odkaz je / není". Prázdný klíč je ale třetí stav: odkaz existoval a cestou se
rozpadl. Mlčení by v té chvíli vypadalo jako rozbitá aplikace.

**3. Třetí plán musí umlčet předchozí hlášku.** Ukázal to až náhled v prohlížeči
(§11 krok 4), testy o tom nevěděly: po prvním sdílení do schránky a druhém,
které schránku nemělo, stály nad sebou „Odkaz zkopírován" a „Zkopíruj odkaz
a pošli ho". Dvě věty, které si protiřečí. `copyShareLink` teď v záložní větvi
hlášku ruší.

**4. Odkaz měří 961 znaků, ne 974.** Změřeno v běžící aplikaci na `localhost`;
na doméně `sifromatika.cz` vyjde o pár znaků víc podle délky adresy. Rozdíl
proti odhadu z §3 je v délce seedu, ne v konfiguraci — na rozhodnutí nic nemění.

**5. Kontrola v prohlížeči odhalila past, do které se dá spadnout i příště:**
nastavení `location.href` na odkaz se **stejnou** cestou a jiným fragmentem
stránku znovu nenačte. Prohlížeč jen změní hash a React běží dál, takže
„obnovený" list byl pořád ten původní. Ověřovat sdílení odkazem má smysl jedině
po skutečném načtení (`location.reload()` nebo nová karta) — jinak test vypadá,
že prošel, a přitom neproběhl.

**Co zůstalo přesně podle návrhu:** fragment místo dotazu, jeden formát
společný se souborem, tři cesty sdílení, kontrola součtu při otevření, úklid
hashe až při první úpravě, věta o řešení a odmítnutí komprese i zkracovače.
