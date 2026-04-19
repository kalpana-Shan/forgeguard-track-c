from pydantic import BaseModel
from typing import List, Optional

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class SuspiciousRegion(BaseModel):
    region_id: str
    box: BoundingBox
    type: str           # text_tamper | image_artifact | layout_anomaly
    severity: str       # high | medium | low
    field_label: str    # Marks | Name | Seal | Signature | Date | ID
    reason: str
    language: str       # en | ta

class OCRRegion(BaseModel):
    text: str
    box: BoundingBox
    confidence: float
    language: str

class PageResult(BaseModel):
    page_number: int
    preview_image_url: str
    ela_heatmap_url: str
    suspicious_regions: List[SuspiciousRegion]
    ocr_regions: List[OCRRegion]

class ForgeReport(BaseModel):
    document_id: str
    status: str
    verdict: str              # GENUINE | REVIEW_NEEDED | HIGH_TAMPER_RISK
    confidence_score: float
    verdict_label: str
    top_reasons: List[str]
    officer_summary: str
    pages: List[PageResult]