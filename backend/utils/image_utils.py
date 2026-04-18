import cv2
import numpy as np

def resize_image(image_path: str, max_width: int = 1200) -> np.ndarray:
    """Resize image to max_width while keeping aspect ratio."""
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    if w <= max_width:
        return img
    scale = max_width / w
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)


def normalize_image(img: np.ndarray) -> np.ndarray:
    """Normalize pixel values to 0-255 uint8."""
    if img.dtype != np.uint8:
        img = np.clip(img, 0, 255).astype(np.uint8)
    return img


def save_image(img: np.ndarray, path: str) -> bool:
    """Save a numpy image array to disk. Returns True if successful."""
    return cv2.imwrite(path, img)


def load_image_rgb(image_path: str) -> np.ndarray:
    """Load image as RGB numpy array (for PIL-compatible operations)."""
    img = cv2.imread(image_path)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def get_image_dimensions(image_path: str) -> tuple:
    """Returns (width, height) of an image without fully loading it."""
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    return w, h