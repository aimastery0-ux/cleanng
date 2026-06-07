import random
import string
import uuid
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail
import requests
from .models import OTPVerification, EmailVerificationToken, PasswordResetToken


def generate_otp(length=6):
    return "".join(random.choices(string.digits, k=length))


def send_otp_sms(phone: str, code: str) -> bool:
    url = "https://api.ng.termii.com/api/sms/send"
    payload = {
        "to": phone,
        "from": settings.TERMII_SENDER_ID,
        "sms": f"Your CleanNG verification code is: {code}. Valid for 10 minutes.",
        "type": "plain",
        "channel": "generic",
        "api_key": settings.TERMII_API_KEY,
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        return response.status_code == 200
    except requests.RequestException:
        return False


def create_and_send_otp(user, phone: str) -> bool:
    code = generate_otp()
    expires_at = timezone.now() + timedelta(minutes=10)

    OTPVerification.objects.filter(phone=phone, is_used=False).update(is_used=True)
    OTPVerification.objects.create(user=user, phone=phone, code=code, expires_at=expires_at)

    if settings.DEBUG:
        print(f"[DEV OTP] Phone: {phone}, Code: {code}")
        return True

    return send_otp_sms(phone, code)


def verify_otp(phone: str, code: str) -> bool:
    otp = OTPVerification.objects.filter(
        phone=phone, code=code, is_used=False, expires_at__gt=timezone.now()
    ).first()
    if otp:
        otp.is_used = True
        otp.save()
        return True
    return False


# ── Email verification ──────────────────────────────────────────────────────

def send_verification_email(user) -> bool:
    token_obj, _ = EmailVerificationToken.objects.get_or_create(user=user)
    # Regenerate token on each send
    token_obj.token = uuid.uuid4()
    token_obj.save()

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    verify_url = f"{frontend_url}/verify-email?token={token_obj.token}"

    if settings.DEBUG:
        print(f"[DEV EMAIL VERIFY] {user.email}: {verify_url}")
        return True

    try:
        send_mail(
            subject="Verify your CleanNG email",
            message=f"Hi {user.first_name},\n\nClick the link to verify your email:\n{verify_url}\n\nThe CleanNG team",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception:
        return False


def verify_email_token(token: str) -> "User | None":
    try:
        token_obj = EmailVerificationToken.objects.select_related("user").get(token=token)
        user = token_obj.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        token_obj.delete()
        return user
    except EmailVerificationToken.DoesNotExist:
        return None


# ── Password reset ───────────────────────────────────────────────────────────

def send_password_reset_email(email: str) -> bool:
    from .models import User
    try:
        user = User.objects.get(email=email, is_active=True)
    except User.DoesNotExist:
        return True  # Don't reveal whether email exists

    # Expire old tokens
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

    token_obj = PasswordResetToken.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=2),
    )

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    reset_url = f"{frontend_url}/reset-password?token={token_obj.token}"

    if settings.DEBUG:
        print(f"[DEV PASSWORD RESET] {email}: {reset_url}")
        return True

    try:
        send_mail(
            subject="Reset your CleanNG password",
            message=f"Hi {user.first_name},\n\nReset your password:\n{reset_url}\n\nExpires in 2 hours.\n\nThe CleanNG team",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        return True
    except Exception:
        return False


def reset_password_with_token(token: str, new_password: str) -> bool:
    try:
        token_obj = PasswordResetToken.objects.select_related("user").get(
            token=token,
            is_used=False,
            expires_at__gt=timezone.now(),
        )
        user = token_obj.user
        user.set_password(new_password)
        user.save()
        token_obj.is_used = True
        token_obj.save()
        return True
    except PasswordResetToken.DoesNotExist:
        return False
