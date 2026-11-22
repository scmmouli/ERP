from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, F, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone

from catalog.models import Item
from catalog.views import STOCK
from inventory.models import StockLedger
from parties.models import Customer
from payments.models import Receipt
from payments.services import ageing
from sales.models import SalesInvoice, SalesInvoiceLine, SalesReturn

ZERO = Decimal("0")
TWO = Decimal("0.01")
DEC = DecimalField(max_digits=14, decimal_places=2)


def q2(x):
    return Decimal(x).quantize(TWO)


def avg_cost_map():
    """Average purchase cost per item, from opening stock and goods received. An estimate, not FIFO."""
    rows = (StockLedger.objects.filter(qty__gt=0, unit_cost__isnull=False).values("item")
            .annotate(q=Sum("qty"), c=Sum(F("qty") * F("unit_cost"), output_field=DEC)))
    return {r["item"]: r["c"] / r["q"] for r in rows if r["q"]}


def customers_with_balance():
    billed = (SalesInvoice.objects.filter(customer=OuterRef("pk")).order_by().values("customer")
              .annotate(s=Sum(F("total") - F("paid"), output_field=DEC)).values("s"))
    credits = (SalesReturn.objects.filter(invoice__customer=OuterRef("pk")).order_by()
               .values("invoice__customer").annotate(s=Sum("credit_amount")).values("s"))
    received = Receipt.objects.filter(customer=OuterRef("pk")).order_by().values("customer").annotate(s=Sum("amount")).values("s")

    def part(sq):
        return Coalesce(Subquery(sq, output_field=DEC), Value(0), output_field=DEC)

    return (Customer.objects.filter(is_active=True)
            .annotate(owed=part(billed) - part(credits) - part(received))
            .filter(owed__gt=0).order_by("-owed"))


def dashboard():
    today = timezone.localdate()
    yesterday = today - timedelta(days=1)
    month_start = today.replace(day=1)

    inv = SalesInvoice.objects
    today_qs = inv.filter(created_at__date=today)
    today_total = today_qs.aggregate(t=Sum("total"))["t"] or ZERO
    yday_total = inv.filter(created_at__date=yesterday).aggregate(t=Sum("total"))["t"] or ZERO
    change = round(float((today_total - yday_total) / yday_total * 100), 1) if yday_total > 0 else None

    start = today - timedelta(days=6)
    rows = (inv.filter(created_at__date__gte=start, created_at__date__lte=today)
            .annotate(d=TruncDate("created_at")).values("d").annotate(t=Sum("total")))
    by_day = {r["d"]: r["t"] for r in rows}
    last7 = [{"date": (start + timedelta(days=i)).isoformat(), "total": by_day.get(start + timedelta(days=i), ZERO)} for i in range(7)]

    mix = list(today_qs.values("payment_mode").annotate(total=Sum("total")).order_by("-total"))

    debtors = list(customers_with_balance())
    total_owed = sum((c.owed for c in debtors), ZERO)
    overdue_total = ZERO
    top = []
    for i, c in enumerate(debtors):
        late = ageing(c)["overdue"]
        overdue_total += late
        if i < 5:
            top.append({"id": c.id, "name": c.name, "outstanding": c.owed, "overdue": late})

    items = Item.objects.filter(is_active=True).annotate(stock=STOCK)
    low = items.filter(reorder_level__gt=0, stock__lte=F("reorder_level"))
    low_items = list(low.order_by("stock", "part_number")[:5].values("id", "part_number", "name", "stock", "reorder_level"))
    low_block = {"count": low.count(), "out_of_stock": low.filter(stock__lte=0).count(), "items": low_items}

    costs = avg_cost_map()
    value, uncosted = ZERO, 0
    for r in items.filter(stock__gt=0).values("id", "stock"):
        if r["id"] in costs:
            value += r["stock"] * costs[r["id"]]
        else:
            uncosted += 1

    movers = list(SalesInvoiceLine.objects.filter(invoice__created_at__date__gte=month_start)
                  .values("item__part_number", "item__name").annotate(qty=Sum("qty")).order_by("-qty")[:5])

    return {
        "today": {"total": today_total, "count": today_qs.count(), "change_pct": change},
        "outstanding": {"total": total_owed, "overdue": overdue_total, "customers": len(debtors)},
        "low_stock": low_block,
        "stock_value": {"amount": q2(value), "uncosted_items": uncosted},
        "last7": last7,
        "payment_mix": [{"mode": m["payment_mode"], "total": m["total"]} for m in mix],
        "top_movers": [{"part_number": m["item__part_number"], "name": m["item__name"], "qty": m["qty"]} for m in movers],
        "top_debtors": top,
    }


def limited_dashboard():
    items = Item.objects.filter(is_active=True).annotate(stock=STOCK)
    low = items.filter(reorder_level__gt=0, stock__lte=F("reorder_level"))
    return {"limited": True, "low_stock": {
        "count": low.count(), "out_of_stock": low.filter(stock__lte=0).count(),
        "items": list(low.order_by("stock", "part_number")[:10].values("id", "part_number", "name", "stock", "reorder_level")),
    }}


def sales_report(start, end):
    invs = SalesInvoice.objects.filter(created_at__date__gte=start, created_at__date__lte=end)
    agg = invs.aggregate(billed=Sum("total"), n=Count("id"), credit=Sum(F("total") - F("paid"), output_field=DEC))
    billed, n = agg["billed"] or ZERO, agg["n"]

    costs = avg_cost_map()
    lines = (SalesInvoiceLine.objects.filter(invoice__in=invs)
             .select_related("item__brand").prefetch_related("returns"))
    net_sales = costed_sales = profit = ZERO
    uncosted = set()
    items = defaultdict(lambda: {"qty": ZERO, "revenue": ZERO, "profit": ZERO, "costed": ZERO})
    brands = defaultdict(lambda: ZERO)
    for l in lines:
        net_qty = l.qty - sum((r.qty for r in l.returns.all()), ZERO)
        if net_qty <= 0:
            continue
        net_taxable = l.taxable * net_qty / l.qty
        net_sales += net_taxable
        it = items[l.item_id]
        it.update(part_number=l.item.part_number, name=l.item.name)
        it["qty"] += net_qty
        it["revenue"] += net_taxable
        brands[l.item.brand.name if l.item.brand else "No brand"] += net_taxable
        cost = costs.get(l.item_id)
        if cost is None:
            uncosted.add(l.item_id)
        else:
            p = net_taxable - cost * net_qty
            profit += p
            costed_sales += net_taxable
            it["profit"] += p
            it["costed"] += net_taxable

    returns = SalesReturn.objects.filter(invoice__in=invs).aggregate(c=Sum("credit_amount"))["c"] or ZERO

    days = (end - start).days + 1
    by_day = {r["d"]: r["t"] for r in invs.annotate(d=TruncDate("created_at")).values("d").annotate(t=Sum("total"))}
    daily = [{"date": (start + timedelta(days=i)).isoformat(), "total": by_day.get(start + timedelta(days=i), ZERO)} for i in range(days)]

    top_items = sorted(items.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    for it in top_items:
        it["margin_pct"] = round(float(it["profit"] / it["costed"] * 100), 1) if it["costed"] > 0 else None
        for k in ("qty", "revenue", "profit"):
            it[k] = q2(it[k])
        del it["costed"]

    customers = [{"name": r["customer__name"], "billed": r["t"]} for r in
                 invs.filter(customer__isnull=False).values("customer__name").annotate(t=Sum("total")).order_by("-t")[:10]]
    walk_in = invs.filter(customer__isnull=True).aggregate(t=Sum("total"))["t"] or ZERO
    if walk_in > 0:
        customers.append({"name": "Walk-in customers", "billed": walk_in})

    return {
        "from": start.isoformat(), "to": end.isoformat(),
        "kpis": {
            "billed": billed, "net_sales": q2(net_sales), "invoices": n,
            "avg_bill": q2(billed / n) if n else ZERO, "returns": returns, "credit_sales": agg["credit"] or ZERO,
            "gross_profit": q2(profit),
            "margin_pct": round(float(profit / costed_sales * 100), 1) if costed_sales > 0 else None,
            "uncosted_items": len(uncosted),
        },
        "daily": daily,
        "payment_mode": [{"mode": r["payment_mode"], "total": r["t"], "count": r["c"]} for r in
                         invs.values("payment_mode").annotate(t=Sum("total"), c=Count("id")).order_by("-t")],
        "top_items": top_items,
        "by_brand": sorted(({"brand": k, "revenue": q2(v)} for k, v in brands.items()), key=lambda x: x["revenue"], reverse=True)[:8],
        "top_customers": customers,
        "by_staff": [{"user": r["created_by__username"], "total": r["t"], "count": r["c"]} for r in
                     invs.values("created_by__username").annotate(t=Sum("total"), c=Count("id")).order_by("-t")],
    }
