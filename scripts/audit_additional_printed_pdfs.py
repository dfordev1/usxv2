#!/usr/bin/env python3
"""Render and hash candidate line evidence from the three additional printed PDFs."""

import gzip
import hashlib
import json
import sqlite3
from collections import defaultdict
from pathlib import Path

import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "data/review/eight-riwayah-printed-audit-plan-v1.json.gz"
SOURCES = ROOT / "data/review/additional-printed-editions-v1.json"
OUTPUT = ROOT / "data/review/additional-printed-line-evidence-v1.json.gz"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


with gzip.open(PLAN, "rt", encoding="utf8") as stream:
    plan = json.load(stream)
sources = json.loads(SOURCES.read_text(encoding="utf8"))
words = json.loads((ROOT / "data/raw/uthmani.json").read_text(encoding="utf8"))
word_ids = {record["location"]: record["id"] for record in words.values()}

database = sqlite3.connect(ROOT / "data/raw/qpc-v2-15-lines.db")
layout_rows = database.execute(
    "SELECT page_number,line_number,first_word_id,last_word_id FROM pages WHERE line_type='ayah'"
).fetchall()


def locate(location):
    word_id = word_ids[location]
    matches = [(page, line) for page, line, first, last in layout_rows if first <= word_id <= last]
    if len(matches) != 1:
        raise ValueError(f"Expected one page/line for {location}, found {matches}")
    return matches[0]


records = []
jobs = defaultdict(list)
for candidate in plan["records"]:
    page, line = locate(candidate["canonical"])
    item = {"id": candidate["id"], "canonical": candidate["canonical"], "canonicalPage": page, "canonicalLine": line, "editions": {}}
    records.append(item)
    for tradition, source in sources["editions"].items():
        pdf_page = page + source["canonicalPageOffset"]
        jobs[(tradition, pdf_page)].append(item)


for tradition, source in sources["editions"].items():
    pdf_path = (SOURCES.parent / source["localAuditPath"]).resolve()
    payload = pdf_path.read_bytes()
    if sha256(payload) != source["sha256"]:
        raise ValueError(f"PDF hash mismatch: {tradition}")
    document = pdfium.PdfDocument(pdf_path)
    for (job_tradition, pdf_page), candidates in sorted(jobs.items(), key=lambda item: item[0][1]):
        if job_tradition != tradition:
            continue
        page = document[pdf_page - 1]
        image = page.render(scale=2.0).to_pil().convert("RGB")
        width, height = image.size
        content_top, content_bottom = (0.13, 0.89) if tradition == "sousi-kfqc" else (0.14, 0.88)
        line_height = height * (content_bottom - content_top) / 15
        for candidate in candidates:
            center = height * content_top + (candidate["canonicalLine"] - 0.5) * line_height
            top = max(0, round(center - 1.35 * line_height))
            bottom = min(height, round(center + 1.35 * line_height))
            crop = image.crop((0, top, width, bottom))
            import io
            buffer = io.BytesIO()
            crop.save(buffer, format="PNG", optimize=True)
            candidate["editions"][tradition] = {
                "pdfPage": pdf_page,
                "sourceSha256": source["sha256"],
                "cropSha256": sha256(buffer.getvalue()),
                "cropBox": {"left": 0, "top": top, "width": width, "height": bottom - top},
                "renderScale": 2.0,
                "status": "target-line-region-rendered-and-hashed",
            }

report = {
    "format": "qusx-additional-printed-line-evidence",
    "version": "1.0.0",
    "status": "complete-three-edition-line-evidence",
    "limitations": sources["limitations"],
    "coverage": {"records": len(records), "editions": 3, "renderedCrops": sum(len(item["editions"]) for item in records)},
    "records": records,
}
with gzip.GzipFile(filename="", mode="wb", fileobj=OUTPUT.open("wb"), mtime=0) as stream:
    stream.write(json.dumps(report, ensure_ascii=False, separators=(",", ":")).encode("utf8"))
print(json.dumps(report["coverage"], indent=2))
