from app.auth.password import hash_password, verify_password


class TestHashPassword:
    def test_hash_differs_from_plaintext(self):
        assert hash_password("Str0ng!Pass") != "Str0ng!Pass"

    def test_same_password_hashed_twice_produces_different_hashes(self):
        # bcrypt salts each hash independently
        assert hash_password("Str0ng!Pass") != hash_password("Str0ng!Pass")


class TestVerifyPassword:
    def test_correct_password_verifies(self):
        hashed = hash_password("Str0ng!Pass")
        assert verify_password("Str0ng!Pass", hashed) is True

    def test_incorrect_password_does_not_verify(self):
        hashed = hash_password("Str0ng!Pass")
        assert verify_password("WrongPass1!", hashed) is False

    def test_verification_is_case_sensitive(self):
        hashed = hash_password("Str0ng!Pass")
        assert verify_password("str0ng!pass", hashed) is False