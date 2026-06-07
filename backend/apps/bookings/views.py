from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, Dispute
from .serializers import (
    BookingSerializer, CreateBookingSerializer,
    CancelBookingSerializer, DisputeSerializer,
)
from .services import transition_booking, check_cancellation_allowed
from apps.accounts.permissions import IsCustomer, IsCleaner


def _get_booking_or_404(pk, user):
    try:
        return Booking.objects.select_related(
            "customer", "cleaner__user", "service", "address"
        ).prefetch_related("status_logs__actor").get(
            pk=pk
        )
    except Booking.DoesNotExist:
        return None


def _user_owns_booking(booking, user):
    return booking.customer == user or booking.cleaner.user == user


class BookingListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == "CUSTOMER":
            qs = Booking.objects.filter(customer=user)
        elif user.role == "CLEANER":
            qs = Booking.objects.filter(cleaner__user=user)
        else:
            qs = Booking.objects.none()

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        qs = qs.select_related(
            "customer", "cleaner__user", "service", "address"
        ).prefetch_related("status_logs__actor").order_by("-created_at")

        return Response(BookingSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role != "CUSTOMER":
            return Response(
                {"detail": "Only customers can create bookings."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = CreateBookingSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.create_booking(customer=request.user)
        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )


class BookingDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        booking = _get_booking_or_404(pk, request.user)
        if not booking or not _user_owns_booking(booking, request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BookingSerializer(booking).data)


# ── Transition endpoints ─────────────────────────────────────────────────────

class BookingAcceptView(APIView):
    """Cleaner only."""
    permission_classes = [IsCleaner]

    def post(self, request, pk):
        booking = _get_booking_or_404(pk, request.user)
        if not booking or booking.cleaner.user != request.user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            booking = transition_booking(booking, Booking.Status.ACCEPTED, request.user)
            return Response(BookingSerializer(booking).data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BookingDeclineView(APIView):
    """Cleaner declines a PENDING booking."""
    permission_classes = [IsCleaner]

    def post(self, request, pk):
        booking = _get_booking_or_404(pk, request.user)
        if not booking or booking.cleaner.user != request.user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if booking.status != Booking.Status.PENDING:
            return Response(
                {"detail": "Only pending bookings can be declined."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get("reason", "Cleaner declined.")
        booking.cancellation_reason = reason
        booking.save(update_fields=["cancellation_reason"])
        try:
            booking = transition_booking(
                booking, Booking.Status.CANCELLED, request.user, note=reason
            )
            return Response(BookingSerializer(booking).data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BookingStartView(APIView):
    """Cleaner marks job started (ACCEPTED → IN_PROGRESS)."""
    permission_classes = [IsCleaner]

    def post(self, request, pk):
        booking = _get_booking_or_404(pk, request.user)
        if not booking or booking.cleaner.user != request.user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            booking = transition_booking(booking, Booking.Status.IN_PROGRESS, request.user)
            return Response(BookingSerializer(booking).data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BookingCompleteView(APIView):
    """Cleaner marks job done (IN_PROGRESS → COMPLETED)."""
    permission_classes = [IsCleaner]

    def post(self, request, pk):
        booking = _get_booking_or_404(pk, request.user)
        if not booking or booking.cleaner.user != request.user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            booking = transition_booking(booking, Booking.Status.COMPLETED, request.user)
            return Response(BookingSerializer(booking).data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BookingCancelView(APIView):
    """Customer or cleaner cancels. Enforces 24h policy."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = _get_booking_or_404(pk, request.user)
        if not booking or not _user_owns_booking(booking, request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        allowed, msg = check_cancellation_allowed(booking)
        if not allowed:
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CancelBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")
        if reason:
            booking.cancellation_reason = reason
            booking.save(update_fields=["cancellation_reason"])
        try:
            booking = transition_booking(booking, Booking.Status.CANCELLED, request.user, note=reason)
            return Response(BookingSerializer(booking).data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DisputeCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = _get_booking_or_404(pk, request.user)
        if not booking or not _user_owns_booking(booking, request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = DisputeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            transition_booking(booking, Booking.Status.DISPUTED, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        dispute = serializer.save(booking=booking, raised_by=request.user)
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


class BookingMessagesView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from apps.messaging.models import Message
        user = self.request.user
        booking_id = self.kwargs["pk"]
        booking = Booking.objects.filter(
            pk=booking_id
        ).filter(Q(customer=user) | Q(cleaner__user=user)).first()
        if not booking:
            return Message.objects.none()
        return Message.objects.filter(booking=booking).select_related("sender")

    def get_serializer_class(self):
        from apps.messaging.serializers import MessageSerializer
        return MessageSerializer
