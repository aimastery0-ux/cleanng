from rest_framework import serializers
from .models import Payment, Payout


class PaymentSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking_id", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id", "booking_id", "flw_tx_ref", "amount", "currency",
            "status", "method", "paid_at", "released_at", "refunded_at",
            "created_at",
        )
        read_only_fields = fields


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = (
            "id", "booking", "amount", "status",
            "flw_transfer_ref", "failure_reason", "processed_at",
        )
        read_only_fields = fields
