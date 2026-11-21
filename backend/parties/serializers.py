import re

from rest_framework import serializers

from .models import Customer, Supplier

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


class CustomerSerializer(serializers.ModelSerializer):
    outstanding = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Customer
        fields = ("id", "name", "phone", "kind", "gstin", "state_code", "address", "credit_limit", "outstanding")

    def validate_gstin(self, value):
        value = value.strip().upper()
        if value and not GSTIN_RE.match(value):
            raise serializers.ValidationError("GSTIN should be 15 characters, for example 33ABCDE1234F1Z5.")
        return value

    def validate_state_code(self, value):
        if not (value.isdigit() and len(value) == 2):
            raise serializers.ValidationError("Use the 2-digit GST state code, for example 33 for Tamil Nadu.")
        return value
