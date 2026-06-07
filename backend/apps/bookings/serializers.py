from rest_framework import serializers
from .models import Booking, Dispute


class BookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    cleaner_name = serializers.CharField(source="cleaner.user.full_name", read_only=True)
    service_title = serializers.CharField(source="service.title", read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id", "customer", "customer_name", "cleaner", "cleaner_name",
            "service", "service_title", "address",
            "scheduled_date", "scheduled_time", "status",
            "total_amount", "commission_amount", "payout_amount",
            "notes", "created_at",
        )
        read_only_fields = ("id", "status", "commission_amount", "payout_amount", "created_at")


class DisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = ("id", "booking", "raised_by", "reason", "description", "status", "resolution", "created_at")
        read_only_fields = ("id", "raised_by", "status", "resolution", "created_at")
