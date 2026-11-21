from rest_framework.permissions import BasePermission


def role_required(*roles):
    """Usage: permission_classes = [role_required("OWNER", "COUNTER")]"""

    class _HasRole(BasePermission):
        def has_permission(self, request, view):
            u = request.user
            return bool(u and u.is_authenticated and u.role in roles)

    return _HasRole
