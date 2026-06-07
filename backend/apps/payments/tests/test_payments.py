import pytest
from unittest.mock import patch, MagicMock
from datetime import date, time, timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.profiles.models import CleanerProfile, Address, Availability
from apps.services.models import Service
from apps.bookings.models import Booking
from apps.payments.models import Payment, Payout
from apps.payments.services import initiate_payment, release_payout


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
    profile.bank_name = "First Bank"
    profile.bank_code = "011"
    profile.account_number = "1234567890"
    profile.account_name = "Test Cleaner"
    profile.save()
    return profile


@pytest.fixture
def service(cleaner_profile):
    return Service.objects.create(
        cleaner=cleaner_profile,
        type="HOME_CLEANING",
        title="Home Cleaning",
        description="Standard home clean",
        price=10000,
        pricing_unit="PER_JOB",
        is_active=True,
    )


@pytest.fixture
def address(customer):
    return Address.objects.create(
        user=customer, label="Home", line1="123 Test St",
        area="Lekki", city="Lagos", state="Lagos", is_default=True,
    )


@pytest.fixture
def availability(cleaner_profile):
    return Availability.objects.create(
        cleaner=cleaner_profile,
        day_of_week=0,  # Monday
        start_time=time(8, 0),
        end_time=time(18, 0),
    )


@pytest.fixture
def accepted_booking(db, customer, cleaner_profile, service, address, availability):
    tomorrow = date.today() + timedelta(days=7)
    booking = Booking.objects.create(
        customer=customer,
        cleaner=cleaner_profile,
        service=service,
        address=address,
        scheduled_date=tomorrow,
        scheduled_time=time(10, 0),
        total_amount=10000,
        status=Booking.Status.ACCEPTED,
    )
    return booking


# ── initiate_payment ──────────────────────────────────────────────────────────

class TestInitiatePayment:
    def test_returns_checkout_params(self, accepted_booking, customer, settings):
        settings.FLW_PUBLIC_KEY = "FLWPUBK_TEST-xxx"
        result = initiate_payment(accepted_booking.id, customer)

        assert "tx_ref" in result
        assert result["tx_ref"].startswith(f"cleanng-{accepted_booking.id}-")
        assert result["amount"] == "10000.00"
        assert result["currency"] == "NGN"
        assert result["customer"]["email"] == customer.email

    def test_creates_payment_record(self, accepted_booking, customer):
        initiate_payment(accepted_booking.id, customer)
        assert Payment.objects.filter(booking=accepted_booking).exists()

    def test_idempotent_second_call(self, accepted_booking, customer):
        initiate_payment(accepted_booking.id, customer)
        # Second call returns same payment
        result = initiate_payment(accepted_booking.id, customer)
        assert Payment.objects.filter(booking=accepted_booking).count() == 1
        assert result["tx_ref"].startswith(f"cleanng-{accepted_booking.id}-")

    def test_raises_for_wrong_user(self, accepted_booking, db):
        other = _make_user("other@test.com", User.Role.CUSTOMER)
        with pytest.raises(PermissionError):
            initiate_payment(accepted_booking.id, other)

    def test_raises_if_already_paid(self, accepted_booking, customer):
        Payment.objects.create(
            booking=accepted_booking,
            flw_tx_ref="ref-123",
            amount=10000,
            status=Payment.Status.HELD_IN_ESCROW,
        )
        with pytest.raises(ValueError):
            initiate_payment(accepted_booking.id, customer)


# ── InitiatePaymentView ───────────────────────────────────────────────────────

class TestInitiatePaymentView:
    def test_initiate_returns_200(self, api, accepted_booking, customer, settings):
        settings.FLW_PUBLIC_KEY = "FLWPUBK_TEST-xxx"
        api.force_authenticate(customer)
        resp = api.post("/api/v1/payments/initiate/", {"booking_id": accepted_booking.id})
        assert resp.status_code == 200
        assert "tx_ref" in resp.data

    def test_requires_auth(self, api, accepted_booking):
        resp = api.post("/api/v1/payments/initiate/", {"booking_id": accepted_booking.id})
        assert resp.status_code == 401

    def test_missing_booking_id(self, api, customer):
        api.force_authenticate(customer)
        resp = api.post("/api/v1/payments/initiate/", {})
        assert resp.status_code == 400


# ── process_webhook ───────────────────────────────────────────────────────────

class TestProcessWebhook:
    def test_updates_payment_to_escrow(self, accepted_booking, settings):
        settings.FLW_SECRET_KEY = "FLWSECK_TEST-xxx"
        payment = Payment.objects.create(
            booking=accepted_booking,
            flw_tx_ref="test-ref-001",
            amount=10000,
            status=Payment.Status.PENDING,
        )

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": {
                "status": "successful",
                "amount": 10000,
                "id": "flw-txid-001",
                "payment_type": "card",
            }
        }

        with patch("apps.payments.services.requests.get", return_value=mock_resp):
            from apps.payments.services import process_webhook
            process_webhook({
                "event": "charge.completed",
                "data": {"id": "flw-txid-001", "tx_ref": "test-ref-001"},
            })

        payment.refresh_from_db()
        assert payment.status == Payment.Status.HELD_IN_ESCROW
        assert payment.flw_transaction_id == "flw-txid-001"

    def test_idempotent_on_duplicate_webhook(self, accepted_booking, settings):
        settings.FLW_SECRET_KEY = "FLWSECK_TEST-xxx"
        payment = Payment.objects.create(
            booking=accepted_booking,
            flw_tx_ref="test-ref-002",
            flw_transaction_id="already-processed",
            amount=10000,
            status=Payment.Status.HELD_IN_ESCROW,
        )

        from apps.payments.services import process_webhook
        process_webhook({
            "event": "charge.completed",
            "data": {"id": "already-processed", "tx_ref": "test-ref-002"},
        })

        payment.refresh_from_db()
        assert payment.status == Payment.Status.HELD_IN_ESCROW


# ── release_payout ────────────────────────────────────────────────────────────

class TestReleasePayout:
    def _make_escrow_booking(self, accepted_booking):
        booking = accepted_booking
        booking.status = Booking.Status.COMPLETED
        booking.payout_amount = 8250  # 82.5% after 17.5% commission
        booking.commission_amount = 1750
        booking.save()
        Payment.objects.create(
            booking=booking,
            flw_tx_ref="test-ref-payout",
            flw_transaction_id="tx-001",
            amount=10000,
            status=Payment.Status.HELD_IN_ESCROW,
        )
        return booking

    def test_creates_payout_on_success(self, accepted_booking, settings):
        settings.FLW_SECRET_KEY = "FLWSECK_TEST-xxx"
        booking = self._make_escrow_booking(accepted_booking)

        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "success",
            "data": {"reference": "flw-transfer-ref-001"},
        }

        with patch("apps.payments.services.requests.post", return_value=mock_resp):
            release_payout(booking.id)

        payout = Payout.objects.get(booking=booking)
        assert payout.status == Payout.Status.SUCCESS
        assert payout.flw_transfer_ref == "flw-transfer-ref-001"

        payment = Payment.objects.get(booking=booking)
        assert payment.status == Payment.Status.RELEASED

    def test_marks_failed_on_flw_error(self, accepted_booking, settings):
        settings.FLW_SECRET_KEY = "FLWSECK_TEST-xxx"
        booking = self._make_escrow_booking(accepted_booking)

        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": "error", "message": "Invalid account"}

        with patch("apps.payments.services.requests.post", return_value=mock_resp):
            release_payout(booking.id)

        payout = Payout.objects.get(booking=booking)
        assert payout.status == Payout.Status.FAILED
        assert "Invalid account" in payout.failure_reason

    def test_uses_cleaner_bank_fields(self, accepted_booking, settings):
        settings.FLW_SECRET_KEY = "FLWSECK_TEST-xxx"
        booking = self._make_escrow_booking(accepted_booking)

        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": "success", "data": {"reference": "ref-x"}}

        with patch("apps.payments.services.requests.post", return_value=mock_resp) as mock_post:
            release_payout(booking.id)

        call_payload = mock_post.call_args[1]["json"]
        assert call_payload["account_bank"] == "011"
        assert call_payload["account_number"] == "1234567890"


# ── ConfirmCompletionView ─────────────────────────────────────────────────────

class TestConfirmCompletionView:
    def test_triggers_payout_task(self, api, accepted_booking, customer, settings):
        booking = accepted_booking
        booking.status = Booking.Status.COMPLETED
        booking.payout_amount = 8250
        booking.save()
        Payment.objects.create(
            booking=booking,
            flw_tx_ref="ref-confirm",
            flw_transaction_id="tx-confirm",
            amount=10000,
            status=Payment.Status.HELD_IN_ESCROW,
        )

        api.force_authenticate(customer)
        with patch("apps.payments.views.release_payout") as mock_task:
            mock_task.delay = MagicMock()
            resp = api.post(f"/api/v1/payments/booking/{booking.id}/confirm/")

        assert resp.status_code == 200
        mock_task.delay.assert_called_once_with(booking.id)

    def test_rejects_non_completed_booking(self, api, accepted_booking, customer):
        api.force_authenticate(customer)
        resp = api.post(f"/api/v1/payments/booking/{accepted_booking.id}/confirm/")
        assert resp.status_code == 400

    def test_rejects_cleaner(self, api, accepted_booking, cleaner_user):
        api.force_authenticate(cleaner_user)
        resp = api.post(f"/api/v1/payments/booking/{accepted_booking.id}/confirm/")
        assert resp.status_code == 403


# ── BookingPaymentView ────────────────────────────────────────────────────────

class TestBookingPaymentView:
    def test_returns_payment_status(self, api, accepted_booking, customer):
        Payment.objects.create(
            booking=accepted_booking,
            flw_tx_ref="ref-status",
            amount=10000,
            status=Payment.Status.HELD_IN_ESCROW,
        )
        api.force_authenticate(customer)
        resp = api.get(f"/api/v1/payments/booking/{accepted_booking.id}/")
        assert resp.status_code == 200
        assert resp.data["payment"]["status"] == "HELD_IN_ESCROW"
        assert resp.data["payout"] is None

    def test_returns_null_when_no_payment(self, api, accepted_booking, customer):
        api.force_authenticate(customer)
        resp = api.get(f"/api/v1/payments/booking/{accepted_booking.id}/")
        assert resp.status_code == 200
        assert resp.data["payment"] is None


# ── BankDetailsView ───────────────────────────────────────────────────────────

class TestBankDetailsView:
    def test_get_bank_details(self, api, cleaner_user, cleaner_profile):
        api.force_authenticate(cleaner_user)
        resp = api.get("/api/v1/profiles/cleaner/bank-details/")
        assert resp.status_code == 200
        assert resp.data["bank_code"] == "011"
        assert resp.data["account_number"] == "1234567890"

    def test_update_bank_details(self, api, cleaner_user, cleaner_profile):
        api.force_authenticate(cleaner_user)
        resp = api.put("/api/v1/profiles/cleaner/bank-details/", {
            "bank_name": "GTBank",
            "bank_code": "058",
            "account_number": "0987654321",
            "account_name": "Test Cleaner",
        })
        assert resp.status_code == 200
        cleaner_profile.refresh_from_db()
        assert cleaner_profile.bank_code == "058"
        assert cleaner_profile.account_number == "0987654321"

    def test_rejects_non_digit_account_number(self, api, cleaner_user, cleaner_profile):
        api.force_authenticate(cleaner_user)
        resp = api.put("/api/v1/profiles/cleaner/bank-details/", {
            "bank_name": "GTBank",
            "bank_code": "058",
            "account_number": "ABCD123456",
            "account_name": "Test Cleaner",
        })
        assert resp.status_code == 400
