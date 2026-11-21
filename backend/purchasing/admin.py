from django.contrib import admin

from .models import GoodsReceipt, GRNLine


class LineInline(admin.TabularInline):
    model = GRNLine
    extra = 0


@admin.register(GoodsReceipt)
class GoodsReceiptAdmin(admin.ModelAdmin):
    list_display = ("number", "supplier", "supplier_invoice_no", "status", "created_at")
    inlines = [LineInline]
