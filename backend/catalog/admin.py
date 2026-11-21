from django.contrib import admin

from .models import Brand, Fitment, Item, ItemCrossRef, VehicleModel


class CrossRefInline(admin.TabularInline):
    model = ItemCrossRef
    extra = 0


class FitmentInline(admin.TabularInline):
    model = Fitment
    extra = 0


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("part_number", "name", "brand", "gst_rate", "mrp", "sale_price", "rack", "is_active")
    search_fields = ("part_number", "name", "barcode")
    list_filter = ("brand", "is_oem", "is_active")
    inlines = [CrossRefInline, FitmentInline]


admin.site.register(Brand)
admin.site.register(VehicleModel)
