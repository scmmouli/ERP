from decimal import Decimal

from django.db.models import Sum

from .models import StockLedger, default_location


def stock_of(item) -> Decimal:
    total = StockLedger.objects.filter(item=item).aggregate(t=Sum("qty"))["t"]
    return total or Decimal("0")


def post_stock(*, item, qty, ref_type, user, ref_id=None, unit_cost=None, note="", location=None):
    return StockLedger.objects.create(
        item=item, location=location or default_location(), qty=qty, unit_cost=unit_cost,
        ref_type=ref_type, ref_id=ref_id, note=note, created_by=user,
    )
