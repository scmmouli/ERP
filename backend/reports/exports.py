from io import BytesIO

from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.styles import Font

from catalog.models import Item
from catalog.views import STOCK
from payments.services import ageing
from sales.models import SalesInvoice

from .services import avg_cost_map, customers_with_balance, sales_report

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _num(v):
    return float(v) if v is not None else None


def _sheet(ws, headers, rows):
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(bold=True)
    for r in rows:
        ws.append(r)
    for i, h in enumerate(headers, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = max(14, len(h) + 4)


def _response(wb, filename):
    buf = BytesIO()
    wb.save(buf)
    resp = HttpResponse(buf.getvalue(), content_type=XLSX)
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


def sales_workbook(start, end):
    data = sales_report(start, end)
    wb = Workbook()
    k = data["kpis"]
    _sheet(wb.active, ["Measure", "Value"], [
        ["Period", f"{start} to {end}"], ["Total billed (incl. GST)", _num(k["billed"])],
        ["Net sales (excl. GST, after returns)", _num(k["net_sales"])], ["Invoices", k["invoices"]],
        ["Average bill", _num(k["avg_bill"])], ["Returns (credit notes)", _num(k["returns"])],
        ["Credit sales (unpaid at billing)", _num(k["credit_sales"])],
        ["Estimated gross profit", _num(k["gross_profit"])], ["Margin %", k["margin_pct"]],
        ["Items sold with no cost recorded", k["uncosted_items"]],
    ])
    wb.active.title = "Summary"
    bills = SalesInvoice.objects.filter(created_at__date__gte=start, created_at__date__lte=end).select_related("customer", "created_by").order_by("created_at")
    _sheet(wb.create_sheet("Bills"), ["Bill", "Date", "Customer", "Payment", "Taxable", "GST", "Total", "Paid", "Due", "Billed by"], [
        [b.number, b.created_at.astimezone().strftime("%Y-%m-%d %H:%M"), b.customer.name if b.customer else "Walk-in", b.payment_mode,
         _num(b.subtotal), _num(b.cgst + b.sgst + b.igst), _num(b.total), _num(b.paid), _num(b.total - b.paid), b.created_by.username]
        for b in bills])
    _sheet(wb.create_sheet("Top items"), ["Part number", "Name", "Qty", "Net sales", "Est. profit", "Margin %"],
           [[i["part_number"], i["name"], _num(i["qty"]), _num(i["revenue"]), _num(i["profit"]), i["margin_pct"]] for i in data["top_items"]])
    return _response(wb, f"sales_{start}_to_{end}.xlsx")


def stock_workbook():
    costs = avg_cost_map()
    rows = []
    for i in Item.objects.filter(is_active=True).annotate(stock=STOCK).select_related("brand").order_by("part_number"):
        cost = costs.get(i.pk)
        rows.append([i.part_number, i.name, i.brand.name if i.brand else "", i.rack, _num(i.stock), i.reorder_level,
                     round(float(cost), 2) if cost is not None else None,
                     round(float(i.stock * cost), 2) if cost is not None and i.stock > 0 else None,
                     _num(i.mrp), _num(i.sale_price)])
    wb = Workbook()
    _sheet(wb.active, ["Part number", "Name", "Brand", "Rack", "In stock", "Reorder level", "Avg cost", "Stock value", "MRP", "Sale price"], rows)
    wb.active.title = "Stock"
    return _response(wb, "stock.xlsx")


def outstanding_workbook():
    rows = []
    for c in customers_with_balance():
        a = ageing(c)
        b = a["buckets"]
        rows.append([c.name, c.phone, c.get_kind_display(), _num(c.owed), _num(a["overdue"]), _num(b["current"]),
                     _num(b["d31_60"]), _num(b["d61_90"]), _num(b["d90_plus"]), _num(c.credit_limit)])
    wb = Workbook()
    _sheet(wb.active, ["Customer", "Phone", "Type", "Outstanding", "Overdue", "0-30 days", "31-60 days", "61-90 days", "Over 90 days", "Credit limit"], rows)
    wb.active.title = "Outstanding"
    return _response(wb, "outstanding.xlsx")
