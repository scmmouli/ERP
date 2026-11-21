from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ConfigView, InvoiceViewSet

router = DefaultRouter()
router.register("invoices", InvoiceViewSet, basename="invoice")
urlpatterns = [path("config/", ConfigView.as_view())] + router.urls
