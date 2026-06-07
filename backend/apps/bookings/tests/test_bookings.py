import pytest
from datetime import date, time, timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.profiles.models import CleanerProfile, Address, Availability
from apps.services.models import Service
from apps.bookings.models import Booking, BookingStatusLog


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def api():
    return APIClient()


def _make_user(email, role, **kwargs):
    return User.objects.create_user(
        email=email, password="TestPass123!", role=role,
        first_name="Test", last_name="User", **kwargs
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
    profile.base_hourly_rate = 5000
    profile.save()
    return profile


@pytest.fixture
def service(cleaner_profile):
    return Service.objects.create(
        cleaner=cleaner_profile,
        type=Service.ServiceType.HOME_CLEANING,
        title="Standard home clean",
        price=5000,
        pricing_unit=Service.PricingUnit.PER_JOB,
        is_active=True,
    )


@pytest.fixture
def availability(cleaner_profile):
    # Monday available
    return Availability.objects.create(
        cleaner=cleaner_profile, day_of_week=0,
        start_time=time(8, 0), end_time=time(17, 0),
    )


@pytest.fixture
def customer_address(customer):
    return Address.objects.create(
        user=customer, label="Home", line1="1 Test St",
        area="Ikeja", city="Lagos", state="Lagos", is_default=True,
    )


def _auth(api, user):
    res = api.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "TestPass123!"},
    )
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return api


def _next_monday():
    today = date.today()
    days_ahead = (0 - today.weekday()) % 7 or 7
    return today + timedelta(days=days_ahead)


@pytest.fixture
def pending_booking(db, customer, cleaner_profile, service, customer_address, availability):
    return Booking.objects.create(
        customer=customer,
        cleaner=cleaner_profile,
        service=service,
        address=customer_address,
        scheduled_date=_next_monday(),
        scheduled_time=time(9, 0),
        total_amount=5000,
        status=Booking.Status.PENDING,
    )


# ── Create booking ────────────────────────────────────────────────────────────

class TestCreateBooking:
    def test_customer_can_book(
        self, db, api, customer, cleaner_profile, service, customer_address, availability
    ):
        auth_api = _auth(api, customer)
        res = auth_api.post(reverse("booking-list"), {
            "cleaner_id": cleaner_profile.id,
            "service_id": service.id,
            "address_id": customer_address.id,
            "scheduled_date": str(_next_monday()),
            "scheduled_time": "09:00",
            "notes": "Please bring your own supplies.",
        })
        assert res.status_code == 201
        assert res.data["status"] == "PENDING"
        assert res.data["total_amount"] == "5000.00"

    def test_cleaner_cannot_book(self, db, api, cleaner_user):
        auth_api = _auth(api, cleaner_user)
        res = auth_api.post(reverse("booking-list"), {
            "cleaner_id": 1, "service_id": 1, "address_id": 1,
            "scheduled_date": str(_next_monday()), "scheduled_time": "09:00",
        })
        assert res.status_code == 403

    def test_past_date_rejected(
        self, db, api, customer, cleaner_profile, service, customer_address
    ):
        auth_api = _auth(api, customer)
        res = auth_api.post(reverse("booking-list"), {
            "cleaner_id": cleaner_profile.id,
            "service_id": service.id,
            "address_id": customer_address.id,
            "scheduled_date": str(date.today() - timedelta(days=1)),
            "scheduled_time": "09:00",
        })
        assert res.status_code == 400

    def test_unavailable_day_rejected(
        self, db, api, customer, cleaner_profile, service, customer_address, availability
    ):
        # availability fixture sets Monday (0); find a Tuesday
        auth_api = _auth(api, customer)
        next_monday = _next_monday()
        next_tuesday = next_monday + timedelta(days=1)
        res = auth_api.post(reverse("booking-list"), {
            "cleaner_id": cleaner_profile.id,
            "service_id": service.id,
            "address_id": customer_address.id,
            "scheduled_date": str(next_tuesday),
            "scheduled_time": "09:00",
        })
        assert res.status_code == 400
        assert "not available" in str(res.data).lower()

    def test_wrong_address_rejected(
        self, db, api, customer, cleaner_profile, service, availability
    ):
        other_customer = _make_user("other@test.com", User.Role.CUSTOMER)
        other_addr = Address.objects.create(
            user=other_customer, label="Home", line1="2 Other St",
            area="Lekki", city="Lagos", state="Lagos",
        )
        auth_api = _auth(api, customer)
        res = auth_api.post(reverse("booking-list"), {
            "cleaner_id": cleaner_profile.id,
            "service_id": service.id,
            "address_id": other_addr.id,
            "scheduled_date": str(_next_monday()),
            "scheduled_time": "09:00",
        })
        assert res.status_code == 400

    def test_creates_status_log(
        self, db, api, customer, cleaner_profile, service, customer_address, availability
    ):
        _auth(api, customer).post(reverse("booking-list"), {
            "cleaner_id": cleaner_profile.id,
            "service_id": service.id,
            "address_id": customer_address.id,
            "scheduled_date": str(_next_monday()),
            "scheduled_time": "09:00",
        })
        booking = Booking.objects.filter(customer=customer).first()
        assert BookingStatusLog.objects.filter(booking=booking, to_status="PENDING").exists()


# ── State machine ─────────────────────────────────────────────────────────────

class TestBookingStateMachine:
    def test_cleaner_accepts(self, db, api, cleaner_user, pending_booking):
        auth_api = _auth(api, cleaner_user)
        res = auth_api.post(reverse("booking-accept", args=[pending_booking.pk]))
        assert res.status_code == 200
        assert res.data["status"] == "ACCEPTED"

    def test_customer_cannot_accept(self, db, api, customer, pending_booking):
        auth_api = _auth(api, customer)
        res = auth_api.post(reverse("booking-accept", args=[pending_booking.pk]))
        assert res.status_code == 403

    def test_cleaner_declines(self, db, api, cleaner_user, pending_booking):
        auth_api = _auth(api, cleaner_user)
        res = auth_api.post(
            reverse("booking-decline", args=[pending_booking.pk]),
            {"reason": "Not available"},
        )
        assert res.status_code == 200
        assert res.data["status"] == "CANCELLED"

    def test_cleaner_starts_job(self, db, api, cleaner_user, pending_booking):
        auth_api = _auth(api, cleaner_user)
        auth_api.post(reverse("booking-accept", args=[pending_booking.pk]))
        res = auth_api.post(reverse("booking-start", args=[pending_booking.pk]))
        assert res.status_code == 200
        assert res.data["status"] == "IN_PROGRESS"

    def test_cleaner_completes_job(self, db, api, cleaner_user, pending_booking):
        auth_api = _auth(api, cleaner_user)
        auth_api.post(reverse("booking-accept", args=[pending_booking.pk]))
        auth_api.post(reverse("booking-start", args=[pending_booking.pk]))
        res = auth_api.post(reverse("booking-complete", args=[pending_booking.pk]))
        assert res.status_code == 200
        assert res.data["status"] == "COMPLETED"

    def test_commission_computed_on_complete(self, db, api, cleaner_user, pending_booking):
        auth_api = _auth(api, cleaner_user)
        auth_api.post(reverse("booking-accept", args=[pending_booking.pk]))
        auth_api.post(reverse("booking-start", args=[pending_booking.pk]))
        auth_api.post(reverse("booking-complete", args=[pending_booking.pk]))
        pending_booking.refresh_from_db()
        assert float(pending_booking.commission_amount) > 0
        assert float(pending_booking.payout_amount) < float(pending_booking.total_amount)

    def test_invalid_transition_rejected(self, db, api, cleaner_user, pending_booking):
        auth_api = _auth(api, cleaner_user)
        # Can't start without accepting first
        res = auth_api.post(reverse("booking-start", args=[pending_booking.pk]))
        assert res.status_code == 400

    def test_cannot_cancel_within_24h(self, db, api, customer, cleaner_profile, service, customer_address, availability):
        # Schedule for 12 hours from now — within 24h window
        from datetime import datetime
        soon = timezone.now() + timedelta(hours=12)
        booking = Booking.objects.create(
            customer=customer, cleaner=cleaner_profile, service=service,
            address=customer_address,
            scheduled_date=soon.date(), scheduled_time=soon.time(),
            total_amount=5000, status=Booking.Status.PENDING,
        )
        auth_api = _auth(api, customer)
        res = auth_api.post(reverse("booking-cancel", args=[booking.pk]))
        assert res.status_code == 400
        assert "24 hours" in res.data["detail"]

    def test_cancel_allowed_before_24h(self, db, api, customer, pending_booking):
        auth_api = _auth(api, customer)
        res = auth_api.post(
            reverse("booking-cancel", args=[pending_booking.pk]),
            {"reason": "Change of plans"},
        )
        assert res.status_code == 200
        assert res.data["status"] == "CANCELLED"

    def test_dispute_raises(self, db, api, customer, pending_booking):
        # Must be ACCEPTED to dispute
        cleaner_api = _auth(APIClient(), pending_booking.cleaner.user)
        cleaner_api.post(reverse("booking-accept", args=[pending_booking.pk]))
        auth_api = _auth(api, customer)
        res = auth_api.post(
            reverse("booking-dispute", args=[pending_booking.pk]),
            {"reason": "Cleaner no-show", "description": "Cleaner did not arrive."},
        )
        assert res.status_code == 201
        pending_booking.refresh_from_db()
        assert pending_booking.status == "DISPUTED"


# ── List / detail ─────────────────────────────────────────────────────────────

class TestBookingListDetail:
    def test_customer_sees_own_bookings(self, db, api, customer, pending_booking):
        auth_api = _auth(api, customer)
        res = auth_api.get(reverse("booking-list"))
        assert res.status_code == 200
        assert len(res.data) >= 1

    def test_cleaner_sees_own_bookings(self, db, api, cleaner_user, pending_booking):
        auth_api = _auth(api, cleaner_user)
        res = auth_api.get(reverse("booking-list"))
        assert res.status_code == 200
        assert len(res.data) >= 1

    def test_status_filter(self, db, api, customer, pending_booking):
        auth_api = _auth(api, customer)
        res = auth_api.get(reverse("booking-list"), {"status": "PENDING"})
        assert all(b["status"] == "PENDING" for b in res.data)

    def test_detail_view(self, db, api, customer, pending_booking):
        auth_api = _auth(api, customer)
        res = auth_api.get(reverse("booking-detail", args=[pending_booking.pk]))
        assert res.status_code == 200
        assert "status_logs" in res.data
        assert "can_cancel" in res.data

    def test_other_user_cannot_see_booking(self, db, api, pending_booking):
        stranger = _make_user("stranger@test.com", User.Role.CUSTOMER)
        auth_api = _auth(api, stranger)
        res = auth_api.get(reverse("booking-detail", args=[pending_booking.pk]))
        assert res.status_code == 404
