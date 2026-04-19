def build_report(doc_id, score_result, text_flags, image_hotspots, clone_flags, layout_flags, ocr_regions, ela_result, page_meta):
    suspicious_regions = []
    rid = 0

    for f in text_flags:
        rid += 1
        r = f["region"]
        suspicious_regions.append({
            "region_id": f"r{rid}",
            "box": r["box"],
            "type": "text_tamper",
            "severity": f.get("severity", "medium"),
            "field_label": r.get("field_label", "Unknown"),
            "reason": f["reason"],
            "language": r.get("language", "en")
        })

    for hs in image_hotspots[:3]:
        rid += 1
        suspicious_regions.append({
            "region_id": f"r{rid}",
            "box": hs["box"],
            "type": "image_artifact",
            "severity": "high" if hs["intensity"] > 80 else "medium",
            "field_label": "Unknown",
            "reason": f"ELA detected compression anomaly (intensity {hs['intensity']}) — possible pasted region",
            "language": "en"
        })

    for cf in clone_flags:
        rid += 1
        suspicious_regions.append({
            "region_id": f"r{rid}",
            "box": cf["box"],
            "type": "image_artifact",
            "severity": cf["severity"],
            "field_label": "Unknown",
            "reason": cf["reason"],
            "language": "en"
        })

    for lf in layout_flags:
        rid += 1
        r = lf["region"]
        suspicious_regions.append({
            "region_id": f"r{rid}",
            "box": r["box"],
            "type": "layout_anomaly",
            "severity": lf.get("severity", "low"),
            "field_label": r.get("field_label", "Unknown"),
            "reason": lf["reason"],
            "language": r.get("language", "en")
        })

    # Build top 3 reasons from highest severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    sorted_regions = sorted(suspicious_regions, key=lambda x: severity_order.get(x["severity"], 3))
    top_reasons = [r["reason"] for r in sorted_regions[:3]]

    # Officer summary
    verdict = score_result["verdict"]
    score = score_result["confidence_score"]
    if verdict == "GENUINE":
        officer_summary = "No significant anomalies detected. Document appears consistent with genuine templates."
    elif verdict == "REVIEW_NEEDED":
        officer_summary = f"Some inconsistencies found (confidence: {int(score*100)}%). Manual spot-check recommended before accepting this document."
    else:
        officer_summary = f"High risk of tampering detected (confidence: {int(score*100)}%). Manual verification strongly recommended. Do not accept without physical verification."

    ocr_out = [{"text": r["text"], "box": r["box"], "confidence": r["confidence"], "language": r["language"]} for r in ocr_regions]

    # Get format_type and original_filename from page_meta (with defaults)
    format_type = page_meta.get("format_type", "image")
    original_filename = page_meta.get("original_filename", "unknown")

    return {
        "document_id": doc_id,
        "status": "analyzed",
        "format_type": format_type,
        "original_filename": original_filename,
        "verdict": score_result["verdict"],
        "confidence_score": score_result["confidence_score"],
        "verdict_label": score_result["verdict_label"],
        "top_reasons": top_reasons if top_reasons else ["No significant anomalies detected"],
        "officer_summary": officer_summary,
        "breakdown": score_result.get("breakdown", {}),  # ← ADDED THIS LINE
        "pages": [{
            "page_number": page_meta["page_number"],
            "preview_image_url": f"/uploads/{page_meta['image_path'].split('/')[-1]}",
            "ela_heatmap_url": f"/overlays/{ela_result['heatmap_path'].split('/')[-1]}",
            "suspicious_regions": suspicious_regions,
            "ocr_regions": ocr_out
        }]
    }

def build_multipage_report(doc_id: str, score_result: dict, all_page_results: list) -> dict:
    pages_output = []
    all_suspicious = []
    all_reasons = []

    for pr in all_page_results:
        page_meta    = pr["page_meta"]
        text_flags   = pr["text_flags"]
        hotspots     = pr["ela_result"]["hotspots"]
        clone_flags  = pr["clone_flags"]
        layout_flags = pr["layout_flags"]
        ocr_regions  = pr["ocr_regions"]
        ela_result   = pr["ela_result"]

        single = build_report(
            doc_id, score_result,
            text_flags, hotspots,
            clone_flags, layout_flags,
            ocr_regions, ela_result, page_meta
        )

        page_data = single["pages"][0]
        pages_output.append(page_data)
        all_suspicious += page_data.get("suspicious_regions", [])
        all_reasons    += single.get("top_reasons", [])

    # Deduplicate reasons, keep top 3
    seen = set()
    unique_reasons = []
    for r in all_reasons:
        if r not in seen:
            seen.add(r)
            unique_reasons.append(r)
        if len(unique_reasons) == 3:
            break

    if not unique_reasons:
        unique_reasons = ["No significant anomalies detected"]

    # Generate officer summary from score
    verdict = score_result["verdict"]
    score   = score_result["confidence_score"]

    if verdict == "LIKELY_GENUINE":
        officer_summary = f"No significant anomalies detected across all pages. Document appears consistent and genuine."
    elif verdict == "REVIEW_NEEDED":
        officer_summary = f"Some inconsistencies found across document pages (confidence: {score}%). Manual spot-check recommended before acceptance."
    else:
        officer_summary = f"High risk of tampering detected across document (confidence: {score}%). Do not accept without physical verification."

    return {
        "document_id": doc_id,
        "status": "analyzed",
        "format_type": all_page_results[0]["page_meta"].get("format_type", "pdf"),
        "original_filename": all_page_results[0]["page_meta"].get("original_filename", ""),
        "verdict": score_result["verdict"],
        "confidence_score": score_result["confidence_score"],
        "verdict_label": score_result["verdict_label"],
        "breakdown": score_result.get("breakdown", {}),
        "top_reasons": unique_reasons,
        "officer_summary": officer_summary,
        "total_pages_analyzed": len(pages_output),
        "pages": pages_output
    }