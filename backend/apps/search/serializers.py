from rest_framework import serializers
from apps.profiles.models import CleanerProfile


class CleanerSearchSerializer(serializers.ModelSerializer):
    """Lean serializer for search result cards — no nested reviews to keep responses fast."""
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    avatar_url = serializers.URLField(source="user.avatar_url", read_only=True)
    active_service_types = serializers.SerializerMethodField()
    availability_days = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = CleanerProfile
        fields = (
            "id",
            "full_name",
            "avatar_url",
            "bio",
            "years_experience",
            "service_areas",
            "base_hourly_rate",
            "is_verified",
            "is_featured",
            "rating_avg",
            "rating_count",
            "active_service_types",
            "availability_days",
            "distance_km",
        )

    def get_active_service_types(self, obj):
        return list(
            obj.services.filter(is_active=True)
            .values_list("type", flat=True)
            .distinct()
        )

    def get_availability_days(self, obj):
        return list(obj.availabilities.values_list("day_of_week", flat=True).order_by("day_of_week"))

    def get_distance_km(self, obj):
        # Injected per-object in the view after haversine calculation
        return None
