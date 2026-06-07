from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("change-password/", views.PasswordChangeView.as_view(), name="change-password"),
    path("send-otp/", views.SendOTPView.as_view(), name="send-otp"),
    path("verify-otp/", views.VerifyOTPView.as_view(), name="verify-otp"),
    path("verify-email/", views.EmailVerifyView.as_view(), name="verify-email"),
    path("resend-verification/", views.ResendVerificationEmailView.as_view(), name="resend-verification"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("google/", views.GoogleAuthView.as_view(), name="google-auth"),
]
