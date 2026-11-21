import re

from rest_framework import serializers

from .models import Supplier

GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$")


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ("id", "name", "phone", "gstin", "address")

    def validate_gstin(self, value):
        value = value.strip().upper()
        if value and not GSTIN_RE.match(value):
            raise serializers.ValidationError("GSTIN should be 15 characters, for example 33ABCDE1234F1Z5.")
        return value
