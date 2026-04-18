from fastapi import APIRouter, UploadFile, File, HTTPException
from services.ingestion import process_upload
from services.ocr_engine import run_ocr
from services.text_checks import check_text_tampering
from services.image_forensics import run_ela, check_clone_patches
from services.layout_checks import check_layout_anomalies
from services.scoring_engine import compute_score
from services.report_builder import build_report
import cv2

router = APIRouter(prefix="/api", tags=["analyze"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}

@router.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, PDF supported")

    file_bytes = await file.read()
    intake = process_upload(file_bytes, file.filename)
    doc_id = intake["document_id"]

    # Process first page only for now
    page_meta = intake["pages"][0]
    img_path = page_meta["image_path"]
    img = cv2.imread(img_path)
    h, w = img.shape[:2]

    ocr_regions = run_ocr(img_path)
    text_flags = check_text_tampering(ocr_regions)
    layout_flags = check_layout_anomalies(ocr_regions, w, h)
    ela_result = run_ela(img_path, doc_id, 1)
    clone_flags = check_clone_patches(img_path)

    score_result = compute_score(
        text_flags, ela_result["hotspots"], clone_flags, layout_flags, ocr_regions
    )

    report = build_report(
        doc_id, score_result, text_flags,
        ela_result["hotspots"], clone_flags,
        layout_flags, ocr_regions, ela_result, page_meta
    )
    return report