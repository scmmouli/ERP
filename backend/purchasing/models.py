from decimal import Decimal

from django.conf import settings
from django.db import models

TWO = Decimal("0.01")


class GoodsReceipt(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"

    number = models.CharField(max_length=20, blank=True, db_index=True)
    supplier = models.ForeignKey("parties.Supplier", on_delete=models.PROTECT)
    supplier_invoice_no = models.CharField(max_length=40, blank=True)
    supplier_invoice_date = models.DateField(null=True, blank=True)
    location = models.ForeignKey("inventory.Location", on_delete=models.PROTECT)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    notes = models.CharField(max_length=300, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-id"]

    @property
    def taxable(self):
        return sum((l.taxable for l in self.lines.all()), Decimal("0"))

    @property
    def gst(self):
        return sum((l.gst_amount for l in self.lines.all()), Decimal("0"))

    @property
    def total(self):
        return self.taxable + self.gst


class GRNLine(models.Model):
    grn = models.ForeignKey(GoodsReceipt, related_name="lines", on_delete=models.CASCADE)
    item = models.ForeignKey("catalog.Item", on_delete=models.PROTECT)
    qty_ordered = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    qty_received = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_rate = models.DecimalField(max_digits=4, decimal_places=2, default=18)  # snapshot at entry time

    @property
    def taxable(self):
        return (self.qty_received * self.unit_cost).quantize(TWO)

    @property
    def gst_amount(self):
        return (self.taxable * self.gst_rate / 100).quantize(TWO)

    @property
    def amount(self):
        return self.taxable + self.gst_amount

    @property
    def short(self):
        if self.qty_ordered is not None and self.qty_received < self.qty_ordered:
            return self.qty_ordered - self.qty_received
        return Decimal("0")
