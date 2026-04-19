from fastapi import APIRouter, HTTPException
import json, os

router = APIRouter(prefix="/api", tags=["samples"])

SAMPLES = {
    "genuine_marksheet": {
        "label": "Genuine Marksheet",
        "filename": "genuine_marksheet.pdf",
        "filetype": "pdf",
        "format_badge": "PDF",
        "category": "marksheet",
        "verdict_hint": "GENUINE",
        "description": "Original university marksheet — no tampering detected",
        "highlight": "Shows clean multi-page PDF analysis"
    },
    "tampered_marksheet": {
        "label": "Tampered Marksheet",
        "filename": "tampered_marksheet.pdf",
        "filetype": "pdf",
        "format_badge": "PDF",
        "category": "marksheet",
        "verdict_hint": "HIGH_TAMPER_RISK",
        "description": "Marks edited from 45 to 90 in subject row",
        "highlight": "Triggers text tamper + OCR confidence drop flags"
    },
    "genuine_cert": {
        "label": "Genuine Certificate",
        "filename": "genuine_cert.jpeg",  # Changed from .jpg to .jpeg
        "filetype": "image",
        "format_badge": "JPEG",
        "category": "certificate",
        "verdict_hint": "GENUINE",
        "description": "Original graduation certificate image — clean",
        "highlight": "Shows image format analysis with ELA baseline"
    },
    "tampered_cert": {
        "label": "Tampered Certificate",
        "filename": "tampered_cert.png",  # Changed from .jpg to .png
        "filetype": "image",
        "format_badge": "PNG",
        "category": "certificate",
        "verdict_hint": "HIGH_TAMPER_RISK",
        "description": "Seal copy-pasted and name overwritten",
        "highlight": "Triggers ELA heatmap + clone detection + layout flags"
    },
    "tamil_cert": {
        "label": "Tamil Certificate",
        "filename": "tamil_cert.jpeg",  # Changed from .pdf to .jpeg (since it's an image)
        "filetype": "image",
        "format_badge": "JPEG",
        "category": "certificate",
        "verdict_hint": "REVIEW_NEEDED",
        "description": "Tamil language graduation certificate",
        "highlight": "Demonstrates regional language OCR support"
    }
}

@router.get("/samples")
def list_samples():
    """Returns all available demo samples with metadata."""
    return [{"id": k, **v} for k, v in SAMPLES.items()]

@router.get("/sample/{sample_id}")
def get_sample(sample_id: str):
    """Returns precomputed analysis result for a demo sample."""
    if sample_id not in SAMPLES:
        raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found")
    result_path = f"samples/{sample_id}_result.json"
    if not os.path.exists(result_path):
        raise HTTPException(
            status_code=404,
            detail=f"Precomputed result missing. Run: POST /api/analyze with {SAMPLES[sample_id]['filename']}"
        )
    with open(result_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    # Inject sample metadata into response for frontend use
    data["sample_meta"] = SAMPLES[sample_id]
    return data