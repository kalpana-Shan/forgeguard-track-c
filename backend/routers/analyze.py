from fastapi import APIRouter, UploadFile, File, HTTPException
from services.ingestion import process_upload
from services.ocr_engine import run_ocr
from services.text_checks import check_text_tampering
from services.image_forensics import run_ela, check_clone_patches
from services.layout_checks import check_layout_anomalies
from services.scoring_engine import compute_score
from services.report_builder import build_report
import cv2
import os

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
    
    # ADD format_type and original_filename to page_meta
    page_meta["format_type"] = intake["format_type"]
    page_meta["original_filename"] = intake["original_filename"]
    
    img_path = page_meta["image_path"]
    
    # Debug: Print image path and check if file exists
    print(f"📸 Image path: {img_path}")
    print(f"📸 File exists: {os.path.exists(img_path)}")
    
    # Try alternative extension if file doesn't exist
    if not os.path.exists(img_path):
        if img_path.endswith('.jpg'):
            alt_path = img_path[:-4] + '.jpeg'
            if os.path.exists(alt_path):
                img_path = alt_path
                print(f"📸 Using alternative path: {img_path}")
        elif img_path.endswith('.jpeg'):
            alt_path = img_path[:-5] + '.jpg'
            if os.path.exists(alt_path):
                img_path = alt_path
                print(f"📸 Using alternative path: {img_path}")
    
    img = cv2.imread(img_path)
    if img is None:
        print(f"❌ Failed to read image at: {img_path}")
        raise HTTPException(status_code=500, detail=f"Could not read uploaded image at {img_path}")
    
    h, w = img.shape[:2]
    print(f"✅ Image loaded: {w}x{h}")

    print("🔍 Running OCR...")
    ocr_regions = run_ocr(img_path)
    print(f"✅ OCR found {len(ocr_regions)} regions")
    
    print("📝 Checking text tampering...")
    text_flags = check_text_tampering(ocr_regions)
    print(f"✅ Text flags: {len(text_flags)}")
    
    print("📐 Checking layout anomalies...")
    layout_flags = check_layout_anomalies(ocr_regions, w, h)
    print(f"✅ Layout flags: {len(layout_flags)}")
    
    print("🔥 Running ELA forensics...")
    ela_result = run_ela(img_path, doc_id, 1)
    print(f"✅ ELA hotspots: {len(ela_result['hotspots'])}")
    print(f"✅ ELA heatmap: {ela_result['heatmap_path']}")
    
    print("🔍 Checking clone patches...")
    clone_flags = check_clone_patches(img_path)
    print(f"✅ Clone flags: {len(clone_flags)}")

    print("📊 Computing score...")
    score_result = compute_score(
        text_flags, ela_result["hotspots"], clone_flags, layout_flags, ocr_regions
    )
    print(f"✅ Score: {score_result['confidence_score']} - {score_result['verdict_label']}")

    print("📋 Building report...")
    report = build_report(
        doc_id, score_result, text_flags,
        ela_result["hotspots"], clone_flags,
        layout_flags, ocr_regions, ela_result, page_meta
    )
    print("✅ Analysis complete!")
    
    return report