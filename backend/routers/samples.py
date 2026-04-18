from fastapi import APIRouter, HTTPException
import json, os

router = APIRouter(prefix="/api", tags=["samples"])

SAMPLES = {
    "genuine_1": {
        "label": "Genuine Certificate",
        "filename": "genuine_cert_1.jpg",
        "description": "Standard graduation certificate — no anomalies"
    },
    "tampered_marks": {
        "label": "Tampered Marksheet",
        "filename": "tampered_marks_1.jpg",
        "description": "Marks field edited from 45 to 90"
    },
    "tampered_seal": {
        "label": "Pasted Seal",
        "filename": "tampered_seal_1.jpg",
        "description": "Official seal copy-pasted from another document"
    }
}

@router.get("/samples")
def list_samples():
    return [{"id": k, **v} for k, v in SAMPLES.items()]

@router.get("/sample/{sample_id}")
def get_sample(sample_id: str):
    # Load precomputed result JSON
    result_path = f"samples/{sample_id}_result.json"
    if not os.path.exists(result_path):
        raise HTTPException(status_code=404, detail="Sample result not found")
    with open(result_path) as f:
        return json.load(f)