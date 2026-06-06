"""
Fee calculation engine for Chess Academy.
"""
from decimal import Decimal
import calendar


def calculate_batch_fee(enrollment, month, year):
    """
    Calculate fee due for an enrollment in a given month/year.
    Returns Decimal fee amount.
    """
    batch = enrollment.batch
    batch_type = batch.batch_type

    if batch_type in ('beginner', 'intermediate'):
        return _calc_fixed_fee(enrollment, batch, month, year)
    elif batch_type == 'advanced':
        return _calc_advanced_fee(enrollment, batch, month, year)
    elif batch_type in ('residential', 'individual', 'home_tutoring'):
        return _calc_elo_fee(enrollment, batch, month, year)
    return Decimal('0')


def _calc_fixed_fee(enrollment, batch, month, year):
    """Beginner/Intermediate: monthly_fee prorated for mid-month joins."""
    if not batch.monthly_fee:
        return Decimal('0')

    classes_per_month = batch.classes_per_month or 12
    monthly_fee = Decimal(str(batch.monthly_fee))

    # Check if student joined mid-month
    join_date = enrollment.join_date
    if join_date.year == year and join_date.month == month:
        # Count working days remaining in month from join date
        total_days_in_month = calendar.monthrange(year, month)[1]
        days_in_month = total_days_in_month - join_date.day + 1
        remaining_classes = round((days_in_month / total_days_in_month) * classes_per_month)
        if remaining_classes <= 0:
            remaining_classes = 1
        fee = (Decimal(remaining_classes) / Decimal(classes_per_month)) * monthly_fee
    else:
        fee = monthly_fee

    if enrollment.fee_override is not None:
        return Decimal(str(enrollment.fee_override))
    return fee.quantize(Decimal('0.01'))


def _calc_advanced_fee(enrollment, batch, month, year):
    """Advanced: classes_attended * rate (full or half day)."""
    from core.models import AttendanceRecord
    records = AttendanceRecord.objects.filter(
        enrollment=enrollment,
        date__year=year,
        date__month=month,
        present=True
    )
    fee = Decimal('0')
    for record in records:
        if record.session_type == 'full' and batch.full_day_rate:
            fee += Decimal(str(batch.full_day_rate))
        elif record.session_type == 'half' and batch.half_day_rate:
            fee += Decimal(str(batch.half_day_rate))
    if enrollment.fee_override is not None:
        return Decimal(str(enrollment.fee_override))
    return fee


def _calc_elo_fee(enrollment, batch, month, year):
    """Residential/Individual/HomeTutor: days_attended * EloRateTier rate."""
    from core.models import AttendanceRecord, EloRateTier
    trainer_elo = batch.trainer.elo_rating
    session_type_map = {
        'residential': 'residential',
        'individual': 'individual',
        'home_tutoring': 'home_tutoring',
    }
    session_type = session_type_map.get(batch.batch_type, 'individual')

    # Find matching EloRateTier
    from django.db.models import Q
    tier = EloRateTier.objects.filter(
        session_type=session_type,
        elo_min__lte=trainer_elo
    ).filter(
        Q(elo_max__isnull=True) | Q(elo_max__gte=trainer_elo)
    ).first()

    if not tier:
        # Fallback: highest tier for session type
        tier = EloRateTier.objects.filter(session_type=session_type).order_by('-elo_min').first()

    if not tier:
        return Decimal('0')

    records = AttendanceRecord.objects.filter(
        enrollment=enrollment,
        date__year=year,
        date__month=month,
        present=True
    )
    days_attended = records.count()
    if enrollment.fee_override is not None:
        return Decimal(str(enrollment.fee_override))
    return Decimal(str(tier.rate_per_day)) * days_attended


def calculate_camp_fee(camp_enrollment):
    """Calculate total fee due for a camp enrollment based on days attended."""
    from core.models import AttendanceRecord
    camp = camp_enrollment.camp
    records = AttendanceRecord.objects.filter(
        camp_enrollment=camp_enrollment,
        present=True
    )
    days_attended = records.count()
    return Decimal(str(camp.daily_rate)) * days_attended


def get_classes_attended(enrollment, month, year):
    """Count attendance records where present=True for a given month."""
    from core.models import AttendanceRecord
    return AttendanceRecord.objects.filter(
        enrollment=enrollment,
        date__year=year,
        date__month=month,
        present=True
    ).count()


def get_total_classes(enrollment, month, year):
    """Count all attendance records for a given month (scheduled classes)."""
    from core.models import AttendanceRecord
    return AttendanceRecord.objects.filter(
        enrollment=enrollment,
        date__year=year,
        date__month=month
    ).count()
