from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to users with role='admin'."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsTrainer(BasePermission):
    """Allow access only to users with role='trainer'."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'trainer')


class IsAdminOrTrainer(BasePermission):
    """Allow access to both admins and trainers."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.role in ('admin', 'trainer'))
