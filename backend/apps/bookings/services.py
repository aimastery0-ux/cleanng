from django.conf import settings
from .models import Booking, BookingStatusLog


def transition_booking(booking: Booking, new_status: str, actor) -> Booking:
    if not booking.can_transition_to(new_status):
        raise ValueError(
            f"Cannot transition booking from '{booking.status}' to '{new_status}'."
        )

    old_status = booking.status

    # Commission computation on completion
    if new_status == Booking.Status.COMPLETED:
        commission_rate = getattr(settings, "PLATFORM_COMMISSION_RATE", 0.175)
        booking.commission_amount = booking.total_amount * commission_rate
        booking.payout_amount = booking.total_amount - booking.commission_amount

    booking.status = new_status
    booking.save()

    BookingStatusLog.objects.create(
        booking=booking,
        from_status=old_status,
        to_status=new_status,
        actor=actor,
    )

    _fire_booking_event(booking, new_status)

    return booking


def _fire_booking_event(booking: Booking, new_status: str):
    try:
        from apps.notifications.tasks import dispatch_booking_notification
        dispatch_booking_notification.delay(booking.id, new_status)
    except Exception:
        pass
