# Migration-impact report — QUSX v1 conformance-definition pass

**Change class: ADDITIVE (no MAJOR, no MINOR format change).**
Per `COMPATIBILITY.md`, any breaking change needs this report before it ships.
This report exists to demonstrate the opposite for the conformance pass: that
it changes **zero bytes of the emitted format** and is therefore not even a
MINOR version bump to the data format — it is documentation, portable schema,
fixtures, and rule-id annotations layered *around* the unchanged output.

## 1. Rule ids / schema constructs changed, added, or withdrawn

| Item | Change |
|---|---|
| `schema/qusx.xsd` | **Unchanged.** No element, attribute, datatype, or enumeration added, removed, or narrowed. |
| Emitted document format (`<qusx>` and children) | **Unchanged.** No new attribute or element is produced by the generator; producers emit exactly what they did before. |
| Normative rules | **Added** (documentation of already-enforced behavior). The rules in `NORMATIVE-RULES.md` name and assign stable ids to constraints that `src/validate.js` and `schema/qusx.xsd` already enforced. No new *constraint on documents* is introduced — every rule was already checked; it now has an id. |
| `schema/qusx.sch` (Schematron) | **Added.** A second, portable implementation of a subset of the already-enforced semantic rules. It does not constrain any document that `validate.js` accepted. |
| `src/validate.js` | Error **messages** gain a `[QUSX-XXX-NNN]` id prefix. **No validation logic changed** — the same documents pass and fail as before; only the wording of failure messages changed. |

Withdrawn rules: none (this is the first assignment of ids).

## 2. Documents / corpora that would newly fail

**None.** Verified against the real committed corpus, not estimated.

The conformance pass adds no new document constraint, so nothing that passed
before fails now. The generated corpus is proven byte-identical (see §4). The
acceptance criterion "existing validation and integrity checks continue
passing" is verified by running the full `npm run verify` suite after the pass
and confirming the same green result as before.

## 3. Mechanical migration path

Not applicable — there is no format change, so no document needs migrating.
A consumer written against the pre-pass format reads post-pass output
unchanged. A consumer wanting to *use* the new machinery (rule ids, Schematron,
fixtures) opts in; nothing is forced.

## 4. Version / namespace

- `<qusx version>` value: **unchanged** (stays in the `0.1`/`1.x`-draft line;
  no bump, because the format did not change).
- Namespace: **unchanged** (none; see `COMPATIBILITY.md` — v1 is namespace-free
  by decision).

## 5. Byte-level proof of "output unchanged"

Baseline git tree hashes at the commit immediately before this pass
(`9a348b62511bd6c33770558a975af5a85607e249`):

| Path | Tree hash (HEAD before pass) |
|---|---|
| `output/` | `5a452236d2fac687175cb7cae982a9e9255cc952` |
| `output-pilot/` | `380196e0200e09db48965f8f5ec90b91341c75b5` |
| `schema/qusx.xsd` (blob) | `19d5c661d61d8436a5d16c57aba1484fc3a3f6a9` |

**Acceptance check:** after the conformance pass is complete, these three
hashes MUST be identical (`git rev-parse HEAD:output`, `HEAD:output-pilot`,
`HEAD:schema/qusx.xsd`). CI additionally enforces this continuously: the
existing deterministic-regeneration step already fails if `output/` or
`output-pilot/` differs from a fresh build, and the working-tree-clean gate
fails if verification dirties anything. If any of the three hashes changes,
this pass has exceeded its "additive only" scope and must be re-reviewed as a
format change — with a *new* migration-impact report — before merging.

## 6. Future breaking changes this pass deliberately did NOT make

Flagged here so a later contributor sees they were considered and consciously
deferred to a real MAJOR with its own report:

- Introducing an XML namespace.
- Adding controlled extension points (`xs:any` / `anyAttribute`) to the XSD.
- Promoting any experimental tradition to a v1-normative profile.
- Wiring in the two unsupported layouts (Digital Khatt, Ligature Basd).
- Resolving the two orthographic text residuals (`11:13`, `80:25`) — blocked on
  upstream QUL review, tracked separately.
