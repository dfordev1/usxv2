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

## Compare the six prototype riwāyāt

```js
import { createAlignmentClient } from "quran-usx";
import alignment from "quran-usx/alignment" with { type: "json" };

const readings = createAlignmentClient(alignment);
readings.getReading("qusx:slot:057:024:001", "hafs-kufi").text;  // هُوَ
readings.getReading("qusx:slot:057:024:001", "warsh-kfqc").text; // empty
readings.compareReadings("qusx:slot:040:026:001");
readings.getAlignmentEvidence("qusx:slot:037:130:001");
```

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
import { normalizeKfgqpcAyah, normalizeQuranComVerse } from "quran-usx/adapters";

const hafs = normalizeQuranComVerse(quranComResponse);
const warsh = normalizeKfgqpcAyah(kfgqpcRecord, { tradition: "warsh-kfqc" });
```

Both adapters return the same `qusx-compatible-verse` shape (`reference`,
`tradition`, `words`, `text`, and source provenance). Adapters are optional
transition helpers, not part of the QUSX XML standard.

The package is ESM-only and requires Node.js 22 or a modern browser/build tool.
