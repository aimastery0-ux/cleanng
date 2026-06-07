from rest_framework import serializers
from .models import CleanerProfile, CustomerProfile, Address, Availability, AvailabilityException


class AvailabilitySerializer(serializers.ModelSerializer):
    day_name = serializers.SerializerMethodField()

    class Meta:
        model = Availability
        fields = ("id", "day_of_week", "day_name", "start_time", "end_time")

    def get_day_name(self, obj):
        return obj.get_day_of_week_display()


class AvailabilityExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityException
        fields = ("id", "date", "is_available", "start_time", "end_time", "reason")


class ServiceSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    type = serializers.CharField()
    title = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    pricing_unit = serializers.CharField()
    is_active = serializers.BooleanField()


class ReviewSummarySerializer(serializers.Serializer):
    author_name = serializers.CharField()
    rating = serializers.IntegerField()
    comment = serializers.CharField()
    created_at = serializers.DateTimeField()


class CleanerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    avatar_url = serializers.URLField(source="user.avatar_url", read_only=True)
    services = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    recent_reviews = serializers.SerializerMethodField()

    class Meta:
        model = CleanerProfile
        fields = (
            "id", "email", "first_name", "last_name", "full_name", "phone", "avatar_url",
            "bio", "years_experience", "service_areas", "base_hourly_rate",
            "is_verified", "verification_status", "id_doc_url", "portfolio_images",
            "rating_avg", "rating_count", "is_featured",
            "services", "availability", "recent_reviews",
            "created_at",
        )
        read_only_fields = (
            "id", "email", "first_name", "last_name", "full_name", "phone", "avatar_url",
            "is_verified", "verification_status", "id_doc_url",
            "rating_avg", "rating_count", "is_featured",
            "services", "availability", "recent_reviews", "created_at",
        )

    def get_services(self, obj):
        active = obj.services.filter(is_active=True)
        return ServiceSummarySerializer(active, many=True).data

    def get_availability(self, obj):
        slots = obj.availabilities.all().order_by("day_of_week")
        return AvailabilitySerializer(slots, many=True).data

    def get_recent_reviews(self, obj):
        from apps.reviews.models import Review
        reviews = Review.objects.filter(
            target=obj.user, is_hidden=False
        ).select_related("author").order_by("-created_at")[:5]
        return [
            {
                "author_name": r.author.full_name,
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at,
            }
            for r in reviews
        ]


class CleanerProfileUpdateSerializer(serializers.ModelSerializer):
    """Writable serializer for profile editor."""
    class Meta:
        model = CleanerProfile
        fields = ("bio", "years_experience", "service_areas", "base_hourly_rate", "portfolio_images")


class AvatarUploadSerializer(serializers.Serializer):
    avatar_url = serializers.URLField()


class PortfolioAddSerializer(serializers.Serializer):
    image_url = serializers.URLField()


class PortfolioRemoveSerializer(serializers.Serializer):
    image_url = serializers.URLField()


class CleanerStatsSerializer(serializers.Serializer):
    total_bookings = serializers.IntegerField()
    completed_bookings = serializers.IntegerField()
    pending_bookings = serializers.IntegerField()
    total_earned = serializers.DecimalField(max_digits=12, decimal_places=2)
    rating_avg = serializers.DecimalField(max_digits=3, decimal_places=2)
    rating_count = serializers.IntegerField()
    this_month_bookings = serializers.IntegerField()
    this_month_earned = serializers.DecimalField(max_digits=12, decimal_places=2)


class AvailabilityBulkSerializer(serializers.Serializer):
    """Replace a cleaner's full weekly availability in one call."""
    slots = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=True,
    )

    def validate_slots(self, slots):
        for slot in slots:
            if "day_of_week" not in slot or "start_time" not in slot or "end_time" not in slot:
                raise serializers.ValidationError("Each slot needs day_of_week, start_time, end_time.")
        return slots


# ── Onboarding wizard ────────────────────────────────────────────────────────

class OnboardingStep1Serializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)


class OnboardingStep2Serializer(serializers.Serializer):
    id_doc_url = serializers.URLField()


class OnboardingStep3Serializer(serializers.ModelSerializer):
    class Meta:
        model = CleanerProfile
        fields = ("bio", "years_experience", "service_areas")


class OnboardingStep4Serializer(serializers.ModelSerializer):
    class Meta:
        model = CleanerProfile
        fields = ("base_hourly_rate",)


# ── Customer ─────────────────────────────────────────────────────────────────

class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ("id", "email", "full_name", "created_at")
        read_only_fields = ("id", "created_at")


class CustomerOnboardingSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    line1 = serializers.CharField(max_length=255)
    area = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100, default="Lagos")
    state = serializers.CharField(max_length=100, default="Lagos")
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ("id", "label", "line1", "area", "city", "state", "latitude", "longitude", "is_default")
