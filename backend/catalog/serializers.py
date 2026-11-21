from rest_framework import serializers

from .models import Brand, Fitment, Item, ItemCrossRef, VehicleModel

ALLOWED_GST = {0, 5, 12, 18, 28}


class CrossRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCrossRef
        fields = ("id", "alt_part_number", "kind")


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleModel
        fields = ("id", "make", "model", "variant")


class FitmentSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer(read_only=True)

    class Meta:
        model = Fitment
        fields = ("id", "vehicle")


def get_or_create_brand(name):
    name = (name or "").strip()
    if not name:
        return None
    return Brand.objects.filter(name__iexact=name).first() or Brand.objects.create(name=name)


class ItemSerializer(serializers.ModelSerializer):
    brand = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cross_refs = CrossRefSerializer(many=True, read_only=True)
    fitments = FitmentSerializer(many=True, read_only=True)
    stock = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Item
        fields = (
            "id", "part_number", "name", "brand", "is_oem", "hsn_code", "gst_rate", "uom",
            "mrp", "sale_price", "rack", "reorder_level", "barcode", "cross_refs", "fitments", "stock",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["brand"] = instance.brand.name if instance.brand else ""
        return data

    def validate_part_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Part number is required.")
        return value

    def validate_gst_rate(self, value):
        if int(value) != value or int(value) not in ALLOWED_GST:
            raise serializers.ValidationError("GST rate must be one of 0, 5, 12, 18 or 28.")
        return value

    def create(self, validated_data):
        validated_data["brand"] = get_or_create_brand(validated_data.pop("brand", None))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "brand" in validated_data:
            validated_data["brand"] = get_or_create_brand(validated_data["brand"])
        return super().update(instance, validated_data)
