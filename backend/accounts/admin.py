from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class ERPUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("ERP role", {"fields": ("role",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("ERP role", {"fields": ("role",)}),)
    list_display = ("username", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active")
