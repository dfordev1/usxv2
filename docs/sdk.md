# QUSX JavaScript SDK

The `quran-usx` package turns a QUSX XML file into a queryable document in Node.js or a modern web app. It has no runtime dependencies. The generated 98 MB corpus is deliberately not included in the npm package; load only the surahs your application needs.

## Install

```sh
npm install quran-usx
```

## Load a surah

```js
import { createQusxClient } from "quran-usx";

const qusx = createQusxClient({ layout: "madani-v1" });
const surah = await qusx.load(114);

console.log(surah.metadata.name);
console.log(surah.getAyah(3).text);
console.log(surah.getAyah(3).recitationText);
console.log(surah.getPage(604).words);
console.log(surah.getLine(604, 13).words);
```

By default, the client reads the generated corpus from the project's GitHub raw URL. Production applications should mirror versioned QUSX files to their own CDN and pass its URL:

```js
const qusx = createQusxClient({
  baseUrl: "https://cdn.example.com/qusx/v0.1",
  layout: "madani-v2",
});
```

## Parse XML already in memory

```js
import { parseQusx } from "quran-usx";

const document = parseQusx(xmlString);
const firstWord = document.getWord(1);
const firstJuzFragment = document.getJuz(1);
```

## Read a local file in Node.js

```js
import { readQusx } from "quran-usx/node";

const document = await readQusx("./001.qusx.xml");
```

Parsing verifies the namespace and version, required metadata, positive numeric fields, unique `sid` values, and correctly paired `sid`/`eid` milestones. Invalid input throws `QusxError` with a stable `code`.

Node applications can load the package's alignment companions without manual
JSON imports:

```js
import { loadBundledAlignment, loadBundledAyahMapping } from "quran-usx/node";

const readings = await loadBundledAlignment();
const ayahs = await loadBundledAyahMapping();
```

## Command line

```sh
npx quran-usx compare hafs warsh 57:24
npx quran-usx map --from warsh --to hafs --ayah 2:1
npx quran-usx validate ./001.qusx.xml
```

Every command accepts `--json`. Tradition aliases are `hafs`, `shubah`,
`warsh`, `qalon`, `douri`, and `sousi`. The validator is the dependency-free
structural parser check. Use the repository verification gate when formal XSD,
Schematron, and corpus-wide validation are required.

## Compare the six prototype riwāyāt

```js
import { createAlignmentClient } from "quran-usx";
import alignment from "quran-usx/alignment" with { type: "json" };

const readings = createAlignmentClient(alignment);
readings.getReading("qusx:slot:057:024:001", "hafs-kufi").text;  // هُوَ
readings.getReading("qusx:slot:057:024:001", "warsh-kfqc").text; // empty
readings.compareReadings("qusx:slot:040:026:001");
readings.compareAyah("57:24", "hafs-kufi", "warsh-kfqc");
readings.getAlignmentEvidence("qusx:slot:037:130:001");
```

`compareAyah()` returns every published reviewed slot whose source reading uses
that ayah. An empty array means the normative prototype has no reviewed record
there; it is not a claim that the two traditions have no difference.

The bundled alignment contains three source-authenticated research rules, not a
complete scholarly-certified qirāʾāt corpus. `createAlignmentClient()` also
accepts another alignment object or JSON string that follows the exported
`quran-usx/alignment-schema` schema.

## Map ayah boundaries

```js
import { createAyahMappingClient } from "quran-usx";
import mapping from "quran-usx/ayah-mapping" with { type: "json" };

const ayahs = createAyahMappingClient(mapping);
ayahs.mapAyah("57:24", "warsh-kfqc");                    // ["57:23"]
ayahs.mapAyah("2:1", "hafs-kufi", "warsh-kfqc");      // ["2:1", "2:2"]
ayahs.mapAyah("57:23", "qalon-kfqc", "warsh-kfqc");  // ["57:23"]
```

The ayah map covers all 31,098 non-Hafs source ayahs. It is generated from
whole-surah word alignment and is explicitly labeled algorithmic research data.
Split and merged ranges therefore remain reviewable rather than being presented
as scholarly-certified mappings. `unmappedHubAyahs` explicitly records the
numbered Hafs basmala at 1:1 where a target tradition has no corresponding
numbered ayah; `mapAyah()` returns an empty array instead of inventing a match.

## Normalize provider responses

```js
import {
  normalizeAlQuranCloudAyah,
  normalizeKfgqpcAyah,
  normalizeQuranComVerse,
} from "quran-usx/adapters";

const hafs = normalizeQuranComVerse(quranComResponse);
const warsh = normalizeKfgqpcAyah(kfgqpcRecord, { tradition: "warsh-kfqc" });
const cloud = normalizeAlQuranCloudAyah(alQuranCloudResponse, { tradition: "hafs-kufi" });
```

Both adapters return the same `qusx-compatible-verse` shape (`reference`,
`tradition`, `words`, `text`, and source provenance). Adapters are optional
transition helpers, not part of the QUSX XML standard.

AlQuran Cloud returns whole-ayah text rather than a word array, so its adapter
derives tokens only from provider whitespace and preserves the full edition
record as provenance. It deliberately requires an explicit `tradition`; an
edition identifier alone is not treated as proof of a riwayah. The optional
live contract check is `npm run audit:alquran-cloud`.

The package is ESM-only and requires Node.js 22 or a modern browser/build tool.

## Unified provider clients

```js
import { createProvider, listProviders } from "quran-usx/providers";

listProviders(); // ["quran.com", "alquran.cloud"]

const quranCom = createProvider("quran.com");
const cloud = createProvider("alquran.cloud", { tradition: "hafs-kufi" });

const verse = await quranCom.getAyah("57:24");
const fatiha = await cloud.getSurah(1);
```

Both clients return the same `CompatibleVerse` structure. Quran.com ayah-ending
number markers are excluded from lexical words. AlQuran Cloud requires an
explicit tradition because its edition identifier is not treated as riwayah
authentication. Network tests can inject `fetch` and `baseUrl`; the live
Al-Fatihah compatibility audit is `npm run audit:provider-fatiha`.

## Complete-surah review inventory

```sh
npx quran-usx review 63
npx quran-usx review 63 --json
```

The bundled Surah 63 pilot is a complete inventory of generated candidates, not
a normative alignment. Eight observations are consolidated into four unique
review locations. All four remain `scholarly-review-required` until reviewer,
date, decision, evidence, and notes are supplied and independently checked.
