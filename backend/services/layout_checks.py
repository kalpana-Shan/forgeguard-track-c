import numpy as np

def check_layout_anomalies(ocr_regions: list, img_width: int, img_height: int) -> list:
    flags = []

    if len(ocr_regions) < 4:
        return flags

    # --- Check 1: Text baseline shift within rows ---
    rows = {}
    for r in ocr_regions:
        row_key = round(r["box"]["y"] / 12) * 12
        rows.setdefault(row_key, []).append(r)

    for row_key, row_regions in rows.items():
        if len(row_regions) < 2:
            continue
        baselines = [r["box"]["y"] + r["box"]["h"] for r in row_regions]
        if max(baselines) - min(baselines) > 12:
            worst = max(row_regions, key=lambda r: r["box"]["y"])
            flags.append({
                "region": worst,
                "check": "baseline_shift",
                "reason": f"Text baseline misalignment in row — possible replaced text near {worst['field_label']}",
                "severity": "medium",
                "score_contribution": 0.30
            })

    # --- Check 2: Text outside expected content zone ---
    margin = img_width * 0.05
    for r in ocr_regions:
        x = r["box"]["x"]
        if x < margin * 0.3 and r["box"]["w"] > 20:
            flags.append({
                "region": r,
                "check": "margin_overflow",
                "reason": f"Text appears outside expected document margin near {r['field_label']}",
                "severity": "low",
                "score_contribution": 0.20
            })

    # --- Check 3: Unusual column spacing ---
    x_positions = sorted([r["box"]["x"] for r in ocr_regions if r["box"]["w"] > 30])
    if len(x_positions) > 5:
        gaps = np.diff(x_positions)
        if gaps.std() > np.mean(gaps) * 1.5:
            flags.append({
                "region": ocr_regions[0],
                "check": "column_spacing_anomaly",
                "reason": "Irregular column spacing across document — layout may have been altered",
                "severity": "low",
                "score_contribution": 0.20
            })

    return flags