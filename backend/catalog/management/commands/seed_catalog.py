from django.core.management.base import BaseCommand

from catalog.models import Fitment, Item, ItemCrossRef, VehicleModel
from catalog.serializers import get_or_create_brand

VEHICLES = [("Maruti", "Swift Dzire", "Diesel"), ("Hyundai", "i20", ""), ("Honda", "City", "Petrol"), ("Maruti", "Alto", "")]

# part, name, brand, oem, hsn, gst, mrp, price, rack, reorder, alternates, vehicle indexes
ITEMS = [
    ("DEMO-BP-001", "Brake pad set, front", "Sample Brand A", False, "87083000", 28, 1450, 1250, "A-12", 6, ["DEMO-BP-ALT1"], [0, 1]),
    ("DEMO-BP-002", "Brake pad set, front (OEM)", "Sample OEM", True, "87083000", 28, 1900, 1750, "B-02", 4, [], [0]),
    ("DEMO-OF-001", "Oil filter", "Sample Brand B", False, "84212300", 18, 320, 270, "C-01", 10, ["DEMO-OF-ALT1", "DEMO-OF-OLD1"], [0, 1, 2]),
    ("DEMO-AF-001", "Air filter", "Sample Brand A", False, "84213100", 18, 450, 380, "C-04", 8, [], [1, 2]),
    ("DEMO-SP-001", "Spark plug", "Sample Brand B", False, "85111000", 28, 300, 240, "D-07", 12, [], [2, 3]),
    ("DEMO-CP-001", "Clutch plate", "Sample Brand A", False, "87089300", 28, 2800, 2400, "B-09", 4, [], [0]),
    ("DEMO-SH-001", "Shock absorber, front", "Sample Brand C", False, "87088000", 28, 3600, 3100, "E-03", 4, [], [1]),
    ("DEMO-WB-001", "Wiper blade", "Sample Brand C", False, "85124000", 18, 350, 290, "D-11", 6, [], [0, 1, 2, 3]),
]


class Command(BaseCommand):
    help = "Load a few sample parts for demos (safe to run again). HSN codes here are samples: verify before real use."

    def handle(self, *args, **options):
        vehicles = [VehicleModel.objects.get_or_create(make=m, model=mo, variant=v)[0] for m, mo, v in VEHICLES]
        for part, name, brand, oem, hsn, gst, mrp, price, rack, reorder, alts, fits in ITEMS:
            item, _ = Item.objects.get_or_create(part_number=part, defaults=dict(
                name=name, brand=get_or_create_brand(brand), is_oem=oem, hsn_code=hsn, gst_rate=gst,
                mrp=mrp, sale_price=price, rack=rack, reorder_level=reorder))
            for a in alts:
                ItemCrossRef.objects.get_or_create(item=item, alt_part_number=a, defaults={"alt_key": ""})
            for i in fits:
                Fitment.objects.get_or_create(item=item, vehicle=vehicles[i])
        self.stdout.write(f"Sample catalog ready: {Item.objects.count()} items.")
