from django.urls import path
from . import views

urlpatterns = [
    path("cleaners/pending/", views.PendingCleanersView.as_view(), name="admin-pending-cleaners"),
    path("cleaners/<int:pk>/approve/", views.ApproveCleanerView.as_view(), name="admin-approve-cleaner"),
    path("cleaners/<int:pk>/reject/", views.RejectCleanerView.as_view(), name="admin-reject-cleaner"),
    path("disputes/", views.DisputeListView.as_view(), name="admin-disputes"),
    path("disputes/<int:pk>/resolve/", views.ResolveDisputeView.as_view(), name="admin-resolve-dispute"),
    path("analytics/", views.AnalyticsView.as_view(), name="admin-analytics"),
    path("payouts/reconciliation/", views.PayoutReconciliationView.as_view(), name="admin-payout-reconciliation"),
]
