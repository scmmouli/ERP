from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ReceiptViewSet, StatementView

router = DefaultRouter()
router.register("receipts", ReceiptViewSet, basename="receipt")
urlpatterns = [path("statement/<int:customer_id>/", StatementView.as_view())] + router.urls
