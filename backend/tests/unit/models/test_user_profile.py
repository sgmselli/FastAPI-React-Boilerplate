from sqlalchemy import select

from app.models.user import User
from app.models.user_profile import UserProfile


class TestIsProfileCompleted:
    def test_false_while_name_is_missing(self):
        assert UserProfile(user_id=1).is_profile_completed is False

    def test_false_with_only_a_first_name(self):
        assert UserProfile(user_id=1, first_name="A").is_profile_completed is False

    def test_false_with_only_a_last_name(self):
        assert UserProfile(user_id=1, last_name="B").is_profile_completed is False

    def test_true_once_both_names_are_set(self):
        assert UserProfile(user_id=1, first_name="A", last_name="B").is_profile_completed is True


class TestUserRelationship:
    def test_assigning_profile_links_both_sides(self):
        user = User(email="a@example.com")
        profile = UserProfile(first_name="A")

        user.profile = profile

        assert profile.user is user

class TestDisplayName:
    def test_uses_full_name_when_set(self):
        user = User(email="a@example.com", profile=UserProfile(first_name="Jane", last_name="Doe"))
        assert user.display_name == "Jane Doe"

    def test_uses_first_name_alone_when_last_name_is_missing(self):
        user = User(email="a@example.com", profile=UserProfile(first_name="Jane"))
        assert user.display_name == "Jane"

    def test_falls_back_to_email_when_name_is_missing(self):
        user = User(email="a@example.com", profile=UserProfile())
        assert user.display_name == "a@example.com"

    def test_falls_back_to_email_when_name_is_empty(self):
        user = User(email="a@example.com", profile=UserProfile(first_name="", last_name=""))
        assert user.display_name == "a@example.com"

    def test_falls_back_to_email_without_a_profile(self):
        assert User(email="a@example.com").display_name == "a@example.com"
