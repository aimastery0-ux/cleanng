from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CleanerProfile, CustomerProfile, Address, Availability, AvailabilityException
from .serializers import (
    CleanerProfileSerializer, CleanerProfileUpdateSerializer,
    AvatarUploadSerializer, PortfolioAddSerializer, PortfolioRemoveSerializer,
    CleanerStatsSerializer, AvailabilityBulkSerializer,
    CustomerProfileSerializer, CustomerOnboardingSerializer,
    AddressSerializer, AvailabilitySerializer, AvailabilityExceptionSerializer,
    OnboardingStep1Serializer, OnboardingStep2Serializer,
    OnboardingStep3Serializer, OnboardingStep4Serializer,
)
from apps.accounts.permissions import IsCleaner, IsCustomer


# ── Cleaner profile ──────────────────────────────────────────────────────────

class CleanerProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsCleaner]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return CleanerProfileUpdateSerializer
        return CleanerProfileSerializer

    def get_object(self):
        return CleanerProfile.objects.select_related("user").prefetch_related(
            "services", "availabilities"
        ).get(user=self.request.user)


class PublicCleanerProfileView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CleanerProfileSerializer
    queryset = CleanerProfile.objects.filter(
        is_verified=True
    ).select_related("user").prefetch_related("services", "availabilities")


class AvatarUploadView(APIView):
    permission_classes = [IsCleaner]

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.avatar_url = serializer.validated_data["avatar_url"]
        request.user.save(update_fields=["avatar_url"])
        return Response({"avatar_url": request.user.avatar_url})


class PortfolioAddView(APIView):
    permission_classes = [IsCleaner]

    def post(self, request):
        serializer = PortfolioAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = CleanerProfile.objects.get(user=request.user)
        url = serializer.validated_data["image_url"]
        if len(profile.portfolio_images) >= 10:
            return Response({"detail": "Maximum 10 portfolio images."}, status=status.HTTP_400_BAD_REQUEST)
        if url not in profile.portfolio_images:
            profile.portfolio_images = profile.portfolio_images + [url]
            profile.save(update_fields=["portfolio_images"])
        return Response({"portfolio_images": profile.portfolio_images})


class PortfolioRemoveView(APIView):
    permission_classes = [IsCleaner]

    def post(self, request):
        serializer = PortfolioRemoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = CleanerProfile.objects.get(user=request.user)
        url = serializer.validated_data["image_url"]
        profile.portfolio_images = [img for img in profile.portfolio_images if img != url]
        profile.save(update_fields=["portfolio_images"])
        return Response({"portfolio_images": profile.portfolio_images})


class CleanerStatsView(APIView):
    permission_classes = [IsCleaner]

    def get(self, request):
        from apps.bookings.models import Booking
        from apps.payments.models import Payout

        profile = CleanerProfile.objects.get(user=request.user)
        bookings = Booking.objects.filter(cleaner=profile)

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_bookings = bookings.filter(created_at__gte=month_start)

        total_earned = Payout.objects.filter(
            cleaner=profile, status="SUCCESS"
        ).aggregate(total=Sum("amount"))["total"] or 0

        month_earned = Payout.objects.filter(
            cleaner=profile, status="SUCCESS", processed_at__gte=month_start
        ).aggregate(total=Sum("amount"))["total"] or 0

        data = {
            "total_bookings": bookings.count(),
            "completed_bookings": bookings.filter(status="COMPLETED").count(),
            "pending_bookings": bookings.filter(status__in=["PENDING", "ACCEPTED"]).count(),
            "total_earned": total_earned,
            "rating_avg": profile.rating_avg,
            "rating_count": profile.rating_count,
            "this_month_bookings": month_bookings.count(),
            "this_month_earned": month_earned,
        }
        return Response(CleanerStatsSerializer(data).data)


# ── Availability ─────────────────────────────────────────────────────────────

class AvailabilityView(generics.ListCreateAPIView):
    permission_classes = [IsCleaner]
    serializer_class = AvailabilitySerializer

    def get_queryset(self):
        return Availability.objects.filter(cleaner__user=self.request.user).order_by("day_of_week")

    def perform_create(self, serializer):
        profile = CleanerProfile.objects.get(user=self.request.user)
        serializer.save(cleaner=profile)


class AvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsCleaner]
    serializer_class = AvailabilitySerializer

    def get_queryset(self):
        return Availability.objects.filter(cleaner__user=self.request.user)


class AvailabilityBulkView(APIView):
    """Replace all weekly slots atomically."""
    permission_classes = [IsCleaner]

    def put(self, request):
        serializer = AvailabilityBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = CleanerProfile.objects.get(user=request.user)
        slots = serializer.validated_data["slots"]

        Availability.objects.filter(cleaner=profile).delete()
        created = []
        for slot in slots:
            obj = Availability.objects.create(
                cleaner=profile,
                day_of_week=slot["day_of_week"],
                start_time=slot["start_time"],
                end_time=slot["end_time"],
            )
            created.append(obj)

        return Response(AvailabilitySerializer(created, many=True).data)


class AvailabilityExceptionView(generics.ListCreateAPIView):
    permission_classes = [IsCleaner]
    serializer_class = AvailabilityExceptionSerializer

    def get_queryset(self):
        return AvailabilityException.objects.filter(cleaner__user=self.request.user)

    def perform_create(self, serializer):
        profile = CleanerProfile.objects.get(user=self.request.user)
        serializer.save(cleaner=profile)


class AvailabilityExceptionDetailView(generics.DestroyAPIView):
    permission_classes = [IsCleaner]
    serializer_class = AvailabilityExceptionSerializer

    def get_queryset(self):
        return AvailabilityException.objects.filter(cleaner__user=self.request.user)


# ── Customer profile ─────────────────────────────────────────────────────────

class CustomerProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsCustomer]
    serializer_class = CustomerProfileSerializer

    def get_object(self):
        return CustomerProfile.objects.get(user=self.request.user)


class CustomerOnboardingView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = CustomerOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        user = request.user
        user.first_name = d["first_name"]
        user.last_name = d["last_name"]
        user.save(update_fields=["first_name", "last_name"])
        CustomerProfile.objects.get_or_create(user=user)
        Address.objects.create(
            user=user, label="Home",
            line1=d["line1"], area=d.get("area", ""),
            city=d.get("city", "Lagos"), state=d.get("state", "Lagos"),
            latitude=d.get("latitude"), longitude=d.get("longitude"),
            is_default=True,
        )
        return Response({"detail": "Onboarding complete."})


# ── Addresses ────────────────────────────────────────────────────────────────

class AddressListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)


# ── Onboarding wizard ────────────────────────────────────────────────────────

class OnboardingStep1View(APIView):
    permission_classes = [IsCleaner]

    def post(self, request):
        serializer = OnboardingStep1Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.first_name = serializer.validated_data["first_name"]
        user.last_name = serializer.validated_data["last_name"]
        user.phone = serializer.validated_data["phone"]
        user.save(update_fields=["first_name", "last_name", "phone"])
        return Response({"detail": "Step 1 saved.", "step": 1})


class OnboardingStep2View(APIView):
    permission_classes = [IsCleaner]

    def post(self, request):
        serializer = OnboardingStep2Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = CleanerProfile.objects.get(user=request.user)
        profile.id_doc_url = serializer.validated_data["id_doc_url"]
        profile.save(update_fields=["id_doc_url"])
        return Response({"detail": "Step 2 saved.", "step": 2})


class OnboardingStep3View(APIView):
    permission_classes = [IsCleaner]

    def post(self, request):
        profile = CleanerProfile.objects.get(user=request.user)
        serializer = OnboardingStep3Serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Step 3 saved.", "step": 3})


class OnboardingStep4View(APIView):
    permission_classes = [IsCleaner]

    def post(self, request):
        profile = CleanerProfile.objects.get(user=request.user)
        serializer = OnboardingStep4Serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        profile.verification_status = CleanerProfile.VerificationStatus.PENDING
        profile.save(update_fields=["verification_status"])
        return Response({"detail": "Onboarding complete. Your profile is under review.", "step": 4})


class OnboardingStatusView(APIView):
    permission_classes = [IsCleaner]

    def get(self, request):
        profile = CleanerProfile.objects.get(user=request.user)
        user = request.user
        step = 1
        if user.first_name and user.phone:
            step = 2
        if profile.id_doc_url:
            step = 3
        if profile.bio and profile.service_areas:
            step = 4
        if profile.base_hourly_rate > 0:
            step = 5
        return Response({
            "current_step": step,
            "verification_status": profile.verification_status,
            "is_verified": profile.is_verified,
        })
