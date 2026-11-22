from datetime import date, timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import role_required

from . import exports, services

OWNER = [role_required("OWNER")]


def parse_range(request):
    today = timezone.localdate()
    p = request.query_params
    try:
        start = date.fromisoformat(p["from"]) if p.get("from") else today.replace(day=1)
        end = date.fromisoformat(p["to"]) if p.get("to") else today
    except ValueError:
        raise ValidationError({"detail": "Dates must look like 2026-11-21."})
    if start > end:
        raise ValidationError({"detail": "The start date is after the end date."})
    if end - start > timedelta(days=366):
        raise ValidationError({"detail": "Choose a period of one year or less."})
    return start, end


class DashboardView(APIView):
    def get(self, request):
        return Response(services.dashboard() if request.user.role == "OWNER" else services.limited_dashboard())


class SalesReportView(APIView):
    permission_classes = OWNER

    def get(self, request):
        return Response(services.sales_report(*parse_range(request)))


class SalesExportView(APIView):
    permission_classes = OWNER

    def get(self, request):
        return exports.sales_workbook(*parse_range(request))


class StockExportView(APIView):
    permission_classes = [role_required("OWNER", "STOREKEEPER")]

    def get(self, request):
        return exports.stock_workbook()


class OutstandingExportView(APIView):
    permission_classes = OWNER

    def get(self, request):
        return exports.outstanding_workbook()
