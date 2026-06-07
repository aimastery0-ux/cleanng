from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from apps.accounts.permissions import IsAdminUser
from apps.profiles.models import CleanerProfile
from apps.bookings.models import Booking, Dispute
from apps.payments.models import Payment, Payout


class PendingCleanersView(generics.ListAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        pending = CleanerProfile.objects.filter(
            verification_status=CleanerProfile.VerificationStatus.PENDING
        ).select_related("user").values(
            "id", "user__email", "user__first_name", "user__last_name",
            "bio", "years_experience", "id_doc_url", "created_at"
        )
        return Response(list(pending))


class ApproveCleanerView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        profile = CleanerProfile.objects.get(pk=pk)
        profile.verification_status = CleanerProfile.VerificationStatus.APPROVED
        profile.is_verified = True
        profile.save()
        return Response({"detail": "Cleaner approved."})


class RejectCleanerView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        profile = CleanerProfile.objects.get(pk=pk)
        profile.verification_status = CleanerProfile.VerificationStatus.REJECTED
        profile.is_verified = False
        profile.rejection_reason = request.data.get("reason", "")
        profile.save()
        return Response({"detail": "Cleaner rejected."})


class DisputeListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        disputes = Dispute.objects.select_related("booking", "raised_by").order_by("-created_at")[:50]
        data = [
            {
                "id": d.id,
                "booking_id": d.booking_id,
                "raised_by": d.raised_by.email,
                "reason": d.reason,
                "status": d.status,
                "created_at": d.created_at,
            }
            for d in disputes
        ]
        return Response(data)


class ResolveDisputeView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        dispute = Dispute.objects.get(pk=pk)
        resolution = request.data.get("resolution", "")
        outcome = request.data.get("outcome", "COMPLETED")

        dispute.status = Dispute.Status.RESOLVED
        dispute.resolution = resolution
        dispute.resolved_by = request.user
        dispute.save()

        from apps.bookings.services import transition_booking
        transition_booking(dispute.booking, outcome, request.user)

        return Response({"detail": "Dispute resolved."})


class AnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        bookings = Booking.objects.all()
        payments = Payment.objects.filter(status__in=["HELD_IN_ESCROW", "RELEASED"])

        data = {
            "total_bookings": bookings.count(),
            "completed_bookings": bookings.filter(status="COMPLETED").count(),
            "pending_bookings": bookings.filter(status="PENDING").count(),
            "active_cleaners": CleanerProfile.objects.filter(is_verified=True).count(),
            "gmv": payments.aggregate(total=Sum("amount"))["total"] or 0,
            "completion_rate": (
                round(bookings.filter(status="COMPLETED").count() / max(bookings.count(), 1) * 100, 1)
            ),
        }
        return Response(data)


class PayoutReconciliationView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        payouts = Payout.objects.values("status").annotate(count=Count("id"), total=Sum("amount"))
        return Response(list(payouts))
