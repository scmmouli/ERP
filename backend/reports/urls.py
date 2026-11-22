from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view()),
    path("sales/", views.SalesReportView.as_view()),
    path("sales/export/", views.SalesExportView.as_view()),
    path("stock/export/", views.StockExportView.as_view()),
    path("outstanding/export/", views.OutstandingExportView.as_view()),
]
