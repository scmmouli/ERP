from django.conf import settings
from django.db import models


class Location(models.Model):
    name = models.CharField(max_length=80, unique=True)

    def __str__(self):
        return self.name


def default_location() -> Location:
    return Location.objects.get_or_create(name="Main Shop")[0]


class StockLedger(models.Model):
    """Insert-only record of every stock movement. Current stock = sum of qty."""

    class Ref(models.TextChoices):
        OPENING = "OPENING", "Opening stock"
        GRN = "GRN", "Goods received"
        SALE = "SALE", "Sale"
        RETURN = "RETURN", "Sales return"
        ADJUST = "ADJUST", "Adjustment"

    item = models.ForeignKey("catalog.Item", related_name="ledger", on_delete=models.PROTECT)
    location = models.ForeignKey(Location, on_delete=models.PROTECT)
    qty = models.DecimalField(max_digits=12, decimal_places=2)  # positive in, negative out
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ref_type = models.CharField(max_length=10, choices=Ref.choices)
    ref_id = models.PositiveIntegerField(null=True, blank=True)
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["item", "location"])]
        ordering = ["-id"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("Stock ledger entries cannot be changed. Post a correcting entry instead.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Stock ledger entries cannot be deleted. Post a correcting entry instead.")
