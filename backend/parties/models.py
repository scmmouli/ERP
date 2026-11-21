from django.db import models


class Supplier(models.Model):
    name = models.CharField(max_length=150, unique=True)
    phone = models.CharField(max_length=20, blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    address = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Customer(models.Model):
    class Kind(models.TextChoices):
        RETAIL = "RETAIL", "Retail"
        GARAGE = "GARAGE", "Garage"
        MECHANIC = "MECHANIC", "Mechanic"

    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.RETAIL)
    gstin = models.CharField(max_length=15, blank=True)
    state_code = models.CharField(max_length=2, default="33")  # decides CGST+SGST or IGST
    address = models.CharField(max_length=300, blank=True)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # 0 = no credit allowed
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
