from django.db.models import Case, Exists, IntegerField, OuterRef, Q, Value, When
from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import role_required

from .importer import build_template, import_workbook
from .models import Brand, Fitment, Item, ItemCrossRef, VehicleModel, normalize_part_number
from .serializers import ItemSerializer

CAN_EDIT = ("OWNER", "STOREKEEPER")


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related("brand").prefetch_related("cross_refs", "fitments__vehicle")
    serializer_class = ItemSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [role_required(*CAN_EDIT)()]

    def perform_destroy(self, instance):
        instance.is_active = False  # never hard-delete: stock and bills will refer to items
        instance.save(update_fields=["is_active"])

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("include_inactive") != "1":
            qs = qs.filter(is_active=True)
        if p.get("brand"):
            qs = qs.filter(brand__name__iexact=p["brand"])
        if p.get("make"):
            fits = Exists(Fitment.objects.filter(item=OuterRef("pk"), vehicle__make__iexact=p["make"]))
            qs = qs.annotate(fits_make=fits).filter(fits_make=True)

        q = p.get("q", "").strip()
        if not q:
            return qs.order_by("part_number")

        name_cond = Q()
        for word in q.split():
            name_cond &= Q(name__icontains=word)
        cond = name_cond | Q(barcode__iexact=q)

        key = normalize_part_number(q)
        if not key:
            return qs.filter(cond).order_by("part_number")

        alt_hit = Exists(ItemCrossRef.objects.filter(item=OuterRef("pk"), alt_key__contains=key))
        rank = Case(
            When(part_key=key, then=Value(0)),
            When(part_key__startswith=key, then=Value(1)),
            When(alt_hit=True, then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )
        cond |= Q(part_key__contains=key) | Q(alt_hit=True)
        return qs.annotate(alt_hit=alt_hit).annotate(rank=rank).filter(cond).order_by("rank", "part_number")


class FiltersView(APIView):
    def get(self, request):
        return Response({
            "brands": list(Brand.objects.filter(items__is_active=True).values_list("name", flat=True).distinct()),
            "makes": list(VehicleModel.objects.order_by("make").values_list("make", flat=True).distinct()),
        })


class ImportView(APIView):
    permission_classes = [role_required(*CAN_EDIT)]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "Choose an Excel file (.xlsx) to import."}, status=400)
        try:
            return Response(import_workbook(f))
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        except Exception:
            return Response({"detail": "Could not read this file. Use the template (.xlsx)."}, status=400)


class TemplateView(APIView):
    def get(self, request):
        resp = HttpResponse(
            build_template(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = 'attachment; filename="item_import_template.xlsx"'
        return resp
