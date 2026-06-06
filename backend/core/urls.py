from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuthViewSet, EloRateTierViewSet, TrainerViewSet, StudentViewSet,
    BankAccountViewSet, BatchViewSet, EnrollmentViewSet, CampViewSet,
    CampEnrollmentViewSet, AttendanceViewSet, TrainerAttendanceViewSet,
    PaymentCycleViewSet, PaymentViewSet, TrainerPayrollViewSet,
    MonthlyExpenseViewSet, WhatsAppReminderViewSet, DashboardViewSet
)

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'elo-tiers', EloRateTierViewSet)
router.register(r'trainers', TrainerViewSet)
router.register(r'students', StudentViewSet)
router.register(r'bank-accounts', BankAccountViewSet)
router.register(r'batches', BatchViewSet)
router.register(r'enrollments', EnrollmentViewSet)
router.register(r'camps', CampViewSet)
router.register(r'camp-enrollments', CampEnrollmentViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'trainer-attendance', TrainerAttendanceViewSet)
router.register(r'payment-cycles', PaymentCycleViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'payroll', TrainerPayrollViewSet)
router.register(r'expenses', MonthlyExpenseViewSet)
router.register(r'reminders', WhatsAppReminderViewSet)
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
