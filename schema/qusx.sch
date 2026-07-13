<?xml version="1.0" encoding="UTF-8"?>
<!--
  QUSX v1 — ISO Schematron schema.

  Implements the portable, single-document semantic (L2) rules whose
  "checkedBy" in test/conformance/rules.json includes "schematron". The
  normative source for these rules is docs/conformance/NORMATIVE-RULES.md;
  where this file and that document disagree, the document is authoritative
  and this file has a bug.

  Rules implemented here:
    QUSX-PIN-001  milestone carries exactly one of sid or eid (XOR)
    QUSX-PIN-002  opening pin (sid) carries required opening attributes
    QUSX-PIN-003  every sid is unique in the document
    QUSX-PIN-006  every sid has a matching eid somewhere in the document
    QUSX-PIN-008  fragment, if present, appears on an opening (sid) pin only
    QUSX-TRD-001  every ayah pin's tradition equals the root tradition

  Rules deliberately NOT implemented here:
    QUSX-PIN-004, QUSX-PIN-005 — these require document-order state (which
      sid on an axis is "currently open" as pins are processed in sequence).
      Schematron/XPath 1.0 patterns can express set-based and positional
      checks, but a full streaming "currently open per axis" state machine
      belongs with the rest of the imperative validation logic already in
      src/validate.js. Duplicating it here in XPath would be unreadable and
      easy to get subtly wrong, so per the task design these stay JS-only.

    QUSX-PIN-007 — "cross-axis overlap is EXPLICITLY PERMITTED". This is a
      "must NOT constrain" meta-rule, not an assertion: it exists to
      document that this schema deliberately does NOT require milestone
      axes (juz/manzil/hizb/rub/ruku/page/line/ayah) to nest with one
      another in document order. A page or line range may begin and end
      mid-ayah; juz/hizb/rub ranges may cross ayah boundaries. No pattern
      below checks inter-axis ordering, and none should be added.

    QUSX-PIN-009 — fragment value shape (whole|start|middle|end) is already
      enforced by the fragmentValue enumeration in schema/qusx.xsd (see
      QUSX-STR-011). v1 does not attempt cross-file reconstruction of
      multi-surah fragment ranges; that is reserved as a possible L3
      corpus-level extension, not required in v1. Nothing to assert here
      beyond QUSX-PIN-008 above.
-->
<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt">

  <title>QUSX v1 semantic rules (portable subset)</title>

  <!-- The eight milestone axes. -->
  <pattern id="pin-axes">

    <rule context="juz | manzil | hizb | rub | ruku | page | line | ayah">

      <!-- QUSX-PIN-001: exactly one of sid or eid. -->
      <assert test="(@sid and not(@eid)) or (@eid and not(@sid))">[QUSX-PIN-001] milestone must carry exactly one of sid or eid (never both, never neither)</assert>

      <!-- QUSX-PIN-002: opening pin has required opening attributes.
           All axes require @number; ayah additionally requires @tradition. -->
      <assert test="not(@sid) or @number">[QUSX-PIN-002] opening pin (sid) must carry the required "number" attribute</assert>
      <assert test="not(@sid) or local-name() != 'ayah' or @tradition">[QUSX-PIN-002] opening ayah pin (sid) must carry the required "tradition" attribute</assert>

      <!-- QUSX-PIN-003: every sid value is unique in the document. -->
      <assert test="not(@sid) or count(//*[@sid = current()/@sid]) = 1">[QUSX-PIN-003] sid value "<value-of select="@sid"/>" must be unique within the document</assert>

      <!-- QUSX-PIN-006: every sid has a matching eid somewhere in the document. -->
      <assert test="not(@sid) or //*[@eid = current()/@sid]">[QUSX-PIN-006] sid "<value-of select="@sid"/>" must be closed by a matching eid before end of document</assert>

      <!-- QUSX-PIN-008: fragment, if present, appears on an opening (sid) pin, not a closing (eid) pin. -->
      <assert test="not(@fragment) or @sid">[QUSX-PIN-008] fragment must appear on an opening (sid) pin, not a closing (eid) pin</assert>

    </rule>

  </pattern>

  <!-- QUSX-TRD-001: every ayah opening pin's tradition equals the root tradition. -->
  <pattern id="tradition-consistency">

    <rule context="ayah[@sid]">
      <assert test="@tradition = /*/@tradition">[QUSX-TRD-001] ayah pin tradition "<value-of select="@tradition"/>" must equal the root qusx tradition "<value-of select="/*/@tradition"/>"</assert>
    </rule>

  </pattern>

</schema>
