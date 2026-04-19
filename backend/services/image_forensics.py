import cv2
import numpy as np
import os
from utils.ela_utils import compute_ela_diff, normalize_ela, ela_to_grayscale, get_ela_hotspot_threshold
from utils.image_utils import save_image

OVERLAY_DIR = "overlays"

def run_ela(image_path: str, doc_id: str, page_num: int, quality: int = 75) -> dict:
    os.makedirs(OVERLAY_DIR, exist_ok=True)

    ela_diff = compute_ela_diff(image_path, quality)
    ela_amplified = normalize_ela(ela_diff, amplify=10)
    ela_gray = ela_to_grayscale(ela_amplified)
    threshold = get_ela_hotspot_threshold(ela_gray)

    heatmap_colored = cv2.applyColorMap(ela_gray, cv2.COLORMAP_JET)
    heatmap_path = os.path.join(OVERLAY_DIR, f"{doc_id}_page{page_num}_ela.jpg")
    cv2.imwrite(heatmap_path, heatmap_colored)

    _, thresh = cv2.threshold(ela_gray, threshold, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    h, w = ela_gray.shape
    img_area = h * w
    hotspots = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 200 or area > img_area * 0.35:
            continue
        x, y, bw, bh = cv2.boundingRect(cnt)
        intensity = float(np.mean(ela_gray[y:y+bh, x:x+bw]))
        hotspots.append({
            "box": {"x": int(x), "y": int(y), "w": int(bw), "h": int(bh)},
            "intensity": round(intensity, 2)
        })

    hotspots.sort(key=lambda s: s["intensity"], reverse=True)
    return {
        "heatmap_path": heatmap_path,
        "hotspots": hotspots[:5]
    }


# check_clone_patches stays exactly the same as before — no changes needed
def check_clone_patches(image_path: str) -> list:
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    block_size = 64
    blocks = {}
    flags = []

    for y in range(0, h - block_size, block_size):
        for x in range(0, w - block_size, block_size):
            block = img[y:y+block_size, x:x+block_size]
            hist = cv2.calcHist([block], [0,1,2], None, [8,8,8], [0,256]*3)
            hist_key = tuple(hist.flatten().astype(int) // 500)
            if hist_key in blocks:
                ox, oy = blocks[hist_key]
                if abs(x - ox) > block_size * 2 or abs(y - oy) > block_size * 2:
                    flags.append({
                        "box": {"x": x, "y": y, "w": block_size, "h": block_size},
                        "reason": "Repeated texture block — possible copy-move editing",
                        "severity": "medium"
                    })
            else:
                blocks[hist_key] = (x, y)

    return flags[:3]