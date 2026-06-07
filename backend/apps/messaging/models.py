from django.db import models
from django.conf import settings
from apps.bookings.models import Booking


class Message(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages"
    )
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "messages"
        ordering = ["sent_at"]
        indexes = [
            models.Index(fields=["booking", "sent_at"]),
        ]

    def __str__(self):
        return f"Message from {self.sender.email} in Booking #{self.booking_id}"
