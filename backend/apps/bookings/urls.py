from django.urls import path
from . import views

urlpatterns = [
    path("", views.BookingListCreateView.as_view(), name="booking-list"),
    path("<int:pk>/", views.BookingDetailView.as_view(), name="booking-detail"),
    path("<int:pk>/accept/", views.BookingAcceptView.as_view(), name="booking-accept"),
    path("<int:pk>/decline/", views.BookingDeclineView.as_view(), name="booking-decline"),
    path("<int:pk>/start/", views.BookingStartView.as_view(), name="booking-start"),
    path("<int:pk>/complete/", views.BookingCompleteView.as_view(), name="booking-complete"),
    path("<int:pk>/cancel/", views.BookingCancelView.as_view(), name="booking-cancel"),
    path("<int:pk>/dispute/", views.DisputeCreateView.as_view(), name="booking-dispute"),
    path("<int:pk>/messages/", views.BookingMessagesView.as_view(), name="booking-messages"),
]
