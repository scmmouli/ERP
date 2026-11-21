from rest_framework import serializers

from catalog.models import Item

from .models import StockLedger


class AdjustSerializer(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.filter(is_active=True))
    qty = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(max_length=200)

    def validate_qty(self, value):
        if value == 0:
            raise serializers.ValidationError("Enter a quantity other than zero.")
        return value


class LedgerSerializer(serializers.ModelSerializer):
    part_number = serializers.CharField(source="item.part_number", read_only=True)
    user = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = StockLedger
        fields = ("id", "part_number", "qty", "unit_cost", "ref_type", "ref_id", "note", "user", "created_at")
