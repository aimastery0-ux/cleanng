import math
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.profiles.models import CleanerProfile
from .serializers import CleanerSearchSerializer


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(float(lat1)))
         * math.cos(math.radians(float(lat2)))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


class CleanerSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = CleanerProfile.objects.filter(
            is_verified=True,
            verification_status="APPROVED",
        ).select_related("user").prefetch_related("services", "availabilities")

        # --- Filters ---

        service_type = request.query_params.get("type")
        if service_type:
            qs = qs.filter(
                services__type=service_type,
                services__is_active=True,
            ).distinct()

        area = request.query_params.get("area")
        if area:
            qs = qs.filter(service_areas__icontains=area)

        min_rating = request.query_params.get("min_rating")
        if min_rating:
            try:
                qs = qs.filter(rating_avg__gte=float(min_rating))
            except ValueError:
                pass

        min_price = request.query_params.get("min_price")
        if min_price:
            try:
                qs = qs.filter(base_hourly_rate__gte=float(min_price))
            except ValueError:
                pass

        max_price = request.query_params.get("max_price")
        if max_price:
            try:
                qs = qs.filter(base_hourly_rate__lte=float(max_price))
            except ValueError:
                pass

        available_day = request.query_params.get("available_day")
        if available_day is not None:
            try:
                qs = qs.filter(availabilities__day_of_week=int(available_day)).distinct()
            except (ValueError, TypeError):
                pass

        # --- Sort ---

        sort = request.query_params.get("sort", "featured")
        if sort == "rating":
            qs = qs.order_by("-rating_avg", "-rating_count")
        elif sort == "price_asc":
            qs = qs.order_by("base_hourly_rate")
        elif sort == "price_desc":
            qs = qs.order_by("-base_hourly_rate")
        else:
            qs = qs.order_by("-is_featured", "-rating_avg")

        profiles = list(qs[:100])

        # --- Distance filter (post-query, haversine via cleaner's default address) ---

        user_lat = request.query_params.get("lat")
        user_lng = request.query_params.get("lng")
        radius_km = float(request.query_params.get("radius", 30))

        # Build a map of cleaner_user_id → (lat, lng) from their default addresses
        if user_lat and user_lng:
            from apps.profiles.models import Address
            user_ids = [p.user_id for p in profiles]
            addr_map: dict[int, tuple] = {}
            for addr in Address.objects.filter(user_id__in=user_ids, is_default=True).only("user_id", "latitude", "longitude"):
                if addr.latitude and addr.longitude:
                    addr_map[addr.user_id] = (addr.latitude, addr.longitude)

            filtered = []
            distances: dict[int, float | None] = {}
            for p in profiles:
                coords = addr_map.get(p.user_id)
                if coords:
                    d = haversine_km(user_lat, user_lng, coords[0], coords[1])
                    if d <= radius_km:
                        distances[p.id] = round(d, 1)
                        filtered.append(p)
                else:
                    # No address on file — include with unknown distance
                    distances[p.id] = None
                    filtered.append(p)

            if sort == "distance":
                filtered.sort(key=lambda p: (distances[p.id] is None, distances[p.id] or 9999))
            profiles = filtered
        else:
            distances: dict[int, float | None] = {p.id: None for p in profiles}

        # --- Pagination ---

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(50, max(1, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page, page_size = 1, 20

        total = len(profiles)
        start = (page - 1) * page_size
        page_profiles = profiles[start:start + page_size]

        # --- Serialize ---

        results = []
        for p in page_profiles:
            data = CleanerSearchSerializer(p, context={"request": request}).data
            data["distance_km"] = distances.get(p.id)
            results.append(data)

        return Response({
            "results": results,
            "count": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if page_size else 1,
        })
