import pytesseract
import cv2
import numpy as np
from PIL import Image
import os

# Windows path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Expanded keyword map — matches partial text, not just exact words
FIELD_KEYWORDS = {
    "Name":      ["name", "பெயர்", "student", "candidate", "full name",
                  "applicant", "holder", "s/o", "d/o", "father"],
    "Marks":     ["marks", "total", "மதிப்பெண்", "grade", "score",
                  "obtained", "maximum", "aggregate", "percentage",
                  "subject", "theory", "practical", "internal", "external"],
    "Date":      ["date", "dob", "தேதி", "born", "issued", "valid",
                  "expiry", "year", "month", "day", "period"],
    "ID":        ["roll", "register", "reg no", "reg.", "id", "hall ticket",
                  "எண்", "number", "no.", "enrollment", "admission",
                  "certificate no", "serial"],
    "Seal":      ["seal", "stamp", "official", "authorized", "authority",
                  "attestation", "verified"],
    "Signature": ["signature", "signed", "principal", "director",
                  "controller", "registrar", "dean", "head"],
    "College":   ["college", "university", "institute", "school",
                  "board", "council", "department"],
    "Result":    ["pass", "fail", "distinction", "first class",
                  "second class", "result", "division"],
}

def detect_field_label(text: str, y: int, img_height: int) -> str:
    """Detect what document field this text belongs to."""
    text_clean = text.lower().strip()

    # Skip noise — single chars or numbers only
    if len(text_clean) <= 1:
        return "General Text"

    # Keyword matching — check if any keyword appears inside the text
    for label, keywords in FIELD_KEYWORDS.items():
        for kw in keywords:
            if kw in text_clean:
                return label

    # Positional fallback
    if y > img_height * 0.85:
        return "Seal/Signature"
    if y > img_height * 0.72:
        return "Footer"
    if y < img_height * 0.12:
        return "Header"

    # If text is purely numeric — likely marks or ID
    if text_clean.replace(".", "").replace("/", "").replace("-", "").isdigit():
        return "Numeric Field"

    return "General Text"


def preprocess_image(img: np.ndarray) -> np.ndarray:
    """
    Enhance image quality before OCR for better accuracy.
    Grayscale → denoise → adaptive threshold → upscale.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Adaptive threshold — handles uneven lighting on scanned docs
    thresh = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )

    # Upscale if image is small — Tesseract works best at 300 DPI
    h, w = thresh.shape
    if w < 1000:
        scale = 1200 / w
        thresh = cv2.resize(thresh, None, fx=scale, fy=scale,
                            interpolation=cv2.INTER_CUBIC)

    return thresh


def resolve_image_path(image_path: str) -> str:
    """Try .jpg and .jpeg extension variants."""
    if os.path.exists(image_path):
        return image_path
    for ext_from, ext_to in [(".jpg", ".jpeg"), (".jpeg", ".jpg")]:
        if image_path.endswith(ext_from):
            alt = image_path[:-len(ext_from)] + ext_to
            if os.path.exists(alt):
                print(f"Using alternative path: {alt}")
                return alt
    return image_path


def run_ocr(image_path: str) -> list:
    image_path = resolve_image_path(image_path)

    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ OCR Error: Could not read image at {image_path}")
        return []

    h, w = img.shape[:2]

    # Preprocess for better OCR accuracy
    processed = preprocess_image(img)
    pil_img = Image.fromarray(processed)

    # Tesseract config:
    # --psm 6  = Assume a uniform block of text (best for documents)
    # --oem 3  = Use both legacy + LSTM engine (most accurate)
    config = "--psm 6 --oem 3"

    try:
        data = pytesseract.image_to_data(
            pil_img,
            lang="eng+tam",
            config=config,
            output_type=pytesseract.Output.DICT
        )
    except Exception as e:
        print(f"❌ Tesseract error: {e}")
        return []

    ocr_regions = []
    n = len(data["text"])

    for i in range(n):
        text = data["text"][i].strip()
        if not text:
            continue

        conf_raw = data["conf"][i]

        # Tesseract returns -1 for non-text regions — skip them
        if conf_raw == -1 or conf_raw < 0:
            continue

        conf = round(max(0.0, min(1.0, float(conf_raw) / 100.0)), 3)

        # Skip very short noisy detections with low confidence
        if len(text) <= 1 and conf < 0.5:
            continue

        x  = int(data["left"][i])
        y  = int(data["top"][i])
        bw = int(data["width"][i])
        bh = int(data["height"][i])

        # Skip zero-size boxes
        if bw == 0 or bh == 0:
            continue

        # Detect language — Tamil Unicode range U+0B80 to U+0BFF
        lang = "ta" if any('\u0B80' <= c <= '\u0BFF' for c in text) else "en"

        field_label = detect_field_label(text, y, h)

        ocr_regions.append({
            "text": text,
            "box": {"x": x, "y": y, "w": bw, "h": bh},
            "confidence": conf,
            "language": lang,
            "field_label": field_label
        })

    print(f"   OCR extracted {len(ocr_regions)} regions "
          f"(avg conf: {round(sum(r['confidence'] for r in ocr_regions) / max(len(ocr_regions), 1), 2)})")

    return ocr_regions