import pytesseract
import cv2
import numpy as np
from PIL import Image

# Windows only — uncomment and set your path:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

FIELD_KEYWORDS = {
    "Name":      ["name", "பெயர்"],
    "Marks":     ["marks", "total", "மதிப்பெண்", "grade", "score"],
    "Date":      ["date", "dob", "தேதி", "born"],
    "ID":        ["roll", "register", "id", "hall ticket", "எண்"],
}

def detect_field_label(text: str, y: int, img_height: int) -> str:
    text_lower = text.lower()
    for label, keywords in FIELD_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return label
    if y > img_height * 0.80:
        return "Seal/Signature"
    return "Unknown"

def run_ocr(image_path: str) -> list:
    img = cv2.imread(image_path)
    h, w = img.shape[:2]

    # Run Tesseract with English + Tamil
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    data = pytesseract.image_to_data(
        pil_img,
        lang="eng+tam",
        output_type=pytesseract.Output.DICT
    )

    ocr_regions = []
    n = len(data["text"])
    for i in range(n):
        text = data["text"][i].strip()
        if not text:
            continue

        conf_raw = data["conf"][i]
        conf = max(0.0, float(conf_raw) / 100.0)  # Tesseract gives 0–100

        x = int(data["left"][i])
        y = int(data["top"][i])
        bw = int(data["width"][i])
        bh = int(data["height"][i])

        lang = "ta" if any('\u0B80' <= c <= '\u0BFF' for c in text) else "en"

        ocr_regions.append({
            "text": text,
            "box": {"x": x, "y": y, "w": bw, "h": bh},
            "confidence": round(conf, 3),
            "language": lang,
            "field_label": detect_field_label(text, y, h)
        })

    return ocr_regions