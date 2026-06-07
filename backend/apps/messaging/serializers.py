from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_avatar = serializers.URLField(source="sender.avatar_url", read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "booking", "sender", "sender_name", "sender_avatar", "is_mine", "body", "sent_at", "read_at")
        read_only_fields = ("id", "sender", "sent_at")

    def get_is_mine(self, obj) -> bool:
        request = self.context.get("request")
        if not request:
            return False
        return obj.sender_id == request.user.id
