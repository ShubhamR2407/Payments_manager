"""
Seed comprehensive dummy data covering every use case for manual testing.

Usage:
    python manage.py seed_data            # create/update dummy data
    python manage.py seed_data --flush    # wipe existing data first, then seed

Creates:
  - Admin user + trainer users (with login credentials printed at the end)
  - ELO rate tiers (per session type)
  - Bank accounts (UPI + bank transfer)
  - Trainers across ELO ranges and teaching levels
  - Batches of EVERY type (beginner, intermediate, advanced, residential,
    individual, home tutoring)
  - Students incl. a mid-month joiner (to test pro-rated fees)
  - Attendance records (full/half day for advanced)
  - Camps + camp enrollments + camp attendance (day-wise billing)
  - Payment cycles with fees auto-calculated from attendance
  - Payments demonstrating PAID / PARTIAL / PENDING statuses, multiple modes,
    and trainer-collected payments
  - Trainer payroll (paid + pending)
  - Monthly expenses (for profit/loss testing)
"""
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

from core.models import (
    EloRateTier, Trainer, Student, BankAccount, Batch, Enrollment,
    Camp, CampEnrollment, AttendanceRecord, TrainerAttendance,
    PaymentCycle, Payment, TrainerPayroll, MonthlyExpense,
)
from core.fee_calculator import (
    calculate_batch_fee, calculate_camp_fee,
    get_classes_attended, get_total_classes,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seed comprehensive dummy data for testing all features."

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush', action='store_true',
            help='Delete existing app data before seeding.'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write(self.style.WARNING('Flushing existing data...'))
            self._flush()

        today = date.today()
        month, year = today.month, today.year

        self.stdout.write('Seeding data...')

        admin = self._seed_admin()
        self._seed_elo_tiers()
        banks = self._seed_banks()
        trainers = self._seed_trainers()
        batches = self._seed_batches(trainers)
        students = self._seed_students()
        self._seed_enrollments(students, batches, month, year)
        self._seed_attendance(month, year)
        camp = self._seed_camp(trainers, students, month, year)
        self._seed_payment_cycles(month, year)
        self._seed_payments(admin, trainers, banks, month, year)
        self._seed_payroll(trainers, month, year)
        self._seed_expenses(month, year)

        self.stdout.write(self.style.SUCCESS('\n✅ Seed complete!\n'))
        self._print_credentials()

    # ------------------------------------------------------------------ #
    def _flush(self):
        Payment.objects.all().delete()
        PaymentCycle.objects.all().delete()
        AttendanceRecord.objects.all().delete()
        TrainerAttendance.objects.all().delete()
        CampEnrollment.objects.all().delete()
        Camp.objects.all().delete()
        Enrollment.objects.all().delete()
        Batch.objects.all().delete()
        TrainerPayroll.objects.all().delete()
        Trainer.objects.all().delete()
        Student.objects.all().delete()
        MonthlyExpense.objects.all().delete()
        EloRateTier.objects.all().delete()
        BankAccount.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    # ------------------------------------------------------------------ #
    def _seed_admin(self):
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@chessacademy.com',
                'first_name': 'Academy', 'last_name': 'Owner',
                'role': 'admin', 'is_staff': True, 'is_superuser': True,
                'phone': '9000000000', 'whatsapp_number': '+919000000000',
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write('  • Created admin user (admin / admin123)')
        return admin

    def _seed_elo_tiers(self):
        # Per session type, three ELO brackets each.
        tiers = []
        for stype in ('residential', 'individual', 'home_tutoring'):
            base = {'residential': 1000, 'individual': 600, 'home_tutoring': 800}[stype]
            tiers += [
                (stype, 0, 1499, base),
                (stype, 1500, 1999, base + 500),
                (stype, 2000, None, base + 1000),
            ]
        for stype, emin, emax, rate in tiers:
            EloRateTier.objects.get_or_create(
                session_type=stype, elo_min=emin,
                defaults={'elo_max': emax, 'rate_per_day': Decimal(rate)},
            )
        self.stdout.write('  • Created ELO rate tiers (9 brackets)')

    def _seed_banks(self):
        banks = {}
        for label, last4, upi in [
            ('HDFC Primary', '4521', 'academy@hdfcbank'),
            ('SBI Savings', '8830', 'chessacad@sbi'),
            ('Paytm UPI', '', 'academy@paytm'),
        ]:
            b, _ = BankAccount.objects.get_or_create(
                label=label, defaults={'account_last4': last4, 'upi_id': upi}
            )
            banks[label] = b
        self.stdout.write('  • Created bank accounts (3)')
        return banks

    def _seed_trainers(self):
        data = [
            # username, first, last, elo, salary, max_level
            ('coach_arjun', 'Arjun', 'Mehta', 2150, 45000, 'advanced'),
            ('coach_priya', 'Priya', 'Sharma', 1850, 35000, 'advanced'),
            ('coach_rohit', 'Rohit', 'Verma', 1450, 25000, 'intermediate'),
            ('coach_neha', 'Neha', 'Patel', 1250, 20000, 'beginner'),
        ]
        trainers = {}
        for uname, fn, ln, elo, salary, level in data:
            user, created = User.objects.get_or_create(
                username=uname,
                defaults={
                    'email': f'{uname}@chessacademy.com',
                    'first_name': fn, 'last_name': ln, 'role': 'trainer',
                    'phone': f'98{elo}00000'[:10],
                    'whatsapp_number': f'+9198{elo}0000'[:13],
                }
            )
            if created:
                user.set_password('trainer123')
                user.save()
            t, _ = Trainer.objects.get_or_create(
                user=user,
                defaults={
                    'elo_rating': elo, 'monthly_salary': Decimal(salary),
                    'max_level': level, 'is_active': True,
                }
            )
            trainers[uname] = t
        self.stdout.write('  • Created trainers (4) — login trainer123')
        return trainers

    def _seed_batches(self, trainers):
        b = {}
        b['beginner_m'], _ = Batch.objects.get_or_create(
            name='Beginner Morning A', defaults=dict(
                batch_type='beginner', shift='morning',
                trainer=trainers['coach_neha'], start_date=date(2025, 1, 5),
                monthly_fee=Decimal(2500), classes_per_month=12, is_active=True))
        b['beginner_e'], _ = Batch.objects.get_or_create(
            name='Beginner Evening B', defaults=dict(
                batch_type='beginner', shift='evening',
                trainer=trainers['coach_neha'], start_date=date(2025, 2, 1),
                monthly_fee=Decimal(2500), classes_per_month=12, is_active=True))
        b['inter_m'], _ = Batch.objects.get_or_create(
            name='Intermediate Morning', defaults=dict(
                batch_type='intermediate', shift='morning',
                trainer=trainers['coach_rohit'], start_date=date(2025, 1, 10),
                monthly_fee=Decimal(3000), classes_per_month=12, is_active=True))
        b['advanced'], _ = Batch.objects.get_or_create(
            name='Advanced Squad', defaults=dict(
                batch_type='advanced', shift='evening',
                trainer=trainers['coach_arjun'], start_date=date(2025, 1, 1),
                full_day_rate=Decimal(1000), half_day_rate=Decimal(500), is_active=True))
        b['residential'], _ = Batch.objects.get_or_create(
            name='Residential Program', defaults=dict(
                batch_type='residential', shift='both',
                trainer=trainers['coach_arjun'], start_date=date(2025, 1, 1), is_active=True))
        b['individual'], _ = Batch.objects.get_or_create(
            name='Individual Coaching', defaults=dict(
                batch_type='individual', shift='na',
                trainer=trainers['coach_priya'], start_date=date(2025, 3, 1), is_active=True))
        b['home'], _ = Batch.objects.get_or_create(
            name='Home Tutoring', defaults=dict(
                batch_type='home_tutoring', shift='na',
                trainer=trainers['coach_priya'], start_date=date(2025, 3, 1), is_active=True))
        self.stdout.write('  • Created batches (7) — every type')
        return b

    def _seed_students(self):
        names = [
            ('Aarav Gupta', 'Suresh Gupta'),
            ('Diya Singh', 'Rajesh Singh'),
            ('Vivaan Reddy', 'Kiran Reddy'),
            ('Ananya Nair', 'Mohan Nair'),
            ('Ishaan Joshi', 'Deepak Joshi'),
            ('Saanvi Rao', 'Venkat Rao'),
            ('Kabir Khan', 'Imran Khan'),
            ('Myra Desai', 'Nikhil Desai'),
        ]
        students = []
        for i, (name, parent) in enumerate(names):
            s, _ = Student.objects.get_or_create(
                name=name,
                defaults=dict(
                    parent_name=parent,
                    phone=f'90000000{i:02d}',
                    whatsapp_number=f'+9190000000{i:02d}',
                    join_date=date(2025, 1, 15),
                    is_active=True,
                )
            )
            students.append(s)
        self.stdout.write('  • Created students (8)')
        return students

    def _seed_enrollments(self, students, batches, month, year):
        first = date(year, month, 1)
        # mid-month join date (15th) to test pro-rated fee
        mid = date(year, month, 15)

        plan = [
            (students[0], batches['beginner_m'], date(2025, 1, 15)),
            (students[1], batches['beginner_m'], date(2025, 2, 1)),
            (students[2], batches['beginner_e'], date(2025, 2, 5)),
            (students[3], batches['inter_m'], date(2025, 1, 20)),
            (students[4], batches['inter_m'], mid),          # mid-month joiner
            (students[5], batches['advanced'], date(2025, 1, 1)),
            (students[6], batches['advanced'], date(2025, 1, 1)),
            (students[7], batches['residential'], date(2025, 1, 1)),
            # multi-enrollment: student already in advanced also takes individual
            (students[5], batches['individual'], date(2025, 3, 1)),
            (students[3], batches['home'], date(2025, 3, 1)),
        ]
        self._enrollments = []
        for student, batch, jdate in plan:
            e, _ = Enrollment.objects.get_or_create(
                student=student, batch=batch,
                defaults=dict(join_date=jdate, is_active=True),
            )
            self._enrollments.append(e)
        self.stdout.write('  • Created enrollments (incl. mid-month joiner & multi-enrollment)')

    def _seed_attendance(self, month, year):
        """Mark attendance for the current month for each enrollment."""
        # Generate up to 12 class dates within the month (every ~2 days).
        class_dates = []
        d = date(year, month, 2)
        while d.month == month and len(class_dates) < 12:
            class_dates.append(d)
            d += timedelta(days=2)

        count = 0
        for e in self._enrollments:
            btype = e.batch.batch_type
            # decide how many days this enrollment attends
            if btype in ('beginner', 'intermediate'):
                attend = class_dates[:10]   # attended 10 of 12
            elif btype == 'advanced':
                attend = class_dates[:8]
            elif btype == 'residential':
                attend = class_dates[:12]
            else:  # individual / home tutoring — fewer, ad-hoc sessions
                attend = class_dates[:4]

            # respect mid-month join date
            attend = [cd for cd in attend if cd >= e.join_date or e.join_date.month != month]

            for i, cd in enumerate(attend):
                # advanced: alternate full/half day to test both rates
                stype = 'half' if (btype == 'advanced' and i % 3 == 0) else 'full'
                _, created = AttendanceRecord.objects.get_or_create(
                    enrollment=e, date=cd,
                    defaults={'present': True, 'session_type': stype},
                )
                if created:
                    count += 1
        self.stdout.write(f'  • Created attendance records ({count})')

    def _seed_camp(self, trainers, students, month, year):
        start = date(year, month, 3)
        end = date(year, month, 9)
        camp, _ = Camp.objects.get_or_create(
            name='Summer Chess Camp',
            defaults=dict(
                trainer=trainers['coach_priya'], start_date=start,
                end_date=end, daily_rate=Decimal(2000), is_active=True),
        )
        # enroll 4 students, each attending a different number of days (day-wise billing)
        camp_days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
        for idx, student in enumerate(students[:4]):
            ce, _ = CampEnrollment.objects.get_or_create(
                camp=camp, student=student,
                defaults={'payment_status': 'pending'},
            )
            days_attended = [3, 5, 7, 4][idx]   # varied attendance
            for cd in camp_days[:days_attended]:
                AttendanceRecord.objects.get_or_create(
                    camp_enrollment=ce, date=cd,
                    defaults={'present': True, 'enrollment': None},
                )
        self.stdout.write('  • Created camp + 4 enrollments (varied day-wise attendance)')
        return camp

    def _seed_payment_cycles(self, month, year):
        # Regular enrollment cycles
        for e in Enrollment.objects.filter(is_active=True).select_related('batch', 'batch__trainer'):
            fee = calculate_batch_fee(e, month, year)
            attended = get_classes_attended(e, month, year)
            total = get_total_classes(e, month, year)
            PaymentCycle.objects.update_or_create(
                enrollment=e, month=month, year=year,
                defaults=dict(fee_due=fee, classes_attended=attended, total_classes=total),
            )
        # Camp cycles
        for ce in CampEnrollment.objects.select_related('camp').all():
            fee = calculate_camp_fee(ce)
            days = AttendanceRecord.objects.filter(camp_enrollment=ce, present=True).count()
            PaymentCycle.objects.update_or_create(
                camp_enrollment=ce, month=month, year=year,
                defaults=dict(fee_due=fee, classes_attended=days, total_classes=days),
            )
        self.stdout.write('  • Generated payment cycles (auto fee calculation)')

    def _seed_payments(self, admin, trainers, banks, month, year):
        cycles = list(PaymentCycle.objects.filter(month=month, year=year))
        modes = ['upi', 'cash', 'bank_transfer']
        bank_list = list(banks.values())

        for i, cycle in enumerate(cycles):
            outcome = i % 3  # 0 = paid, 1 = partial, 2 = pending
            if outcome == 2 or cycle.fee_due <= 0:
                continue  # leave pending (no payment recorded)

            amount = cycle.fee_due if outcome == 0 else (cycle.fee_due / 2).quantize(Decimal('0.01'))
            mode = modes[i % 3]
            # every 4th payment is collected by a trainer (tests trainer-collected flow)
            by_trainer = (i % 4 == 0)
            Payment.objects.create(
                cycle=cycle,
                amount=amount,
                mode=mode,
                bank_account=bank_list[i % len(bank_list)] if mode != 'cash' else None,
                collected_by='trainer' if by_trainer else 'admin',
                collected_by_trainer=trainers['coach_arjun'] if by_trainer else None,
                recorded_by=admin,
                notes='Seed payment',
            )
            total_paid = sum(p.amount for p in cycle.payments.all())
            cycle.fee_paid = total_paid
            cycle.status = 'paid' if total_paid >= cycle.fee_due else 'partial'
            cycle.save()
            if cycle.camp_enrollment:
                ce = cycle.camp_enrollment
                ce.payment_status = cycle.status
                ce.save()
        self.stdout.write('  • Recorded payments (paid / partial / pending mix, multiple modes)')

    def _seed_payroll(self, trainers, month, year):
        for idx, t in enumerate(trainers.values()):
            hours = Decimal(['80', '60', '48', '40'][idx % 4])
            paid = (idx % 2 == 0)
            TrainerPayroll.objects.update_or_create(
                trainer=t, month=month, year=year,
                defaults=dict(
                    salary_due=t.monthly_salary,
                    hours_logged=hours,
                    salary_paid=t.monthly_salary if paid else Decimal(0),
                    status='paid' if paid else 'pending',
                    payment_date=date(year, month, 5) if paid else None,
                ),
            )
        self.stdout.write('  • Generated trainer payroll (paid + pending)')

    def _seed_expenses(self, month, year):
        for label, amount in [
            ('Rent', 25000), ('Electricity', 4000),
            ('Internet', 1500), ('Chess Boards & Supplies', 6000),
        ]:
            MonthlyExpense.objects.get_or_create(
                month=month, year=year, label=label,
                defaults={'amount': Decimal(amount)},
            )
        self.stdout.write('  • Created monthly expenses (4) for profit/loss testing')

    def _print_credentials(self):
        self.stdout.write(self.style.HTTP_INFO('Login credentials:'))
        self.stdout.write('  Admin   : admin / admin123')
        self.stdout.write('  Trainers: coach_arjun, coach_priya, coach_rohit, coach_neha / trainer123')
        self.stdout.write('')
