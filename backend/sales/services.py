from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Sum

from catalog.models import Item
from inventory.models import default_location
from inventory.services import post_stock, stock_of

from .models import SalesInvoice, SalesInvoiceLine, SalesReturn, SalesReturnLine

TWO = Decimal("0.01")
ZERO = Decimal("0")


class BillingError(Exception):
    """A business-rule problem the counter staff can fix. The message is shown to them."""


def q(x):
    return Decimal(x).quantize(TWO, rounding=ROUND_HALF_UP)


def compute_line(qty, rate, discount, gst_rate, inter_state):
    gross = q(qty * rate)
    after_discount = gross - discount
    if settings.PRICES_INCLUDE_GST:
        taxable = q(after_discount * 100 / (100 + gst_rate))
        gst = after_discount - taxable
    else:
        taxable = after_discount
        gst = q(taxable * gst_rate / 100)
    if inter_state:
        cgst = sgst = ZERO
        igst = gst
    else:
        cgst = q(gst / 2)
        sgst = gst - cgst
        igst = ZERO
    return {"taxable": taxable, "cgst": cgst, "sgst": sgst, "igst": igst, "amount": taxable + gst}


def customer_outstanding(customer) -> Decimal:
    inv = SalesInvoice.objects.filter(customer=customer).aggregate(t=Sum("total"), p=Sum("paid"))
    ret = SalesReturn.objects.filter(invoice__customer=customer).aggregate(c=Sum("credit_amount"))
    from payments.models import Receipt  # imported here to avoid a circular import

    rec = Receipt.objects.filter(customer=customer).aggregate(t=Sum("amount"))["t"] or ZERO
    return (inv["t"] or ZERO) - (inv["p"] or ZERO) - (ret["c"] or ZERO) - rec


@transaction.atomic
def create_invoice(*, user, customer, lines, payment_mode, paid):
    if not lines:
        raise BillingError("Add at least one part to the bill.")
    inter_state = bool(customer and customer.state_code != settings.SHOP_STATE_CODE)

    list(Item.objects.select_for_update().filter(pk__in={l["item"].pk for l in lines}))  # lock rows

    wanted = defaultdict(lambda: ZERO)
    for l in lines:
        wanted[l["item"].pk] += l["qty"]
    for l in lines:
        item = l["item"]
        available = stock_of(item)
        if wanted[item.pk] > available:
            raise BillingError(f"{item.part_number}: only {available:g} in stock, bill has {wanted[item.pk]:g}.")

    built, totals = [], defaultdict(lambda: ZERO)
    for l in lines:
        item, qty, rate, discount = l["item"], l["qty"], l["rate"], l.get("discount") or ZERO
        if user.role != "OWNER" and rate != item.sale_price:
            raise BillingError(f"{item.part_number}: only the owner can change a price. Use a discount instead.")
        gross = q(qty * rate)
        if discount > gross:
            raise BillingError(f"{item.part_number}: discount is more than the line value.")
        if user.role == "COUNTER" and gross > 0:
            pct = discount * 100 / gross
            if pct > settings.COUNTER_MAX_DISCOUNT_PERCENT:
                raise BillingError(
                    f"{item.part_number}: discount is {pct:.1f}%. Counter staff can give up to "
                    f"{settings.COUNTER_MAX_DISCOUNT_PERCENT}%. Ask the owner."
                )
        c = compute_line(qty, rate, discount, item.gst_rate, inter_state)
        built.append((l, c))
        for k in ("taxable", "cgst", "sgst", "igst"):
            totals[k] += c[k]

    raw_total = totals["taxable"] + totals["cgst"] + totals["sgst"] + totals["igst"]
    total = raw_total.quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    if payment_mode == "CREDIT":
        if not customer:
            raise BillingError("Choose a customer for a credit sale.")
        paid = min(paid or ZERO, total)
        due = total - paid
        if due > 0:
            limit = customer.credit_limit
            if limit <= 0:
                raise BillingError(f"{customer.name} has no credit limit. Set one on the customer first.")
            owed = customer_outstanding(customer)
            if owed + due > limit:
                raise BillingError(
                    f"Credit limit exceeded for {customer.name}: owes ₹{owed:,.2f}, limit ₹{limit:,.2f}, "
                    f"this bill adds ₹{due:,.2f}."
                )
    else:
        paid = total

    invoice = SalesInvoice.objects.create(
        customer=customer, location=default_location(), payment_mode=payment_mode, inter_state=inter_state,
        subtotal=totals["taxable"], cgst=totals["cgst"], sgst=totals["sgst"], igst=totals["igst"],
        round_off=total - raw_total, total=total, paid=paid, created_by=user,
    )
    invoice.number = f"INV-{invoice.pk:05d}"
    invoice.save(update_fields=["number"])

    for l, c in built:
        SalesInvoiceLine.objects.create(
            invoice=invoice, item=l["item"], qty=l["qty"], rate=l["rate"], discount=l.get("discount") or ZERO,
            gst_rate=l["item"].gst_rate, **c,
        )
        post_stock(item=l["item"], qty=-l["qty"], ref_type="SALE", ref_id=invoice.pk, note=invoice.number,
                   user=user, location=invoice.location)
    return invoice


@transaction.atomic
def create_return(*, user, invoice, pairs):
    """pairs: list of (SalesInvoiceLine, qty to return)."""
    if not pairs:
        raise BillingError("Choose at least one item to return.")
    rows, credit = [], ZERO
    for line, qty in pairs:
        already = line.returns.aggregate(t=Sum("qty"))["t"] or ZERO
        if qty <= 0 or qty > line.qty - already:
            raise BillingError(f"{line.item.part_number}: you can return at most {line.qty - already:g}.")
        amount = q(line.amount * qty / line.qty)
        rows.append((line, qty, amount))
        credit += amount
    ret = SalesReturn.objects.create(invoice=invoice, credit_amount=credit, created_by=user)
    ret.number = f"CN-{ret.pk:05d}"
    ret.save(update_fields=["number"])
    for line, qty, amount in rows:
        SalesReturnLine.objects.create(sales_return=ret, line=line, qty=qty, amount=amount)
        post_stock(item=line.item, qty=qty, ref_type="RETURN", ref_id=ret.pk, note=ret.number,
                   user=user, location=invoice.location)
    return ret
