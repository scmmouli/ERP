from django.conf import settings
from django.db import models


class SalesInvoice(models.Model):
    class Mode(models.TextChoices):
        CASH = "CASH", "Cash"
        UPI = "UPI", "UPI"
        CREDIT = "CREDIT", "Credit"

    number = models.CharField(max_length=20, blank=True, db_index=True)
    customer = models.ForeignKey("parties.Customer", null=True, blank=True, on_delete=models.PROTECT)
    location = models.ForeignKey("inventory.Location", on_delete=models.PROTECT)
    payment_mode = models.CharField(max_length=10, choices=Mode.choices)
    inter_state = models.BooleanField(default=False)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)  # taxable value
    cgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class SalesInvoiceLine(models.Model):
    """Rate, discount and GST are copied here so later price changes never alter old bills."""

    invoice = models.ForeignKey(SalesInvoice, related_name="lines", on_delete=models.CASCADE)
    item = models.ForeignKey("catalog.Item", on_delete=models.PROTECT)
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_rate = models.DecimalField(max_digits=4, decimal_places=2)
    taxable = models.DecimalField(max_digits=12, decimal_places=2)
    cgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=12, decimal_places=2)


class SalesReturn(models.Model):
    number = models.CharField(max_length=20, blank=True, db_index=True)
    invoice = models.ForeignKey(SalesInvoice, related_name="returns", on_delete=models.PROTECT)
    credit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]


class SalesReturnLine(models.Model):
    sales_return = models.ForeignKey(SalesReturn, related_name="lines", on_delete=models.CASCADE)
    line = models.ForeignKey(SalesInvoiceLine, related_name="returns", on_delete=models.PROTECT)
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
