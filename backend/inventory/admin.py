from django.contrib import admin

from .models import Location, StockLedger


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
    list_display = ("id", "item", "qty", "ref_type", "ref_id", "created_by", "created_at")
    list_filter = ("ref_type",)
    search_fields = ("item__part_number", "item__name")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(Location)
