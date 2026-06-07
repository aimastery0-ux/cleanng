import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.booking_id = self.scope["url_route"]["kwargs"]["booking_id"]
        self.room_group_name = f"booking_{self.booking_id}_chat"
        user = self.scope["user"]

        if not user.is_authenticated:
            await self.close()
            return

        if not await self.user_has_access(user, self.booking_id):
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Mark presence
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "presence_update", "user_id": user.id, "online": True},
        )

    async def disconnect(self, close_code):
        user = self.scope["user"]
        if user.is_authenticated:
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "presence_update", "user_id": user.id, "online": False},
            )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get("type", "message")

        if message_type == "message":
            user = self.scope["user"]
            body = data.get("body", "").strip()
            if not body:
                return

            message = await self.save_message(user, self.booking_id, body)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message_id": message.id,
                    "sender_id": user.id,
                    "sender_name": user.full_name,
                    "body": body,
                    "sent_at": message.sent_at.isoformat(),
                },
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({"type": "message", **event}))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({"type": "presence", **event}))

    @database_sync_to_async
    def user_has_access(self, user, booking_id):
        from apps.bookings.models import Booking
        return Booking.objects.filter(
            id=booking_id
        ).filter(
            models.Q(customer=user) | models.Q(cleaner__user=user)
        ).exists()

    @database_sync_to_async
    def save_message(self, user, booking_id, body):
        from .models import Message
        return Message.objects.create(
            booking_id=booking_id,
            sender=user,
            body=body,
        )
