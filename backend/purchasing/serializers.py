from django.db import transaction
from rest_framework import serializers

from inventory.models import default_location

from .models import GoodsReceipt, GRNLine

D = dict(max_digits=12, decimal_places=2, read_only=True)


class GRNLineSerializer(serializers.ModelSerializer):
    part_number = serializers.CharField(source="item.part_number", read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    taxable = serializers.DecimalField(**D)
    gst_amount = serializers.DecimalField(**D)
    amount = serializers.DecimalField(**D)
    short = serializers.DecimalField(**D)

    class Meta:
        model = GRNLine
        fields = ("id", "item", "part_number", "item_name", "qty_ordered", "qty_received", "unit_cost",
                  "gst_rate", "taxable", "gst_amount", "amount", "short")
        read_only_fields = ("gst_rate",)
        extra_kwargs = {"qty_ordered": {"required": False, "allow_null": True}}

    def validate(self, attrs):
        for f in ("qty_ordered", "qty_received", "unit_cost"):
            if attrs.get(f) is not None and attrs[f] < 0:
                raise serializers.ValidationError(f"{f.replace('_', ' ').capitalize()} cannot be negative.")
        return attrs


class GRNSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    lines = GRNLineSerializer(many=True)
    taxable = serializers.DecimalField(**D)
    gst = serializers.DecimalField(**D)
    total = serializers.DecimalField(**D)

    class Meta:
        model = GoodsReceipt
        fields = ("id", "number", "supplier", "supplier_name", "supplier_invoice_no", "supplier_invoice_date",
                  "status", "notes", "lines", "taxable", "gst", "total", "created_at", "posted_at")
        read_only_fields = ("number", "status", "created_at", "posted_at")

    def validate_lines(self, lines):
        if not lines:
            raise serializers.ValidationError("Add at least one part.")
        return lines

    def _set_lines(self, grn, lines):
        grn.lines.all().delete()
        for ln in lines:
            GRNLine.objects.create(grn=grn, gst_rate=ln["item"].gst_rate, **ln)

    @transaction.atomic
    def create(self, validated_data):
        lines = validated_data.pop("lines")
        grn = GoodsReceipt.objects.create(
            created_by=self.context["request"].user, location=default_location(), **validated_data
        )
        grn.number = f"GRN-{grn.pk:05d}"
        grn.save(update_fields=["number"])
        self._set_lines(grn, lines)
        return grn

    @transaction.atomic
    def update(self, instance, validated_data):
        if instance.status == GoodsReceipt.Status.POSTED:
            raise serializers.ValidationError({"detail": "A posted receipt cannot be changed."})
        lines = validated_data.pop("lines", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if lines is not None:
            self._set_lines(instance, lines)
        return instance
