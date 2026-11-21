from rest_framework.routers import DefaultRouter

from .views import GoodsReceiptViewSet

router = DefaultRouter()
router.register("grns", GoodsReceiptViewSet, basename="grn")
urlpatterns = router.urls
