#!/usr/bin/env python3
"""Compare generated Hafs ayah text/counts with the live Quran.com v4 API.

This is an independent, networked audit and is intentionally not part of the
deterministic offline verification gate.
"""

import json
import sys
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = sys.argv[1] if len(sys.argv) > 1 else "madani-v2"
OUTPUT = ROOT / "output" / LAYOUT
API = "https://api.quran.com/api/v4"
NS = "https://dfordev1.github.io/usxv2/ns/v1"
KNOWN_LETTER_MISMATCHES = {"11:13", "80:25"}


def fetch_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "QUSX-independent-audit/0.1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def generated_ayahs(chapter):
    root = etree.parse(str(OUTPUT / f"{chapter:03d}.qusx.xml")).getroot()
    if etree.QName(root).namespace != NS:
        raise ValueError(f"chapter {chapter}: wrong namespace {etree.QName(root).namespace!r}")

    result = {}
    active = {}
    structure_tags = {"page", "juz", "hizb", "rub", "manzil", "ruku"}
    current = None
    words = []
    for element in root:
        tag = etree.QName(element).localname
        if tag in structure_tags and element.get("sid"):
            active[tag] = int(element.get("number"))
        elif tag == "ayah" and element.get("sid"):
            current = int(element.get("number"))
            words = []
            result[current] = {"structure": dict(active)}
        elif tag == "word" and current is not None and element.get("type") != "number":
            words.append(element.text or "")
        elif tag == "ayah" and element.get("eid") and current is not None:
            result[current]["text"] = unicodedata.normalize("NFC", " ".join(words))
            result[current]["structure_end"] = dict(active)
            current = None
    return result


def fetch_chapter(chapter):
    payload = fetch_json(f"{API}/quran/verses/uthmani?chapter_number={chapter}")
    structure_payload = fetch_json(
        f"{API}/verses/by_chapter/{chapter}?fields=page_number,juz_number,hizb_number,"
        "rub_el_hizb_number,ruku_number,manzil_number&per_page=300"
    )
    structures = {
        verse["verse_number"]: {
            "page": verse["page_number"],
            "juz": verse["juz_number"],
            "hizb": verse["hizb_number"],
            "rub": verse["rub_el_hizb_number"],
            "manzil": verse["manzil_number"],
            "ruku": verse["ruku_number"],
        }
        for verse in structure_payload["verses"]
    }
    return chapter, {
        int(verse["verse_key"].split(":")[1]): {
            "text": unicodedata.normalize("NFC", verse["text_uthmani"]),
            "structure": structures[int(verse["verse_key"].split(":")[1])],
        }
        for verse in payload["verses"]
    }


def letter_skeleton(text):
    """Remove whitespace, marks, and recitation annotations; retain encoded letters."""
    return "".join(character for character in text if unicodedata.category(character).startswith("L"))


def main():
    if not OUTPUT.is_dir():
        raise SystemExit(f"Unknown or unavailable layout: {LAYOUT}")
    chapters = fetch_json(f"{API}/chapters")["chapters"]
    expected_counts = {chapter["id"]: chapter["verses_count"] for chapter in chapters}
    with ThreadPoolExecutor(max_workers=8) as executor:
        live = dict(executor.map(fetch_chapter, range(1, 115)))

    count_mismatches = []
    text_mismatches = []
    letter_mismatches = []
    structure_mismatches = []
    boundary_convention_differences = []
    checked = 0
    for chapter in range(1, 115):
        generated = generated_ayahs(chapter)
        remote = live[chapter]
        expected = expected_counts[chapter]
        if len(generated) != expected or len(remote) != expected:
            count_mismatches.append((chapter, len(generated), len(remote), expected))
        for ayah in sorted(set(generated) | set(remote)):
            checked += 1
            ours = generated.get(ayah, {})
            theirs = remote.get(ayah, {})
            if ours.get("text") != theirs.get("text"):
                text_mismatches.append(f"{chapter}:{ayah}")
            if letter_skeleton(ours.get("text", "")) != letter_skeleton(theirs.get("text", "")):
                letter_mismatches.append(f"{chapter}:{ayah}")
            for axis, expected_value in theirs.get("structure", {}).items():
                start_value = ours.get("structure", {}).get(axis)
                end_value = ours.get("structure_end", {}).get(axis, start_value)
                valid_values = {start_value, end_value}
                if expected_value not in valid_values:
                    structure_mismatches.append(
                        f"{chapter}:{ayah}:{axis}={start_value}..{end_value} expected {expected_value}"
                    )
                elif expected_value != start_value:
                    boundary_convention_differences.append(
                        f"{chapter}:{ayah}:{axis}=start {start_value}, end/API {end_value}"
                    )

    print(f"Generated layout checked: {LAYOUT}")
    print(f"Generated chapters checked: 114")
    print(f"Generated ayahs checked: {checked}")
    print(f"Chapter/count mismatches: {len(count_mismatches)}")
    print(f"Exact text mismatches: {len(text_mismatches)}")
    print(f"Letter-level mismatches after removing marks/annotations: {len(letter_mismatches)}")
    print(f"Ayah-start structural mismatches: {len(structure_mismatches)}")
    print(f"Cross-boundary ayahs where API uses the ending segment: {len(boundary_convention_differences)}")
    if count_mismatches:
        print("Count mismatch details:", count_mismatches)
    if text_mismatches:
        print("First exact-text mismatch keys:", ", ".join(text_mismatches[:20]))
    if letter_mismatches:
        print("Letter-level mismatch keys:", ", ".join(letter_mismatches))
    if structure_mismatches:
        print("First structural mismatches:", "; ".join(structure_mismatches[:20]))
    if boundary_convention_differences:
        print("First boundary-convention differences:", "; ".join(boundary_convention_differences[:20]))
    unexpected_letter_result = set(letter_mismatches) != KNOWN_LETTER_MISMATCHES
    if unexpected_letter_result:
        print("Letter-level mismatch set differs from the reviewed baseline.")
    return 1 if count_mismatches or structure_mismatches or unexpected_letter_result else 0


if __name__ == "__main__":
    sys.exit(main())
