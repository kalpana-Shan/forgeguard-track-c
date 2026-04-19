import numpy as np
from PIL import Image
import io


def compute_ela_diff(image_path: str, quality: int = 75) -> np.ndarray:
    """
    Core ELA computation.
    Returns a float32 numpy array of per-pixel difference
    between the original and recompressed image.
    """
    original = Image.open(image_path).convert("RGB")

    # Recompress at lower quality
    buffer = io.BytesIO()
    original.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    recompressed = Image.open(buffer).convert("RGB")

    orig_arr = np.array(original).astype(np.float32)
    recomp_arr = np.array(recompressed).astype(np.float32)

    ela_diff = np.abs(orig_arr - recomp_arr)
    return ela_diff


def normalize_ela(ela_diff: np.ndarray, amplify: int = 10) -> np.ndarray:
    """
    Normalize ELA diff to 0-255 uint8 and amplify for visibility.
    """
    if ela_diff.max() == 0:
        return ela_diff.astype(np.uint8)
    ela_norm = (ela_diff / ela_diff.max() * 255).astype(np.uint8)
    ela_amplified = np.clip(ela_norm * amplify, 0, 255).astype(np.uint8)
    return ela_amplified


def ela_to_grayscale(ela_amplified: np.ndarray) -> np.ndarray:
    """
    Convert amplified ELA RGB array to grayscale for thresholding.
    Import cv2 here only when needed to keep utils lightweight.
    """
    import cv2
    return cv2.cvtColor(ela_amplified, cv2.COLOR_RGB2GRAY)


def get_ela_hotspot_threshold(ela_gray: np.ndarray) -> int:
    """
    Dynamically compute a threshold based on image mean + 1 std.
    More robust than a hardcoded value like 60.
    """
    mean = float(np.mean(ela_gray))
    std = float(np.std(ela_gray))
    threshold = int(mean + std * 1.5)
    return max(30, min(threshold, 120))  # clamp between 30–120