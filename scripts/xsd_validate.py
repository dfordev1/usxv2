#!/usr/bin/env python3
"""Validate every generated QUSX file against schema/qusx.xsd with a real
XML Schema processor (lxml/libxml2) -- not the regex-based src/validate.js.

Usage:
  python scripts/xsd_validate.py           # validate the main output/ corpus
  python scripts/xsd_validate.py --pilot   # validate the 4 CONFORMING pilot
                                            # traditions under output-pilot/
Requires: pip install lxml

Note on --pilot: Al-Susi (output-pilot/sousi/) is intentionally EXCLUDED --
its tradition code is not in the schema enum (it was always a bonus, out of
the originally-scoped 5 traditions; see docs/multi-tradition-status.md). It
is expected to be XSD-invalid and is not a conformance target.
"""
import glob
import sys
from pathlib import Path
from lxml import etree

ROOT = Path(__file__).parent.parent
schema = etree.XMLSchema(etree.parse(str(ROOT / "schema" / "qusx.xsd")))

PILOT = "--pilot" in sys.argv
if PILOT:
    CONFORMING_TRADITIONS = ["warsh", "qalon", "douri", "shubah"]
    files = sorted(
        f
        for t in CONFORMING_TRADITIONS
        for f in glob.glob(str(ROOT / "output-pilot" / t / "*.xml"))
    )
    label = "output-pilot/ (4 conforming traditions, Al-Susi excluded by design)"
else:
    files = sorted(glob.glob(str(ROOT / "output" / "*" / "*.xml")))
    label = "output/"
if not files:
    print(f"No generated files found under {label} -- run the generator first.")
    sys.exit(1)

invalid = 0
for f in files:
    doc = etree.parse(f)
    if not schema.validate(doc):
        invalid += 1
        for e in schema.error_log:
            print(f"{f}: {e}")

print(f"XSD validation [{label}]: {len(files) - invalid}/{len(files)} valid, {invalid} invalid")
sys.exit(1 if invalid else 0)
