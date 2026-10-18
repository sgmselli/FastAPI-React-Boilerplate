import pytest
from pydantic_core import PydanticCustomError

from app.utils.validations import validate_name


class TestValidateName:
    def test_valid_name_returned_unchanged(self):
        assert validate_name("Jane_Doe-2.") == "Jane_Doe-2."

    def test_name_at_maximum_length_accepted(self):
        assert validate_name("a" * 50) == "a" * 50

    def test_empty_name_rejected(self):
        with pytest.raises(PydanticCustomError) as exc_info:
            validate_name("")
        assert exc_info.value.type == "name_too_short"

    def test_name_too_long_rejected(self):
        with pytest.raises(PydanticCustomError) as exc_info:
            validate_name("a" * 51)
        assert exc_info.value.type == "name_too_long"
        assert str(exc_info.value) == "Name must be up to 50 characters"

    def test_name_with_invalid_characters_rejected(self):
        with pytest.raises(PydanticCustomError) as exc_info:
            validate_name("Jane@Doe!")
        assert exc_info.value.type == "name_invalid"
