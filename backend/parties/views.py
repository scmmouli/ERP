from django.db.models import DecimalField, F, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import viewsets

from accounts.permissions import role_required

from .models import Customer, Supplier
from .serializers import CustomerSerializer, SupplierSerializer


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


DEC = DecimalField(max_digits=14, decimal_places=2)


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [role_required("OWNER", "COUNTER")]
    pagination_class = None

    def get_queryset(self):
        from sales.models import SalesInvoice, SalesReturn  # imported here to avoid a circular import

        billed = (SalesInvoice.objects.filter(customer=OuterRef("pk")).order_by().values("customer")
                  .annotate(s=Sum(F("total") - F("paid"), output_field=DEC)).values("s"))
        credits = (SalesReturn.objects.filter(invoice__customer=OuterRef("pk")).order_by()
                   .values("invoice__customer").annotate(s=Sum("credit_amount")).values("s"))
        qs = Customer.objects.filter(is_active=True).annotate(
            outstanding=Coalesce(Subquery(billed, output_field=DEC), Value(0), output_field=DEC)
            - Coalesce(Subquery(credits, output_field=DEC), Value(0), output_field=DEC)
        )
        q = self.request.query_params.get("q", "").strip()
        return qs.filter(Q(name__icontains=q) | Q(phone__icontains=q)) if q else qs

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
