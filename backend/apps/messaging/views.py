from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Message
from .serializers import MessageSerializer
from apps.bookings.models import Booking


class MessageHistoryView(APIView):
    """GET message history for a booking. Marks unread messages as read."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.select_related("customer", "cleaner__user").get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        if booking.customer != request.user and booking.cleaner.user != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        messages = Message.objects.filter(booking=booking).select_related("sender").order_by("sent_at")

        # Mark messages from the other party as read
        Message.objects.filter(
            booking=booking, read_at__isnull=True
        ).exclude(sender=request.user).update(read_at=timezone.now())

        serializer = MessageSerializer(messages, many=True, context={"request": request})
        return Response(serializer.data)
