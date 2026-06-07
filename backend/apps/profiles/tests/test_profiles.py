import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.profiles.models import CleanerProfile, Availability


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def cleaner_user(db):
    user = User.objects.create_user(
        email="cleaner@test.com",
        password="TestPass123!",
        role=User.Role.CLEANER,
        first_name="Ada",
        last_name="Obi",
    )
    return user


@pytest.fixture
def cleaner_profile(cleaner_user):
    return CleanerProfile.objects.get(user=cleaner_user)


@pytest.fixture
def auth_cleaner(api, cleaner_user):
    res = api.post(reverse("token_obtain_pair"), {"email": cleaner_user.email, "password": "TestPass123!"})
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return api


class TestCleanerProfileView:
    def test_get_profile(self, auth_cleaner):
        res = auth_cleaner.get(reverse("cleaner-profile"))
        assert res.status_code == 200
        assert "bio" in res.data
        assert "services" in res.data
        assert "availability" in res.data

    def test_update_bio(self, auth_cleaner, cleaner_profile):
        res = auth_cleaner.patch(
            reverse("cleaner-profile"),
            {"bio": "I have been cleaning homes in Lagos for 5 years with excellence."},
        )
        assert res.status_code == 200
        cleaner_profile.refresh_from_db()
        assert "Lagos" in cleaner_profile.bio

    def test_update_service_areas(self, auth_cleaner, cleaner_profile):
        res = auth_cleaner.patch(
            reverse("cleaner-profile"),
            {"service_areas": ["Ikeja", "Yaba"], "bio": cleaner_profile.bio or "Bio text that meets minimum length requirement here."},
        )
        assert res.status_code == 200


class TestAvatarUpload:
    def test_upload_avatar(self, auth_cleaner, cleaner_user):
        url = "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"
        res = auth_cleaner.post(reverse("cleaner-avatar"), {"avatar_url": url})
        assert res.status_code == 200
        cleaner_user.refresh_from_db()
        assert cleaner_user.avatar_url == url

    def test_invalid_url(self, auth_cleaner):
        res = auth_cleaner.post(reverse("cleaner-avatar"), {"avatar_url": "not-a-url"})
        assert res.status_code == 400


class TestPortfolio:
    def test_add_image(self, auth_cleaner, cleaner_profile):
        url = "https://res.cloudinary.com/demo/image/upload/v1/sample1.jpg"
        res = auth_cleaner.post(reverse("portfolio-add"), {"image_url": url})
        assert res.status_code == 200
        assert url in res.data["portfolio_images"]

    def test_remove_image(self, auth_cleaner, cleaner_profile):
        url = "https://res.cloudinary.com/demo/image/upload/v1/sample1.jpg"
        cleaner_profile.portfolio_images = [url]
        cleaner_profile.save()
        res = auth_cleaner.post(reverse("portfolio-remove"), {"image_url": url})
        assert res.status_code == 200
        assert url not in res.data["portfolio_images"]

    def test_max_10_images(self, auth_cleaner, cleaner_profile):
        cleaner_profile.portfolio_images = [f"https://cdn.example.com/{i}.jpg" for i in range(10)]
        cleaner_profile.save()
        res = auth_cleaner.post(
            reverse("portfolio-add"),
            {"image_url": "https://cdn.example.com/new.jpg"},
        )
        assert res.status_code == 400


class TestAvailability:
    def test_bulk_set(self, auth_cleaner, cleaner_profile):
        slots = [
            {"day_of_week": 0, "start_time": "08:00", "end_time": "17:00"},
            {"day_of_week": 1, "start_time": "09:00", "end_time": "18:00"},
        ]
        res = auth_cleaner.put(reverse("availability-bulk"), {"slots": slots}, format="json")
        assert res.status_code == 200
        assert len(res.data) == 2
        assert Availability.objects.filter(cleaner=cleaner_profile).count() == 2

    def test_bulk_replaces_existing(self, auth_cleaner, cleaner_profile):
        Availability.objects.create(
            cleaner=cleaner_profile, day_of_week=0,
            start_time="08:00", end_time="17:00",
        )
        slots = [{"day_of_week": 2, "start_time": "10:00", "end_time": "16:00"}]
        auth_cleaner.put(reverse("availability-bulk"), {"slots": slots}, format="json")
        assert not Availability.objects.filter(cleaner=cleaner_profile, day_of_week=0).exists()
        assert Availability.objects.filter(cleaner=cleaner_profile, day_of_week=2).exists()

    def test_bulk_empty_clears(self, auth_cleaner, cleaner_profile):
        Availability.objects.create(
            cleaner=cleaner_profile, day_of_week=0,
            start_time="08:00", end_time="17:00",
        )
        res = auth_cleaner.put(reverse("availability-bulk"), {"slots": []}, format="json")
        assert res.status_code == 200
        assert Availability.objects.filter(cleaner=cleaner_profile).count() == 0

    def test_single_delete(self, auth_cleaner, cleaner_profile):
        slot = Availability.objects.create(
            cleaner=cleaner_profile, day_of_week=0,
            start_time="08:00", end_time="17:00",
        )
        res = auth_cleaner.delete(reverse("availability-detail", args=[slot.pk]))
        assert res.status_code == 204


class TestCleanerStats:
    def test_stats_returns_structure(self, auth_cleaner):
        res = auth_cleaner.get(reverse("cleaner-stats"))
        assert res.status_code == 200
        assert "total_bookings" in res.data
        assert "total_earned" in res.data
        assert "this_month_bookings" in res.data


class TestOnboardingStatus:
    def test_initial_step(self, auth_cleaner):
        res = auth_cleaner.get(reverse("onboarding-status"))
        assert res.status_code == 200
        assert res.data["current_step"] >= 1

    def test_step1_advances(self, auth_cleaner, cleaner_user):
        res = auth_cleaner.post(
            reverse("onboarding-step1"),
            {"first_name": "Ada", "last_name": "Obi", "phone": "+2348012345678"},
        )
        assert res.status_code == 200
        cleaner_user.refresh_from_db()
        assert cleaner_user.phone == "+2348012345678"
