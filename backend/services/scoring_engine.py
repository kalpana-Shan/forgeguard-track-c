WEIGHTS = {
    "text_tamper":     0.30,
    "image_forensic":  0.25,
    "layout_anomaly":  0.15,
    "ocr_instability": 0.10,
    "critical_field":  0.20
}

CRITICAL_FIELDS = {"Marks", "Name", "ID", "Date", "Seal/Signature", "Seal", "Signature"}

SEVERITY_SCORE = {"high": 1.0, "medium": 0.55, "low": 0.25}

def compute_score(text_flags, image_hotspots, clone_flags, layout_flags, ocr_regions) -> dict:
    score = 0.0

    # --- Text tamper score (weight: 30%) ---
    high_text = [f for f in text_flags if f.get("severity") == "high"]
    medium_text = [f for f in text_flags if f.get("severity") == "medium"]
    text_score = min(1.0, (len(high_text) * 0.35) + (len(medium_text) * 0.10))
    score += text_score * 0.30

    # --- ELA hotspot score (weight: 25%) ---
    strong_hotspots = [h for h in image_hotspots if h.get("intensity", 0) > 85]
    ela_score = min(1.0, len(strong_hotspots) * 0.40)
    score += ela_score * 0.25

    # --- Clone detection score (weight: 20%) ---
    clone_score = min(1.0, len(clone_flags) * 0.50)
    score += clone_score * 0.20

    # --- Layout anomaly score (weight: 15%) ---
    high_layout = [f for f in layout_flags if f.get("severity") == "high"]
    medium_layout = [f for f in layout_flags if f.get("severity") == "medium"]
    layout_score = min(1.0, (len(high_layout) * 0.30) + (len(medium_layout) * 0.10))
    score += layout_score * 0.15

    # --- Baseline guard: cap score if total signals are very low ---
    total_signals = len(high_text) + len(strong_hotspots) + len(clone_flags) + len(high_layout)

    if total_signals == 0:
        score = 0.0
    elif total_signals <= 2:
        score = min(score, 0.25)
    elif total_signals <= 4:
        score = min(score, 0.50)

    # --- OCR confidence adjustment ---
    if ocr_regions and len(ocr_regions) >= 3:
        avg_conf = sum(r["confidence"] for r in ocr_regions) / len(ocr_regions)
        if avg_conf > 0.82:
            score = max(0.0, score - 0.10)
        elif avg_conf > 0.68:
            score = max(0.0, score - 0.05)
        elif avg_conf < 0.35:
            score = min(1.0, score + 0.12)

    score = round(min(max(score, 0.0), 1.0), 3)

    # --- Verdict thresholds ---
    if score < 0.30:
        verdict = "LIKELY_GENUINE"
        verdict_label = "Likely Genuine"
    elif score < 0.58:
        verdict = "REVIEW_NEEDED"
        verdict_label = "Needs Review"
    else:
        verdict = "HIGH_TAMPER_RISK"
        verdict_label = "High Tamper Risk"

    confidence_percentage = int(score * 100)

    return {
        "confidence_score": confidence_percentage,
        "verdict": verdict,
        "verdict_label": verdict_label,
        "breakdown": {
            "text_tamper": round(text_score * 100),
            "ela_hotspots": round(ela_score * 100),
            "clone_detection": round(clone_score * 100),
            "layout_anomaly": round(layout_score * 100)
        }
    }