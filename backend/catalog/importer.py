"""Excel import for the item catalog. Change HEADERS / row handling here to match the shop's own sheet."""
import re
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.db import transaction
from openpyxl import Workbook, load_workbook

from .models import Fitment, Item, ItemCrossRef, VehicleModel
from .serializers import ALLOWED_GST, get_or_create_brand

HEADERS = [
    "Part Number", "Name", "Brand", "Type", "HSN Code", "GST Rate", "MRP", "Sale Price",
    "Unit", "Rack", "Reorder Level", "Barcode", "Alternate Part Numbers", "Fits Vehicles",
]
REQUIRED = ["part number", "name"]


def build_template() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Items"
    ws.append(HEADERS)
    for col in "ABCDEFGHIJKLMN":
        ws.column_dimensions[col].width = 22
    info = wb.create_sheet("Instructions")
    for line in [
        "Fill one row per part on the Items sheet. Only Part Number and Name are required.",
        "Type: OEM or Aftermarket (blank means Aftermarket).",
        "GST Rate: 0, 5, 12, 18 or 28 (blank means 18).",
        "Alternate Part Numbers: separate with commas.",
        "Fits Vehicles: Make / Model / Variant, separate vehicles with semicolons. Variant is optional.",
        "Example: Maruti / Swift Dzire / Diesel; Hyundai / i20",
        "If a Part Number already exists, that item is updated instead of duplicated.",
    ]:
        info.append([line])
    info.column_dimensions["A"].width = 100
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _text(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def _decimal(v, label, default="0") -> Decimal:
    t = _text(v).replace(",", "").replace("₹", "").replace("%", "")
    if not t:
        return Decimal(default)
    try:
        d = Decimal(t)
    except InvalidOperation:
        raise ValueError(f"{label} must be a number (got '{t}').")
    if d < 0:
        raise ValueError(f"{label} cannot be negative.")
    return d


def _split(v, seps):
    return [p.strip() for p in re.split(seps, _text(v)) if p.strip()]


def _import_row(r):
    part = _text(r.get("part number"))
    name = _text(r.get("name"))
    if not part or not name:
        raise ValueError("Part Number and Name are required.")
    gst = _decimal(r.get("gst rate"), "GST Rate", "18")
    if gst not in ALLOWED_GST:
        raise ValueError("GST Rate must be 0, 5, 12, 18 or 28.")
    reorder = _decimal(r.get("reorder level"), "Reorder Level")
    defaults = {
        "name": name,
        "brand": get_or_create_brand(_text(r.get("brand"))),
        "is_oem": _text(r.get("type")).lower() == "oem",
        "hsn_code": _text(r.get("hsn code"))[:8],
        "gst_rate": gst,
        "uom": _text(r.get("unit")) or "PCS",
        "mrp": _decimal(r.get("mrp"), "MRP"),
        "sale_price": _decimal(r.get("sale price"), "Sale Price"),
        "rack": _text(r.get("rack"))[:20],
        "reorder_level": int(reorder),
        "barcode": _text(r.get("barcode"))[:50],
        "is_active": True,
    }
    item = Item.objects.filter(part_number__iexact=part).first()
    created = item is None
    if created:
        item = Item(part_number=part, **defaults)
    else:
        for k, v in defaults.items():
            setattr(item, k, v)
    item.save()

    for alt in _split(r.get("alternate part numbers"), r"[,;\n]"):
        ItemCrossRef.objects.get_or_create(item=item, alt_key=re.sub(r"[^A-Z0-9]", "", alt.upper()),
                                           defaults={"alt_part_number": alt})
    for entry in _split(r.get("fits vehicles"), r";"):
        parts = [p.strip() for p in entry.split("/")]
        if len(parts) < 2 or not parts[0] or not parts[1]:
            raise ValueError(f"Vehicle '{entry}' should look like Make / Model / Variant.")
        vehicle, _ = VehicleModel.objects.get_or_create(
            make=parts[0], model=parts[1], variant=parts[2] if len(parts) > 2 else ""
        )
        Fitment.objects.get_or_create(item=item, vehicle=vehicle)
    return created


def import_workbook(file) -> dict:
    wb = load_workbook(file, read_only=True, data_only=True)
    ws = wb["Items"] if "Items" in wb.sheetnames else wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = next(rows, None)
    if not header:
        raise ValueError("The sheet is empty.")
    cols = [_text(h).lower() for h in header]
    missing = [h for h in REQUIRED if h not in cols]
    if missing:
        raise ValueError("Missing column(s): " + ", ".join(m.title() for m in missing))

    result = {"created": 0, "updated": 0, "failed": 0, "errors": []}
    for n, row in enumerate(rows, start=2):
        r = dict(zip(cols, row))
        if not any(_text(v) for v in row):
            continue
        try:
            with transaction.atomic():
                created = _import_row(r)
            result["created" if created else "updated"] += 1
        except Exception as e:  # report the row and keep going
            result["failed"] += 1
            if len(result["errors"]) < 100:
                result["errors"].append({"row": n, "message": str(e)})
    return result
