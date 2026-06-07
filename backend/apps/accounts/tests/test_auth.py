import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User, OTPVerification, EmailVerificationToken
from django.utils import timezone
from datetime import timedelta


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def customer(db):
    user = User.objects.create_user(
        email="customer@test.com",
        password="TestPass123!",
        role=User.Role.CUSTOMER,
        first_name="Test",
        last_name="Customer",
    )
    return user


@pytest.fixture
def cleaner(db):
    user = User.objects.create_user(
        email="cleaner@test.com",
        password="TestPass123!",
        role=User.Role.CLEANER,
        first_name="Test",
        last_name="Cleaner",
    )
    return user


@pytest.fixture
def auth_client(client, customer):
    resp = client.post(reverse("login"), {"email": "customer@test.com", "password": "TestPass123!"})
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['tokens']['access']}")
    return client, customer


# ── Registration ─────────────────────────────────────────────────────────────

class TestRegistration:
    def test_customer_register(self, client, db):
        resp = client.post(reverse("register"), {
            "email": "new@test.com",
            "password": "StrongPass1!",
            "password_confirm": "StrongPass1!",
            "first_name": "Ada",
            "last_name": "Obi",
            "role": "CUSTOMER",
        })
        assert resp.status_code == 201
        assert resp.data["user"]["role"] == "CUSTOMER"
        assert "access" in resp.data["tokens"]

    def test_cleaner_register_creates_profile(self, client, db):
        resp = client.post(reverse("register"), {
            "email": "cleaner.new@test.com",
            "password": "StrongPass1!",
            "password_confirm": "StrongPass1!",
            "first_name": "Emeka",
            "last_name": "Nwosu",
            "role": "CLEANER",
        })
        assert resp.status_code == 201
        user = User.objects.get(email="cleaner.new@test.com")
        assert hasattr(user, "cleaner_profile")

    def test_customer_register_creates_profile(self, client, db):
        client.post(reverse("register"), {
            "email": "cust.new@test.com",
            "password": "StrongPass1!",
            "password_confirm": "StrongPass1!",
            "first_name": "Ngozi",
            "last_name": "Eze",
            "role": "CUSTOMER",
        })
        user = User.objects.get(email="cust.new@test.com")
        assert hasattr(user, "customer_profile")

    def test_duplicate_email_rejected(self, client, customer):
        resp = client.post(reverse("register"), {
            "email": "customer@test.com",
            "password": "StrongPass1!",
            "password_confirm": "StrongPass1!",
            "first_name": "X",
            "last_name": "Y",
            "role": "CUSTOMER",
        })
        assert resp.status_code == 400

    def test_password_mismatch_rejected(self, client, db):
        resp = client.post(reverse("register"), {
            "email": "x@test.com",
            "password": "StrongPass1!",
            "password_confirm": "WrongPass1!",
            "first_name": "X",
            "last_name": "Y",
            "role": "CUSTOMER",
        })
        assert resp.status_code == 400

    def test_admin_self_register_rejected(self, client, db):
        resp = client.post(reverse("register"), {
            "email": "admin@test.com",
            "password": "StrongPass1!",
            "password_confirm": "StrongPass1!",
            "first_name": "X",
            "last_name": "Y",
            "role": "ADMIN",
        })
        assert resp.status_code == 400


# ── Login ────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_success(self, client, customer):
        resp = client.post(reverse("login"), {
            "email": "customer@test.com",
            "password": "TestPass123!",
        })
        assert resp.status_code == 200
        assert "access" in resp.data["tokens"]

    def test_login_wrong_password(self, client, customer):
        resp = client.post(reverse("login"), {
            "email": "customer@test.com",
            "password": "wrongpassword",
        })
        assert resp.status_code == 400

    def test_login_unknown_email(self, client, db):
        resp = client.post(reverse("login"), {
            "email": "nobody@test.com",
            "password": "TestPass123!",
        })
        assert resp.status_code == 400


# ── OTP ──────────────────────────────────────────────────────────────────────

class TestOTP:
    def test_send_and_verify_otp(self, db, settings):
        settings.DEBUG = True
        user = User.objects.create_user(
            email="otp@test.com", password="pass", role=User.Role.CUSTOMER
        )
        client = APIClient()
        login = client.post(reverse("login"), {"email": "otp@test.com", "password": "pass"})
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['tokens']['access']}")

        phone = "+2348012345678"
        client.post(reverse("send-otp"), {"phone": phone})
        otp = OTPVerification.objects.filter(phone=phone, is_used=False).first()
        assert otp is not None

        resp = client.post(reverse("verify-otp"), {"phone": phone, "code": otp.code})
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.is_phone_verified is True

    def test_expired_otp_rejected(self, db):
        user = User.objects.create_user(
            email="expired@test.com", password="pass", role=User.Role.CUSTOMER
        )
        OTPVerification.objects.create(
            user=user,
            phone="+234800000001",
            code="999999",
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        client = APIClient()
        login = client.post(reverse("login"), {"email": "expired@test.com", "password": "pass"})
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['tokens']['access']}")
        resp = client.post(reverse("verify-otp"), {"phone": "+234800000001", "code": "999999"})
        assert resp.status_code == 400


# ── Email verification ───────────────────────────────────────────────────────

class TestEmailVerification:
    def test_verify_email_with_valid_token(self, db):
        user = User.objects.create_user(
            email="verify@test.com", password="pass", role=User.Role.CUSTOMER
        )
        token_obj = EmailVerificationToken.objects.create(user=user)
        client = APIClient()
        resp = client.post(reverse("verify-email"), {"token": str(token_obj.token)})
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.is_email_verified is True

    def test_invalid_token_rejected(self, db):
        client = APIClient()
        resp = client.post(reverse("verify-email"), {"token": "00000000-0000-0000-0000-000000000000"})
        assert resp.status_code == 400


# ── Password reset ───────────────────────────────────────────────────────────

class TestPasswordReset:
    def test_reset_flow(self, db, settings):
        settings.DEBUG = True
        user = User.objects.create_user(
            email="reset@test.com", password="OldPass1!", role=User.Role.CUSTOMER
        )
        client = APIClient()
        resp = client.post(reverse("password-reset"), {"email": "reset@test.com"})
        assert resp.status_code == 200

        from apps.accounts.models import PasswordResetToken
        token = PasswordResetToken.objects.filter(user=user, is_used=False).first()
        assert token is not None

        resp = client.post(reverse("password-reset-confirm"), {
            "token": str(token.token),
            "new_password": "NewPass1!",
        })
        assert resp.status_code == 200

        # Old password no longer works
        resp = client.post(reverse("login"), {"email": "reset@test.com", "password": "OldPass1!"})
        assert resp.status_code == 400

        # New password works
        resp = client.post(reverse("login"), {"email": "reset@test.com", "password": "NewPass1!"})
        assert resp.status_code == 200

    def test_nonexistent_email_returns_200(self, db):
        client = APIClient()
        resp = client.post(reverse("password-reset"), {"email": "ghost@test.com"})
        assert resp.status_code == 200  # Don't reveal email existence


# ── Me / profile ─────────────────────────────────────────────────────────────

class TestMe:
    def test_me_authenticated(self, db):
        user = User.objects.create_user(
            email="me@test.com", password="pass", role=User.Role.CUSTOMER,
            first_name="Ada", last_name="Obi"
        )
        client = APIClient()
        login = client.post(reverse("login"), {"email": "me@test.com", "password": "pass"})
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['tokens']['access']}")
        resp = client.get(reverse("me"))
        assert resp.status_code == 200
        assert resp.data["email"] == "me@test.com"

    def test_me_unauthenticated(self, db):
        client = APIClient()
        resp = client.get(reverse("me"))
        assert resp.status_code == 401
