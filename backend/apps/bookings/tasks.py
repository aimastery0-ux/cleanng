from celery import shared_task


@shared_task
def auto_decline_booking(booking_id: int):
    """Auto-cancel a booking that's still PENDING after 24h (cleaner didn't respond)."""
    from .models import Booking
    from .services import transition_booking
    try:
        booking = Booking.objects.get(pk=booking_id, status=Booking.Status.PENDING)
        transition_booking(
            booking,
            Booking.Status.CANCELLED,
            actor=None,
            note="Auto-cancelled: cleaner did not respond within 24 hours.",
        )
    except Booking.DoesNotExist:
        pass  # Already accepted/cancelled — nothing to do
