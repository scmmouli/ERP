from rest_framework import viewsets

from accounts.permissions import role_required

from .models import Supplier
from .serializers import SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    permission_classes = [role_required("OWNER", "STOREKEEPER")]
    pagination_class = None

    def get_queryset(self):
        qs = Supplier.objects.filter(is_active=True)
        q = self.request.query_params.get("q", "").strip()
        return qs.filter(name__icontains=q) if q else qs

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
