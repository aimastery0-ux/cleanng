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
        read_only_fields = ("id", "is_verified", "verification_status", "rating_avg", "rating_count", "is_featured", "created_at")


class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ("id", "email", "full_name", "created_at")
        read_only_fields = ("id", "created_at")


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
