from app.utils.normalizations import normalize_capital_insenitive, normalize_capital_senitive


class TestNormalizeCapitalInsensitive:
    def test_strips_whitespace(self):
        assert normalize_capital_insenitive("  Jane Doe  ") == "Jane Doe"

    def test_preserves_case(self):
        assert normalize_capital_insenitive("Jane Doe") == "Jane Doe"


class TestNormalizeCapitalSensitive:
    def test_strips_whitespace_and_lowercases(self):
        assert normalize_capital_senitive("  User@Example.com  ") == "user@example.com"

    def test_already_lowercase_unchanged(self):
        assert normalize_capital_senitive("user@example.com") == "user@example.com"