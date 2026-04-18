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

    return {
        "document_id": doc_id,
        "status": "analyzed",
        "verdict": score_result["verdict"],
        "confidence_score": score_result["confidence_score"],
        "verdict_label": score_result["verdict_label"],
        "top_reasons": top_reasons if top_reasons else ["No significant anomalies detected"],
        "officer_summary": officer_summary,
        "pages": [{
            "page_number": page_meta["page_number"],
            "preview_image_url": f"/uploads/{page_meta['image_path'].split('/')[-1]}",
            "ela_heatmap_url": f"/overlays/{ela_result['heatmap_path'].split('/')[-1]}",
            "suspicious_regions": suspicious_regions,
            "ocr_regions": ocr_out
        }]
    }