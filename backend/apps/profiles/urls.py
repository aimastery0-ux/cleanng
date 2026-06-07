from django.urls import path
from . import views

urlpatterns = [
    path("cleaner/", views.CleanerProfileView.as_view(), name="cleaner-profile"),
    path("cleaner/<int:pk>/", views.PublicCleanerProfileView.as_view(), name="public-cleaner-profile"),
    path("customer/", views.CustomerProfileView.as_view(), name="customer-profile"),
    path("addresses/", views.AddressListCreateView.as_view(), name="address-list"),
    path("addresses/<int:pk>/", views.AddressDetailView.as_view(), name="address-detail"),
    path("availability/", views.AvailabilityView.as_view(), name="availability"),
    path("availability/exceptions/", views.AvailabilityExceptionView.as_view(), name="availability-exceptions"),
]
