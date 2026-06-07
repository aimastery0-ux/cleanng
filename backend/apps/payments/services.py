import uuid
import requests
from django.conf import settings
from django.utils import timezone
from celery import shared_task
from .models import Payment, Payout
from apps.bookings.models import Booking
from apps.bookings.services import transition_booking


def initiate_payment(booking_id: int, user) -> dict:
    booking = Booking.objects.select_related("customer", "cleaner__user").get(pk=booking_id)

    if booking.customer != user:
        raise PermissionError("Not your booking.")

    tx_ref = f"cleanng-{booking_id}-{uuid.uuid4().hex[:8]}"
    payment, created = Payment.objects.get_or_create(
        booking=booking,
        defaults={
            "flw_tx_ref": tx_ref,
            "amount": booking.total_amount,
        },
    )

    if not created and payment.status != Payment.Status.PENDING:
        raise ValueError("Payment already processed.")

    return {
        "tx_ref": payment.flw_tx_ref,
        "amount": str(payment.amount),
        "currency": "NGN",
        "customer": {
            "email": user.email,
            "name": user.full_name,
            "phone_number": user.phone or "",
        },
        "public_key": settings.FLW_PUBLIC_KEY,
    }


@shared_task
def process_webhook(payload: dict):
    event = payload.get("event", "")
    data = payload.get("data", {})

    if event != "charge.completed":
        return

    tx_id = str(data.get("id", ""))
    tx_ref = data.get("tx_ref", "")

    payment = Payment.objects.filter(flw_tx_ref=tx_ref).first()
    if not payment:
        return

    if payment.flw_transaction_id:
        return

    # Verify with Flutterwave
    headers = {"Authorization": f"Bearer {settings.FLW_SECRET_KEY}"}
    resp = requests.get(f"https://api.flutterwave.com/v3/transactions/{tx_id}/verify", headers=headers, timeout=15)
    if resp.status_code != 200:
        return

    verified = resp.json().get("data", {})
    if verified.get("status") != "successful" or str(verified.get("amount")) != str(payment.amount):
        payment.status = Payment.Status.FAILED
        payment.save()
        return

    payment.flw_transaction_id = tx_id
    payment.status = Payment.Status.HELD_IN_ESCROW
    payment.paid_at = timezone.now()
    payment.webhook_payload = payload
    payment.method = _map_method(verified.get("payment_type", ""))
    payment.save()

    system_user = None
    transition_booking(payment.booking, Booking.Status.ACCEPTED, system_user)


@shared_task
def release_payout(booking_id: int):
    from apps.bookings.models import Booking
    booking = Booking.objects.select_related("payment", "cleaner__user").get(pk=booking_id)
    payment = booking.payment

    if payment.status != Payment.Status.HELD_IN_ESCROW:
        return

    payout, _ = Payout.objects.get_or_create(
        booking=booking,
        defaults={"cleaner": booking.cleaner, "amount": booking.payout_amount},
    )

    payout.status = Payout.Status.PROCESSING
    payout.save()

    headers = {"Authorization": f"Bearer {settings.FLW_SECRET_KEY}", "Content-Type": "application/json"}
    payload = {
        "account_bank": booking.cleaner.user.bank_code if hasattr(booking.cleaner.user, "bank_code") else "",
        "account_number": booking.cleaner.user.account_number if hasattr(booking.cleaner.user, "account_number") else "",
        "amount": float(booking.payout_amount),
        "narration": f"CleanNG payout - Booking #{booking_id}",
        "currency": "NGN",
        "reference": f"cleanng-payout-{booking_id}",
    }

    try:
        resp = requests.post("https://api.flutterwave.com/v3/transfers", json=payload, headers=headers, timeout=15)
        result = resp.json()
        if result.get("status") == "success":
            payout.flw_transfer_ref = result["data"].get("reference", "")
            payout.status = Payout.Status.SUCCESS
            payout.processed_at = timezone.now()
            payment.status = Payment.Status.RELEASED
            payment.released_at = timezone.now()
            payment.save()
        else:
            payout.status = Payout.Status.FAILED
            payout.failure_reason = result.get("message", "Unknown error")
    except Exception as e:
        payout.status = Payout.Status.FAILED
        payout.failure_reason = str(e)

    payout.save()


def _map_method(payment_type: str) -> str:
    mapping = {"card": "CARD", "banktransfer": "TRANSFER", "ussd": "USSD"}
    return mapping.get(payment_type.lower(), "CARD")
