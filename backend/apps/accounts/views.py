from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema

from .models import User
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    PasswordChangeSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, SendOTPSerializer, VerifyOTPSerializer,
    EmailVerifySerializer,
)
from .services import (
    create_and_send_otp, verify_otp,
    send_verification_email, verify_email_token,
    send_password_reset_email, reset_password_with_token,
)


class AuthThrottle(AnonRateThrottle):
    rate = "10/minute"


@extend_schema(tags=["auth"])
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["auth"])
class LoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            }
        )


@extend_schema(tags=["auth"])
class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logged out successfully."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["auth"])
class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


@extend_schema(tags=["auth"])
class PasswordChangeView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PasswordChangeSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed successfully."})


@extend_schema(tags=["auth"])
class SendOTPView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SendOTPSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        sent = create_and_send_otp(request.user, phone)
        if sent:
            return Response({"detail": "OTP sent."})
        return Response({"detail": "Failed to send OTP."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@extend_schema(tags=["auth"])
class VerifyOTPView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VerifyOTPSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        code = serializer.validated_data["code"]

        if verify_otp(phone, code):
            request.user.phone = phone
            request.user.is_phone_verified = True
            request.user.save(update_fields=["phone", "is_phone_verified"])
            return Response({"detail": "Phone verified successfully."})
        return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["auth"])
class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        send_password_reset_email(serializer.validated_data["email"])
        return Response({"detail": "If that email exists, a reset link has been sent."})


@extend_schema(tags=["auth"])
class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        success = reset_password_with_token(
            serializer.validated_data["token"],
            serializer.validated_data["new_password"],
        )
        if success:
            return Response({"detail": "Password reset successfully."})
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["auth"])
class EmailVerifyView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = EmailVerifySerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = verify_email_token(serializer.validated_data["token"])
        if user:
            return Response({"detail": "Email verified successfully."})
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["auth"])
class ResendVerificationEmailView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.is_email_verified:
            return Response({"detail": "Email already verified."})
        send_verification_email(request.user)
        return Response({"detail": "Verification email sent."})


@extend_schema(tags=["auth"])
class GoogleAuthView(generics.GenericAPIView):
    """Exchange a Google ID token for CleanNG JWT tokens."""
    permission_classes = [AllowAny]

    def post(self, request):
        import requests as http_requests
        id_token = request.data.get("id_token")
        role = request.data.get("role", "CUSTOMER")

        if not id_token:
            return Response({"detail": "id_token required."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify token with Google
        resp = http_requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
            timeout=10,
        )
        if resp.status_code != 200:
            return Response({"detail": "Invalid Google token."}, status=status.HTTP_400_BAD_REQUEST)

        google_data = resp.json()
        email = google_data.get("email")
        if not email or not google_data.get("email_verified"):
            return Response({"detail": "Email not verified by Google."}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": google_data.get("given_name", ""),
                "last_name": google_data.get("family_name", ""),
                "avatar_url": google_data.get("picture", ""),
                "is_email_verified": True,
                "role": role if role in ("CUSTOMER", "CLEANER") else "CUSTOMER",
            },
        )

        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])

        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user).data,
            "tokens": {"access": str(refresh.access_token), "refresh": str(refresh)},
            "created": created,
        })


@extend_schema(tags=["health"])
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "service": "CleanNG API"})
