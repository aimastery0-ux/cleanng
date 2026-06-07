from rest_framework import serializers
from .models import CleanerProfile, CustomerProfile, Address, Availability, AvailabilityException


class CleanerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    avatar_url = serializers.URLField(source="user.avatar_url", read_only=True)

    class Meta:
        model = CleanerProfile
        fields = (
            "id", "email", "full_name", "avatar_url",
            "bio", "years_experience", "service_areas", "base_hourly_rate",
            "is_verified", "verification_status", "portfolio_images",
            "rating_avg", "rating_count", "is_featured", "created_at",
        )
        read_only_fields = (
            "id", "is_verified", "verification_status",
            "rating_avg", "rating_count", "is_featured", "created_at",
        )


# Step serializers for the onboarding wizard
class OnboardingStep1Serializer(serializers.Serializer):
    """Basic info: name + phone."""
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)


class OnboardingStep2Serializer(serializers.Serializer):
    """ID document upload URL (Cloudinary URL from frontend upload)."""
    id_doc_url = serializers.URLField()


class OnboardingStep3Serializer(serializers.ModelSerializer):
    """Bio, service areas."""
    class Meta:
        model = CleanerProfile
        fields = ("bio", "years_experience", "service_areas")


class OnboardingStep4Serializer(serializers.ModelSerializer):
    """Base rate — final step, sets profile to PENDING."""
    class Meta:
        model = CleanerProfile
        fields = ("base_hourly_rate",)


class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ("id", "email", "full_name", "created_at")
        read_only_fields = ("id", "created_at")


class CustomerOnboardingSerializer(serializers.Serializer):
    """Customer lightweight onboarding: name + default address."""
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


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ("id", "day_of_week", "start_time", "end_time")


class AvailabilityExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityException
        fields = ("id", "date", "is_available", "start_time", "end_time", "reason")
