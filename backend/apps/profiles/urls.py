from django.urls import path
from . import views

urlpatterns = [
    # Cleaner profile
    path("cleaner/", views.CleanerProfileView.as_view(), name="cleaner-profile"),
    path("cleaner/<int:pk>/", views.PublicCleanerProfileView.as_view(), name="public-cleaner-profile"),
    path("cleaner/avatar/", views.AvatarUploadView.as_view(), name="cleaner-avatar"),
    path("cleaner/portfolio/add/", views.PortfolioAddView.as_view(), name="portfolio-add"),
    path("cleaner/portfolio/remove/", views.PortfolioRemoveView.as_view(), name="portfolio-remove"),
    path("cleaner/stats/", views.CleanerStatsView.as_view(), name="cleaner-stats"),

    # Onboarding wizard
    path("onboarding/cleaner/status/", views.OnboardingStatusView.as_view(), name="onboarding-status"),
    path("onboarding/cleaner/step1/", views.OnboardingStep1View.as_view(), name="onboarding-step1"),
    path("onboarding/cleaner/step2/", views.OnboardingStep2View.as_view(), name="onboarding-step2"),
    path("onboarding/cleaner/step3/", views.OnboardingStep3View.as_view(), name="onboarding-step3"),
    path("onboarding/cleaner/step4/", views.OnboardingStep4View.as_view(), name="onboarding-step4"),

    # Customer
    path("customer/", views.CustomerProfileView.as_view(), name="customer-profile"),
    path("onboarding/customer/", views.CustomerOnboardingView.as_view(), name="customer-onboarding"),

    # Addresses
    path("addresses/", views.AddressListCreateView.as_view(), name="address-list"),
    path("addresses/<int:pk>/", views.AddressDetailView.as_view(), name="address-detail"),

    # Bank details (payouts)
    path("cleaner/bank-details/", views.BankDetailsView.as_view(), name="bank-details"),

    # Availability
    path("availability/", views.AvailabilityView.as_view(), name="availability"),
    path("availability/bulk/", views.AvailabilityBulkView.as_view(), name="availability-bulk"),
    path("availability/<int:pk>/", views.AvailabilityDetailView.as_view(), name="availability-detail"),
    path("availability/exceptions/", views.AvailabilityExceptionView.as_view(), name="availability-exceptions"),
    path("availability/exceptions/<int:pk>/", views.AvailabilityExceptionDetailView.as_view(), name="availability-exception-detail"),
]
