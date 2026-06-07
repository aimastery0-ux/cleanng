from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import CleanerProfile, CustomerProfile, Address, Availability, AvailabilityException
from .serializers import (
    CleanerProfileSerializer, CustomerProfileSerializer, CustomerOnboardingSerializer,
    AddressSerializer, AvailabilitySerializer, AvailabilityExceptionSerializer,
    OnboardingStep1Serializer, OnboardingStep2Serializer,
    OnboardingStep3Serializer, OnboardingStep4Serializer,
)
from apps.accounts.permissions import IsCleaner, IsCustomer


class CleanerProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsCleaner]
    serializer_class = CleanerProfileSerializer

    def get_object(self):
        return CleanerProfile.objects.get(user=self.request.user)


class PublicCleanerProfileView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CleanerProfileSerializer
    queryset = CleanerProfile.objects.filter(is_verified=True).select_related("user")


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsCustomer]
    serializer_class = CustomerProfileSerializer

    def get_object(self):
        return CustomerProfile.objects.get(user=self.request.user)


# ── Cleaner onboarding wizard steps ─────────────────────────────────────────

class OnboardingStep1View(APIView):
    """Basic info: update name + phone on User."""
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
    """ID document upload URL."""
    permission_classes = [IsCleaner]

    def post(self, request):
        serializer = OnboardingStep2Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = CleanerProfile.objects.get(user=request.user)
        profile.id_doc_url = serializer.validated_data["id_doc_url"]
        profile.save(update_fields=["id_doc_url"])
        return Response({"detail": "Step 2 saved.", "step": 2})


class OnboardingStep3View(APIView):
    """Bio + service areas."""
    permission_classes = [IsCleaner]

    def post(self, request):
        profile = CleanerProfile.objects.get(user=request.user)
        serializer = OnboardingStep3Serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Step 3 saved.", "step": 3})


class OnboardingStep4View(APIView):
    """Base rate — completes onboarding, marks profile PENDING."""
    permission_classes = [IsCleaner]

    def post(self, request):
        profile = CleanerProfile.objects.get(user=request.user)
        serializer = OnboardingStep4Serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        # Mark as submitted for review
        profile.verification_status = CleanerProfile.VerificationStatus.PENDING
        profile.save(update_fields=["verification_status"])
        return Response({"detail": "Onboarding complete. Your profile is under review.", "step": 4})


class OnboardingStatusView(APIView):
    """Returns current cleaner onboarding progress."""
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
            step = 5  # complete

        return Response({
            "current_step": step,
            "verification_status": profile.verification_status,
            "is_verified": profile.is_verified,
        })


# ── Customer onboarding ──────────────────────────────────────────────────────

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
            user=user,
            label="Home",
            line1=d["line1"],
            area=d.get("area", ""),
            city=d.get("city", "Lagos"),
            state=d.get("state", "Lagos"),
            latitude=d.get("latitude"),
            longitude=d.get("longitude"),
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


# ── Availability ─────────────────────────────────────────────────────────────

class AvailabilityView(generics.ListCreateAPIView):
    permission_classes = [IsCleaner]
    serializer_class = AvailabilitySerializer

    def get_queryset(self):
        return Availability.objects.filter(cleaner__user=self.request.user)

    def perform_create(self, serializer):
        profile = CleanerProfile.objects.get(user=self.request.user)
        serializer.save(cleaner=profile)


class AvailabilityExceptionView(generics.ListCreateAPIView):
    permission_classes = [IsCleaner]
    serializer_class = AvailabilityExceptionSerializer

    def get_queryset(self):
        return AvailabilityException.objects.filter(cleaner__user=self.request.user)

    def perform_create(self, serializer):
        profile = CleanerProfile.objects.get(user=self.request.user)
        serializer.save(cleaner=profile)
