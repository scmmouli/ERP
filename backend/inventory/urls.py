from django.urls import path

from .views import AdjustmentView, LedgerView

urlpatterns = [
    path("adjustments/", AdjustmentView.as_view()),
    path("ledger/", LedgerView.as_view()),
]
