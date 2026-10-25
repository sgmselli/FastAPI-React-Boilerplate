from sqlalchemy import select

from app.models.user import User
from app.models.user_profile import UserProfile


class TestIsProfileCompleted:
    def test_false_while_name_is_missing(self):
        assert UserProfile(user_id=1).is_profile_completed is False

    def test_true_once_name_is_set(self):
        assert UserProfile(user_id=1, name="A").is_profile_completed is True

    def test_true_without_a_profile_picture(self):
        profile = UserProfile(user_id=1, name="A", profile_picture_key=None)
        assert profile.is_profile_completed is True


class TestUserRelationship:
    def test_assigning_profile_links_both_sides(self):
        user = User(email="a@example.com")
        profile = UserProfile(name="A")

        user.profile = profile

        assert profile.user is user

class TestDisplayName:
    def test_uses_profile_name_when_set(self):
        user = User(email="a@example.com", profile=UserProfile(name="Jane Doe"))
        assert user.display_name == "Jane Doe"

    def test_falls_back_to_email_when_name_is_missing(self):
        user = User(email="a@example.com", profile=UserProfile())
        assert user.display_name == "a@example.com"

    def test_falls_back_to_email_when_name_is_empty(self):
        user = User(email="a@example.com", profile=UserProfile(name=""))
        assert user.display_name == "a@example.com"

    def test_falls_back_to_email_without_a_profile(self):
        assert User(email="a@example.com").display_name == "a@example.com"
