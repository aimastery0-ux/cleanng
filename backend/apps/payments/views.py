import requests
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Payment, Payout
from .serializers import PaymentSerializer, PayoutSerializer
from .services import process_webhook, initiate_payment, release_payout
from apps.bookings.models import Booking
from apps.bookings.services import transition_booking
from apps.accounts.permissions import IsCustomer


class InitiatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get("booking_id")
        if not booking_id:
            return Response({"detail": "booking_id required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = initiate_payment(int(booking_id), request.user)
            return Response(result)
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class FlutterwaveWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        verif_hash = request.headers.get("verif-hash", "")
        if verif_hash != settings.FLW_WEBHOOK_HASH:
            return Response({"detail": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED)

        process_webhook.delay(request.data)
        return Response({"status": "ok"})


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, tx_ref):
        payment = Payment.objects.filter(flw_tx_ref=tx_ref).first()
        if not payment:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if payment.booking.customer != request.user and payment.booking.cleaner.user != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        return Response(PaymentSerializer(payment).data)


class BookingPaymentView(APIView):
    """Get payment + payout status for a booking."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.select_related("customer", "cleaner__user").get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        if booking.customer != request.user and booking.cleaner.user != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        result: dict = {"booking_id": booking_id, "payment": None, "payout": None}

        payment = Payment.objects.filter(booking=booking).first()
        if payment:
            result["payment"] = PaymentSerializer(payment).data

        payout = Payout.objects.filter(booking=booking).first()
        if payout:
            result["payout"] = PayoutSerializer(payout).data

        return Response(result)


class ConfirmCompletionView(APIView):
    """Customer confirms the job is done → triggers cleaner payout."""
    permission_classes = [IsCustomer]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.select_related(
                "customer", "cleaner__user", "payment"
            ).get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        if booking.customer != request.user:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        if booking.status != Booking.Status.COMPLETED:
            return Response(
                {"detail": "Booking must be in COMPLETED status before you can confirm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = getattr(booking, "payment", None)
        if not payment or payment.status != Payment.Status.HELD_IN_ESCROW:
            return Response(
                {"detail": "No payment held in escrow for this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        release_payout.delay(booking_id)
        return Response({"detail": "Payout initiated. Funds will be released to the cleaner shortly."})


class RefundView(APIView):
    """Admin-only: issue a full refund for a held payment."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.select_related("payment").get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        payment = getattr(booking, "payment", None)
        if not payment:
            return Response({"detail": "No payment for this booking."}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != Payment.Status.HELD_IN_ESCROW:
            return Response(
                {"detail": "Payment must be held in escrow to issue a refund."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        headers = {"Authorization": f"Bearer {settings.FLW_SECRET_KEY}", "Content-Type": "application/json"}
        payload = {
            "id": payment.flw_transaction_id,
            "amount": str(payment.amount),
        }
        try:
            resp = requests.post(
                "https://api.flutterwave.com/v3/transactions/refund",
                json=payload,
                headers=headers,
                timeout=15,
            )
            result = resp.json()
            if result.get("status") == "success":
                from django.utils import timezone
                payment.status = Payment.Status.REFUNDED
                payment.refunded_at = timezone.now()
                payment.save(update_fields=["status", "refunded_at"])
                transition_booking(booking, Booking.Status.CANCELLED, request.user, note="Admin refund")
                return Response({"detail": "Refund issued successfully."})
            return Response(
                {"detail": result.get("message", "Refund failed.")},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
