from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from sales.models import SalesInvoice, SalesReturn

from .models import Receipt

ZERO = Decimal("0")
OVERDUE_AFTER_DAYS = 30  # change here if the shop gives a different credit period


def _credits(customer):
    receipts = Receipt.objects.filter(customer=customer).aggregate(t=Sum("amount"))["t"] or ZERO
    returns = SalesReturn.objects.filter(invoice__customer=customer).aggregate(t=Sum("credit_amount"))["t"] or ZERO
    return receipts + returns


def ageing(customer):
    """Receipts and return credits are applied to the oldest unpaid bills first."""
    today = timezone.localdate()
    pool = _credits(customer)
    buckets = {"current": ZERO, "d31_60": ZERO, "d61_90": ZERO, "d90_plus": ZERO}
    open_invoices = []
    for inv in SalesInvoice.objects.filter(customer=customer).order_by("created_at", "id"):
        open_amt = inv.total - inv.paid
        if open_amt <= 0:
            continue
        used = min(open_amt, pool)
        pool -= used
        open_amt -= used
        if open_amt <= 0:
            continue
        days = (today - timezone.localtime(inv.created_at).date()).days
        key = "current" if days <= 30 else "d31_60" if days <= 60 else "d61_90" if days <= 90 else "d90_plus"
        buckets[key] += open_amt
        open_invoices.append({"id": inv.id, "number": inv.number, "date": inv.created_at, "total": inv.total,
                              "open": open_amt, "days": days, "overdue": days > OVERDUE_AFTER_DAYS})
    return {
        "outstanding": sum(buckets.values(), ZERO),
        "advance": pool,
        "overdue": sum((i["open"] for i in open_invoices if i["overdue"]), ZERO),
        "buckets": buckets,
        "open_invoices": open_invoices,
    }


def statement(customer):
    rows = []
    for inv in SalesInvoice.objects.filter(customer=customer):
        due = inv.total - inv.paid
        if due > 0:
            rows.append({"at": inv.created_at, "kind": "BILL", "ref": inv.number, "debit": due, "credit": ZERO,
                         "text": f"Bill total ₹{inv.total:,.2f}, paid ₹{inv.paid:,.2f}"})
    for r in Receipt.objects.filter(customer=customer):
        rows.append({"at": r.created_at, "kind": "RECEIPT", "ref": r.number, "debit": ZERO, "credit": r.amount,
                     "text": f"Payment received ({r.get_mode_display()})" + (f": {r.note}" if r.note else "")})
    for ret in SalesReturn.objects.filter(invoice__customer=customer).select_related("invoice"):
        rows.append({"at": ret.created_at, "kind": "RETURN", "ref": ret.number, "debit": ZERO, "credit": ret.credit_amount,
                     "text": f"Return against {ret.invoice.number}"})
    rows.sort(key=lambda r: r["at"])
    balance = ZERO
    for r in rows:
        balance += r["debit"] - r["credit"]
        r["balance"] = balance
    return rows
