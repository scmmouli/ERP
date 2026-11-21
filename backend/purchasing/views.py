from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import role_required
from inventory.services import post_stock

from .models import GoodsReceipt
from .serializers import GRNSerializer


class GoodsReceiptViewSet(viewsets.ModelViewSet):
    serializer_class = GRNSerializer
    permission_classes = [role_required("OWNER", "STOREKEEPER")]

    def get_queryset(self):
        qs = GoodsReceipt.objects.select_related("supplier").prefetch_related("lines__item")
        status = self.request.query_params.get("status")
        return qs.filter(status=status) if status else qs

    def perform_destroy(self, instance):
        if instance.status == GoodsReceipt.Status.POSTED:
            raise ValidationError({"detail": "A posted receipt cannot be deleted."})
        instance.delete()

    @action(detail=True, methods=["post"], url_path="post")
    def post_to_stock(self, request, pk=None):
        with transaction.atomic():
            grn = GoodsReceipt.objects.select_for_update().get(pk=pk)
            if grn.status == GoodsReceipt.Status.POSTED:
                raise ValidationError({"detail": "This receipt is already posted."})
            lines = [l for l in grn.lines.select_related("item") if l.qty_received > 0]
            if not lines:
                raise ValidationError({"detail": "Enter a received quantity on at least one line."})
            for l in lines:
                post_stock(item=l.item, qty=l.qty_received, ref_type="GRN", ref_id=grn.pk,
                           unit_cost=l.unit_cost, note=f"{grn.number} from {grn.supplier.name}",
                           user=request.user, location=grn.location)
            grn.status = GoodsReceipt.Status.POSTED
            grn.posted_at = timezone.now()
            grn.save(update_fields=["status", "posted_at"])
        grn = self.get_queryset().get(pk=pk)
        return Response(self.get_serializer(grn).data)
