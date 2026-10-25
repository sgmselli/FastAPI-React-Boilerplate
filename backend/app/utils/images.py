from io import BytesIO
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

from app.core.config import settings
from app.exceptions.image import InvalidImage

# iPhones save HEIC by default
register_heif_opener()

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP", "HEIF", "AVIF"}
PROFILE_PICTURE_CONTENT_TYPE = "image/webp"

def process_profile_picture(data: bytes) -> bytes:
    """Validate an uploaded image and re-encode it as a square WebP.

    The format is read from the bytes rather than trusting the client's content type,
    and re-encoding drops all metadata, including EXIF GPS location.
    """
    if len(data) > settings.profile_picture_max_bytes:
        max_mb = settings.profile_picture_max_bytes // (1024 * 1024)
        raise InvalidImage(f"Image must be {max_mb}MB or smaller.")

    try:
        image = Image.open(BytesIO(data))
    except Exception:
        raise InvalidImage()

    if image.format not in ALLOWED_IMAGE_FORMATS:
        raise InvalidImage("Image must be a JPEG, PNG, WebP, HEIC or AVIF.")

    # Image.open only reads the header, so this is checked before the pixels are
    # decoded - a small file can still declare enormous dimensions
    if image.width * image.height > settings.profile_picture_max_pixels:
        raise InvalidImage("Image dimensions are too large.")

    try:
        image.load()
    except Exception:
        raise InvalidImage()

    # Phone photos are often stored sideways with an EXIF rotation flag, which is
    # about to be stripped, so apply it to the pixels first
    image = ImageOps.exif_transpose(image)

    has_transparency = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    image = image.convert("RGBA" if has_transparency else "RGB")

    size = settings.profile_picture_size
    image = ImageOps.fit(image, (size, size), Image.Resampling.LANCZOS)

    output = BytesIO()
    image.save(output, format="WEBP", quality=85)
    return output.getvalue()
