from decimal import Decimal

from django.conf import settings
from rest_framework import serializers

from catalog.models import Item
from parties.models import Customer

from .models import SalesInvoice, SalesInvoiceLine, SalesReturn

M = dict(max_digits=12, decimal_places=2, read_only=True)


class LineInSerializer(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.filter(is_active=True))
    qty = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    rate = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"))
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"), default=Decimal("0"))


class InvoiceCreateSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.filter(is_active=True), allow_null=True, required=False)
    payment_mode = serializers.ChoiceField(choices=["CASH", "UPI", "CREDIT"])
    paid = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"), required=False, allow_null=True)
    lines = LineInSerializer(many=True, allow_empty=False)


class ReturnLineInSerializer(serializers.Serializer):
    line = serializers.IntegerField()
    qty = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))


class ReturnCreateSerializer(serializers.Serializer):
    lines = ReturnLineInSerializer(many=True, allow_empty=False)


class LineSerializer(serializers.ModelSerializer):
    part_number = serializers.CharField(source="item.part_number", read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    hsn_code = serializers.CharField(source="item.hsn_code", read_only=True)
    returned_qty = serializers.SerializerMethodField()

    class Meta:
        model = SalesInvoiceLine
        fields = ("id", "part_number", "item_name", "hsn_code", "qty", "rate", "discount", "gst_rate",
                  "taxable", "cgst", "sgst", "igst", "amount", "returned_qty")

    def get_returned_qty(self, obj):
        return str(sum((r.qty for r in obj.returns.all()), Decimal("0")))


class ReturnSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesReturn
        fields = ("id", "number", "credit_amount", "created_at")


class CustomerBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "name", "phone", "gstin", "state_code", "address")


class InvoiceSerializer(serializers.ModelSerializer):
    customer = CustomerBriefSerializer(read_only=True)
    lines = LineSerializer(many=True, read_only=True)
    returns = ReturnSerializer(many=True, read_only=True)
    due = serializers.SerializerMethodField()
    user = serializers.CharField(source="created_by.username", read_only=True)
    shop = serializers.SerializerMethodField()

    class Meta:
        model = SalesInvoice
        fields = ("id", "number", "customer", "payment_mode", "inter_state", "subtotal", "cgst", "sgst", "igst",
                  "round_off", "total", "paid", "due", "lines", "returns", "user", "created_at", "shop")

    def get_due(self, obj):
        return str(obj.total - obj.paid)

    def get_shop(self, obj):
        return {"name": settings.SHOP_NAME, "gstin": settings.SHOP_GSTIN, "address": settings.SHOP_ADDRESS,
                "phone": settings.SHOP_PHONE}
