#!/usr/bin/env python3
"""Validate every generated QUSX file against schema/qusx.xsd with a real
XML Schema processor (lxml/libxml2) -- not the regex-based src/validate.js.

Usage: python scripts/xsd_validate.py
Requires: pip install lxml
"""
import glob
import sys
from pathlib import Path
from lxml import etree

ROOT = Path(__file__).parent.parent
schema = etree.XMLSchema(etree.parse(str(ROOT / "schema" / "qusx.xsd")))

files = sorted(glob.glob(str(ROOT / "output" / "*" / "*.xml")))
if not files:
    print("No generated files found under output/ -- run src/generate.js first.")
    sys.exit(1)

invalid = 0
for f in files:
    doc = etree.parse(f)
    if not schema.validate(doc):
        invalid += 1
        for e in schema.error_log:
            print(f"{f}: {e}")

print(f"XSD validation: {len(files) - invalid}/{len(files)} valid, {invalid} invalid")
sys.exit(1 if invalid else 0)
