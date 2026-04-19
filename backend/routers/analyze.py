from fastapi import APIRouter, UploadFile, File, HTTPException
from services.ingestion import process_upload
from services.ocr_engine import run_ocr
from services.text_checks import check_text_tampering
from services.image_forensics import run_ela, check_clone_patches
from services.layout_checks import check_layout_anomalies
from services.scoring_engine import compute_score
from services.report_builder import build_report, build_multipage_report
import cv2
import os
import json

router = APIRouter(prefix="/api", tags=["analyze"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}


def resolve_image_path(img_path: str) -> str:
    """Try .jpg and .jpeg variants if original path doesn't exist."""
    if os.path.exists(img_path):
        return img_path
    for ext_from, ext_to in [(".jpg", ".jpeg"), (".jpeg", ".jpg")]:
        if img_path.endswith(ext_from):
            alt = img_path[:-len(ext_from)] + ext_to
            if os.path.exists(alt):
                print(f"📸 Using alternative path: {alt}")
                return alt
    return img_path  # return original even if not found — will fail later with clear error


def analyze_single_page(img_path: str, doc_id: str, page_num: int, page_meta: dict) -> dict:
    """Run full analysis pipeline on a single page image. Returns raw signals dict."""
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f"Could not read image at {img_path}")
    h, w = img.shape[:2]
    print(f"✅ Page {page_num} loaded: {w}x{h}")

    print(f"🔍 [{page_num}] Running OCR...")
    ocr_regions = run_ocr(img_path)
    print(f"✅ [{page_num}] OCR: {len(ocr_regions)} regions")

    print(f"📝 [{page_num}] Checking text tampering...")
    text_flags = check_text_tampering(ocr_regions)
    print(f"✅ [{page_num}] Text flags: {len(text_flags)}")

    print(f"📐 [{page_num}] Checking layout anomalies...")
    layout_flags = check_layout_anomalies(ocr_regions, w, h)
    print(f"✅ [{page_num}] Layout flags: {len(layout_flags)}")

    print(f"🔥 [{page_num}] Running ELA forensics...")
    ela_result = run_ela(img_path, doc_id, page_num)
    print(f"✅ [{page_num}] ELA hotspots: {len(ela_result['hotspots'])}, heatmap: {ela_result['heatmap_path']}")

    print(f"🔍 [{page_num}] Checking clone patches...")
    clone_flags = check_clone_patches(img_path)
    print(f"✅ [{page_num}] Clone flags: {len(clone_flags)}")

    return {
        "page_meta": {**page_meta, "width": w, "height": h},
        "ocr_regions": ocr_regions,
        "text_flags": text_flags,
        "layout_flags": layout_flags,
        "ela_result": ela_result,
        "clone_flags": clone_flags,
    }


# ─────────────────────────────────────────────
#  MAIN ANALYZE ENDPOINT
# ─────────────────────────────────────────────

@router.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Only JPG, PNG, PDF supported."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    print(f"\n{'='*50}")
    print(f"📂 Analyzing: {file.filename} ({file.content_type})")
    print(f"{'='*50}")

    intake = process_upload(file_bytes, file.filename)
    doc_id = intake["document_id"]
    print(f"📋 Document ID: {doc_id} | Pages: {intake['total_pages']} | Format: {intake['format_type']}")

    all_page_results = []

    for page_meta in intake["pages"]:
        img_path = resolve_image_path(page_meta["image_path"])
        page_meta["image_path"] = img_path
        page_meta["format_type"] = intake["format_type"]
        page_meta["original_filename"] = intake["original_filename"]

        if not os.path.exists(img_path):
            print(f"❌ Image not found: {img_path} — skipping page {page_meta['page_number']}")
            continue

        try:
            result = analyze_single_page(img_path, doc_id, page_meta["page_number"], page_meta)
            all_page_results.append(result)
        except Exception as e:
            print(f"❌ Error on page {page_meta['page_number']}: {e}")
            continue

    if not all_page_results:
        raise HTTPException(status_code=500, detail="All pages failed to process. Check server logs.")

    # Aggregate signals across all pages
    all_text_flags    = [f for pr in all_page_results for f in pr["text_flags"]]
    all_hotspots      = [h for pr in all_page_results for h in pr["ela_result"]["hotspots"]]
    all_clone_flags   = [f for pr in all_page_results for f in pr["clone_flags"]]
    all_layout_flags  = [f for pr in all_page_results for f in pr["layout_flags"]]
    all_ocr_regions   = [r for pr in all_page_results for r in pr["ocr_regions"]]

    print(f"\n📊 Aggregated signals:")
    print(f"   Text flags: {len(all_text_flags)} | Hotspots: {len(all_hotspots)} | Clones: {len(all_clone_flags)} | Layout: {len(all_layout_flags)}")

    print("📊 Computing score...")
    score_result = compute_score(
        all_text_flags, all_hotspots, all_clone_flags, all_layout_flags, all_ocr_regions
    )
    print(f"✅ Score: {score_result['confidence_score']}% — {score_result['verdict_label']}")

    print("📋 Building report...")
    if len(all_page_results) == 1:
        pr = all_page_results[0]
        report = build_report(
            doc_id, score_result,
            pr["text_flags"], pr["ela_result"]["hotspots"],
            pr["clone_flags"], pr["layout_flags"],
            pr["ocr_regions"], pr["ela_result"], pr["page_meta"]
        )
    else:
        report = build_multipage_report(doc_id, score_result, all_page_results)

    # Inject format metadata for frontend
    report["format_type"] = intake["format_type"]
    report["original_filename"] = intake["original_filename"]
    report["total_pages_analyzed"] = len(all_page_results)

    print(f"✅ Analysis complete! Verdict: {score_result['verdict']} ({score_result['confidence_score']}%)\n")
    return report


# ─────────────────────────────────────────────
#  DEBUG ENDPOINT — shows raw signal counts
#  Use this to diagnose scoring issues
# ─────────────────────────────────────────────

@router.post("/debug")
async def debug_document(file: UploadFile = File(...)):
    """
    Returns raw signal counts without scoring.
    Use this to check if genuine vs tampered docs produce different signals.
    """
    file_bytes = await file.read()
    intake = process_upload(file_bytes, file.filename)
    page_meta = intake["pages"][0]
    img_path = resolve_image_path(page_meta["image_path"])

    if not os.path.exists(img_path):
        raise HTTPException(status_code=500, detail=f"Image not found: {img_path}")

    img = cv2.imread(img_path)
    h, w = img.shape[:2]

    ocr = run_ocr(img_path)
    text_f = check_text_tampering(ocr)
    layout_f = check_layout_anomalies(ocr, w, h)
    ela = run_ela(img_path, intake["document_id"], 1)
    clone_f = check_clone_patches(img_path)

    avg_conf = round(sum(r["confidence"] for r in ocr) / len(ocr), 3) if ocr else 0
    strong_hotspots = [h for h in ela["hotspots"] if h.get("intensity", 0) > 85]
    high_text = [f for f in text_f if f.get("severity") == "high"]
    medium_text = [f for f in text_f if f.get("severity") == "medium"]
    high_layout = [f for f in layout_f if f.get("severity") == "high"]

    return {
        "filename": file.filename,
        "image_size": f"{w}x{h}",
        "ocr_region_count": len(ocr),
        "avg_ocr_confidence": avg_conf,
        "text_flags": {
            "high": len(high_text),
            "medium": len(medium_text),
            "total": len(text_f),
            "details": [
                {"check": f.get("check"), "reason": f.get("reason"), "severity": f.get("severity")}
                for f in text_f[:5]  # show first 5 only
            ]
        },
        "ela_hotspots": {
            "strong_above_85": len(strong_hotspots),
            "all": len(ela["hotspots"]),
            "intensities": [round(h.get("intensity", 0), 1) for h in ela["hotspots"]]
        },
        "clone_flags": {
            "count": len(clone_f),
            "details": clone_f[:3]
        },
        "layout_flags": {
            "high": len(high_layout),
            "total": len(layout_f),
            "details": [
                {"check": f.get("check"), "reason": f.get("reason"), "severity": f.get("severity")}
                for f in layout_f[:5]
            ]
        },
        "expected_score_preview": {
            "text_contribution": round(min(1.0, len(high_text) * 0.35 + len(medium_text) * 0.10) * 30, 1),
            "ela_contribution": round(min(1.0, len(strong_hotspots) * 0.40) * 25, 1),
            "clone_contribution": round(min(1.0, len(clone_f) * 0.50) * 20, 1),
            "layout_contribution": round(min(1.0, len(high_layout) * 0.30) * 15, 1),
        }
    }