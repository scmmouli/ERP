from django.conf import settings
from django.db import models


class Receipt(models.Model):
    """Money received from a customer against what they owe. Insert-only."""

    class Mode(models.TextChoices):
        CASH = "CASH", "Cash"
        UPI = "UPI", "UPI"
        BANK = "BANK", "Bank transfer"

    number = models.CharField(max_length=20, blank=True, db_index=True)
    customer = models.ForeignKey("parties.Customer", on_delete=models.PROTECT, related_name="receipts")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.CASH)
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
