from django.urls import path
from . import views

urlpatterns = [
    path("cleaners/", views.CleanerSearchView.as_view(), name="cleaner-search"),
]
