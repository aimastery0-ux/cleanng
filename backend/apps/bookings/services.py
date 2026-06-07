from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from .models import Booking, BookingStatusLog


def transition_booking(booking: Booking, new_status: str, actor, note: str = "") -> Booking:
    if not booking.can_transition_to(new_status):
        raise ValueError(
            f"Cannot transition booking from '{booking.status}' to '{new_status}'."
        )

    old_status = booking.status

    if new_status == Booking.Status.COMPLETED:
        rate = getattr(settings, "PLATFORM_COMMISSION_RATE", 0.175)
        booking.commission_amount = round(booking.total_amount * rate, 2)
        booking.payout_amount = round(booking.total_amount - booking.commission_amount, 2)

    booking.status = new_status
    booking.save()

    BookingStatusLog.objects.create(
        booking=booking,
        from_status=old_status,
        to_status=new_status,
        actor=actor,
        note=note,
    )

    _fire_booking_event(booking, new_status)

    return booking


def check_cancellation_allowed(booking: Booking) -> tuple[bool, str]:
    """Returns (allowed, reason). Free cancel up to 24h before scheduled time."""
    if booking.status not in (Booking.Status.PENDING, Booking.Status.ACCEPTED):
        return False, f"Booking cannot be cancelled from status '{booking.status}'."
    scheduled_dt = datetime.combine(booking.scheduled_date, booking.scheduled_time)
    scheduled_dt = timezone.make_aware(scheduled_dt)
    if timezone.now() >= scheduled_dt - timedelta(hours=24):
        return False, "Cancellation is only allowed more than 24 hours before the scheduled time."
    return True, ""


def _fire_booking_event(booking: Booking, new_status: str):
    try:
        from apps.notifications.tasks import dispatch_booking_notification
        dispatch_booking_notification.delay(booking.id, new_status)
    except Exception:
        pass
