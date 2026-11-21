from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import role_required
from parties.models import Customer
from sales.services import customer_outstanding

from .models import Receipt
from .serializers import ReceiptSerializer
from .services import ageing, statement

CAN_COLLECT = role_required("OWNER", "COUNTER")


class ReceiptViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ReceiptSerializer
    permission_classes = [CAN_COLLECT]

    def get_queryset(self):
        qs = Receipt.objects.select_related("customer", "created_by")
        c = self.request.query_params.get("customer")
        return qs.filter(customer_id=c) if c else qs

    def perform_create(self, serializer):
        customer, amount = serializer.validated_data["customer"], serializer.validated_data["amount"]
        owed = customer_outstanding(customer)
        if amount > owed:
            raise ValidationError({"detail": f"{customer.name} owes only ₹{max(owed, 0):,.2f}. Enter that amount or less."})
        receipt = serializer.save(created_by=self.request.user)
        receipt.number = f"RCT-{receipt.pk:05d}"
        receipt.save(update_fields=["number"])


class StatementView(APIView):
    permission_classes = [CAN_COLLECT]

    def get(self, request, customer_id):
        c = get_object_or_404(Customer, pk=customer_id, is_active=True)
        data = ageing(c)
        data["customer"] = {"id": c.id, "name": c.name, "phone": c.phone, "kind": c.kind, "gstin": c.gstin,
                            "state_code": c.state_code, "address": c.address, "credit_limit": c.credit_limit}
        data["entries"] = statement(c)
        return Response(data)
