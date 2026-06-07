import random
import string
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
import requests
from .models import OTPVerification


def generate_otp(length=6):
    return "".join(random.choices(string.digits, k=length))


def send_otp_sms(phone: str, code: str) -> bool:
    """Send OTP via Termii."""
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

    # Invalidate old OTPs for this phone
    OTPVerification.objects.filter(phone=phone, is_used=False).update(is_used=True)

    OTPVerification.objects.create(
        user=user,
        phone=phone,
        code=code,
        expires_at=expires_at,
    )

    if settings.DEBUG:
        print(f"[DEV OTP] Phone: {phone}, Code: {code}")
        return True

    return send_otp_sms(phone, code)


def verify_otp(phone: str, code: str) -> bool:
    otp = OTPVerification.objects.filter(
        phone=phone,
        code=code,
        is_used=False,
        expires_at__gt=timezone.now(),
    ).first()

    if otp:
        otp.is_used = True
        otp.save()
        return True
    return False
