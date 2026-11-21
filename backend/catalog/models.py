import re

from django.db import models


def normalize_part_number(value: str) -> str:
    """'04465-0K 240' and '044650k240' both become '044650K240', so searches ignore dashes and spaces."""
    return re.sub(r"[^A-Z0-9]", "", (value or "").upper())


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Item(models.Model):
    part_number = models.CharField(max_length=60, unique=True)
    part_key = models.CharField(max_length=60, db_index=True, editable=False)
    name = models.CharField(max_length=200)
    brand = models.ForeignKey(Brand, null=True, blank=True, on_delete=models.SET_NULL, related_name="items")
    is_oem = models.BooleanField(default=False)
    hsn_code = models.CharField(max_length=8, blank=True)
    gst_rate = models.DecimalField(max_digits=4, decimal_places=2, default=18)
    uom = models.CharField(max_length=10, default="PCS")
    mrp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rack = models.CharField(max_length=20, blank=True)
    reorder_level = models.PositiveIntegerField(default=0)
    barcode = models.CharField(max_length=50, blank=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["part_number"]

    def save(self, *args, **kwargs):
        self.part_number = self.part_number.strip()
        self.part_key = normalize_part_number(self.part_number)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.part_number} {self.name}"


class ItemCrossRef(models.Model):
    """Alternate, OEM or superseded part numbers that lead to the same item."""

    class Kind(models.TextChoices):
        OEM = "OEM", "OEM"
        AFTERMARKET = "AFTERMARKET", "Aftermarket"
        SUPERSEDED = "SUPERSEDED", "Superseded"

    item = models.ForeignKey(Item, related_name="cross_refs", on_delete=models.CASCADE)
    alt_part_number = models.CharField(max_length=60)
    alt_key = models.CharField(max_length=60, db_index=True, editable=False)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.AFTERMARKET)

    class Meta:
        unique_together = [("item", "alt_key")]

    def save(self, *args, **kwargs):
        self.alt_key = normalize_part_number(self.alt_part_number)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.alt_part_number


class VehicleModel(models.Model):
    make = models.CharField(max_length=60)
    model = models.CharField(max_length=60)
    variant = models.CharField(max_length=60, blank=True)
    year_from = models.PositiveSmallIntegerField(null=True, blank=True)
    year_to = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        unique_together = [("make", "model", "variant")]
        ordering = ["make", "model", "variant"]

    def __str__(self):
        return " ".join(p for p in (self.make, self.model, self.variant) if p)


class Fitment(models.Model):
    item = models.ForeignKey(Item, related_name="fitments", on_delete=models.CASCADE)
    vehicle = models.ForeignKey(VehicleModel, related_name="fitments", on_delete=models.CASCADE)

    class Meta:
        unique_together = [("item", "vehicle")]
