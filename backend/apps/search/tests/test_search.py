import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.profiles.models import CleanerProfile, Address, Availability
from apps.services.models import Service


@pytest.fixture
def api():
    return APIClient()


def make_cleaner(email, areas=None, rate=5000, verified=True):
    user = User.objects.create_user(
        email=email, password="pass", role=User.Role.CLEANER,
        first_name="Test", last_name="Cleaner",
    )
    profile = CleanerProfile.objects.get(user=user)
    profile.service_areas = areas or ["Ikeja"]
    profile.base_hourly_rate = rate
    profile.rating_avg = 4.5
    profile.rating_count = 10
    if verified:
        profile.is_verified = True
        profile.verification_status = "APPROVED"
    profile.save()
    return profile


class TestSearchFilters:
    def test_returns_only_verified(self, db, api):
        make_cleaner("v1@test.com", verified=True)
        make_cleaner("u1@test.com", verified=False)
        res = api.get(reverse("cleaner-search"))
        assert res.status_code == 200
        emails = [r["full_name"] for r in res.data["results"]]
        assert len(res.data["results"]) == 1

    def test_area_filter(self, db, api):
        make_cleaner("a1@test.com", areas=["Ikeja", "Yaba"])
        make_cleaner("a2@test.com", areas=["Lekki", "Ajah"])
        res = api.get(reverse("cleaner-search"), {"area": "Ikeja"})
        assert res.data["count"] == 1

    def test_service_type_filter(self, db, api):
        p1 = make_cleaner("st1@test.com")
        p2 = make_cleaner("st2@test.com")
        Service.objects.create(
            cleaner=p1, type=Service.ServiceType.DEEP_CLEANING,
            title="Deep clean", price=10000, pricing_unit=Service.PricingUnit.PER_JOB,
        )
        res = api.get(reverse("cleaner-search"), {"type": "DEEP_CLEANING"})
        assert res.data["count"] == 1

    def test_price_range_filter(self, db, api):
        make_cleaner("pr1@test.com", rate=3000)
        make_cleaner("pr2@test.com", rate=8000)
        make_cleaner("pr3@test.com", rate=12000)
        res = api.get(reverse("cleaner-search"), {"min_price": 5000, "max_price": 10000})
        assert res.data["count"] == 1

    def test_min_rating_filter(self, db, api):
        p = make_cleaner("mr1@test.com")
        p.rating_avg = 3.0
        p.save()
        make_cleaner("mr2@test.com")  # rating_avg stays at 4.5
        res = api.get(reverse("cleaner-search"), {"min_rating": 4.0})
        assert res.data["count"] == 1

    def test_availability_day_filter(self, db, api):
        p1 = make_cleaner("av1@test.com")
        p2 = make_cleaner("av2@test.com")
        Availability.objects.create(cleaner=p1, day_of_week=0, start_time="08:00", end_time="17:00")
        res = api.get(reverse("cleaner-search"), {"available_day": 0})
        assert res.data["count"] == 1

    def test_sort_by_rating(self, db, api):
        p1 = make_cleaner("s1@test.com")
        p1.rating_avg = 4.9
        p1.save()
        p2 = make_cleaner("s2@test.com")
        p2.rating_avg = 3.0
        p2.save()
        res = api.get(reverse("cleaner-search"), {"sort": "rating"})
        assert float(res.data["results"][0]["rating_avg"]) >= float(res.data["results"][-1]["rating_avg"])

    def test_sort_by_price_asc(self, db, api):
        make_cleaner("sp1@test.com", rate=10000)
        make_cleaner("sp2@test.com", rate=2000)
        res = api.get(reverse("cleaner-search"), {"sort": "price_asc"})
        prices = [float(r["base_hourly_rate"]) for r in res.data["results"]]
        assert prices == sorted(prices)

    def test_pagination(self, db, api):
        for i in range(5):
            make_cleaner(f"pg{i}@test.com")
        res = api.get(reverse("cleaner-search"), {"page": 1, "page_size": 2})
        assert len(res.data["results"]) == 2
        assert res.data["total_pages"] == 3
        assert res.data["count"] == 5

    def test_response_structure(self, db, api):
        make_cleaner("rs@test.com")
        res = api.get(reverse("cleaner-search"))
        assert "results" in res.data
        assert "count" in res.data
        r = res.data["results"][0]
        assert "id" in r
        assert "full_name" in r
        assert "base_hourly_rate" in r
        assert "active_service_types" in r
        assert "availability_days" in r

    def test_distance_key_present(self, db, api):
        make_cleaner("dk@test.com")
        res = api.get(reverse("cleaner-search"))
        assert "distance_km" in res.data["results"][0]

    def test_empty_results_graceful(self, db, api):
        res = api.get(reverse("cleaner-search"), {"area": "Nowhere"})
        assert res.status_code == 200
        assert res.data["count"] == 0
        assert res.data["results"] == []
