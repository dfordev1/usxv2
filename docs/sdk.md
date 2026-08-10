# QUSX JavaScript SDK

The `qusx` package turns a QUSX XML file into a queryable document in Node.js or a modern web app. It has no runtime dependencies. The generated 98 MB corpus is deliberately not included in the npm package; load only the surahs your application needs.

## Install

```sh
npm install qusx
```

## Load a surah

```js
import { createQusxClient } from "qusx";

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
import { parseQusx } from "qusx";

const document = parseQusx(xmlString);
const firstWord = document.getWord(1);
const firstJuzFragment = document.getJuz(1);
```

## Read a local file in Node.js

```js
import { readQusx } from "qusx/node";

const document = await readQusx("./001.qusx.xml");
```

Parsing verifies the namespace and version, required metadata, positive numeric fields, unique `sid` values, and correctly paired `sid`/`eid` milestones. Invalid input throws `QusxError` with a stable `code`.

The package is ESM-only and requires Node.js 22 or a modern browser/build tool.
