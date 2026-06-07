from django.urls import path
from . import views

urlpatterns = [
    path("booking/<int:booking_id>/", views.MessageHistoryView.as_view(), name="message-history"),
]
