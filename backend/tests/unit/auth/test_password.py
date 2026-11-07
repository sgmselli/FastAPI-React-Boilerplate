from app.auth.password import hash_password, verify_password


class TestHashPassword:
    async def test_hash_differs_from_plaintext(self):
        assert await hash_password("Str0ng!Pass") != "Str0ng!Pass"

    async def test_same_password_hashed_twice_produces_different_hashes(self):
        # Argon2 salts each hash independently
        assert await hash_password("Str0ng!Pass") != await hash_password("Str0ng!Pass")

    async def test_uses_argon2id(self):
        assert (await hash_password("Str0ng!Pass")).startswith("$argon2id$")


class TestVerifyPassword:
    async def test_correct_password_verifies(self):
        hashed = await hash_password("Str0ng!Pass")
        assert await verify_password("Str0ng!Pass", hashed) is True

    async def test_incorrect_password_does_not_verify(self):
        hashed = await hash_password("Str0ng!Pass")
        assert await verify_password("WrongPass1!", hashed) is False

    async def test_verification_is_case_sensitive(self):
        hashed = await hash_password("Str0ng!Pass")
        assert await verify_password("str0ng!pass", hashed) is False
