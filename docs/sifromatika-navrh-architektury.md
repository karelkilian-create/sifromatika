# Šifromatika — návrh architektury (v0, k připomínkování)

> **Co je tento dokument.** Zadání projektu vzniklo v ChatGPT, technický návrh architektury
> vypracoval Claude. Tenhle dokument je shrnutí návrhu **včetně míst, kde se s původním
> zadáním rozchází**, a vrací se ChatGPT k oponentuře. Je psaný soběstačně — nepředpokládá
> znalost předchozí konverzace.
>
> **Stav:** návrhová fáze uzavřena. Závazný rozsah první verze viz [`rozsah-0.1.md`](./rozsah-0.1.md).
> Sekce 9 a 10 tohoto dokumentu jsou tím zodpovězené a zůstávají jen jako záznam rozhodování.

---

## 1. Zadání v kostce

Webová aplikace pro učitele ZŠ (primárně 3.–5. ročník, později 6.–9.), která během několika
sekund vytvoří matematickou šifrovací hru.

Učitel zadá tajenku, např. `POKLAD JE U BAZÉNU`, a aplikace vygeneruje:
šifrovací tabulku, souřadnice tajenky, matematické příklady, pracovní list, řešení a PDF k tisku.

**Technická omezení:** React + TypeScript + Vite, PWA, **bez backendu**, veškeré generování
lokálně v prohlížeči. Musí fungovat na Windows / Linux / macOS / tabletech / mobilech.
Open source, GitHub.

**Nastavitelné:** text tajenky, počet řádků a sloupců, četnost opakování písmen, obtížnost,
typy příkladů (sčítání, odčítání, násobení, dělení, slovní úlohy, geometrie, převody jednotek,
jednoduché rovnice).

**Pravidla ze zadání:**
- Písmena se nesmí v tabulce vyskytnout jen jednou; častá písmena se opakují.
- Stejné písmeno v tajence by mělo pokud možno pokaždé použít jinou souřadnici.
- Stejný výsledek má mít více různých příkladů (24 = `18+6` = `30−6` = `6×4` = `48÷2`),
  program je náhodně střídá.

**Dlouhodobý cíl:** Šifromatika není jedna hra, ale platforma pro matematické aktivity.
Později: bingo, domino, pexeso, bludiště, QR hry, únikové hry, matematické stezky, pracovní listy.

---

## 2. Hlavní architektonické rozhodnutí

**Šifra a matematika jsou dvě nezávislé vrstvy, které o sobě navzájem nevědí.**

```
tajenka ──► [ VRSTVA ŠIFRY ] ──► seznam cílových hodnot ──► [ VRSTVA ÚLOH ] ──► pracovní list
              mřížka, rozmístění      [24, 7, 56, 12, …]      18+6, 63−56, …
              písmen, souřadnice
```

Vrstva šifry říká jen: *„potřebuji 17 úloh, jejichž výsledky budou postupně 24, 7, 56, …"*
Vrstva úloh říká jen: *„umím vyrobit úlohu s výsledkem 24 v obtížnosti 4. třídy, typ násobení."*

**Proč je to zásadní pro dlouhodobý cíl:** vrstva úloh je jediná věc, kterou budou všechny
budoucí moduly sdílet. Bingo, domino, pexeso i bludiště jsou jen jiné způsoby, jak spotřebovat
množinu úloh s předepsanými výsledky. Když se tahle vrstva navrhne dobře teď, druhý modul je
otázka víkendu. Když se zamíchá do šifrovacího generátoru, bude se za rok přepisovat všechno.

To je celý „platformní" argument. Zbytek je detail.

---

## 3. Sporné body oproti původnímu zadání

Tohle je nejdůležitější část dokumentu. Sedm míst, kde návrh mění původní představu.

### 3.1 Nastavení nejsou nezávislá — jsou provázaná

Zadání nechává uživatele volně nastavit *řádky*, *sloupce*, *obtížnost* a *typy příkladů*. Jenže:

- mřížka 10×10 s lineárním číslováním potřebuje výsledky 1–100,
- 3. třída, jen sčítání a odčítání do 20, umí vyrobit výsledky 0–20,
- → **neřešitelné.** Aplikace buď spadne, nebo tiše vyrobí příklady mimo zadanou obtížnost.

Není to okrajový případ — uživatel na to narazí během prvních pěti minut.

**Návrh:** obrátit směr odvození. Primární vstup je *tajenka + ročník*. Z obtížnosti vyplyne
**dosažitelný obor výsledků**, z něj se odvodí schéma kódování a velikost mřížky. Rozměry
zůstanou jako *volitelný override* v pokročilém nastavení s okamžitou validací
(*„s tímto nastavením lze vyrobit nejvýše 6×6 — chceš povolit i násobilku do 100?"*).

Vyžaduje to **feasibility checker** jako součást jádra, ne jako validaci ve formuláři. Vrací
buď `Ok`, nebo `Infeasible` se seznamem konfliktů a **návrhy relaxace**.

### 3.2 Frekvence písmen — zadání používá špatnou frekvenci

Zadání říká: *„častá písmena (A,E,O,N,T,S,R,L…) se budou v tabulce opakovat."* To je obecná
frekvence češtiny. Pro tenhle účel jsou ale potřeba **dvě různé frekvence a každá řeší něco jiného**:

1. **Frekvence v konkrétní tajence** — určuje, kolik buněk daného písmene *musí* v tabulce být.
   Když je v tajence 3× „U", je potřeba ≥3 buňky s „U", jinak nelze splnit požadavek na různé
   souřadnice.
2. **Obecná frekvence češtiny** — určuje **klamná (výplňová) písmena**. To zadání neřeší vůbec,
   ale je to klíčové pro kvalitu hry: **pokud tabulka obsahuje jen písmena z tajenky, žák ji
   uhodne bez počítání.** Tabulka musí obsahovat věrohodný šum, a jeho rozložení podle češtiny
   je přesně to místo, kam obecná frekvence patří.

### 3.3 „Stejné písmeno pokaždé jiná souřadnice" je měkké omezení

Nemůže to být tvrdý požadavek — tajenka `ANANAS V MARMELÁDĚ` má 5× „A" a při malé mřížce se to
nevejde. Je potřeba definované pořadí ústupků:

1. různá souřadnice pro každý výskyt (ideál),
2. různá, dokud zásoba stačí, pak recyklovat tu nejvzdálenější,
3. sdělit uživateli: *„písmeno A se opakuje, zvětšit mřížku?"*

Generátor musí vracet explicitní `RelaxationLog`, který jde zobrazit v UI. **Tichá degradace je
horší než chyba.**

### 3.4 Generování úlohy „pozpátku z výsledku" nefunguje pro polovinu typů

Pro `18+6 = 24` je zpětné generování triviální. Pro **slovní úlohy, geometrii a převody jednotek
je katastrofální** — vzniknou zadání typu *„Jana koupila 47 rohlíků a 23 snědla"* nebo obdélník
se stranami 1 a 137 cm.

**Návrh: generovat dopředu, přiřazovat zpětně.** Generátor vyrobí *zásobník* přirozených úloh
v dané obtížnosti, ty se zaindexují podle výsledku, a vrstva šifry si z indexu vybírá.

Kontrakt generátoru tedy potřebuje oba režimy:

```ts
interface TaskGenerator {
  id: string
  supports(profile: DifficultyProfile): boolean
  /** Které hodnoty vůbec umím vyrobit? Vstup pro feasibility check. */
  reachableValues(profile: DifficultyProfile): ValueSet
  /** Přímý režim — levný pro aritmetiku. Smí vrátit null. */
  generateForValue(target: number, ctx: GenContext): Task | null
  /** Zásobníkový režim — pro slovní úlohy a geometrii. */
  generatePool(ctx: GenContext, count: number): Task[]
}
```

Aritmetika implementuje `generateForValue`. Slovní úlohy implementují jen `generatePool` a z toho
druhého vrací `null`. Přiřazovací vrstva si poradí s obojím.

### 3.5 Zadání úlohy nesmí být `string`

Jakmile přibude geometrie, je potřeba SVG obrázek. Jakmile přibudou slovní úlohy, je potřeba
odstavec textu, který se do buňky mřížky nevejde. `prompt: string` se bude přepisovat.

```ts
type PromptNode =
  | { kind: 'expr';   latexLike: string }              // 18 + 6 =
  | { kind: 'text';   runs: TextRun[] }                // slovní úloha
  | { kind: 'figure'; svg: SvgSpec; caption?: PromptNode }

interface Task {
  id: string
  generatorId: TaskTypeId
  value: number
  prompt: PromptNode
  solutionSteps: PromptNode[]
  difficultyScore: number
  footprint: 'inline' | 'halfBlock' | 'fullBlock'   // ← pro sazbu listu
}
```

`footprint` je ta důležitá část. Bez ní se sazba rozpadne, jakmile se na jednom listu potká
`6×4` s třívětou slovní úlohou.

### 3.6 Přiřazení úloh k pozicím je párovací problém, ne cyklus

Naivní *„pro každou pozici vyber náhodnou úlohu s daným výsledkem"* vyrobí list, kde je pětkrát
`12+12` a nedodrží se poměr zaškrtnutých typů. Reálná omezení:

- žádné dvě identické úlohy na listu,
- respektovat poměr zaškrtnutých typů (uživatel zaškrtl 4 typy → čeká zhruba čtvrtiny),
- rozumné rozložení obtížnosti napříč listem,
- footprinty musí jít vysázet.

Greedy s backtrackingem stačí, ale musí to být **samostatný testovatelný modul**, ne `for` cyklus
schovaný v generátoru.

### 3.7 Ověření správnosti není nepovinné

Učitel to vytiskne pro 25 dětí. Tichá chyba = ztracená hodina a ztracená důvěra.
Do pipeline patří **povinný verifikační krok, který běží vždy, i v produkci**:

1. Dekóduj vygenerovaný list zpět (jen z tabulky + výsledků) → musí dát přesně původní tajenku.
2. Přepočítej každou úlohu nezávislým evaluátorem → musí sedět s deklarovanou hodnotou.
3. Žádný kód v tabulce nesmí ukazovat na dvě různá písmena.
4. Každá hodnota potřebná pro tajenku musí být v tabulce dosažitelná.

Při selhání generovat znovu s jiným seedem (max N pokusů), pak teprve hlásit chybu. Je to
zároveň ideální základ pro property-based testy.

### 3.8 Bonus: příliš mnoho nastavení = učitel to zavře

Sedm zaškrtávátek, obtížnost, řádky, sloupce, četnost opakování. Cílová skupina je učitel ZŠ,
který má pět minut mezi hodinami.

**Návrh UX:** primární obrazovka = *tajenka + ročník + tlačítko Vytvořit*. Nic víc. Výsledek
okamžitě, vedle tlačítko *„Jiná varianta"* (= seed + 1). Všechno ostatní za rozbalovacím
„Pokročilé nastavení". Presety typu *„4. třída – malá násobilka"* pokryjí 90 % použití.

---

## 4. Struktura projektu

```
sifromatika/
├─ docs/
│  ├─ adr/                        # architektonická rozhodnutí (proč, ne co)
│  └─ authoring-tasks.md          # jak napsat vlastní generátor úloh
├─ src/
│  ├─ core/                       # ČISTÉ TS. Žádný React, žádný DOM, žádné I/O.
│  │  ├─ rng/                     # seedovaný PRNG, deterministické shuffle/pick
│  │  ├─ text/                    # normalizace, diakritika, frekvence
│  │  ├─ model/                   # doménové typy + zod schémata + migrace verzí
│  │  ├─ constraints/             # feasibility checker, relaxační strategie
│  │  ├─ assignment/              # párování úloh na pozice
│  │  ├─ verify/                  # dekodér + evaluátor výrazů
│  │  └─ document/                # DocumentModel — render-agnostický popis listu
│  │
│  ├─ tasks/                      # ── VRSTVA ÚLOH (sdílená všemi moduly)
│  │  ├─ registry.ts
│  │  ├─ arithmetic/  equations/  units/  geometry/
│  │  └─ wordproblems/
│  │     ├─ engine.ts             # šablona + řešení slotů pod omezením
│  │     └─ templates/cs/*.json   # kurátorovaný obsah, ne kód
│  │
│  ├─ ciphers/                    # ── VRSTVA ŠIFER
│  │  ├─ registry.ts
│  │  ├─ grid-linear/             # výsledek = pořadové číslo buňky
│  │  └─ grid-coord/              # dvojice řádek/sloupec
│  │
│  ├─ activities/                 # ── MODULY (kompozice tasks + ciphers + sazba)
│  │  ├─ registry.ts
│  │  └─ cipher-grid/  { config, generate, verify, layout }
│  │
│  ├─ render/
│  │  ├─ screen/                  # React náhled
│  │  ├─ print/                   # @media print CSS
│  │  └─ pdf/                     # lazy chunk, embedovaný font
│  │
│  ├─ features/                   # UI řezy: editor, preview, export, presets
│  ├─ app/  i18n/
│  └─ storage/                    # IndexedDB presety + URL kodek konfigurace
│
└─ tests/
   ├─ property/                   # fast-check: „každý list jde dekódovat"
   └─ golden/                     # seed → snapshot; hlídá determinismus
```

**Pravidlo závislostí, vynucené lintem** (`dependency-cruiser` / `eslint-plugin-import`):

```
app → features → activities → { ciphers, tasks } → core
render → core                     (render nesmí do activities)
core → nic
```

`core` a `tasks` nesmí importovat React ani nic z `dom` lib. To je hranice, díky které bude
vrstva úloh za rok znovupoužitelná.

> **Poznámka k monorepu:** návrh záměrně **nezavádí pnpm workspace**. Pro solo OSS projekt ve
> fázi 0.1 přidává monorepo tření (build orchestration, verzování, releases) bez odpovídajícího
> přínosu. Hranice vynucené lintem dají 90 % užitku za 5 % ceny. Na workspace přejít až ve chvíli,
> kdy vznikne druhý konzument `core` (např. CLI pro hromadné generování).

---

## 5. Datový model

```ts
// ── Konfigurace (serializovatelná, verzovaná, putuje v URL) ──────────
interface ProjectConfig {
  schemaVersion: 1
  generatorVersion: number       // ⚠ změna mění determinismus, viz rizika
  activity: 'cipher-grid'
  seed: string
  locale: 'cs'
  payload: CipherGridConfig      // discriminated union podle activity
}

interface CipherGridConfig {
  message: string
  difficulty: DifficultyProfile
  taskMix: Partial<Record<TaskTypeId, number>>   // váhy, ne booleany
  cipher: {
    strategy: 'grid-linear' | 'grid-coord'
    grid?: { rows: number; cols: number }        // volitelný override
    distinctCellPerOccurrence: boolean
    decoyDensity: number                         // 0–1, podíl klamných písmen
  }
  output: { includeSolution: boolean; paper: 'A4'; columns: 1 | 2 }
}

interface DifficultyProfile {
  grade: 3 | 4 | 5 | 6 | 7 | 8 | 9
  numberRange: { min: number; max: number }
  allowNegatives: boolean
  crossesTen: boolean
  multiplicationTables: number[]     // [2,3,4,5,10]
  divisionExactOnly: boolean
  maxOperands: number
}

// ── Doména ───────────────────────────────────────────────────────────
interface NormalizedMessage {
  original: string
  letters: string[]                  // bez diakritiky, uppercase, bez mezer
  gaps: number[]                     // indexy hranic slov
  histogram: Map<string, number>
}

type CodeToken =
  | { kind: 'linear'; n: number }
  | { kind: 'coord'; row: number; col: number }

interface CipherTable {
  rows: number; cols: number
  cells: { code: CodeToken; letter: string; isDecoy: boolean }[]
}

interface CipherArtifact {
  table: CipherTable
  sequence: (CodeToken | { kind: 'gap' })[]   // 1:1 s tajenkou
  requiredValues: number[]                    // vstup pro vrstvu úloh
}

// ── Výstup ───────────────────────────────────────────────────────────
interface GenerationResult {
  config: ProjectConfig
  worksheet: DocumentModel
  solution: DocumentModel
  relaxations: RelaxationLog[]       // co se muselo ustoupit — zobrazit uživateli
  verification: { ok: true } | { ok: false; failures: string[] }
}
```

`DocumentModel` je **abstraktní popis stránky** (bloky, mřížky, obrázky, zalomení), nezávislý na
tom, jestli ho vykreslí React, print CSS nebo PDF. Bez téhle mezivrstvy se sazba píše třikrát
a pokaždé trochu jinak.

---

## 6. Osy rozšiřitelnosti

Tři nezávislé osy, každá s vlastním registrem:

| Osa | Kontrakt | Přidání nového znamená |
|---|---|---|
| **Typ úlohy** | `TaskGenerator` | jeden soubor v `tasks/`, zápis do registru |
| **Šifra / kódování** | `CipherStrategy` | jeden adresář v `ciphers/` |
| **Aktivita (modul)** | `Activity` | kompozice existujících úloh + vlastní sazba |

```ts
interface Activity<C> {
  id: string
  configSchema: ZodSchema<C>
  defaults(profile: DifficultyProfile): C
  checkFeasibility(cfg: C): FeasibilityReport
  generate(cfg: C, rng: Rng): GenerationResult
}
```

**Test správnosti návrhu:** bingo, domino ani pexeso nepotřebují novou šifru ani nový typ úlohy.
Jsou to čisté `Activity` implementace nad stávající vrstvou úloh. Proto je klíčové postavit druhý
modul **před** verzí 1.0 — do té doby je slovo „platforma" jen hypotéza.

---

## 7. Roadmapa 0.1 → 1.0

| Verze | Obsah | Kritérium „hotovo" |
|---|---|---|
| **0.1** | Chodící kostra. `grid-linear`, jen `+` a `−`, náhled na obrazovce, tisk přes print CSS. Seedovaný PRNG. Verifikace v pipeline. | Zadám tajenku, vytisknu list, dekóduju ho ručně a sedí. |
| **0.2** | `×`, `÷`, profily obtížnosti 3.–5. ročník, frekvence písmen, klamná písmena, různé souřadnice, feasibility checker s relaxacemi. | Property test: 10 000 náhodných konfigurací → 0 neverifikovatelných listů. |
| **0.3** | Skutečný PDF export (`@react-pdf/renderer`, embedovaný font s háčky), A4 sazba, oddělené řešení, lazy chunk. | Diakritika sedí na Win / macOS / Linux / iOS. |
| **0.4** | PWA + offline, konfigurace v URL hashi, presety v IndexedDB, „Jiná varianta". | Funguje v letadle. Odkaz poslaný kolegyni vygeneruje identický list. |
| **0.5** | Slovní úlohy — šablonový engine + kurátorovaná sada `cs` šablon. Převody jednotek. | 50+ šablon, žádná nesmyslná čísla. |
| **0.6** | Geometrie se SVG obrázky, jednoduché rovnice. Sazba v2 (footprinty, míchání inline/block). | List s mixem `6×4` a slovní úlohy vypadá dobře. |
| **0.7** | UX polish: presety podle ročníku, přístupnost (WCAG AA, klávesnice), dyslexie-friendly volby, tablet. | Učitel vyrobí list na tabletu do 60 s bez nápovědy. |
| **0.8** | **Druhý modul — matematické domino.** Bez jediné změny v `tasks/` a `core/`. | Pokud si vyžádá zásah do jádra, návrh byl špatný. Opravit teď, ne po 1.0. |
| **0.9** | i18n infrastruktura (cs, příprava sk/en), dokumentace pluginů, CONTRIBUTING, ADR, galerie příkladů. | Cizí člověk přidá typ úlohy jen podle dokumentace. |
| **1.0** | Zmrazení: `schemaVersion: 1` stabilní, determinismus garantovaný, licence, CI, changelog. | Odkaz vytvořený v 1.0 funguje i v 1.9. |

---

## 8. Technická rizika

**1. Drift determinismu — nejzávažnější.**
Sdílený odkaz obsahuje seed. Jakmile se ve verzi 0.6 změní pořadí volání PRNG, všechny existující
odkazy vygenerují jiný list. Učitel má vytištěné řešení z minulého týdne a nesedí.
*Mitigace:* `generatorVersion` v konfiguraci; golden testy (seed → hash výstupu) v CI, které
selžou při každé nechtěné změně; při nesouladu verzí buď zachovat starý generátor v bundlu, nebo
uživatele explicitně varovat — ale nikdy tiše vygenerovat něco jiného.

**2. Neřešitelné konfigurace.** Viz 3.1. Bez feasibility checkeru v jádru to bude nejčastější
položka v bug trackeru.

**3. PDF a čeština.** `jsPDF` výchozími fonty háčky a čárky neumí. Embedovaný font
(Noto Sans / Source Sans 3) má 200–400 kB → **musí být v lazy chunku**, jinak trpí první načtení
na mobilu. Zkontrolovat licenci fontu (SIL OFL je v pořádku).
*Proto verze 0.1 používá print CSS:* nulová velikost bundlu, dokonalá diakritika, funguje všude.
Skutečné PDF až v 0.3 — jinak je to měsíc práce před prvním použitelným výstupem. Print CSS má
horší kontrolu nad zalomením stránky, proto ho v 0.3 nahradí `@react-pdf/renderer`, ale ne dřív.

**4. Výkon a paměť na starších tabletech.** Generování PDF o 30 stranách na čtyři roky starém
iPadu umí spadnout. Generovat ve Web Workeru, držet hlavní vlákno responzivní, omezit počet stran.

**5. Pedagogická kvalita slovních úloh.** Volně generované slovní úlohy bývají nesmyslné nebo
kulturně divné. *Mitigace:* šablony jako **kurátorovaný obsah v JSON, ne v kódu** — může je
připomínkovat učitel bez znalosti programování. V UI krok „zkontroluj před tiskem".

**6. Rozsah.** Osm modulů v plánu, jeden vývojář. Oddělené vrstvy jsou obrana, ale skutečná
obrana je nedělat modul 3 dřív, než je modul 1 opravdu hotový.

**7. Kombinatorická exploze v testování.** Ručně psané testy tenhle prostor nepokryjí.
`fast-check` s invariantem *„každá platná konfigurace vede k dekódovatelnému listu"* najde víc
chyb za hodinu než měsíc unit testů.

**8. Mobil na vstupu.** Editor pracovního listu na telefonu je bolestivý. Doporučení: telefon =
**náhled a tisk**, autoring optimalizovaný pro tablet a desktop. Přiznat to je lepší než dělat
všude polovičatý kompromis.

---

## 9. Otázka rozsahu — TOHLE JE HLAVNÍ ROZHODNUTÍ

> **Rozhodnuto:** varianta A+ (architektura jako B, implementace jako A).
> Detail viz [`rozsah-0.1.md`](./rozsah-0.1.md).

Zadavatel po přečtení návrhu poznamenal, že se to zdá **složitější, než čekal**. To je legitimní
reakce a je potřeba ji vyřešit dřív, než se napíše první řádek kódu.

Návrh výše je „úplný". Existují ale tři reálné varianty startu:

### Varianta A — Minimum (odhad: víkend až týden)
Jedna šifra (`grid-linear`), jen `+ − × ÷`, žádné slovní úlohy, žádná geometrie, tisk přes
print CSS, žádné PWA, žádné sdílení odkazem. Vrstvy `core` / `tasks` / `ciphers` **oddělené**,
ale minimální — jen tolik, aby šlo později přidat další typ úlohy bez přepisování.

- **Pro:** použitelný výstup skoro okamžitě, ověří se, jestli o to učitelé vůbec stojí.
- **Proti:** není to platforma, je to jedna hra. Pokud se rozroste, bude potřeba refaktoring —
  ale malý, protože hranice vrstev jsou od začátku správně.
- **Vypuštěno oproti návrhu:** feasibility checker (nahrazen tvrdými limity ve formuláři),
  párovací modul (nahrazen jednoduchým výběrem s kontrolou duplicit), `PromptNode` AST
  (stačí `string`, dokud nejsou slovní úlohy a geometrie).

### Varianta B — Solidní základ (odhad: několik týdnů)
Verze 0.1–0.4 z roadmapy. Kompletní aritmetika, feasibility checker, klamná písmena, skutečné
PDF, PWA, sdílení odkazem. Slovní úlohy a geometrie **zatím ne**, ale kontrakty na ně připravené.

- **Pro:** hotový produkt, který učitel reálně používá. Architektura unese pokračování.
- **Proti:** slovní úlohy a geometrie ze zadání zatím chybí.

### Varianta C — Plný návrh (odhad: měsíce)
Celá roadmapa 0.1–1.0 včetně druhého modulu.

---

**Doporučení Claudea: varianta B, ale postavená v pořadí varianty A.**
Tedy: začít minimem, ale s vrstvami oddělenými od prvního commitu, a přidávat po jedné položce
z roadmapy. Rozdíl v ceně mezi „minimum s dobrými hranicemi" a „minimum s hranicemi zamíchanými"
je v praxi jeden až dva dny; rozdíl v ceně pozdějšího refaktoringu jsou týdny.

Konkrétně to znamená: **složitost návrhu neznamená složitost prvního kroku.** Sekce 4 a 5 popisují
cílový stav, ne to, co musí existovat ve verzi 0.1. Ve verzi 0.1 je většina těch adresářů prázdná
nebo obsahuje třicetiřádkový soubor.

---

## 10. Otevřené otázky pro ChatGPT

> **Zodpovězeno.** Odpovědi a výsledná rozhodnutí jsou zapracované v [`rozsah-0.1.md`](./rozsah-0.1.md) §3.

Prosím o oponenturu, ne o souhlas. Konkrétně:

1. **Sekce 3.1 (obrácení směru odvození):** souhlasíš, že nechat uživatele volně nastavit rozměry
   mřížky nezávisle na obtížnosti je chyba? Nebo vidíš způsob, jak to udržet a přitom vyřešit
   neřešitelné kombinace?

2. **Sekce 3.4 (dopředné generování místo zpětného):** je to podle tebe správná diagnóza problému
   se slovními úlohami a geometrií? Existuje elegantnější řešení než zásobník + indexace?

3. **Sekce 3.2 (klamná písmena):** původní zadání s nimi nepočítá. Souhlasíš, že bez nich jde
   tajenka uhodnout bez počítání, a že je to zásadní vada herního designu, ne kosmetika?

4. **Sekce 9 (volba rozsahu):** která varianta A / B / C dává smysl pro jednoho vývojáře
   s neurčitým časovým rozpočtem? Je doporučení „B v pořadí A" rozumné, nebo je to falešný
   kompromis?

5. **Rozhodnutí nezavádět monorepo** (poznámka na konci sekce 4): souhlasíš, nebo to považuješ
   za krátkozraké vzhledem k plánovaným osmi modulům?

6. **Chybí v návrhu něco podstatného?** Zvlášť z pohledu pedagogického, ne technického —
   znáš cílovou skupinu ze zadání. Je něco, co učitel ZŠ bude potřebovat a co tady není?

7. **Formát hry:** návrh předpokládá, že výsledek příkladu ukazuje na buňku v tabulce (přímo,
   nebo přes dvojici souřadnic). Existuje varianta šifrovací hry běžná v českých školách,
   která do tohoto modelu nezapadá a se kterou by se mělo počítat?
