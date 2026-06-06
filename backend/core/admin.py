from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, EloRateTier, Trainer, Student, BankAccount, Batch, Enrollment,
    Camp, CampEnrollment, AttendanceRecord, TrainerAttendance,
    PaymentCycle, Payment, TrainerPayroll, MonthlyExpense, WhatsAppReminder
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    list_filter = ['role', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Academy Info', {'fields': ('role', 'phone', 'whatsapp_number')}),
    )


@admin.register(EloRateTier)
class EloRateTierAdmin(admin.ModelAdmin):
    list_display = ['session_type', 'elo_min', 'elo_max', 'rate_per_day']
    list_filter = ['session_type']


@admin.register(Trainer)
class TrainerAdmin(admin.ModelAdmin):
    list_display = ['user', 'elo_rating', 'monthly_salary', 'max_level', 'is_active']
    list_filter = ['is_active', 'max_level']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent_name', 'phone', 'join_date', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'parent_name', 'phone']


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ['label', 'account_last4', 'upi_id', 'is_active']


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ['name', 'batch_type', 'shift', 'trainer', 'start_date', 'is_active']
    list_filter = ['batch_type', 'shift', 'is_active']
    search_fields = ['name']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'batch', 'join_date', 'is_active']
    list_filter = ['is_active']
    search_fields = ['student__name', 'batch__name']


@admin.register(Camp)
class CampAdmin(admin.ModelAdmin):
    list_display = ['name', 'trainer', 'start_date', 'end_date', 'daily_rate', 'is_active']
    list_filter = ['is_active']


@admin.register(CampEnrollment)
class CampEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['camp', 'student', 'payment_status']
    list_filter = ['payment_status']


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'date', 'present', 'session_type']
    list_filter = ['present', 'session_type', 'date']
    date_hierarchy = 'date'


@admin.register(TrainerAttendance)
class TrainerAttendanceAdmin(admin.ModelAdmin):
    list_display = ['trainer', 'batch', 'date', 'present', 'hours_logged']
    list_filter = ['present', 'date']


@admin.register(PaymentCycle)
class PaymentCycleAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'month', 'year', 'fee_due', 'fee_paid', 'status']
    list_filter = ['status', 'month', 'year']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['cycle', 'amount', 'mode', 'collected_by', 'timestamp']
    list_filter = ['mode', 'collected_by']
    date_hierarchy = 'timestamp'


@admin.register(TrainerPayroll)
class TrainerPayrollAdmin(admin.ModelAdmin):
    list_display = ['trainer', 'month', 'year', 'salary_due', 'salary_paid', 'status']
    list_filter = ['status', 'month', 'year']


@admin.register(MonthlyExpense)
class MonthlyExpenseAdmin(admin.ModelAdmin):
    list_display = ['label', 'month', 'year', 'amount']
    list_filter = ['month', 'year']


@admin.register(WhatsAppReminder)
class WhatsAppReminderAdmin(admin.ModelAdmin):
    list_display = ['student', 'cycle', 'status', 'sent_at']
    list_filter = ['status']
