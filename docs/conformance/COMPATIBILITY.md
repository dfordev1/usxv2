# QUSX — Compatibility, versioning & extension policy

**Status: DRAFT for review. Proposal only — no format change is made by this
document.** It defines the rules that *future* changes must follow. The current
output format is unchanged; see the migration-impact requirement at the end.

## Version identifiers

Two distinct version fields exist and MUST NOT be conflated:

| Field | Where | Meaning |
|---|---|---|
| **Standard version** | `<qusx version="...">` | The version of *this specification* the document claims to conform to. v1 documents carry a `version` in the `1.x` line. |
| **Generator version** | `<qusx generatorVersion="...">` (optional) | The version of the tool that produced the file. Informational; never affects conformance. |

The standard version follows **semantic versioning for a data format**:

- **MAJOR** (1 → 2): a breaking change — a document valid under the old major
  may be invalid under the new one, or the same document's meaning changes.
  Requires a migration-impact report (below) and a new major before release.
- **MINOR** (1.0 → 1.1): a backward-compatible addition — new optional
  attribute, new optional element, new enumeration value, a newly-integrated
  layout or tradition profile. Every 1.0-valid document remains 1.1-valid.
- **PATCH** (1.0.0 → 1.0.1): editorial/clarifying only; no schema change.

**Consumer rule:** a consumer written for `1.x` MUST accept any `1.y` document
with `y >= x` by ignoring attributes/elements it does not recognize (see
extension handling). It MUST NOT reject a document solely because
`version` is a higher `1.z` than it was written for.

## Namespace strategy

- **v1 decision: no XML namespace.** The current format uses unqualified
  element/attribute names (`elementFormDefault="qualified"` in the XSD refers
  to local elements, but no target namespace is declared). Introducing a
  namespace now would break every existing consumer and file for no functional
  gain, so v1 stays namespace-free.
- **Reserved for v2:** if a namespace is ever introduced, it will be a
  breaking (MAJOR) change with a dated namespace URI
  (`https://.../qusx/2`), and a migration-impact report. v1 tooling is not
  required to understand a namespaced document.
- **Extension namespace (reserved, forward-looking):** third-party extension
  attributes/elements, if standardized later, SHOULD use their own namespace
  prefix so they can never collide with core QUSX names. v1 core defines no
  such extensions.

## Schema-version rules

- The XSD (`schema/qusx.xsd`) is versioned with the standard: a `1.x` XSD
  accepts every `1.y` (y ≤ x) document.
- Adding an optional attribute, optional element, or enumeration value is a
  MINOR, backward-compatible XSD change.
- Making an optional attribute required, removing an element/attribute,
  narrowing a datatype, or removing an enumeration value is a MAJOR,
  breaking change.
- The Schematron schema (`schema/qusx.sch`) is versioned in lockstep and cites
  the same rule ids as `NORMATIVE-RULES.md`.

## Extension / unknown-content handling

QUSX v1 is a **closed core vocabulary** (the child elements and attributes in
the XSD) but defines how producers and consumers should treat content outside
it:

- **Producers** MUST NOT emit non-core elements or attributes in the no-namespace
  core in v1. (There is no sanctioned extension mechanism in v1 core; one is
  reserved for a future minor via the extension namespace above.)
- **Consumers** SHOULD be liberal in what they accept for *forward*
  compatibility: when reading a document whose `version` is a higher `1.z`, a
  consumer MUST ignore (not error on) any element or attribute it does not
  recognize, so that a MINOR addition never breaks an older reader. Under the
  current XSD this is enforced strictly (unknown content fails L1); the
  liberal-consumer rule governs *hand-written or future* readers, and the XSD
  will gain controlled extension points (`xs:any`/`anyAttribute` in reserved
  namespaces) only via a documented MINOR change with its own migration note.

## Deprecation

- A feature is deprecated by documenting it as such in a MINOR release; it keeps
  working for the remainder of the major line.
- Removal happens only at the next MAJOR, with a migration-impact report.

## Migration-impact report — required before any breaking change

No breaking (MAJOR) schema or format change ships without a committed
**migration-impact report** that states, at minimum:

1. The exact rule ids and schema constructs changed, added, or withdrawn.
2. Which existing documents/corpora would newly fail, with counts run against
   the real committed corpus (not estimated).
3. A mechanical migration path (script or documented transform) from the old
   format to the new, or an explicit statement that none is possible and why.
4. The new `version` value and namespace (if any).

For this v1 conformance pass specifically, a migration-impact report is
produced **before** touching the emitted format, precisely so that the
"existing output remains unchanged during the design pass" acceptance criterion
is verifiable: the report will show that the conformance work is **additive**
(new docs, Schematron, fixtures, rule-id-annotated error messages) and changes
**zero bytes** of `output/` or `output-pilot/`. See
`docs/conformance/MIGRATION-IMPACT.md`.
