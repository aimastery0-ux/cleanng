from rest_framework import serializers
from .models import Payment, Payout


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ("id", "booking", "flw_tx_ref", "amount", "currency", "status", "method", "paid_at", "released_at")
        read_only_fields = fields


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = ("id", "cleaner", "booking", "amount", "status", "processed_at")
        read_only_fields = fields
