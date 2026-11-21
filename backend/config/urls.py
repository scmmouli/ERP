from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/parties/", include("parties.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/purchasing/", include("purchasing.urls")),
    path("api/sales/", include("sales.urls")),
    path("api/payments/", include("payments.urls")),
]
