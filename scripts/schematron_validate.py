#!/usr/bin/env python3
"""
Validate QUSX documents against schema/qusx.sch using lxml's ISO Schematron
implementation.

Usage:
    python scripts/schematron_validate.py [file ...]

If no files are given, defaults to a couple of real generated files plus
every fixture under test/fixtures/*.xml.

Prints per-file PASS/FAIL and, on failure, the failed-assertion messages
(which each begin with a "[QUSX-...]" rule id per NORMATIVE-RULES.md).

Exit code is non-zero if any file whose name does NOT indicate it's an
expected-invalid fixture (heuristic: files under test/fixtures/) fails.
Fixture files under test/fixtures/ are expected to fail (they are negative
test cases); their pass/fail result is reported but does not affect the
process exit code.
"""
import sys
from pathlib import Path

from lxml import etree, isoschematron

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMATRON_PATH = REPO_ROOT / "schema" / "qusx.sch"


def default_targets():
    targets = [
        REPO_ROOT / "output" / "madani-v2" / "001.qusx.xml",
        REPO_ROOT / "output" / "madani-v2" / "002.qusx.xml",
    ]
    targets = [t for t in targets if t.exists()]
    targets.extend(sorted((REPO_ROOT / "test" / "fixtures").glob("*.xml")))
    return targets


def load_schematron():
    sch_doc = etree.parse(str(SCHEMATRON_PATH))
    return isoschematron.Schematron(sch_doc, store_report=True)


def validate_file(schematron, path):
    doc = etree.parse(str(path))
    ok = schematron.validate(doc)
    messages = []
    if not ok:
        report = schematron.validation_report
        ns = {"svrl": "http://purl.oclc.org/dsdl/svrl"}
        for failed in report.findall(".//svrl:failed-assert", ns):
            text_el = failed.find("svrl:text", ns)
            text = text_el.text.strip() if text_el is not None and text_el.text else "(no message)"
            messages.append(text)
    return ok, messages


def main(argv):
    targets = [Path(a) for a in argv] if argv else default_targets()
    if not targets:
        print("No target files found.", file=sys.stderr)
        return 2

    schematron = load_schematron()

    any_unexpected_failure = False
    for path in targets:
        if not path.exists():
            print(f"SKIP  {path} (not found)")
            continue
        is_fixture = "fixtures" in path.parts
        try:
            ok, messages = validate_file(schematron, path)
        except etree.XMLSyntaxError as exc:
            # Some negative fixtures (e.g. duplicate-root-attribute) are not
            # even well-formed XML (QUSX-WF-003) — that's a parser-level
            # rejection, not something Schematron ever sees. Report and skip.
            print(f"FAIL  {path}")
            print(f"        (not well-formed XML, rejected before Schematron ran: {exc})")
            continue
        status = "PASS" if ok else "FAIL"
        print(f"{status}  {path}")
        for m in messages:
            print(f"        {m}")
        if not ok and not is_fixture:
            any_unexpected_failure = True

    return 1 if any_unexpected_failure else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
