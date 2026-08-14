# Registr aktivit (`ActivityModule`)

**Stav: hotovo**, včetně kroku 5. Schváleno a implementováno 14. 8. 2026.
Co se v implementaci ukázalo jinak, než návrh čekal, je v §10.

Vychází z `docs/SIFROMATIKA-EVALUATION.md` §C.1 a §D (CHANGE 1 a 3).
Stav před zásahem: 11 testovacích souborů, 207 testů, vše zelené.
Stav po zásahu: 12 souborů, 222 testů, `npm run check` čistý.

---

## 1. Co se dnes větví na aktivitu

Ověřeno v kódu, ne z paměti — je to **pět** míst, ne čtyři:

| Soubor | Místo | Co tam je |
|---|---|---|
| `app/App.tsx:112` | `checksumFor` | `if (config.activity === 'cipher-grid')` |
| `app/App.tsx:128` | `generated` v `useMemo` | ternár volající jeden ze dvou generátorů |
| `app/App.tsx:280,305` | dva bloky náhledu | každý s vlastní sestavou `WorksheetView` + `SolutionView` |
| `features/editor/state.ts:44,83` | `toConfig` / `fromConfig` | větev na překlad stavu formuláře |
| `storage/sifra.ts:114` | `parseConfig` | větev na validaci payloadu |
| `features/editor/EditorPanel.tsx:58` | `isCipher` | která pole formuláře se ukážou |

Šesté místo je `INITIAL_EDITOR_STATE` v `state.ts:20` — plochý objekt, kde jsou
vedle sebe pole obou aktivit (`message` i `taskCount`).

S dvěma aktivitami to nikoho netlačí. S pátou je to pět souběžných větvení
a zapomenutá větev v `sifra.ts` znamená soubor, který jde uložit a nejde otevřít.

---

## 2. Cíl

Přidání třetí aktivity = **jeden nový adresář a jeden řádek v registru**.
Žádný soubor mimo `activities/` se nesmí kvůli nové aktivitě otevírat.

Výjimka, kterou navrhuji vědomě ponechat: `EditorPanel` (viz §7).

---

## 3. Kontrakt

Nový soubor `src/activities/contract.ts` — čistě deklarativní, závislý jen na `core`.

```ts
/** Pole formuláře, která má každá aktivita: ročník, název, operace. */
export interface SharedEditorState {
  grade: Grade
  title: string
  operations: Record<OperationTag, boolean>
}

/**
 * Jedna aktivita, celá.
 *
 * `State` je slice formuláře jen pro tuhle aktivitu, `Cfg` její payload
 * v `.sifra`, `Sheet` výsledek generování.
 */
export interface ActivityModule<State, Cfg, Sheet> {
  info: ActivityInfo                       // už existuje v registry.ts

  /** Výchozí hodnoty slice formuláře. */
  initialState: State

  /** Formulář → konfigurace. Shared pole přicházejí zvlášť. */
  toConfig(state: State, shared: SharedEditorState, seed: string): Project<Cfg>

  /** Konfigurace → slice formuláře. Shared pole čte shell sám. */
  fromConfig(config: Project<Cfg>): State

  /** Validace payloadu z .sifra. `null` = poškozený nebo cizí. */
  parsePayload(raw: unknown): Cfg | null

  generate(config: Project<Cfg>): Outcome<Sheet>
  checksum(sheet: Sheet): string

  /** Náhled: pracovní list + list řešení. Viz §5. */
  View: (props: { sheet: Sheet; config: Project<Cfg> }) => ReactNode
}
```

Registr zůstane tam, kde je (`activities/registry.ts`), a jen se rozšíří —
katalog s `available: false` je hodnotný sám o sobě a nemá se rozbíjet:

```ts
export const activityModules = {
  'cipher-grid': cipherGridModule,
  'sequence-sheet': sequenceSheetModule,
} satisfies Record<ActivityId, ActivityModule<any, any, any>>
```

`satisfies Record<ActivityId, …>` je to podstatné: **přidání `ActivityId`
do `core/model` bez modulu je chyba překladu**, ne runtime překvapení.

---

## 4. Stav formuláře po jmenných prostorech

Dnes: jeden plochý objekt, `message` vedle `taskCount`. Po zásahu:

```ts
export interface EditorState {
  activity: ActivityId
  shared: SharedEditorState
  byActivity: {
    'cipher-grid': CipherGridEditorState
    'sequence-sheet': SequenceSheetEditorState
  }
}
```

Vlastnost, kvůli které byl plochý stav zvolen, **zůstává**: přepnutí aktivity
mění jen `activity`, slice se nemaže, a učitel najde svou tajenku tam, kde ji
nechal. Nově navíc nejde omylem sáhnout na cizí pole.

Tohle je CHANGE #3 z evaluace. Navrhuji ho udělat **zároveň s registrem**, ne
zvlášť: `toConfig` v modulu aktivity potřebuje typ svého slice, takže by se
`EditorState` stejně přepisoval dvakrát.

---

## 5. Náhled — mezikrok, ne `DocumentModel`

`DocumentModel` (C.2) je další krok v pořadí, ne tenhle. Aby se ale z `App.tsx`
dostaly obě větve náhledu už teď, dostane každá aktivita `view.tsx`:

```
src/activities/cipher-grid/
  index.ts     ← generátor, čistý, bez Reactu (beze změny)
  module.ts    ← adaptér: složí ActivityModule z index.ts + payload.ts + view.tsx
  payload.ts   ← parsePayload, závisí jen na core
  view.tsx     ← <CipherGridView sheet config /> — sestava View komponent z render/
```

Pravidlo **„generátor vrací data, ne JSX"** tím zůstává nedotčené: JSX je
v odděleném souboru, `index.ts` a jeho testy Reactu nevidí. `.dependency-cruiser`
to dovolí — zakázaný je směr `render → activities`, ne opačný.

Až přijde C.2, `view.tsx` se nahradí za `toDocument(sheet): DocumentModel`
a `App.tsx` se přitom nedotkne. To je ten důvod, proč `View` je v kontraktu
jako pole, a ne zadrátovaný import.

`payload.ts` odděleně proto, aby `storage/sifra.ts` nemusel kvůli validaci
souboru vtáhnout celý generátor. Duch poznámky v `sifra.ts:57` zůstává:
parser nedůvěryhodného vstupu nesahá do generátorové vrstvy.

---

## 6. Jak se zmenší volající

**`App.tsx`** — `checksumFor`, `generated` i oba bloky náhledu se scvrknou na:

```ts
const activity = activityModules[state.activity]
const config = useMemo(() => activity.toConfig(...), [state, seed])
const outcome = useMemo(() => activity.generate(config), [config])
…
{outcome.ok && verified && <Preview><activity.View sheet={outcome.sheet} config={config} /></Preview>}
```

Cena: `activityModules[state.activity]` vrací unii modulů, takže `sheet`
z jednoho a `View` z druhého by si TypeScript nechal projít jako kombinaci.
Řeší se jednou v registru — `renderActivity(state, seed)`, které drží obojí
pohromadě uvnitř jedné generické funkce. Není to elegantní, ale je to lokální
a nikdo mimo registr to nevidí.

**`storage/sifra.ts`** — `parseConfig` ztratí větev:

```ts
const module = activityModules[raw.activity]   // po kontrole, že je to známé id
const payload = module?.parsePayload(raw.payload)
```

Chování na neznámé aktivitě se **nemění**: dál `null`, dál žádný tichý převod
na šifru.

**`features/editor/state.ts`** — zůstane jako tenká vrstva nad registrem
(shared pole + delegace), zhruba třetinová.

---

## 7. Co se vědomě nemění

- `EditorPanel` a jeho `isCipher`. Deklarativní popis polí formuláře je
  správný krok, ale až u páté aktivity — dřív je to abstrakce pro dvě větve.
- `core/verify`, `core/rng`, sémantika seedu, `GENERATOR_VERSION` — KEEP z §D.
- Formát `.sifra`: beze změny, `schemaVersion` zůstává 1. **Refaktoring nesmí
  změnit jediný bajt výstupu** — to je hlavní testovací kritérium.
- Katalog s `available: false` a chování `ActivityNav`.

---

## 8. Postup a kontrola

Pět kroků, po každém zelené testy:

1. `contract.ts` + rozšíření `registry.ts`, zatím nikdo nevolá.
2. `cipher-grid/module.ts` + `payload.ts` + `view.tsx`, přesun beze změny logiky.
3. Totéž pro `sequence-sheet`.
4. Přepsat volající: `App.tsx`, `state.ts`, `sifra.ts`.
5. Namespacovaný `EditorState` + `EditorPanel`.

**Jak se pozná, že to sedí:**

- 207 stávajících testů zelených, včetně golden snapshotů v `tests/golden/`.
  Golden snapshot je tu tím nejcennějším: chytne změnu výstupu na bajt.
- Nové testy nad registrem, parametrizované — píšou se jednou a platí pro
  každou budoucí aktivitu:
  - každé `available: true` id má modul,
  - `toConfig → fromConfig` je pro každý modul kruhem beze ztráty,
  - `serializeSifra → parseSifra` projde pro každý modul,
  - `parsePayload(nesmysl)` vrací `null` u každého modulu.
- `npm run check` (typecheck + lint + `arch` + testy) bez nových porušení —
  hlídá i pravidla v `.dependency-cruiser.cjs`.

**Riziko: nízké.** Je to přesun hotového kódu pod dohledem golden testů.
Jediné skutečné riziko je krok 5 (formulář), kde testy nejsou — ověří se ručně:
přepnout aktivitu tam a zpět, tajenka musí zůstat.

---

## 9. Otázka k rozhodnutí

Krok 5 (namespacovaný `EditorState`) není nutný k tomu, aby registr fungoval.
Navrhuji ho udělat hned, protože jinak se `toConfig` přepisuje podruhé.
Když ho chceš oddělit, kroky 1–4 dávají smysl i samy o sobě.

> **Rozhodnuto:** udělat celé včetně kroku 5.

---

## 10. Co se od návrhu odchýlilo

Pět věcí, které se ukázaly až při psaní:

1. **`ActivitySheet` v kontraktu.** Návrh na něj zapomněl: shell potřebuje
   z listu `verification` (jinak by se tiskl neověřený list), `relaxations`
   a `title` pro název souboru. Kontrakt to teď vyžaduje od každé aktivity —
   nejde přidat hru, která se tiskne bez kontroly.
2. **`View` bere jen `sheet`, ne `sheet` + `config`.** List svou konfiguraci
   nese s sebou, a druhá cesta k témuž by se rozešla: při opakovaném pokusu
   o generování má `sheet.config` odvozený seed (`…#1`), zatímco vnější
   konfigurace ten původní.
3. **`View` je zapsané jako metoda, ne jako pole s funkčním typem.** Jinak by
   modul nešel uvnitř registru přiřadit na `AnyActivityModule` — vlastnosti
   s funkčním typem jsou v přísném režimu kontravariantní, metody bivariantní.
4. **`initialState` má vypsaný typ.** Bez anotace se `sequences: false`
   odvodí jako literál `false` a formulář by to zaškrtávátko nikdy nezapnul.
   Stálo to jeden nepovedený běh typecheku a je to past i pro příští aktivitu.
5. **`Project<Id, Cfg>` v `core/model`.** Aby kontrakt uměl říct „konfigurace
   právě té aktivity, které modul patří", musely se `CipherGridProject`
   a `SequenceSheetProject` přepsat na generický `Project`. Tvar dat se
   nezměnil, jen se přestal psát dvakrát.

Tři casty přežily, všechny uvnitř `registry.ts` a všechny okomentované:
`initialActivityStates`, párování id ↔ payload v `parseActivityProject`
a `AnyActivityModule` v `configFor` / `runActivity` / `checksumForConfig`.
Mimo registr není ani jeden — a to byl smysl.

**Ověřeno:** 207 původních testů beze změny výsledku, včetně golden snapshotů
(výstup se nezměnil na bajt), 15 nových testů nad registrem, `npm run check`
čistý. Formulář ručně v prohlížeči: tajenka → přepnout na řady → změnit počet
úloh na 7 → zpět na šifru; tajenka na místě, konzole bez chyb.
