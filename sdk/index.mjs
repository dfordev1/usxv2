export const QUSX_NAMESPACE = "https://dfordev1.github.io/usxv2/ns/v1";
export const QUSX_VERSION = "0.1";

const AXES = new Set(["ayah", "page", "line", "juz", "hizb", "rub", "manzil", "ruku"]);
const CHILDREN = new Set([...AXES, "word", "sajda"]);

export class QusxError extends Error {
  constructor(message, code = "QUSX_INVALID") {
    super(message);
    this.name = "QusxError";
    this.code = code;
  }
}

function decodeXml(value) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity[0] === "#") {
      const radix = entity[1].toLowerCase() === "x" ? 16 : 10;
      const raw = radix === 16 ? entity.slice(2) : entity.slice(1);
      const point = Number.parseInt(raw, radix);
      if (!Number.isInteger(point) || point > 0x10ffff) throw new QusxError(`Invalid XML entity: &${entity};`);
      return String.fromCodePoint(point);
    }
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[entity.toLowerCase()];
  });
}

function attributes(source) {
  const result = Object.create(null);
  let rest = source.trim();
  const matcher = /^([A-Za-z_][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')\s*/;
  while (rest) {
    const match = matcher.exec(rest);
    if (!match) throw new QusxError(`Malformed attribute list near: ${rest.slice(0, 40)}`);
    const name = match[1];
    if (name in result) throw new QusxError(`Duplicate attribute: ${name}`);
    result[name] = decodeXml(match[2].slice(1, -1));
    rest = rest.slice(match[0].length);
  }
  return result;
}

function positiveInteger(value, label) {
  if (!/^[1-9]\d*$/.test(value ?? "")) throw new QusxError(`${label} must be a positive integer`);
  return Number(value);
}

function publicAttributes(attrs) {
  return Object.freeze({ ...attrs });
}

function makeSlice(axis, number, sid, words, events) {
  const lexicalWords = words.filter((word) => word.type !== "number");
  return Object.freeze({
    axis,
    number,
    sid,
    words: Object.freeze(words),
    events: Object.freeze(events),
    text: words.map((word) => word.text).join(" "),
    recitationText: lexicalWords.map((word) => word.text).join(" "),
  });
}

export class QusxDocument {
  constructor(metadata, events) {
    this.metadata = Object.freeze(metadata);
    this.events = Object.freeze(events);
    this.words = Object.freeze(events.filter((event) => event.kind === "word"));
    this.sajdas = Object.freeze(events.filter((event) => event.kind === "sajda"));
    this.#wordById = new Map(this.words.map((word) => [word.id, word]));
    Object.freeze(this);
  }

  #wordById;

  getWord(id) {
    return this.#wordById.get(Number(id));
  }

  get(axis, number) {
    if (!AXES.has(axis)) throw new QusxError(`Unknown QUSX axis: ${axis}`, "QUSX_QUERY");
    const target = Number(number);
    if (!Number.isInteger(target) || target < 1) throw new QusxError(`${axis} number must be a positive integer`, "QUSX_QUERY");
    const words = this.words.filter((word) => word.axes[axis]?.number === target);
    if (!words.length) return undefined;
    const sid = words[0].axes[axis].sid;
    const events = this.events.filter((event) => event.kind === "word" ? event.axes[axis]?.number === target : event.axis === axis && (event.number === target || event.sid === sid || event.eid === sid));
    return makeSlice(axis, target, sid, words, events);
  }

  getAyah(number) { return this.get("ayah", number); }
  getPage(number) { return this.get("page", number); }
  getJuz(number) { return this.get("juz", number); }
  getHizb(number) { return this.get("hizb", number); }
  getRub(number) { return this.get("rub", number); }
  getManzil(number) { return this.get("manzil", number); }
  getRuku(number) { return this.get("ruku", number); }

  getLine(page, line) {
    if (line === undefined) return this.get("line", page);
    const targetPage = Number(page);
    const targetLine = Number(line);
    const words = this.words.filter((word) => word.axes.page?.number === targetPage && word.axes.line?.number === targetLine);
    if (!words.length) return undefined;
    return makeSlice("line", targetLine, words[0].axes.line.sid, words, []);
  }
}

export function parseQusx(xml, options = {}) {
  if (typeof xml !== "string") throw new TypeError("parseQusx expects an XML string");
  if (/<!DOCTYPE/i.test(xml)) throw new QusxError("DOCTYPE declarations are not allowed", "QUSX_UNSAFE_XML");

  const cleaned = xml.replace(/^\uFEFF/, "").replace(/<\?xml[\s\S]*?\?>/i, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<\?[\s\S]*?\?>/g, "").trim();
  const rootMatch = /^<qusx\s+([^>]*?)>([\s\S]*)<\/qusx>\s*$/.exec(cleaned);
  if (!rootMatch) throw new QusxError("Expected one <qusx> root element");
  const root = attributes(rootMatch[1]);
  if (root.xmlns !== QUSX_NAMESPACE) throw new QusxError(`Unsupported QUSX namespace: ${root.xmlns ?? "missing"}`, "QUSX_NAMESPACE");
  const expectedVersion = options.version ?? QUSX_VERSION;
  if (expectedVersion !== false && root.version !== expectedVersion) throw new QusxError(`Unsupported QUSX version: ${root.version ?? "missing"}`, "QUSX_VERSION");

  const metadata = {
    ...root,
    surah: positiveInteger(root.surah, "surah"),
    ayahCount: positiveInteger(root.ayahCount, "ayahCount"),
    bismillahPre: root.bismillahPre === "true",
  };
  if (metadata.surah > 114) throw new QusxError("surah must be between 1 and 114");
  for (const key of ["name", "nameArabic", "revelationPlace", "tradition"]) if (!root[key]) throw new QusxError(`Missing root attribute: ${key}`);
  if (!/^(true|false)$/.test(root.bismillahPre ?? "")) throw new QusxError("bismillahPre must be true or false");

  const body = rootMatch[2];
  const token = /<([A-Za-z][\w.-]*)([^>]*)\/>|<word\s+([^>]*)>([\s\S]*?)<\/word>/g;
  const events = [];
  const open = Object.create(null);
  const seenSids = new Set();
  let cursor = 0;
  let match;
  while ((match = token.exec(body))) {
    if (body.slice(cursor, match.index).trim()) throw new QusxError(`Unexpected XML content near offset ${cursor}`);
    cursor = token.lastIndex;
    if (match[3] !== undefined) {
      const attrs = attributes(match[3]);
      const id = positiveInteger(attrs.id, "word id");
      const position = positiveInteger(attrs.position, "word position");
      const text = decodeXml(match[4]);
      if (/<|>/.test(text)) throw new QusxError("word elements cannot contain child markup");
      const axes = Object.fromEntries(Object.entries(open).map(([axis, value]) => [axis, Object.freeze({ ...value })]));
      events.push(Object.freeze({ ...attrs, kind: "word", id, position, text, axes: Object.freeze(axes) }));
      continue;
    }
    const axis = match[1];
    if (!CHILDREN.has(axis) || axis === "word") throw new QusxError(`Unexpected child element: ${axis}`);
    const attrs = attributes(match[2]);
    if (axis === "sajda") {
      events.push(Object.freeze({ ...attrs, kind: "sajda", number: positiveInteger(attrs.number, "sajda number") }));
      continue;
    }
    const hasSid = typeof attrs.sid === "string";
    const hasEid = typeof attrs.eid === "string";
    if (hasSid === hasEid) throw new QusxError(`<${axis}> must have exactly one of sid or eid`);
    if (hasSid) {
      if (open[axis]) throw new QusxError(`${axis} milestone opened before the previous one closed`);
      if (seenSids.has(attrs.sid)) throw new QusxError(`Duplicate sid: ${attrs.sid}`);
      const number = positiveInteger(attrs.number, `${axis} number`);
      const value = Object.freeze({ axis, number, sid: attrs.sid, attributes: publicAttributes(attrs) });
      open[axis] = value;
      seenSids.add(attrs.sid);
      events.push(Object.freeze({ kind: "start", ...value }));
    } else {
      if (!open[axis] || open[axis].sid !== attrs.eid) throw new QusxError(`Unmatched ${axis} eid: ${attrs.eid}`);
      events.push(Object.freeze({ kind: "end", axis, number: open[axis].number, eid: attrs.eid, attributes: publicAttributes(attrs) }));
      delete open[axis];
    }
  }
  if (body.slice(cursor).trim()) throw new QusxError(`Unexpected XML content near offset ${cursor}`);
  const unclosed = Object.keys(open);
  if (unclosed.length) throw new QusxError(`Unclosed milestones: ${unclosed.join(", ")}`);
  if (!events.length) throw new QusxError("QUSX document contains no events");
  return new QusxDocument(metadata, events);
}

export async function loadQusx(url, options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new QusxError("No fetch implementation is available", "QUSX_FETCH");
  const response = await fetchImpl(url, { signal: options.signal });
  if (!response.ok) throw new QusxError(`Could not load QUSX (${response.status} ${response.statusText})`, "QUSX_FETCH");
  return parseQusx(await response.text(), options);
}

export function createQusxClient(options = {}) {
  const baseUrl = (options.baseUrl ?? "https://raw.githubusercontent.com/dfordev1/usxv2/main/output").replace(/\/$/, "");
  const layout = options.layout ?? "madani-v1";
  const fetchImpl = options.fetch;
  return Object.freeze({
    url(surah) {
      const number = Number(surah);
      if (!Number.isInteger(number) || number < 1 || number > 114) throw new QusxError("surah must be between 1 and 114", "QUSX_QUERY");
      return `${baseUrl}/${encodeURIComponent(layout)}/${String(number).padStart(3, "0")}.qusx.xml`;
    },
    load(surah, loadOptions = {}) {
      return loadQusx(this.url(surah), { ...loadOptions, fetch: loadOptions.fetch ?? fetchImpl });
    },
  });
}

function alignmentError(message) {
  return new QusxError(message, "QUSX_ALIGNMENT");
}

export function parseAlignment(value) {
  let data = value;
  if (typeof value === "string") {
    try { data = JSON.parse(value); } catch { throw alignmentError("Alignment input is not valid JSON"); }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw alignmentError("Alignment must be an object");
  if (data.format !== "qusx-alignment") throw alignmentError("Unsupported alignment format");
  if (!/^\d+\.\d+\.\d+$/.test(data.version ?? "")) throw alignmentError("Alignment version must be semantic");
  if (!Array.isArray(data.traditions) || data.traditions.length < 2 || new Set(data.traditions).size !== data.traditions.length) {
    throw alignmentError("Alignment traditions must be a unique array");
  }
  if (!data.traditions.includes(data.canonicalTradition)) throw alignmentError("Canonical tradition is not listed");
  if (!Array.isArray(data.rules) || !data.rules.length) throw alignmentError("Alignment requires at least one rule");

  const ids = new Set();
  const slots = new Set();
  const rules = data.rules.map((rule) => {
    if (!rule || typeof rule !== "object") throw alignmentError("Alignment rule must be an object");
    if (typeof rule.id !== "string" || ids.has(rule.id)) throw alignmentError(`Duplicate or missing alignment rule id: ${rule.id ?? "missing"}`);
    if (typeof rule.slotId !== "string" || slots.has(rule.slotId)) throw alignmentError(`Duplicate or missing alignment slot id: ${rule.slotId ?? "missing"}`);
    ids.add(rule.id);
    slots.add(rule.slotId);
    if (!rule.readings || typeof rule.readings !== "object") throw alignmentError(`${rule.id}: readings are required`);
    const readingKeys = Object.keys(rule.readings);
    if (readingKeys.length !== data.traditions.length || data.traditions.some((tradition) => !readingKeys.includes(tradition))) {
      throw alignmentError(`${rule.id}: every listed tradition must have one reading`);
    }
    const readings = Object.fromEntries(data.traditions.map((tradition) => {
      const reading = rule.readings[tradition];
      if (!reading || !/^\d+:\d+$/.test(reading.ayah ?? "") || !Array.isArray(reading.tokens) || reading.tokens.some((token) => typeof token !== "string" || !token)) {
        throw alignmentError(`${rule.id}: invalid reading for ${tradition}`);
      }
      return [tradition, Object.freeze({ ayah: reading.ayah, tokens: Object.freeze([...reading.tokens]), text: reading.tokens.join(" ") })];
    }));
    return Object.freeze({ ...rule, readings: Object.freeze(readings), evidence: Object.freeze([...(rule.evidence ?? [])]) });
  });

  return Object.freeze({
    ...data,
    traditions: Object.freeze([...data.traditions]),
    rules: Object.freeze(rules),
  });
}

export function createAlignmentClient(input) {
  const alignment = parseAlignment(input);
  const bySlot = new Map(alignment.rules.map((rule) => [rule.slotId, rule]));
  const byId = new Map(alignment.rules.map((rule) => [rule.id, rule]));

  function requireTradition(tradition) {
    if (!alignment.traditions.includes(tradition)) throw alignmentError(`Unknown alignment tradition: ${tradition}`);
  }

  function requireRule(identifier) {
    const rule = bySlot.get(identifier) ?? byId.get(identifier);
    if (!rule) throw alignmentError(`Unknown alignment rule or slot: ${identifier}`);
    return rule;
  }

  return Object.freeze({
    alignment,
    listAlignmentRules() { return alignment.rules; },
    getReading(identifier, tradition) {
      requireTradition(tradition);
      const rule = requireRule(identifier);
      return Object.freeze({ ruleId: rule.id, slotId: rule.slotId, tradition, ...rule.readings[tradition] });
    },
    compareReadings(identifier) {
      const rule = requireRule(identifier);
      return Object.freeze({
        ruleId: rule.id,
        slotId: rule.slotId,
        kind: rule.kind,
        readings: rule.readings,
      });
    },
    compareAyah(reference, sourceTradition, targetTradition) {
      requireTradition(sourceTradition);
      requireTradition(targetTradition);
      if (!/^(?:[1-9]|[1-9]\d|10\d|11[0-4]):[1-9]\d*$/.test(reference)) {
        throw alignmentError(`Invalid ayah reference: ${reference}`);
      }
      return Object.freeze(alignment.rules
        .filter((rule) => rule.readings[sourceTradition].ayah === reference)
        .map((rule) => Object.freeze({
          ruleId: rule.id,
          slotId: rule.slotId,
          kind: rule.kind,
          authentication: rule.authentication,
          source: Object.freeze({ tradition: sourceTradition, ...rule.readings[sourceTradition] }),
          target: Object.freeze({ tradition: targetTradition, ...rule.readings[targetTradition] }),
          evidence: rule.evidence,
        })));
    },
    getAlignmentEvidence(identifier) {
      const rule = requireRule(identifier);
      return Object.freeze({ authentication: rule.authentication, evidence: rule.evidence });
    },
  });
}

export function parseAyahMapping(value) {
  let data = value;
  if (typeof value === "string") {
    try { data = JSON.parse(value); } catch { throw alignmentError("Ayah mapping input is not valid JSON"); }
  }
  if (!data || typeof data !== "object" || data.format !== "qusx-ayah-mapping") throw alignmentError("Unsupported ayah mapping format");
  if (!/^\d+\.\d+\.\d+$/.test(data.version ?? "")) throw alignmentError("Ayah mapping version must be semantic");
  if (!Array.isArray(data.traditions) || !data.traditions.includes(data.hubTradition)) throw alignmentError("Ayah mapping hub tradition is not listed");
  if (!data.mappings || typeof data.mappings !== "object") throw alignmentError("Ayah mappings are required");
  const reference = /^(?:[1-9]|[1-9]\d|10\d|11[0-4]):[1-9]\d*$/;
  const mappings = {};
  for (const tradition of data.traditions) {
    if (tradition === data.hubTradition) continue;
    const rows = data.mappings[tradition];
    if (!Array.isArray(rows) || !rows.length) throw alignmentError(`Missing ayah mappings for ${tradition}`);
    const seen = new Set();
    mappings[tradition] = Object.freeze(rows.map((row) => {
      if (!reference.test(row?.source ?? "") || seen.has(row.source)) throw alignmentError(`${tradition}: duplicate or invalid source ayah`);
      if (!Array.isArray(row.targets) || !row.targets.length || row.targets.some((target) => !reference.test(target))) throw alignmentError(`${tradition} ${row.source}: invalid target ayahs`);
      seen.add(row.source);
      return Object.freeze({ source: row.source, targets: Object.freeze([...new Set(row.targets)]) });
    }));
  }
  const unmappedHubAyahs = Object.freeze(Object.fromEntries(Object.entries(data.unmappedHubAyahs ?? {}).map(([tradition, references]) => {
    if (!Array.isArray(references) || references.some((item) => !reference.test(item))) throw alignmentError(`${tradition}: invalid unmapped hub ayahs`);
    return [tradition, Object.freeze([...references])];
  })));
  return Object.freeze({ ...data, traditions: Object.freeze([...data.traditions]), mappings: Object.freeze(mappings), unmappedHubAyahs });
}

export function createAyahMappingClient(input) {
  const mapping = parseAyahMapping(input);
  const hub = mapping.hubTradition;
  const toHub = new Map();
  const fromHub = new Map();
  const known = new Map(mapping.traditions.map((tradition) => [tradition, new Set()]));
  for (const [tradition, rows] of Object.entries(mapping.mappings)) {
    const forward = new Map();
    const reverse = new Map();
    for (const row of rows) {
      forward.set(row.source, row.targets);
      known.get(tradition).add(row.source);
      for (const target of row.targets) {
        known.get(hub).add(target);
        if (!reverse.has(target)) reverse.set(target, []);
        reverse.get(target).push(row.source);
      }
    }
    toHub.set(tradition, forward);
    fromHub.set(tradition, reverse);
  }
  function requireTradition(tradition) {
    if (!mapping.traditions.includes(tradition)) throw alignmentError(`Unknown ayah-mapping tradition: ${tradition}`);
  }
  function uniqueSorted(values) {
    return [...new Set(values)].sort((a, b) => {
      const [as, aa] = a.split(":").map(Number);
      const [bs, ba] = b.split(":").map(Number);
      return as - bs || aa - ba;
    });
  }
  return Object.freeze({
    mapping,
    mapAyah(reference, targetTradition, sourceTradition = hub) {
      requireTradition(sourceTradition);
      requireTradition(targetTradition);
      if (!known.get(sourceTradition).has(reference)) return Object.freeze([]);
      if (sourceTradition === targetTradition) return Object.freeze([reference]);
      const hubRefs = sourceTradition === hub ? [reference] : toHub.get(sourceTradition).get(reference);
      if (!hubRefs?.length) return Object.freeze([]);
      if (targetTradition === hub) return Object.freeze([...hubRefs]);
      const targets = hubRefs.flatMap((hubRef) => fromHub.get(targetTradition).get(hubRef) ?? []);
      return Object.freeze(uniqueSorted(targets));
    },
  });
}
