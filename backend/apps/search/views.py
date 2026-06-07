from rest_framework import generics, permissions
from rest_framework.response import Response
from apps.profiles.models import CleanerProfile
from apps.profiles.serializers import CleanerProfileSerializer
import math


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(float(lat1))) * math.cos(math.radians(float(lat2))) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


class CleanerSearchView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CleanerProfileSerializer

    def get(self, request):
        qs = CleanerProfile.objects.filter(
            is_verified=True,
            verification_status="APPROVED",
        ).select_related("user")

        service_type = request.query_params.get("type")
        if service_type:
            qs = qs.filter(services__type=service_type, services__is_active=True).distinct()

        min_rating = request.query_params.get("min_rating")
        if min_rating:
            qs = qs.filter(rating_avg__gte=min_rating)

        max_rate = request.query_params.get("max_rate")
        if max_rate:
            qs = qs.filter(base_hourly_rate__lte=max_rate)

        sort = request.query_params.get("sort", "featured")
        if sort == "rating":
            qs = qs.order_by("-rating_avg")
        elif sort == "price":
            qs = qs.order_by("base_hourly_rate")
        else:
            qs = qs.order_by("-is_featured", "-rating_avg")

        serializer = self.get_serializer(qs[:50], many=True)
        return Response({"results": serializer.data, "count": len(serializer.data)})
