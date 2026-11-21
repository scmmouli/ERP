from django.db import transaction
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import role_required

from .models import StockLedger
from .serializers import AdjustSerializer, LedgerSerializer
from .services import post_stock, stock_of


class AdjustmentView(APIView):
    permission_classes = [role_required("OWNER", "STOREKEEPER")]

    def post(self, request):
        s = AdjustSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        item, qty = s.validated_data["item"], s.validated_data["qty"]
        with transaction.atomic():
            current = stock_of(item)
            if current + qty < 0:
                return Response({"detail": f"Stock cannot go below zero. Current stock is {current}."}, status=400)
            post_stock(item=item, qty=qty, ref_type="ADJUST", user=request.user, note=s.validated_data["reason"])
        return Response({"stock": str(stock_of(item))})


class LedgerView(ListAPIView):
    serializer_class = LedgerSerializer

    def get_queryset(self):
        qs = StockLedger.objects.select_related("item", "created_by")
        item = self.request.query_params.get("item")
        return qs.filter(item_id=item) if item else qs
