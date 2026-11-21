from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FiltersView, ImportView, ItemViewSet, TemplateView

router = DefaultRouter()
router.register("items", ItemViewSet, basename="item")

urlpatterns = [
    path("filters/", FiltersView.as_view()),
    path("import/", ImportView.as_view()),
    path("import/template/", TemplateView.as_view()),
    path("", include(router.urls)),
]
