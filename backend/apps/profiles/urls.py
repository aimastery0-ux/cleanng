from django.urls import path
from . import views

urlpatterns = [
    # Cleaner profile
    path("cleaner/", views.CleanerProfileView.as_view(), name="cleaner-profile"),
    path("cleaner/<int:pk>/", views.PublicCleanerProfileView.as_view(), name="public-cleaner-profile"),

    # Cleaner onboarding wizard
    path("onboarding/cleaner/status/", views.OnboardingStatusView.as_view(), name="onboarding-status"),
    path("onboarding/cleaner/step1/", views.OnboardingStep1View.as_view(), name="onboarding-step1"),
    path("onboarding/cleaner/step2/", views.OnboardingStep2View.as_view(), name="onboarding-step2"),
    path("onboarding/cleaner/step3/", views.OnboardingStep3View.as_view(), name="onboarding-step3"),
    path("onboarding/cleaner/step4/", views.OnboardingStep4View.as_view(), name="onboarding-step4"),

    # Customer profile + onboarding
    path("customer/", views.CustomerProfileView.as_view(), name="customer-profile"),
    path("onboarding/customer/", views.CustomerOnboardingView.as_view(), name="customer-onboarding"),

    # Addresses
    path("addresses/", views.AddressListCreateView.as_view(), name="address-list"),
    path("addresses/<int:pk>/", views.AddressDetailView.as_view(), name="address-detail"),

    # Availability
    path("availability/", views.AvailabilityView.as_view(), name="availability"),
    path("availability/exceptions/", views.AvailabilityExceptionView.as_view(), name="availability-exceptions"),
]
