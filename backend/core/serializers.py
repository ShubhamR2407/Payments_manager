from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    EloRateTier, Trainer, Student, BankAccount, Batch, Enrollment,
    Camp, CampEnrollment, AttendanceRecord, TrainerAttendance,
    PaymentCycle, Payment, TrainerPayroll, MonthlyExpense, WhatsAppReminder
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'whatsapp_number']
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'whatsapp_number', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class EloRateTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = EloRateTier
        fields = '__all__'


class TrainerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Trainer
        fields = ['id', 'user', 'user_id', 'full_name', 'elo_rating', 'monthly_salary', 'is_active', 'max_level']

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class StudentSerializer(serializers.ModelSerializer):
    total_due = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'name', 'parent_name', 'phone', 'whatsapp_number', 'join_date', 'is_active', 'total_due', 'total_paid']

    def get_total_due(self, obj):
        from django.db.models import Sum
        total = PaymentCycle.objects.filter(
            enrollment__student=obj
        ).aggregate(s=Sum('fee_due'))['s'] or 0
        return float(total)

    def get_total_paid(self, obj):
        from django.db.models import Sum
        total = PaymentCycle.objects.filter(
            enrollment__student=obj
        ).aggregate(s=Sum('fee_paid'))['s'] or 0
        return float(total)


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = '__all__'


class BatchSerializer(serializers.ModelSerializer):
    trainer_name = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = [
            'id', 'name', 'batch_type', 'shift', 'trainer', 'trainer_name',
            'start_date', 'is_active', 'monthly_fee', 'full_day_rate',
            'half_day_rate', 'classes_per_month', 'enrollment_count'
        ]

    def get_trainer_name(self, obj):
        return str(obj.trainer)

    def get_enrollment_count(self, obj):
        return obj.enrollments.filter(is_active=True).count()


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    batch_name = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'student_name', 'batch', 'batch_name', 'join_date', 'is_active', 'fee_override']

    def get_student_name(self, obj):
        return obj.student.name

    def get_batch_name(self, obj):
        return str(obj.batch)


class CampSerializer(serializers.ModelSerializer):
    trainer_name = serializers.SerializerMethodField()
    total_days = serializers.ReadOnlyField()
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model = Camp
        fields = ['id', 'name', 'trainer', 'trainer_name', 'start_date', 'end_date', 'daily_rate', 'is_active', 'total_days', 'enrollment_count']

    def get_trainer_name(self, obj):
        return str(obj.trainer)

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class CampEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    camp_name = serializers.SerializerMethodField()

    class Meta:
        model = CampEnrollment
        fields = ['id', 'camp', 'camp_name', 'student', 'student_name', 'payment_status']

    def get_student_name(self, obj):
        return obj.student.name

    def get_camp_name(self, obj):
        return str(obj.camp)


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = ['id', 'enrollment', 'camp_enrollment', 'date', 'present', 'session_type']


class TrainerAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerAttendance
        fields = '__all__'


class PaymentCycleSerializer(serializers.ModelSerializer):
    balance = serializers.ReadOnlyField()
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentCycle
        fields = [
            'id', 'enrollment', 'camp_enrollment', 'month', 'year',
            'total_classes', 'classes_attended', 'fee_due', 'fee_paid',
            'status', 'balance', 'student_name'
        ]

    def get_student_name(self, obj):
        if obj.enrollment:
            return obj.enrollment.student.name
        if obj.camp_enrollment:
            return obj.camp_enrollment.student.name
        return ''


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'cycle', 'amount', 'mode', 'bank_account', 'collected_by',
            'collected_by_trainer', 'recorded_by', 'recorded_by_name',
            'screenshot', 'timestamp', 'notes'
        ]
        read_only_fields = ['recorded_by', 'timestamp']

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.get_full_name() or obj.recorded_by.username


class TrainerPayrollSerializer(serializers.ModelSerializer):
    trainer_name = serializers.SerializerMethodField()

    class Meta:
        model = TrainerPayroll
        fields = '__all__'

    def get_trainer_name(self, obj):
        return str(obj.trainer)


class MonthlyExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyExpense
        fields = '__all__'


class WhatsAppReminderSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppReminder
        fields = '__all__'

    def get_student_name(self, obj):
        return obj.student.name
