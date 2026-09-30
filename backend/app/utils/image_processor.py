import base64
import os
import uuid
from io import BytesIO
from typing import Optional
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

UPLOAD_DIR = os.path.join("uploads", "attendance_photos")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB max
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def process_and_save_photo(
    photo_base64: str,
    prefix: str = "att"
) -> Optional[str]:
    """
    Validates, compresses, resizes, and safely stores an attendance photo.
    Returns: Relative path to saved image, or None if invalid.
    """
    if not photo_base64:
        return None

    try:
        # Strip data URL header if present (e.g. data:image/jpeg;base64,...)
        if "," in photo_base64:
            photo_base64 = photo_base64.split(",", 1)[1]

        image_data = base64.b64decode(photo_base64)
        
        if len(image_data) > MAX_SIZE_BYTES:
            raise ValueError("Photo size exceeds allowed limit (5MB).")

        # Open and validate with PIL
        with Image.open(BytesIO(image_data)) as img:
            img_format = img.format
            if img_format not in ALLOWED_FORMATS:
                raise ValueError(f"Unsupported image format: {img_format}. Allowed: JPEG, PNG, WEBP.")

            # Convert RGBA to RGB for standard JPEG storage
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Resize if dimensions exceed 800x800 for efficient storage
            max_dimension = 800
            if img.width > max_dimension or img.height > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

            # Generate unique filename
            filename = f"{prefix}_{uuid.uuid4().hex[:12]}.jpg"
            file_path = os.path.join(UPLOAD_DIR, filename)

            # Save with optimized JPEG compression
            img.save(file_path, "JPEG", quality=85, optimize=True)

            return f"/uploads/attendance_photos/{filename}"

    except Exception as e:
        print(f"[ImageProcessor] Error processing photo: {e}")
        return None
