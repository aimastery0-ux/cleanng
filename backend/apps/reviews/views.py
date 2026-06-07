from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Review
from .serializers import ReviewSerializer, CreateReviewSerializer
from apps.bookings.models import Booking
from apps.accounts.permissions import IsCustomer


class CreateReviewView(APIView):
    """Customer submits a review for a completed booking."""
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        review = Review.objects.create(
            booking=d["_booking"],
            author=request.user,
            target=d["_target"],
            rating=d["rating"],
            comment=d.get("comment", ""),
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class CleanerReviewsView(generics.ListAPIView):
    """Public list of reviews for a cleaner (by cleaner profile pk)."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        cleaner_pk = self.kwargs["cleaner_pk"]
        return Review.objects.filter(
            target__cleaner_profile__pk=cleaner_pk,
            is_hidden=False,
        ).select_related("author").order_by("-created_at")


class BookingReviewView(APIView):
    """Get the review written for a specific booking (if any)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.select_related("customer", "cleaner__user").get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if booking.customer != request.user and booking.cleaner.user != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        review = Review.objects.filter(booking=booking).select_related("author").first()
        if not review:
            return Response({"review": None, "can_review": self._can_review(booking, request.user)})

        return Response({
            "review": ReviewSerializer(review).data,
            "can_review": False,
        })

    def _can_review(self, booking, user):
        return (
            booking.status == Booking.Status.COMPLETED
            and booking.customer == user
            and not Review.objects.filter(booking=booking, author=user).exists()
        )
