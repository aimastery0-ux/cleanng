from django.urls import path
from . import views

urlpatterns = [
    path("initiate/", views.InitiatePaymentView.as_view(), name="payment-initiate"),
    path("webhook/", views.FlutterwaveWebhookView.as_view(), name="flutterwave-webhook"),
    path("verify/<str:tx_ref>/", views.VerifyPaymentView.as_view(), name="payment-verify"),
    path("booking/<int:booking_id>/", views.BookingPaymentView.as_view(), name="booking-payment"),
    path("booking/<int:booking_id>/confirm/", views.ConfirmCompletionView.as_view(), name="confirm-completion"),
    path("booking/<int:booking_id>/refund/", views.RefundView.as_view(), name="payment-refund"),
]
