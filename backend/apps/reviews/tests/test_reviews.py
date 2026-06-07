import pytest
from datetime import date, time, timedelta
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.profiles.models import CleanerProfile, Address, Availability
from apps.services.models import Service
from apps.bookings.models import Booking
from apps.reviews.models import Review


@pytest.fixture
def api():
    return APIClient()


def _make_user(email, role):
    return User.objects.create_user(
        email=email, password="TestPass123!", role=role,
        first_name="Test", last_name="User",
    )


@pytest.fixture
def customer(db):
    return _make_user("customer@test.com", User.Role.CUSTOMER)


@pytest.fixture
def cleaner_user(db):
    return _make_user("cleaner@test.com", User.Role.CLEANER)


@pytest.fixture
def cleaner_profile(cleaner_user):
    profile = CleanerProfile.objects.get(user=cleaner_user)
    profile.is_verified = True
    profile.verification_status = "APPROVED"
    profile.save()
    return profile


@pytest.fixture
def service(cleaner_profile):
    return Service.objects.create(
        cleaner=cleaner_profile, type="HOME_CLEANING", title="Home Clean",
        description="Clean", price=5000, pricing_unit="PER_JOB", is_active=True,
    )


@pytest.fixture
def address(customer):
    return Address.objects.create(
        user=customer, label="Home", line1="1 Test St",
        area="Lekki", city="Lagos", state="Lagos", is_default=True,
    )


@pytest.fixture
def completed_booking(db, customer, cleaner_profile, service, address):
    booking = Booking.objects.create(
        customer=customer,
        cleaner=cleaner_profile,
        service=service,
        address=address,
        scheduled_date=date.today() - timedelta(days=1),
        scheduled_time=time(10, 0),
        total_amount=5000,
        commission_amount=875,
        payout_amount=4125,
        status=Booking.Status.COMPLETED,
    )
    return booking


# ── CreateReviewView ──────────────────────────────────────────────────────────

class TestCreateReview:
    def test_customer_can_review_completed_booking(self, api, customer, completed_booking):
        api.force_authenticate(customer)
        resp = api.post("/api/v1/reviews/", {
            "booking_id": completed_booking.id,
            "rating": 5,
            "comment": "Excellent service!",
        })
        assert resp.status_code == 201
        assert resp.data["rating"] == 5
        assert resp.data["comment"] == "Excellent service!"

    def test_requires_auth(self, api, completed_booking):
        resp = api.post("/api/v1/reviews/", {
            "booking_id": completed_booking.id,
            "rating": 4,
        })
        assert resp.status_code == 401

    def test_cleaner_cannot_review(self, api, cleaner_user, completed_booking):
        api.force_authenticate(cleaner_user)
        resp = api.post("/api/v1/reviews/", {
            "booking_id": completed_booking.id,
            "rating": 4,
        })
        assert resp.status_code == 403

    def test_cannot_review_non_completed_booking(self, api, customer, completed_booking):
        completed_booking.status = Booking.Status.ACCEPTED
        completed_booking.save()
        api.force_authenticate(customer)
        resp = api.post("/api/v1/reviews/", {
            "booking_id": completed_booking.id,
            "rating": 5,
        })
        assert resp.status_code == 400

    def test_cannot_review_twice(self, api, customer, completed_booking, cleaner_user):
        Review.objects.create(
            booking=completed_booking, author=customer, target=cleaner_user,
            rating=4, comment="Good",
        )
        api.force_authenticate(customer)
        resp = api.post("/api/v1/reviews/", {
            "booking_id": completed_booking.id,
            "rating": 5,
        })
        assert resp.status_code == 400

    def test_rating_out_of_range(self, api, customer, completed_booking):
        api.force_authenticate(customer)
        resp = api.post("/api/v1/reviews/", {
            "booking_id": completed_booking.id,
            "rating": 6,
        })
        assert resp.status_code == 400


# ── Rating recalculation ──────────────────────────────────────────────────────

class TestRatingSignal:
    def test_rating_avg_updated_after_review(self, customer, completed_booking, cleaner_profile, cleaner_user):
        Review.objects.create(
            booking=completed_booking, author=customer, target=cleaner_user,
            rating=5, comment="Great",
        )
        cleaner_profile.refresh_from_db()
        assert cleaner_profile.rating_avg == 5
        assert cleaner_profile.rating_count == 1

    def test_rating_avg_averages_multiple_reviews(self, db, customer, cleaner_profile, cleaner_user, service, address):
        # Second completed booking for second review
        booking2 = Booking.objects.create(
            customer=customer, cleaner=cleaner_profile, service=service,
            address=address, scheduled_date=date.today() - timedelta(days=2),
            scheduled_time=time(10, 0), total_amount=5000,
            commission_amount=875, payout_amount=4125,
            status=Booking.Status.COMPLETED,
        )
        booking3 = Booking.objects.create(
            customer=customer, cleaner=cleaner_profile, service=service,
            address=address, scheduled_date=date.today() - timedelta(days=3),
            scheduled_time=time(10, 0), total_amount=5000,
            commission_amount=875, payout_amount=4125,
            status=Booking.Status.COMPLETED,
        )
        Review.objects.create(booking=booking2, author=customer, target=cleaner_user, rating=4)
        Review.objects.create(booking=booking3, author=customer, target=cleaner_user, rating=2)
        cleaner_profile.refresh_from_db()
        assert float(cleaner_profile.rating_avg) == 3.0
        assert cleaner_profile.rating_count == 2

    def test_rating_decremented_on_delete(self, customer, completed_booking, cleaner_profile, cleaner_user):
        review = Review.objects.create(
            booking=completed_booking, author=customer, target=cleaner_user,
            rating=5, comment="Great",
        )
        review.delete()
        cleaner_profile.refresh_from_db()
        assert cleaner_profile.rating_count == 0


# ── CleanerReviewsView ────────────────────────────────────────────────────────

class TestCleanerReviewsView:
    def test_lists_cleaner_reviews(self, api, customer, completed_booking, cleaner_profile, cleaner_user):
        Review.objects.create(
            booking=completed_booking, author=customer, target=cleaner_user,
            rating=5, comment="Excellent",
        )
        resp = api.get(f"/api/v1/reviews/cleaner/{cleaner_profile.pk}/")
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]["rating"] == 5

    def test_does_not_show_hidden_reviews(self, api, customer, completed_booking, cleaner_profile, cleaner_user):
        Review.objects.create(
            booking=completed_booking, author=customer, target=cleaner_user,
            rating=1, comment="Bad", is_hidden=True,
        )
        resp = api.get(f"/api/v1/reviews/cleaner/{cleaner_profile.pk}/")
        assert resp.status_code == 200
        assert len(resp.data) == 0

    def test_public_no_auth_required(self, api, cleaner_profile):
        resp = api.get(f"/api/v1/reviews/cleaner/{cleaner_profile.pk}/")
        assert resp.status_code == 200


# ── BookingReviewView ─────────────────────────────────────────────────────────

class TestBookingReviewView:
    def test_can_review_completed_booking(self, api, customer, completed_booking):
        api.force_authenticate(customer)
        resp = api.get(f"/api/v1/reviews/booking/{completed_booking.id}/")
        assert resp.status_code == 200
        assert resp.data["can_review"] is True
        assert resp.data["review"] is None

    def test_returns_existing_review(self, api, customer, completed_booking, cleaner_user):
        review = Review.objects.create(
            booking=completed_booking, author=customer, target=cleaner_user,
            rating=5, comment="Great",
        )
        api.force_authenticate(customer)
        resp = api.get(f"/api/v1/reviews/booking/{completed_booking.id}/")
        assert resp.status_code == 200
        assert resp.data["can_review"] is False
        assert resp.data["review"]["id"] == review.id

    def test_cleaner_cannot_review(self, api, cleaner_user, completed_booking):
        api.force_authenticate(cleaner_user)
        resp = api.get(f"/api/v1/reviews/booking/{completed_booking.id}/")
        assert resp.status_code == 200
        assert resp.data["can_review"] is False
