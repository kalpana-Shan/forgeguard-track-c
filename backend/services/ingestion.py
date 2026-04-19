import fitz
import numpy as np
import cv2
import uuid
import os

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def process_upload(file_bytes: bytes, filename: str) -> dict:
    doc_id = str(uuid.uuid4())[:8]
    ext = filename.rsplit(".", 1)[-1].lower()
    pages = []

    if ext == "pdf":
        pdf = fitz.open(stream=file_bytes, filetype="pdf")
        for i, page in enumerate(pdf):
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            img_path = os.path.join(UPLOAD_DIR, f"{doc_id}_page{i+1}.jpg")
            pix.save(img_path)
            pages.append({
                "page_number": i + 1,
                "image_path": img_path,
                "width": pix.width,
                "height": pix.height
            })
        pages = pages[:2]  # max 2 pages for demo speed
        format_type = "pdf"

    else:
        img_array = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        h, w = img.shape[:2]
        img_path = os.path.join(UPLOAD_DIR, f"{doc_id}_page1.jpg")
        cv2.imwrite(img_path, img)
        pages.append({
            "page_number": 1,
            "image_path": img_path,
            "width": w,
            "height": h
        })
        format_type = "image"

    return {
        "document_id": doc_id,
        "pages": pages,
        "source_ext": ext,
        "format_type": format_type,   # ← NEW: tells frontend what format was uploaded
        "total_pages": len(pages),
        "original_filename": filename
    }