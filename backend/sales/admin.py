from django.contrib import admin

from .models import SalesInvoice, SalesInvoiceLine


class LineInline(admin.TabularInline):
    model = SalesInvoiceLine
    extra = 0
    can_delete = False


@admin.register(SalesInvoice)
class SalesInvoiceAdmin(admin.ModelAdmin):
    list_display = ("number", "customer", "payment_mode", "total", "paid", "created_at")
    inlines = [LineInline]
