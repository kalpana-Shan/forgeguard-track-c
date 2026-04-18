WEIGHTS = {
    "text_tamper":     0.30,
    "image_forensic":  0.25,
    "layout_anomaly":  0.15,
    "ocr_instability": 0.10,
    "critical_field":  0.20
}

CRITICAL_FIELDS = {"Marks", "Name", "ID", "Date", "Seal/Signature", "Seal", "Signature"}

SEVERITY_SCORE = {"high": 1.0, "medium": 0.55, "low": 0.25}

def compute_score(
    text_flags: list,
    image_hotspots: list,
    clone_flags: list,
    layout_flags: list,
    ocr_regions: list
) -> dict:

    # --- Text tamper sub-score ---
    text_score = min(1.0, sum(f.get("score_contribution", 0.3) for f in text_flags) / 2)

    # --- Image forensic sub-score ---
    hotspot_score = min(1.0, len(image_hotspots) * 0.25)
    clone_score = min(1.0, len(clone_flags) * 0.35)
    image_score = min(1.0, (hotspot_score + clone_score) / 2)

    # --- Layout sub-score ---
    layout_score = min(1.0, sum(f.get("score_contribution", 0.2) for f in layout_flags) / 1.5)

    # --- OCR instability sub-score ---
    if ocr_regions:
        low_conf = [r for r in ocr_regions if r["confidence"] < 0.50]
        ocr_score = min(1.0, len(low_conf) / max(len(ocr_regions), 1))
    else:
        ocr_score = 0.0

    # --- Critical field multiplier ---
    all_flags = text_flags + layout_flags
    critical_hit = any(
        f.get("region", {}).get("field_label", "") in CRITICAL_FIELDS
        for f in all_flags
    )
    critical_score = 1.0 if critical_hit else 0.0

    # --- Weighted final score ---
    final = (
        text_score     * WEIGHTS["text_tamper"] +
        image_score    * WEIGHTS["image_forensic"] +
        layout_score   * WEIGHTS["layout_anomaly"] +
        ocr_score      * WEIGHTS["ocr_instability"] +
        critical_score * WEIGHTS["critical_field"]
    )
    final = round(min(1.0, final), 3)

    # --- Verdict ---
    if final < 0.35:
        verdict = "GENUINE"
        label = "Likely Genuine"
    elif final < 0.65:
        verdict = "REVIEW_NEEDED"
        label = "Review Needed"
    else:
        verdict = "HIGH_TAMPER_RISK"
        label = "High Tamper Risk"

    return {
        "confidence_score": final,
        "verdict": verdict,
        "verdict_label": label,
        "subscores": {
            "text_tamper": round(text_score, 3),
            "image_forensic": round(image_score, 3),
            "layout_anomaly": round(layout_score, 3),
            "ocr_instability": round(ocr_score, 3),
            "critical_field": round(critical_score, 3)
        }
    }