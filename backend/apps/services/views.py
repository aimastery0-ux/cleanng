from rest_framework import generics, permissions
from .models import Service
from .serializers import ServiceSerializer
from apps.accounts.permissions import IsCleaner
from apps.profiles.models import CleanerProfile


class ServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsCleaner]

    def get_queryset(self):
        return Service.objects.filter(cleaner__user=self.request.user)

    def perform_create(self, serializer):
        profile = CleanerProfile.objects.get(user=self.request.user)
        serializer.save(cleaner=profile)


class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsCleaner]

    def get_queryset(self):
        return Service.objects.filter(cleaner__user=self.request.user)
