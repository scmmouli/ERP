from django.contrib import admin

from .models import Receipt


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("number", "customer", "amount", "mode", "created_by", "created_at")
    search_fields = ("number", "customer__name")
