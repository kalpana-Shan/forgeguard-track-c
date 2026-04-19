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
    # Only count HIGH severity flags, ignore medium/low for genuine docs
    high_text = [f for f in text_flags if f.get("severity") == "high"]
    medium_text = [f for f in text_flags if f.get("severity") == "medium"]
    
    # Reduce weight - genuine docs have some medium flags due to OCR noise
    text_score = min(0.3, (len(high_text) * 0.15) + (len(medium_text) * 0.03))
    score += text_score * 0.30

    # --- ELA hotspot score (weight: 25%) ---
    # Only count hotspots with VERY HIGH intensity (>85)
    strong_hotspots = [h for h in image_hotspots if h.get("intensity", 0) > 85]
    ela_score = min(0.3, len(strong_hotspots) * 0.15)
    score += ela_score * 0.25

    # --- Clone detection score (weight: 20%) ---
    # Clone flags are rare - only count if present
    clone_score = min(0.3, len(clone_flags) * 0.20)
    score += clone_score * 0.20

    # --- Layout anomaly score (weight: 15%) ---
    high_layout = [f for f in layout_flags if f.get("severity") == "high"]
    layout_score = min(0.2, len(high_layout) * 0.10)
    score += layout_score * 0.15

    # --- OCR average confidence bonus (weight: 10%) ---
    # If overall OCR confidence is high, SIGNIFICANTLY REDUCE the score
    if ocr_regions:
        avg_conf = sum(r["confidence"] for r in ocr_regions) / len(ocr_regions)
        # Genuine docs have high confidence (0.70-0.90)
        if avg_conf > 0.75:
            score = max(0.0, score - 0.20)   # Big reduction for clean docs
        elif avg_conf > 0.60:
            score = max(0.0, score - 0.10)
        elif avg_conf < 0.40:
            score = min(1.0, score + 0.10)   # Low confidence = possible tampering

    # Cap the score
    score = round(min(max(score, 0.0), 1.0), 3)

    # Verdict thresholds (adjusted lower for genuine docs)
    if score < 0.20:      # Changed from 0.30 to 0.20
        verdict = "LIKELY_GENUINE"
        verdict_label = "Likely Genuine"
    elif score < 0.50:    # Changed from 0.60 to 0.50
        verdict = "REVIEW_NEEDED"
        verdict_label = "Needs Review"
    else:
        verdict = "HIGH_TAMPER_RISK"
        verdict_label = "High Tamper Risk"

    # Convert to percentage for frontend
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