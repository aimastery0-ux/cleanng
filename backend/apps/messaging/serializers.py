from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "booking", "sender", "sender_name", "body", "sent_at", "read_at")
        read_only_fields = ("id", "sender", "sent_at")
