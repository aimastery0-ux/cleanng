from django.db import models
from django.conf import settings


class CleanerProfile(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cleaner_profile"
    )
    bio = models.TextField(blank=True)
    years_experience = models.PositiveSmallIntegerField(default=0)
    service_areas = models.JSONField(default=list)
    base_hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_verified = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=10, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    id_doc_url = models.URLField(blank=True)
    portfolio_images = models.JSONField(default=list)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    featured_until = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    # Bank account for payouts
    bank_name = models.CharField(max_length=100, blank=True)
    bank_code = models.CharField(max_length=20, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    account_name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cleaner_profiles"
        indexes = [
            models.Index(fields=["is_verified", "is_featured"]),
            models.Index(fields=["rating_avg"]),
        ]

    def __str__(self):
        return f"Cleaner: {self.user.email}"


class CustomerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customer_profile"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "customer_profiles"

    def __str__(self):
        return f"Customer: {self.user.email}"


class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses"
    )
    label = models.CharField(max_length=50, blank=True)
    line1 = models.CharField(max_length=255)
    area = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, default="Lagos")
    state = models.CharField(max_length=100, default="Lagos")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "addresses"
        indexes = [
            models.Index(fields=["user", "is_default"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

    def __str__(self):
        return f"{self.label or self.line1} ({self.user.email})"

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Availability(models.Model):
    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0
        TUESDAY = 1
        WEDNESDAY = 2
        THURSDAY = 3
        FRIDAY = 4
        SATURDAY = 5
        SUNDAY = 6

    cleaner = models.ForeignKey(CleanerProfile, on_delete=models.CASCADE, related_name="availabilities")
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        db_table = "availabilities"
        unique_together = ("cleaner", "day_of_week")

    def __str__(self):
        return f"{self.cleaner.user.email} - {self.get_day_of_week_display()}"


class AvailabilityException(models.Model):
    cleaner = models.ForeignKey(CleanerProfile, on_delete=models.CASCADE, related_name="availability_exceptions")
    date = models.DateField()
    is_available = models.BooleanField(default=False)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    reason = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "availability_exceptions"
        unique_together = ("cleaner", "date")
