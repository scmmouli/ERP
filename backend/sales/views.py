from django.conf import settings
from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import role_required

from .models import SalesInvoice
from .serializers import InvoiceCreateSerializer, InvoiceSerializer, ReturnCreateSerializer
from .services import BillingError, create_invoice, create_return

CAN_BILL = role_required("OWNER", "COUNTER")


class InvoiceViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [CAN_BILL]

    def get_queryset(self):
        qs = SalesInvoice.objects.select_related("customer", "created_by").prefetch_related(
            "lines__item", "lines__returns", "returns")
        p = self.request.query_params
        if p.get("q"):
            qs = qs.filter(Q(number__icontains=p["q"]) | Q(customer__name__icontains=p["q"]))
        if p.get("date"):
            qs = qs.filter(created_at__date=p["date"])
        return qs

    def create(self, request):
        s = InvoiceCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        try:
            invoice = create_invoice(user=request.user, customer=d.get("customer"), lines=d["lines"],
                                     payment_mode=d["payment_mode"], paid=d.get("paid"))
        except BillingError as e:
            raise ValidationError({"detail": str(e)})
        return Response(InvoiceSerializer(self.get_queryset().get(pk=invoice.pk)).data, status=201)

    @action(detail=True, methods=["post"], url_path="return")
    def make_return(self, request, pk=None):
        invoice = self.get_object()
        s = ReturnCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        by_id = {l.pk: l for l in invoice.lines.select_related("item")}
        pairs = []
        for row in s.validated_data["lines"]:
            if row["line"] not in by_id:
                raise ValidationError({"detail": "A returned line does not belong to this bill."})
            pairs.append((by_id[row["line"]], row["qty"]))
        try:
            create_return(user=request.user, invoice=invoice, pairs=pairs)
        except BillingError as e:
            raise ValidationError({"detail": str(e)})
        return Response(InvoiceSerializer(self.get_queryset().get(pk=invoice.pk)).data)


class ConfigView(APIView):
    def get(self, request):
        return Response({
            "shop_name": settings.SHOP_NAME,
            "shop_state_code": settings.SHOP_STATE_CODE,
            "prices_include_gst": settings.PRICES_INCLUDE_GST,
            "counter_max_discount_percent": settings.COUNTER_MAX_DISCOUNT_PERCENT,
        })
