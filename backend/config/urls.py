from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path("django-admin/", admin.site.urls),

    # OpenAPI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # App APIs
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/profiles/", include("apps.profiles.urls")),
    path("api/v1/services/", include("apps.services.urls")),
    path("api/v1/search/", include("apps.search.urls")),
    path("api/v1/bookings/", include("apps.bookings.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/messages/", include("apps.messaging.urls")),
    path("api/v1/reviews/", include("apps.reviews.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/admin-panel/", include("apps.admin_panel.urls")),

    # Social auth
    path("auth/social/", include("social_django.urls", namespace="social")),
]
