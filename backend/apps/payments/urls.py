from django.urls import path
from . import views

urlpatterns = [
    path("initiate/", views.InitiatePaymentView.as_view(), name="payment-initiate"),
    path("webhook/", views.FlutterwaveWebhookView.as_view(), name="flutterwave-webhook"),
    path("verify/<str:tx_ref>/", views.VerifyPaymentView.as_view(), name="payment-verify"),
]
