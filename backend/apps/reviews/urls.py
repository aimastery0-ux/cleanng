from django.urls import path
from . import views

urlpatterns = [
    path("", views.CreateReviewView.as_view(), name="review-create"),
    path("cleaner/<int:cleaner_pk>/", views.CleanerReviewsView.as_view(), name="cleaner-reviews"),
    path("booking/<int:booking_id>/", views.BookingReviewView.as_view(), name="booking-review"),
]
