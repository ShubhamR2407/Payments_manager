from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = [('admin', 'Admin'), ('trainer', 'Trainer')]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')
    phone = models.CharField(max_length=15, blank=True)
    whatsapp_number = models.CharField(max_length=15, blank=True)


class EloRateTier(models.Model):
    SESSION_TYPES = [
        ('residential', 'Residential'),
        ('individual', 'Individual'),
        ('home_tutoring', 'Home Tutoring'),
    ]
    session_type = models.CharField(max_length=30, choices=SESSION_TYPES)
    elo_min = models.IntegerField()
    elo_max = models.IntegerField(null=True, blank=True, help_text="Leave blank for no upper limit")
    rate_per_day = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['session_type', 'elo_min']

    def __str__(self):
        return f"{self.session_type}: {self.elo_min}-{self.elo_max or '∞'} = ₹{self.rate_per_day}"


class Trainer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='trainer_profile')
    elo_rating = models.IntegerField(default=1200)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    LEVEL_CHOICES = [('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')]
    max_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='advanced',
                                  help_text="Highest batch level this trainer can teach")

    def __str__(self):
        return f"{self.user.get_full_name()} (ELO: {self.elo_rating})"


class Student(models.Model):
    name = models.CharField(max_length=100)
    parent_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    whatsapp_number = models.CharField(max_length=15)
    join_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class BankAccount(models.Model):
    label = models.CharField(max_length=100)
    account_last4 = models.CharField(max_length=4, blank=True)
    upi_id = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.label


class Batch(models.Model):
    BATCH_TYPES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('residential', 'Residential'),
        ('individual', 'Individual'),
        ('home_tutoring', 'Home Tutoring'),
    ]
    SHIFT_CHOICES = [('morning', 'Morning'), ('evening', 'Evening'), ('both', 'Both'), ('na', 'N/A')]

    name = models.CharField(max_length=100)
    batch_type = models.CharField(max_length=30, choices=BATCH_TYPES)
    shift = models.CharField(max_length=10, choices=SHIFT_CHOICES, default='na')
    trainer = models.ForeignKey(Trainer, on_delete=models.PROTECT, related_name='batches')
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    full_day_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    half_day_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    classes_per_month = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.get_batch_type_display()})"


class Enrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='enrollments')
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT, related_name='enrollments')
    join_date = models.DateField()
    is_active = models.BooleanField(default=True)
    fee_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                        help_text="Override auto-calculated fee if needed")

    class Meta:
        unique_together = ['student', 'batch']

    def __str__(self):
        return f"{self.student} in {self.batch}"


class Camp(models.Model):
    name = models.CharField(max_length=100)
    trainer = models.ForeignKey(Trainer, on_delete=models.PROTECT, related_name='camps')
    start_date = models.DateField()
    end_date = models.DateField()
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=2000)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.start_date} to {self.end_date})"

    @property
    def total_days(self):
        return (self.end_date - self.start_date).days + 1


class CampEnrollment(models.Model):
    PAYMENT_STATUS = [('pending', 'Pending'), ('partial', 'Partial'), ('paid', 'Paid')]
    camp = models.ForeignKey(Camp, on_delete=models.PROTECT, related_name='enrollments')
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='camp_enrollments')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')

    class Meta:
        unique_together = ['camp', 'student']

    def __str__(self):
        return f"{self.student} in {self.camp}"


class AttendanceRecord(models.Model):
    SESSION_TYPE = [('full', 'Full Day'), ('half', 'Half Day')]
    enrollment = models.ForeignKey(Enrollment, on_delete=models.PROTECT, related_name='attendance', null=True, blank=True)
    camp_enrollment = models.ForeignKey(CampEnrollment, on_delete=models.PROTECT, related_name='attendance', null=True, blank=True)
    date = models.DateField()
    present = models.BooleanField(default=False)
    session_type = models.CharField(max_length=10, choices=SESSION_TYPE, default='full')

    class Meta:
        unique_together = ['enrollment', 'date']

    def __str__(self):
        ref = self.enrollment or self.camp_enrollment
        return f"{ref} - {self.date}: {'Present' if self.present else 'Absent'}"


class TrainerAttendance(models.Model):
    trainer = models.ForeignKey(Trainer, on_delete=models.PROTECT, related_name='attendance')
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT, null=True, blank=True)
    camp = models.ForeignKey(Camp, on_delete=models.PROTECT, null=True, blank=True)
    date = models.DateField()
    present = models.BooleanField(default=True)
    cancelled_by_trainer = models.BooleanField(default=False)
    hours_logged = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.trainer} - {self.date}"


class PaymentCycle(models.Model):
    STATUS = [('pending', 'Pending'), ('partial', 'Partial'), ('paid', 'Paid')]
    enrollment = models.ForeignKey(Enrollment, on_delete=models.PROTECT, related_name='payment_cycles', null=True, blank=True)
    camp_enrollment = models.ForeignKey(CampEnrollment, on_delete=models.PROTECT, related_name='payment_cycles', null=True, blank=True)
    month = models.IntegerField(null=True, blank=True)
    year = models.IntegerField()
    total_classes = models.IntegerField(default=0)
    classes_attended = models.IntegerField(default=0)
    fee_due = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fee_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')

    def __str__(self):
        ref = self.enrollment or self.camp_enrollment
        return f"{ref} - {self.month}/{self.year}"

    @property
    def balance(self):
        return self.fee_due - self.fee_paid


class Payment(models.Model):
    MODE_CHOICES = [('upi', 'UPI'), ('cash', 'Cash'), ('bank_transfer', 'Bank Transfer')]
    COLLECTED_BY = [('admin', 'Admin'), ('trainer', 'Trainer')]

    cycle = models.ForeignKey(PaymentCycle, on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.SET_NULL, null=True, blank=True)
    collected_by = models.CharField(max_length=20, choices=COLLECTED_BY, default='admin')
    collected_by_trainer = models.ForeignKey(Trainer, on_delete=models.SET_NULL, null=True, blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    screenshot = models.ImageField(upload_to='payment_screenshots/', null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"₹{self.amount} for {self.cycle}"


class TrainerPayroll(models.Model):
    STATUS = [('pending', 'Pending'), ('paid', 'Paid')]
    trainer = models.ForeignKey(Trainer, on_delete=models.PROTECT, related_name='payrolls')
    month = models.IntegerField()
    year = models.IntegerField()
    hours_logged = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    salary_due = models.DecimalField(max_digits=10, decimal_places=2)
    salary_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    payment_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['trainer', 'month', 'year']

    def __str__(self):
        return f"{self.trainer} payroll {self.month}/{self.year}"


class MonthlyExpense(models.Model):
    month = models.IntegerField()
    year = models.IntegerField()
    label = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.label} - {self.month}/{self.year}"


class WhatsAppReminder(models.Model):
    STATUS = [('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed')]
    student = models.ForeignKey(Student, on_delete=models.PROTECT)
    cycle = models.ForeignKey(PaymentCycle, on_delete=models.PROTECT)
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    message = models.TextField()
    error_message = models.TextField(blank=True)
