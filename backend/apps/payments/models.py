from django.db import models
from django.conf import settings
from apps.bookings.models import Booking
from apps.profiles.models import CleanerProfile


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        HELD_IN_ESCROW = "HELD_IN_ESCROW", "Held in Escrow"
        RELEASED = "RELEASED", "Released"
        REFUNDED = "REFUNDED", "Refunded"
        FAILED = "FAILED", "Failed"

    class Method(models.TextChoices):
        CARD = "CARD", "Card"
        TRANSFER = "TRANSFER", "Bank Transfer"
        USSD = "USSD", "USSD"

    booking = models.OneToOneField(Booking, on_delete=models.PROTECT, related_name="payment")
    flw_tx_ref = models.CharField(max_length=100, unique=True)
    flw_transaction_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="NGN")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    method = models.CharField(max_length=10, choices=Method.choices, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    webhook_payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["flw_tx_ref"]),
        ]

    def __str__(self):
        return f"Payment #{self.pk} - ₦{self.amount} ({self.status})"


class Payout(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    cleaner = models.ForeignKey(CleanerProfile, on_delete=models.PROTECT, related_name="payouts")
    booking = models.OneToOneField(Booking, on_delete=models.PROTECT, related_name="payout")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    flw_transfer_ref = models.CharField(max_length=100, unique=True, null=True, blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    failure_reason = models.TextField(blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payouts"

    def __str__(self):
        return f"Payout #{self.pk} - ₦{self.amount} ({self.status})"
