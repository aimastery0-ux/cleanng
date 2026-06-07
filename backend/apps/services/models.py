from django.db import models
from apps.profiles.models import CleanerProfile


class Service(models.Model):
    class ServiceType(models.TextChoices):
        REGULAR = "REGULAR", "Regular Cleaning"
        DEEP = "DEEP", "Deep Cleaning"
        POST_CONSTRUCTION = "POST_CONSTRUCTION", "Post-Construction"
        OFFICE = "OFFICE", "Office Cleaning"
        MOVE_IN_OUT = "MOVE_IN_OUT", "Move In/Out Cleaning"

    class PricingUnit(models.TextChoices):
        PER_HOUR = "PER_HOUR", "Per Hour"
        FLAT = "FLAT", "Flat Rate"
        PER_ROOM = "PER_ROOM", "Per Room"

    cleaner = models.ForeignKey(CleanerProfile, on_delete=models.CASCADE, related_name="services")
    type = models.CharField(max_length=20, choices=ServiceType.choices)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    pricing_unit = models.CharField(max_length=10, choices=PricingUnit.choices, default=PricingUnit.PER_HOUR)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "services"
        indexes = [
            models.Index(fields=["cleaner", "is_active"]),
            models.Index(fields=["type"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.cleaner.user.email}"
