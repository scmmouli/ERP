from decimal import Decimal

from rest_framework import serializers

from .models import Receipt


class ReceiptSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    user = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Receipt
        fields = ("id", "number", "customer", "customer_name", "amount", "mode", "note", "user", "created_at")
        read_only_fields = ("number", "created_at")
