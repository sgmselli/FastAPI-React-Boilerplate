from io import BytesIO
import pytest
from PIL import Image

from app.core.config import settings
from app.exceptions.image import InvalidImage
from app.utils.images import process_profile_picture


def make_image(format: str, size: tuple[int, int] = (100, 100), mode: str = "RGB", **save_kwargs) -> bytes:
    output = BytesIO()
    Image.new(mode, size, "red").save(output, format=format, **save_kwargs)
    return output.getvalue()


def open_result(data: bytes) -> Image.Image:
    return Image.open(BytesIO(data))


class TestProcessProfilePicture:
    @pytest.mark.parametrize("format", ["JPEG", "PNG", "WEBP", "HEIF", "AVIF"])
    def test_allowed_formats_become_square_webp(self, format):
        result = open_result(process_profile_picture(make_image(format, (300, 200))))

        assert result.format == "WEBP"
        assert result.size == (settings.profile_picture_size, settings.profile_picture_size)

    def test_small_images_are_scaled_up(self):
        result = open_result(process_profile_picture(make_image("PNG", (10, 10))))
        assert result.size == (settings.profile_picture_size, settings.profile_picture_size)

    def test_crops_from_the_centre(self):
        # Blue left half, red right half - a centre crop of a wide image keeps both
        image = Image.new("RGB", (400, 100), "blue")
        image.paste("red", (200, 0, 400, 100))
        output = BytesIO()
        image.save(output, format="PNG")

        result = open_result(process_profile_picture(output.getvalue())).convert("RGB")

        assert result.getpixel((10, 256))[2] > 200
        assert result.getpixel((500, 256))[0] > 200

    def test_transparency_is_kept(self):
        output = BytesIO()
        Image.new("RGBA", (100, 100), (255, 0, 0, 0)).save(output, format="PNG")

        result = open_result(process_profile_picture(output.getvalue()))

        assert result.mode == "RGBA"
        assert result.getpixel((256, 256))[3] == 0

    def test_opaque_images_have_no_alpha(self):
        result = open_result(process_profile_picture(make_image("JPEG")))
        assert result.mode == "RGB"

    def test_exif_metadata_is_stripped(self):
        exif = Image.Exif()
        exif[0x010F] = "Camera Maker"
        data = make_image("JPEG", exif=exif.tobytes())

        result = open_result(process_profile_picture(data))

        assert len(result.getexif()) == 0

    def test_heic_metadata_is_stripped(self):
        exif = Image.Exif()
        exif[0x010F] = "Apple"
        data = make_image("HEIF", exif=exif.tobytes())

        result = open_result(process_profile_picture(data))

        assert len(result.getexif()) == 0

    def test_exif_orientation_is_applied_before_stripping(self):
        exif = Image.Exif()
        exif[0x0112] = 6  # Rotated 90 degrees - a portrait photo stored as landscape
        image = Image.new("RGB", (400, 100), "blue")
        image.paste("red", (0, 0, 200, 100))
        output = BytesIO()
        image.save(output, format="JPEG", exif=exif.tobytes())

        result = open_result(process_profile_picture(output.getvalue())).convert("RGB")

        # After rotating, the red half is on top rather than on the left
        assert result.getpixel((256, 10))[0] > 200
        assert result.getpixel((256, 500))[2] > 200

    def test_file_over_size_limit_rejected(self, monkeypatch):
        data = make_image("PNG")
        monkeypatch.setattr(settings, "profile_picture_max_bytes", len(data) - 1)

        with pytest.raises(InvalidImage, match="or smaller"):
            process_profile_picture(data)

    def test_dimensions_over_pixel_limit_rejected(self, monkeypatch):
        monkeypatch.setattr(settings, "profile_picture_max_pixels", 99 * 99)

        with pytest.raises(InvalidImage, match="dimensions"):
            process_profile_picture(make_image("PNG"))

    def test_disallowed_format_rejected(self):
        with pytest.raises(InvalidImage, match="JPEG, PNG, WebP, HEIC or AVIF"):
            process_profile_picture(make_image("GIF"))

    def test_non_image_rejected(self):
        with pytest.raises(InvalidImage, match="not a valid image"):
            process_profile_picture(b"%PDF-1.7 not an image")

    def test_truncated_image_rejected(self):
        data = make_image("PNG", (300, 300))

        with pytest.raises(InvalidImage, match="not a valid image"):
            process_profile_picture(data[: len(data) // 2])
