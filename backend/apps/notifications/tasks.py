from celery import shared_task
import requests
from django.conf import settings
from .models import Notification


@shared_task
def dispatch_booking_notification(booking_id: int, event: str):
    from apps.bookings.models import Booking
    booking = Booking.objects.select_related("customer", "cleaner__user").get(pk=booking_id)

    EVENT_MESSAGES = {
        "ACCEPTED": ("Booking accepted", "Your booking has been accepted! Please complete payment."),
        "IN_PROGRESS": ("Job started", "Your cleaner has started the job."),
        "COMPLETED": ("Job completed", "Your booking is complete. Please confirm to release payment."),
        "CANCELLED": ("Booking cancelled", "Your booking has been cancelled."),
        "DISPUTED": ("Dispute raised", "A dispute has been raised for your booking."),
    }

    title, body = EVENT_MESSAGES.get(event, ("Update", "Your booking has been updated."))

    for user in [booking.customer, booking.cleaner.user]:
        _create_in_app(user, event, title, body, booking_id)
        if user.phone and user.is_phone_verified:
            send_sms.delay(user.phone, body)


@shared_task
def send_sms(phone: str, message: str) -> bool:
    url = "https://api.ng.termii.com/api/sms/send"
    payload = {
        "to": phone,
        "from": settings.TERMII_SENDER_ID,
        "sms": message,
        "type": "plain",
        "channel": "generic",
        "api_key": settings.TERMII_API_KEY,
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception:
        return False


def _create_in_app(user, event_type: str, title: str, body: str, booking_id: int):
    Notification.objects.create(
        user=user,
        type=event_type,
        channel=Notification.Channel.IN_APP,
        payload={"title": title, "body": body, "booking_id": booking_id},
        status=Notification.Status.SENT,
    )
