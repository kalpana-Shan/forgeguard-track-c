from .ingestion import process_upload
from .ocr_engine import run_ocr
from .text_checks import check_text_tampering
from .image_forensics import run_ela, check_clone_patches
from .layout_checks import check_layout_anomalies
from .scoring_engine import compute_score
from .report_builder import build_report