from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Booking, Dispute
from .serializers import BookingSerializer, DisputeSerializer
from apps.messaging.models import Message
from apps.messaging.serializers import MessageSerializer
from apps.accounts.permissions import IsCustomer, IsCleaner


class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "CUSTOMER":
            return Booking.objects.filter(customer=user).select_related("cleaner__user", "service")
        elif user.role == "CLEANER":
            return Booking.objects.filter(cleaner__user=user).select_related("customer", "service")
        return Booking.objects.none()

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        return Booking.objects.filter(Q(customer=user) | Q(cleaner__user=user))


class BookingTransitionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    target_status = None

    def post(self, request, pk):
        from .services import transition_booking
        try:
            booking = Booking.objects.get(pk=pk)
            transition_booking(booking, self.target_status, request.user)
            return Response(BookingSerializer(booking).data)
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BookingAcceptView(BookingTransitionView):
    target_status = Booking.Status.ACCEPTED


class BookingDeclineView(BookingTransitionView):
    target_status = Booking.Status.CANCELLED


class BookingStartView(BookingTransitionView):
    target_status = Booking.Status.IN_PROGRESS


class BookingCompleteView(BookingTransitionView):
    target_status = Booking.Status.COMPLETED


class BookingCancelView(BookingTransitionView):
    target_status = Booking.Status.CANCELLED


class DisputeCreateView(generics.CreateAPIView):
    serializer_class = DisputeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        booking = Booking.objects.get(pk=self.kwargs["pk"])
        serializer.save(booking=booking, raised_by=self.request.user)


class BookingMessagesView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        booking_id = self.kwargs["pk"]
        booking = Booking.objects.filter(
            pk=booking_id
        ).filter(Q(customer=user) | Q(cleaner__user=user)).first()
        if not booking:
            return Message.objects.none()
        return Message.objects.filter(booking=booking)
