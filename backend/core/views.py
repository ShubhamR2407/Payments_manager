from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
import calendar
from datetime import date, datetime

from .models import (
    EloRateTier, Trainer, Student, BankAccount, Batch, Enrollment,
    Camp, CampEnrollment, AttendanceRecord, TrainerAttendance,
    PaymentCycle, Payment, TrainerPayroll, MonthlyExpense, WhatsAppReminder
)
from .serializers import (
    UserSerializer, UserCreateSerializer, EloRateTierSerializer,
    TrainerSerializer, StudentSerializer, BankAccountSerializer,
    BatchSerializer, EnrollmentSerializer, CampSerializer,
    CampEnrollmentSerializer, AttendanceRecordSerializer,
    TrainerAttendanceSerializer, PaymentCycleSerializer,
    PaymentSerializer, TrainerPayrollSerializer, MonthlyExpenseSerializer,
    WhatsAppReminderSerializer
)
from .permissions import IsAdmin, IsAdminOrTrainer
from .fee_calculator import calculate_batch_fee, calculate_camp_fee, get_classes_attended, get_total_classes
from .whatsapp import send_whatsapp_message, build_payment_reminder_message
from .email_utils import send_trainer_credentials

User = get_user_model()


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully'})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def create_user(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EloRateTierViewSet(viewsets.ModelViewSet):
    queryset = EloRateTier.objects.all()
    serializer_class = EloRateTierSerializer
    permission_classes = [IsAdmin]


class TrainerViewSet(viewsets.ModelViewSet):
    queryset = Trainer.objects.select_related('user').all()
    serializer_class = TrainerSerializer
    permission_classes = [IsAdmin]

    @action(detail=False, methods=['post'])
    def create_with_user(self, request):
        """
        Create a trainer account: auto-generates username + temp password,
        creates User + Trainer, sends credentials via SendGrid.
        Body: { first_name, last_name, email, phone, elo_rating, monthly_salary, max_level }
        """
        import secrets
        import string

        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip()
        phone = request.data.get('phone', '').strip()
        elo_rating = int(request.data.get('elo_rating', 1200))
        monthly_salary = request.data.get('monthly_salary')
        max_level = request.data.get('max_level', 'advanced')

        if not first_name or not email or not monthly_salary:
            return Response({'error': 'first_name, email, and monthly_salary are required'}, status=400)

        # Generate username from first_name + last_name
        base = (first_name + last_name).lower().replace(' ', '')
        username = base
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{counter}"
            counter += 1

        # Generate temp password
        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for _ in range(12))

        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role='trainer',
            phone=phone,
        )
        user.set_password(password)
        user.save()

        trainer = Trainer.objects.create(
            user=user,
            elo_rating=elo_rating,
            monthly_salary=monthly_salary,
            max_level=max_level,
        )

        email_result = send_trainer_credentials(email, user.get_full_name(), username, password)

        return Response({
            'trainer': TrainerSerializer(trainer).data,
            'credentials': {'username': username, 'password': password},
            'email_sent': email_result.get('success', False),
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        trainer = self.get_object()
        current_month = date.today().month
        current_year = date.today().year
        hours = TrainerAttendance.objects.filter(
            trainer=trainer,
            date__year=current_year,
            date__month=current_month
        ).aggregate(total=Sum('hours_logged'))['total'] or 0
        payroll = TrainerPayroll.objects.filter(
            trainer=trainer, month=current_month, year=current_year
        ).first()
        return Response({
            'hours_this_month': float(hours),
            'payroll': TrainerPayrollSerializer(payroll).data if payroll else None,
            'active_batches': trainer.batches.filter(is_active=True).count(),
        })


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(parent_name__icontains=search) | Q(phone__icontains=search))
        active = self.request.query_params.get('is_active')
        if active is not None:
            qs = qs.filter(is_active=active.lower() == 'true')
        return qs

    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        student = self.get_object()
        cycles = PaymentCycle.objects.filter(
            Q(enrollment__student=student) | Q(camp_enrollment__student=student)
        ).prefetch_related('payments')
        return Response(PaymentCycleSerializer(cycles, many=True).data)

    @action(detail=True, methods=['get'])
    def enrollments(self, request, pk=None):
        student = self.get_object()
        enrollments = Enrollment.objects.filter(student=student).select_related('batch')
        return Response(EnrollmentSerializer(enrollments, many=True).data)


class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.all()
    serializer_class = BankAccountSerializer
    permission_classes = [IsAdmin]


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.select_related('trainer').all()
    serializer_class = BatchSerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'trainer':
            try:
                trainer = self.request.user.trainer_profile
                qs = qs.filter(trainer=trainer)
            except Exception:
                qs = qs.none()
        active = self.request.query_params.get('is_active')
        if active is not None:
            qs = qs.filter(is_active=active.lower() == 'true')
        return qs

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        batch = self.get_object()
        enrollments = batch.enrollments.filter(is_active=True).select_related('student')
        return Response(EnrollmentSerializer(enrollments, many=True).data)


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related('student', 'batch').all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        qs = super().get_queryset()
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Deactivate this enrollment (and optionally all enrollments for the student).
        Body: { deactivate_all: bool }
        Applies mid-month fee rule: if student attended ≤ half the classes this month,
        fee is halved for current cycle.
        """
        enrollment = self.get_object()
        deactivate_all = request.data.get('deactivate_all', False)
        today = date.today()

        def _deactivate_enrollment(enr):
            enr.is_active = False
            enr.deactivation_date = today
            enr.save()
            # Mid-month fee rule: find or create current cycle
            cycle = PaymentCycle.objects.filter(
                enrollment=enr, month=today.month, year=today.year
            ).first()
            if cycle and cycle.status != 'paid':
                total = cycle.total_classes or 1
                attended = cycle.classes_attended or 0
                if attended <= total / 2:
                    cycle.fee_due = cycle.fee_due / 2
                    cycle.save()

        if deactivate_all:
            for enr in Enrollment.objects.filter(student=enrollment.student, is_active=True):
                _deactivate_enrollment(enr)
        else:
            _deactivate_enrollment(enrollment)

        return Response({'message': 'Deactivated successfully'})


class CampViewSet(viewsets.ModelViewSet):
    queryset = Camp.objects.select_related('trainer').all()
    serializer_class = CampSerializer
    permission_classes = [IsAdminOrTrainer]

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        camp = self.get_object()
        enrollments = camp.enrollments.all().select_related('student')
        return Response(CampEnrollmentSerializer(enrollments, many=True).data)


class CampEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = CampEnrollment.objects.select_related('camp', 'student').all()
    serializer_class = CampEnrollmentSerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        qs = super().get_queryset()
        camp_id = self.request.query_params.get('camp')
        if camp_id:
            qs = qs.filter(camp_id=camp_id)
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        qs = super().get_queryset()
        enrollment_id = self.request.query_params.get('enrollment')
        if enrollment_id:
            qs = qs.filter(enrollment_id=enrollment_id)
        date_str = self.request.query_params.get('date')
        if date_str:
            qs = qs.filter(date=date_str)
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            qs = qs.filter(enrollment__batch_id=batch_id)
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)
        return qs

    @action(detail=False, methods=['post'])
    def bulk_entry(self, request):
        """
        Bulk attendance entry for a batch on a given date.
        Body: { batch_id, date, records: [{enrollment_id, present, session_type}] }
        """
        batch_id = request.data.get('batch_id')
        date_str = request.data.get('date')
        records = request.data.get('records', [])

        if not batch_id or not date_str:
            return Response({'error': 'batch_id and date required'}, status=400)

        results = []
        for rec in records:
            enrollment_id = rec.get('enrollment_id')
            present = rec.get('present', False)
            session_type = rec.get('session_type', 'full')
            hours = rec.get('hours')
            obj, created = AttendanceRecord.objects.update_or_create(
                enrollment_id=enrollment_id,
                date=date_str,
                defaults={'present': present, 'session_type': session_type, 'hours': hours}
            )
            results.append(AttendanceRecordSerializer(obj).data)
        return Response(results)

    @action(detail=False, methods=['get'])
    def student_summary(self, request):
        """
        Attendance summary for a student over a month or date range.
        Params: enrollment_id, month, year (or date_from + date_to)
        """
        enrollment_id = request.query_params.get('enrollment_id')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not enrollment_id:
            return Response({'error': 'enrollment_id required'}, status=400)

        qs = AttendanceRecord.objects.filter(enrollment_id=enrollment_id)
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)
        elif date_from and date_to:
            qs = qs.filter(date__gte=date_from, date__lte=date_to)

        records = list(qs.order_by('date').values('date', 'present', 'session_type', 'hours'))
        total = len(records)
        present_count = sum(1 for r in records if r['present'])
        pct = round(present_count / total * 100, 1) if total > 0 else 0

        return Response({
            'total_sessions': total,
            'present': present_count,
            'absent': total - present_count,
            'attendance_pct': pct,
            'records': records,
        })

    @action(detail=False, methods=['post'])
    def bulk_camp_entry(self, request):
        """
        Bulk attendance entry for a camp on a given date.
        Body: { camp_id, date, records: [{camp_enrollment_id, present}] }
        """
        date_str = request.data.get('date')
        records = request.data.get('records', [])

        if not date_str:
            return Response({'error': 'date required'}, status=400)

        results = []
        for rec in records:
            ce_id = rec.get('camp_enrollment_id')
            present = rec.get('present', False)
            # For camp attendance, we use camp_enrollment FK
            # unique_together is on enrollment+date, so for camp use separate logic
            obj, created = AttendanceRecord.objects.get_or_create(
                camp_enrollment_id=ce_id,
                date=date_str,
                defaults={'present': present, 'enrollment': None}
            )
            if not created:
                obj.present = present
                obj.save()
            results.append(AttendanceRecordSerializer(obj).data)
        return Response(results)


class TrainerAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TrainerAttendance.objects.all()
    serializer_class = TrainerAttendanceSerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        qs = super().get_queryset()
        trainer_id = self.request.query_params.get('trainer')
        if trainer_id:
            qs = qs.filter(trainer_id=trainer_id)
        batch_id = self.request.query_params.get('batch')
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        date_str = self.request.query_params.get('date')
        if date_str:
            qs = qs.filter(date=date_str)
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)
        return qs

    @action(detail=False, methods=['post'])
    def bulk_entry(self, request):
        """
        Bulk trainer attendance entry for a batch on a given date.
        Body: { batch_id, date, records: [{trainer_id, present, cancelled_by_trainer, hours_logged}] }
        """
        batch_id = request.data.get('batch_id')
        date_str = request.data.get('date')
        records = request.data.get('records', [])

        if not batch_id or not date_str:
            return Response({'error': 'batch_id and date required'}, status=400)

        results = []
        for rec in records:
            trainer_id = rec.get('trainer_id')
            present = rec.get('present', True)
            cancelled = rec.get('cancelled_by_trainer', False)
            hours = rec.get('hours_logged', 0)
            obj, _ = TrainerAttendance.objects.update_or_create(
                trainer_id=trainer_id,
                batch_id=batch_id,
                date=date_str,
                defaults={'present': present, 'cancelled_by_trainer': cancelled, 'hours_logged': hours}
            )
            results.append(TrainerAttendanceSerializer(obj).data)
        return Response(results)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Attendance summary for a trainer over a date range or month.
        Params: trainer_id, month, year (or date_from + date_to)
        """
        trainer_id = request.query_params.get('trainer_id')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not trainer_id:
            return Response({'error': 'trainer_id required'}, status=400)

        qs = TrainerAttendance.objects.filter(trainer_id=trainer_id)
        if month and year:
            qs = qs.filter(date__month=month, date__year=year)
        elif date_from and date_to:
            qs = qs.filter(date__gte=date_from, date__lte=date_to)

        records = list(qs.order_by('date').values('date', 'present', 'cancelled_by_trainer', 'hours_logged', 'batch_id'))
        total = len(records)
        present_count = sum(1 for r in records if r['present'])
        pct = round(present_count / total * 100, 1) if total > 0 else 0

        return Response({
            'total_sessions': total,
            'present': present_count,
            'absent': total - present_count,
            'attendance_pct': pct,
            'records': records,
        })


class PaymentCycleViewSet(viewsets.ModelViewSet):
    queryset = PaymentCycle.objects.all()
    serializer_class = PaymentCycleSerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        qs = super().get_queryset()
        enrollment_id = self.request.query_params.get('enrollment')
        if enrollment_id:
            qs = qs.filter(enrollment_id=enrollment_id)
        student_id = self.request.query_params.get('student')
        if student_id:
            qs = qs.filter(Q(enrollment__student_id=student_id) | Q(camp_enrollment__student_id=student_id))
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        return qs

    @action(detail=False, methods=['post'])
    def generate_for_month(self, request):
        """
        Auto-generate payment cycles for all active enrollments for a given month/year.
        Body: { month, year }
        """
        month = int(request.data.get('month', date.today().month))
        year = int(request.data.get('year', date.today().year))

        created_count = 0
        updated_count = 0

        for enrollment in Enrollment.objects.filter(is_active=True).select_related('batch', 'batch__trainer'):
            fee = calculate_batch_fee(enrollment, month, year)
            classes_attended = get_classes_attended(enrollment, month, year)
            total_classes = get_total_classes(enrollment, month, year)

            cycle, created = PaymentCycle.objects.get_or_create(
                enrollment=enrollment,
                month=month,
                year=year,
                defaults={
                    'fee_due': fee,
                    'classes_attended': classes_attended,
                    'total_classes': total_classes,
                }
            )
            if not created:
                cycle.fee_due = fee
                cycle.classes_attended = classes_attended
                cycle.total_classes = total_classes
                cycle.save()
                updated_count += 1
            else:
                created_count += 1

        return Response({
            'message': f'Generated cycles for {month}/{year}',
            'created': created_count,
            'updated': updated_count
        })


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('cycle', 'recorded_by').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminOrTrainer]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'trainer':
            try:
                trainer = self.request.user.trainer_profile
                qs = qs.filter(cycle__enrollment__batch__trainer=trainer)
            except Exception:
                qs = qs.none()
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
        return qs

    def perform_create(self, serializer):
        payment = serializer.save(recorded_by=self.request.user)
        # Update cycle fee_paid and status
        cycle = payment.cycle
        total_paid = cycle.payments.aggregate(s=Sum('amount'))['s'] or 0
        cycle.fee_paid = total_paid
        if total_paid >= cycle.fee_due:
            cycle.status = 'paid'
        elif total_paid > 0:
            cycle.status = 'partial'
        else:
            cycle.status = 'pending'
        cycle.save()

        # Update camp enrollment payment_status if applicable
        if cycle.camp_enrollment:
            ce = cycle.camp_enrollment
            camp_total_due = sum(c.fee_due for c in ce.payment_cycles.all())
            camp_total_paid = sum(c.fee_paid for c in ce.payment_cycles.all())
            if camp_total_paid >= camp_total_due:
                ce.payment_status = 'paid'
            elif camp_total_paid > 0:
                ce.payment_status = 'partial'
            ce.save()


class TrainerPayrollViewSet(viewsets.ModelViewSet):
    queryset = TrainerPayroll.objects.select_related('trainer').all()
    serializer_class = TrainerPayrollSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        trainer_id = self.request.query_params.get('trainer')
        if trainer_id:
            qs = qs.filter(trainer_id=trainer_id)
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        return qs

    @action(detail=False, methods=['post'])
    def generate_for_month(self, request):
        """Auto-generate payroll records for all active trainers."""
        month = int(request.data.get('month', date.today().month))
        year = int(request.data.get('year', date.today().year))

        created = 0
        for trainer in Trainer.objects.filter(is_active=True):
            hours = TrainerAttendance.objects.filter(
                trainer=trainer,
                date__month=month,
                date__year=year,
                present=True
            ).aggregate(total=Sum('hours_logged'))['total'] or 0

            payroll, is_new = TrainerPayroll.objects.get_or_create(
                trainer=trainer,
                month=month,
                year=year,
                defaults={
                    'salary_due': trainer.monthly_salary,
                    'hours_logged': hours,
                }
            )
            if not is_new:
                payroll.hours_logged = hours
                payroll.save()
            else:
                created += 1

        return Response({'message': f'Payroll generated for {month}/{year}', 'created': created})

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        payroll = self.get_object()
        amount = request.data.get('amount', payroll.salary_due)
        payroll.salary_paid = amount
        payroll.status = 'paid'
        payroll.payment_date = date.today()
        payroll.notes = request.data.get('notes', '')
        payroll.save()
        return Response(TrainerPayrollSerializer(payroll).data)


class MonthlyExpenseViewSet(viewsets.ModelViewSet):
    queryset = MonthlyExpense.objects.all()
    serializer_class = MonthlyExpenseSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        return qs


class WhatsAppReminderViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppReminder.objects.select_related('student', 'cycle').all()
    serializer_class = WhatsAppReminderSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """
        Send WhatsApp reminders for all unpaid/partial cycles.
        Optionally filter by month/year.
        """
        month = request.data.get('month', date.today().month)
        year = request.data.get('year', date.today().year)

        cycles = PaymentCycle.objects.filter(
            status__in=['pending', 'partial'],
            month=month,
            year=year
        ).select_related('enrollment__student', 'camp_enrollment__student')

        sent = 0
        failed = 0
        for cycle in cycles:
            if cycle.enrollment:
                student = cycle.enrollment.student
            elif cycle.camp_enrollment:
                student = cycle.camp_enrollment.student
            else:
                continue

            month_name = calendar.month_name[int(month)]
            balance = cycle.fee_due - cycle.fee_paid
            message = build_payment_reminder_message(
                student.parent_name, student.name, balance, month_name
            )

            reminder = WhatsAppReminder.objects.create(
                student=student,
                cycle=cycle,
                message=message,
                status='pending'
            )

            result = send_whatsapp_message(student.whatsapp_number, message)
            if result['success']:
                reminder.status = 'sent'
                reminder.sent_at = timezone.now()
                sent += 1
            else:
                reminder.status = 'failed'
                reminder.error_message = result['error']
                failed += 1
            reminder.save()

        return Response({'sent': sent, 'failed': failed})

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send a single WhatsApp reminder."""
        reminder = self.get_object()
        result = send_whatsapp_message(reminder.student.whatsapp_number, reminder.message)
        if result['success']:
            reminder.status = 'sent'
            reminder.sent_at = timezone.now()
            reminder.error_message = ''
        else:
            reminder.status = 'failed'
            reminder.error_message = result['error']
        reminder.save()
        return Response(WhatsAppReminderSerializer(reminder).data)


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTrainer]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        today = date.today()
        current_month = today.month
        current_year = today.year

        total_students = Student.objects.filter(is_active=True).count()
        total_trainers = Trainer.objects.filter(is_active=True).count()
        total_batches = Batch.objects.filter(is_active=True).count()

        # Unpaid dues this month
        unpaid_cycles = PaymentCycle.objects.filter(
            status__in=['pending', 'partial'],
            month=current_month,
            year=current_year
        )
        total_unpaid = unpaid_cycles.aggregate(
            s=Sum('fee_due')
        )['s'] or 0
        total_paid = unpaid_cycles.aggregate(
            s=Sum('fee_paid')
        )['s'] or 0
        unpaid_balance = float(total_unpaid) - float(total_paid)

        # Today's attendance
        today_attendance = AttendanceRecord.objects.filter(date=today, present=True).count()
        today_total = AttendanceRecord.objects.filter(date=today).count()

        # Monthly collections
        monthly_collected = Payment.objects.filter(
            timestamp__month=current_month,
            timestamp__year=current_year
        ).aggregate(s=Sum('amount'))['s'] or 0

        # Monthly expenses
        monthly_expenses = MonthlyExpense.objects.filter(
            month=current_month, year=current_year
        ).aggregate(s=Sum('amount'))['s'] or 0

        # Salary due
        salary_due = TrainerPayroll.objects.filter(
            month=current_month, year=current_year, status='pending'
        ).aggregate(s=Sum('salary_due'))['s'] or 0

        return Response({
            'total_students': total_students,
            'total_trainers': total_trainers,
            'total_batches': total_batches,
            'unpaid_balance': unpaid_balance,
            'unpaid_cycles_count': unpaid_cycles.count(),
            'today_attendance': today_attendance,
            'today_total_scheduled': today_total,
            'monthly_collected': float(monthly_collected),
            'monthly_expenses': float(monthly_expenses),
            'salary_due': float(salary_due),
            'month': current_month,
            'year': current_year,
        })

    @action(detail=False, methods=['get'])
    def monthly_profit(self, request):
        """Return profit breakdown for recent months."""
        results = []
        today = date.today()
        for i in range(12):
            month = today.month - i
            year = today.year
            while month <= 0:
                month += 12
                year -= 1

            collected = Payment.objects.filter(
                timestamp__month=month,
                timestamp__year=year
            ).aggregate(s=Sum('amount'))['s'] or 0

            expenses = MonthlyExpense.objects.filter(
                month=month, year=year
            ).aggregate(s=Sum('amount'))['s'] or 0

            salaries = TrainerPayroll.objects.filter(
                month=month, year=year
            ).aggregate(s=Sum('salary_paid'))['s'] or 0

            profit = float(collected) - float(expenses) - float(salaries)
            results.append({
                'month': month,
                'year': year,
                'month_name': calendar.month_name[month],
                'collected': float(collected),
                'expenses': float(expenses),
                'salaries': float(salaries),
                'profit': profit,
            })

        return Response(results)
