import numpy as np

def check_text_tampering(ocr_regions: list) -> list:
    flags = []

    if not ocr_regions:
        return flags

    # --- Check 1: OCR confidence drop ---
    confidences = [r["confidence"] for r in ocr_regions]
    avg_conf = np.mean(confidences)

    for r in ocr_regions:
        if r["confidence"] < avg_conf * 0.35 and r["confidence"] < 0.35:
            flags.append({
                "region": r,
                "check": "low_ocr_confidence",
                "reason": f"OCR confidence {round(r['confidence'],2)} is unusually low in {r['field_label']} field",
                "severity": "high" if r["confidence"] < 0.25 else "medium",
                "score_contribution": 0.7 if r["confidence"] < 0.25 else 0.4
            })

    # --- Check 2: Bounding box height inconsistency in same row ---
    rows = {}
    for r in ocr_regions:
        row_key = round(r["box"]["y"] / 10) * 10
        rows.setdefault(row_key, []).append(r)

    for row_key, row_regions in rows.items():
        if len(row_regions) < 2:
            continue
        heights = [r["box"]["h"] for r in row_regions]
        avg_h = np.mean(heights)
        for r in row_regions:
            if abs(r["box"]["h"] - avg_h) > avg_h * 0.5:
                flags.append({
                    "region": r,
                    "check": "height_inconsistency",
                    "reason": f"Text height in {r['field_label']} differs significantly from same-row text",
                    "severity": "medium",
                    "score_contribution": 0.35
                })

    # --- Check 3: Word spacing anomaly (text overlap = possible overwrite) ---
    for i in range(len(ocr_regions) - 1):
        r1 = ocr_regions[i]
        r2 = ocr_regions[i + 1]
        if abs(r1["box"]["y"] - r2["box"]["y"]) > 15:
            continue
        gap = r2["box"]["x"] - (r1["box"]["x"] + r1["box"]["w"])
        if gap < -5:
            flags.append({
                "region": r2,
                "check": "text_overlap",
                "reason": f"Text regions overlap — possible overwritten field near {r2['field_label']}",
                "severity": "high",
                "score_contribution": 0.65
            })

    # --- Deduplicate: remove duplicate flags on the same region ---
    seen_boxes = set()
    unique_flags = []
    for f in flags:
        box = f["region"]["box"]
        key = (box["x"] // 20, box["y"] // 20)
        if key not in seen_boxes:
            seen_boxes.add(key)
            unique_flags.append(f)

    return unique_flags          # ← MUST be inside the function, at this indentation level
