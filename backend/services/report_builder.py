import os


def _fix_url_path(raw_path: str) -> str:
    """
    Convert any OS path to a clean URL-safe relative path.
    Handles Windows backslashes and nested subfolders.
    Example: 'overlays\\abc123_page1_ela.jpg' → '/overlays/abc123_page1_ela.jpg'
    """
    # Normalize backslashes to forward slashes
    clean = raw_path.replace("\\", "/")
    # Extract just the filename from any nested path
    filename = clean.split("/")[-1]
    return filename


def _build_text_reason(f: dict) -> str:
    """Build a specific, human-readable reason for a text tamper flag."""
    r = f.get("region", {})
    check = f.get("check", "")
    field = r.get("field_label", "General Text")
    text  = r.get("text", "")
    conf  = round(r.get("confidence", 0), 2)
    short_text = f'"{text[:25]}"' if text else ""

    if check == "low_ocr_confidence":
        return (
            f"Low OCR confidence ({conf}) on {short_text} in {field} field "
            f"— text may have been digitally altered or pasted"
        )
    elif check == "height_inconsistency":
        return (
            f"Text size inconsistency in {field} field {short_text} "
            f"— font height differs from surrounding row text"
        )
    elif check == "text_overlap":
        return (
            f"Overlapping text regions near {field} field {short_text} "
            f"— possible overwrite or text insertion detected"
        )
    else:
        return f.get("reason", f"Text anomaly detected in {field} field")


def _build_ela_reason(hs: dict) -> str:
    """Build a specific reason for an ELA hotspot."""
    intensity = round(hs.get("intensity", 0), 1)
    box = hs.get("box", {})
    x, y = box.get("x", 0), box.get("y", 0)
    if intensity > 120:
        level = "severe"
    elif intensity > 90:
        level = "significant"
    else:
        level = "moderate"
    return (
        f"ELA forensics detected {level} recompression anomaly "
        f"(intensity: {intensity}) at region ({x},{y}) "
        f"— area may have been digitally edited or content pasted in"
    )


def _get_ela_field_label(hs: dict, page_ocr: list, img_height: int = 1000) -> str:
    """
    Try to map an ELA hotspot to a nearby OCR field label.
    If no nearby text found, use positional guess.
    """
    box = hs.get("box", {})
    hx = box.get("x", 0) + box.get("w", 0) // 2
    hy = box.get("y", 0) + box.get("h", 0) // 2

    # Find the closest OCR region center
    best_label = None
    best_dist  = 9999
    for r in page_ocr:
        rx = r["box"]["x"] + r["box"]["w"] // 2
        ry = r["box"]["y"] + r["box"]["h"] // 2
        dist = abs(rx - hx) + abs(ry - hy)
        if dist < best_dist and r.get("field_label", "General Text") != "General Text":
            best_dist  = dist
            best_label = r.get("field_label")

    if best_label and best_dist < 150:
        return best_label

    # Positional fallback
    if hy > img_height * 0.85:
        return "Seal/Signature"
    if hy > img_height * 0.70:
        return "Footer"
    if hy < img_height * 0.12:
        return "Header"
    return "Document Body"


def build_suspicious_regions(
    text_flags, hotspots, clone_flags, layout_flags, ocr_regions=None
) -> list:
    """
    Build a clean list of suspicious regions with specific evidence messages.
    Used by both build_report and build_multipage_report.
    """
    regions = []
    rid = 0
    ocr_regions = ocr_regions or []

    # --- Text tamper flags ---
    for f in text_flags:
        rid += 1
        r      = f.get("region", {})
        field  = r.get("field_label", "General Text")
        reason = _build_text_reason(f)

        regions.append({
            "region_id": f"R{rid}",
            "box":        r.get("box", {"x": 0, "y": 0, "w": 0, "h": 0}),
            "type":       "text_tamper",
            "severity":   f.get("severity", "medium"),
            "field_label": field,
            "reason":     reason,
            "language":   r.get("language", "en")
        })

    # --- ELA hotspot flags (top 3 only) ---
    for hs in hotspots[:3]:
        rid += 1
        field  = _get_ela_field_label(hs, ocr_regions)
        reason = _build_ela_reason(hs)
        intensity = hs.get("intensity", 0)

        regions.append({
            "region_id": f"R{rid}",
            "box":        hs.get("box", {"x": 0, "y": 0, "w": 0, "h": 0}),
            "type":       "image_artifact",
            "severity":   "high" if intensity > 90 else "medium",
            "field_label": field,
            "reason":     reason,
            "language":   "en"
        })

    # --- Clone detection flags ---
    for cf in clone_flags:
        rid += 1
        box = cf.get("box", {"x": 0, "y": 0, "w": 0, "h": 0})
        x, y = box.get("x", 0), box.get("y", 0)
        regions.append({
            "region_id": f"R{rid}",
            "box":        box,
            "type":       "image_artifact",
            "severity":   cf.get("severity", "medium"),
            "field_label": "Image Region",
            "reason":     (
                f"Repeated texture block found at ({x},{y}) "
                f"— possible copy-move editing or stamp/seal duplication"
            ),
            "language":   "en"
        })

    # --- Layout anomaly flags ---
    for lf in layout_flags:
        rid += 1
        r      = lf.get("region", {})
        field  = r.get("field_label", "General Text") if r else "Layout"
        box    = r.get("box", {"x": 0, "y": 0, "w": 0, "h": 0}) if r else {"x": 0, "y": 0, "w": 0, "h": 0}
        check  = lf.get("check", "")
        sev    = lf.get("severity", "low")

        if check == "baseline_shift":
            reason = (
                f"Text baseline misalignment in {field} field "
                f"— text row is not horizontally aligned, suggesting replaced content"
            )
        elif check == "margin_overflow":
            reason = (
                f"Text found outside expected document margin near {field} "
                f"— may indicate content was added after original creation"
            )
        elif check == "column_spacing_anomaly":
            reason = (
                f"Irregular column spacing detected across document "
                f"— table or layout may have been modified"
            )
        else:
            reason = lf.get("reason", f"Layout anomaly detected near {field}")

        regions.append({
            "region_id": f"R{rid}",
            "box":        box,
            "type":       "layout_anomaly",
            "severity":   sev,
            "field_label": field,
            "reason":     reason,
            "language":   r.get("language", "en") if r else "en"
        })

    return regions


def _build_top_reasons(suspicious_regions: list) -> list:
    """Extract top 3 most important reasons by severity."""
    severity_order = {"high": 0, "medium": 1, "low": 2}
    sorted_regions = sorted(
        suspicious_regions,
        key=lambda x: severity_order.get(x["severity"], 3)
    )
    seen = set()
    reasons = []
    for r in sorted_regions:
        reason = r["reason"]
        if reason not in seen:
            seen.add(reason)
            reasons.append(reason)
        if len(reasons) == 3:
            break
    return reasons if reasons else ["No significant anomalies detected"]


def _build_officer_summary(verdict: str, score: int) -> str:
    """Build officer-friendly summary based on verdict."""
    if verdict == "LIKELY_GENUINE":
        return (
            "No significant anomalies detected. Document appears consistent "
            "with genuine templates. Safe to proceed with standard verification."
        )
    elif verdict == "REVIEW_NEEDED":
        return (
            f"Some inconsistencies found (confidence: {score}%). "
            "Manual spot-check recommended before accepting this document. "
            "Cross-verify key fields against original records."
        )
    else:
        return (
            f"High risk of tampering detected (confidence: {score}%). "
            "Manual verification strongly recommended. "
            "Do not accept without physical verification."
        )


# ─────────────────────────────────────────────
#  SINGLE PAGE REPORT
# ─────────────────────────────────────────────

def build_report(
    doc_id, score_result, text_flags, image_hotspots,
    clone_flags, layout_flags, ocr_regions, ela_result, page_meta
):
    suspicious_regions = build_suspicious_regions(
        text_flags, image_hotspots, clone_flags, layout_flags, ocr_regions
    )

    top_reasons    = _build_top_reasons(suspicious_regions)
    verdict        = score_result["verdict"]
    score          = score_result["confidence_score"]
    officer_summary = _build_officer_summary(verdict, score)

    # Clean OCR output for frontend
    ocr_out = [
        {
            "text":       r["text"],
            "box":        r["box"],
            "confidence": r["confidence"],
            "language":   r["language"],
            "field_label": r.get("field_label", "General Text")
        }
        for r in ocr_regions
    ]

    # Fix Windows backslash paths for URLs
    img_filename = _fix_url_path(page_meta["image_path"])
    ela_filename = _fix_url_path(ela_result["heatmap_path"])

    return {
        "document_id":       doc_id,
        "status":            "analyzed",
        "format_type":       page_meta.get("format_type", "image"),
        "original_filename": page_meta.get("original_filename", "unknown"),
        "verdict":           score_result["verdict"],
        "confidence_score":  score_result["confidence_score"],
        "verdict_label":     score_result["verdict_label"],
        "breakdown":         score_result.get("breakdown", {}),
        "top_reasons":       top_reasons,
        "officer_summary":   officer_summary,
        "pages": [{
            "page_number":       page_meta["page_number"],
            "preview_image_url": f"/uploads/{img_filename}",
            "ela_heatmap_url":   f"/overlays/{ela_filename}",
            "suspicious_regions": suspicious_regions,
            "ocr_regions":       ocr_out
        }]
    }


# ─────────────────────────────────────────────
#  MULTI PAGE REPORT
# ─────────────────────────────────────────────

def build_multipage_report(doc_id: str, score_result: dict, all_page_results: list) -> dict:
    pages_output   = []
    all_suspicious = []

    for pr in all_page_results:
        single = build_report(
            doc_id, score_result,
            pr["text_flags"],
            pr["ela_result"]["hotspots"],
            pr["clone_flags"],
            pr["layout_flags"],
            pr["ocr_regions"],
            pr["ela_result"],
            pr["page_meta"]
        )
        page_data = single["pages"][0]
        pages_output.append(page_data)
        all_suspicious += page_data.get("suspicious_regions", [])

    # Deduplicate top reasons across all pages
    top_reasons = _build_top_reasons(all_suspicious)

    verdict         = score_result["verdict"]
    score           = score_result["confidence_score"]
    officer_summary = _build_officer_summary(verdict, score)

    return {
        "document_id":           doc_id,
        "status":                "analyzed",
        "format_type":           all_page_results[0]["page_meta"].get("format_type", "pdf"),
        "original_filename":     all_page_results[0]["page_meta"].get("original_filename", ""),
        "verdict":               score_result["verdict"],
        "confidence_score":      score_result["confidence_score"],
        "verdict_label":         score_result["verdict_label"],
        "breakdown":             score_result.get("breakdown", {}),
        "top_reasons":           top_reasons,
        "officer_summary":       officer_summary,
        "total_pages_analyzed":  len(pages_output),
        "pages":                 pages_output
    }