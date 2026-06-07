import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.profiles.models import CleanerProfile
from apps.services.models import Service


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def cleaner_user(db):
    return User.objects.create_user(
        email="svc_cleaner@test.com",
        password="TestPass123!",
        role=User.Role.CLEANER,
        first_name="Test",
        last_name="Cleaner",
    )


@pytest.fixture
def cleaner_profile(cleaner_user):
    return CleanerProfile.objects.get(user=cleaner_user)


@pytest.fixture
def auth(api, cleaner_user):
    res = api.post(reverse("token_obtain_pair"), {"email": cleaner_user.email, "password": "TestPass123!"})
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return api


@pytest.fixture
def service(cleaner_profile):
    return Service.objects.create(
        cleaner=cleaner_profile,
        type=Service.ServiceType.HOME_CLEANING,
        title="Standard home cleaning",
        price="5000.00",
        pricing_unit=Service.PricingUnit.PER_HOUR,
    )


class TestServiceCRUD:
    def test_create_service(self, auth, cleaner_profile):
        res = auth.post(
            reverse("service-list"),
            {
                "type": "HOME_CLEANING",
                "title": "2-bedroom home cleaning",
                "price": "8000.00",
                "pricing_unit": "PER_HOUR",
            },
        )
        assert res.status_code == 201
        assert Service.objects.filter(cleaner=cleaner_profile).count() == 1

    def test_list_own_services(self, auth, service):
        res = auth.get(reverse("service-list"))
        assert res.status_code == 200
        assert len(res.data) >= 1

    def test_update_service(self, auth, service):
        res = auth.patch(
            reverse("service-detail", args=[service.pk]),
            {"title": "Updated title"},
        )
        assert res.status_code == 200
        service.refresh_from_db()
        assert service.title == "Updated title"

    def test_toggle_active(self, auth, service):
        assert service.is_active is True
        res = auth.patch(
            reverse("service-detail", args=[service.pk]),
            {"is_active": False},
        )
        assert res.status_code == 200
        service.refresh_from_db()
        assert service.is_active is False

    def test_delete_service(self, auth, service):
        res = auth.delete(reverse("service-detail", args=[service.pk]))
        assert res.status_code == 204
        assert not Service.objects.filter(pk=service.pk).exists()

    def test_cannot_edit_other_cleaner_service(self, db, auth):
        other_user = User.objects.create_user(
            email="other@test.com",
            password="TestPass123!",
            role=User.Role.CLEANER,
        )
        other_profile = CleanerProfile.objects.get(user=other_user)
        other_service = Service.objects.create(
            cleaner=other_profile,
            type=Service.ServiceType.DEEP_CLEANING,
            title="Other cleaner's service",
            price="10000.00",
            pricing_unit=Service.PricingUnit.PER_JOB,
        )
        res = auth.patch(
            reverse("service-detail", args=[other_service.pk]),
            {"title": "Hijacked"},
        )
        assert res.status_code == 404

    def test_customer_cannot_create_service(self, db):
        customer = User.objects.create_user(
            email="cust2@test.com",
            password="TestPass123!",
            role=User.Role.CUSTOMER,
        )
        client = APIClient()
        res = client.post(
            reverse("token_obtain_pair"),
            {"email": customer.email, "password": "TestPass123!"},
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        res = client.post(
            reverse("service-list"),
            {"type": "HOME_CLEANING", "title": "X", "price": "1000", "pricing_unit": "PER_HOUR"},
        )
        assert res.status_code == 403
