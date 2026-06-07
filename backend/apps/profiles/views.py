from rest_framework import generics, permissions
from .models import CleanerProfile, CustomerProfile, Address, Availability, AvailabilityException
from .serializers import (
    CleanerProfileSerializer, CustomerProfileSerializer,
    AddressSerializer, AvailabilitySerializer, AvailabilityExceptionSerializer,
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
    queryset = CleanerProfile.objects.filter(is_verified=True)


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsCustomer]
    serializer_class = CustomerProfileSerializer

    def get_object(self):
        return CustomerProfile.objects.get(user=self.request.user)


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
