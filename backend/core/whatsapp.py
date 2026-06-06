"""
WhatsApp notification via Twilio.
"""
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_whatsapp_message(to_number: str, message: str) -> dict:
    """
    Send a WhatsApp message via Twilio.
    Returns dict with 'success', 'sid', and 'error' keys.
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.warning("Twilio credentials not configured. Message not sent.")
        return {'success': False, 'sid': None, 'error': 'Twilio credentials not configured'}

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # Ensure number is in whatsapp: format
        if not to_number.startswith('whatsapp:'):
            to_number = f'whatsapp:{to_number}'

        msg = client.messages.create(
            body=message,
            from_=settings.TWILIO_WHATSAPP_FROM,
            to=to_number
        )
        return {'success': True, 'sid': msg.sid, 'error': None}
    except Exception as e:
        logger.error(f"WhatsApp send failed: {e}")
        return {'success': False, 'sid': None, 'error': str(e)}


def build_payment_reminder_message(parent_name: str, student_name: str, amount, month_name: str) -> str:
    """Build standard payment reminder message."""
    return (
        f"Dear {parent_name}, your child {student_name}'s payment of "
        f"₹{amount} is due for {month_name}. "
        f"Please complete the payment at your earliest convenience. "
        f"Thank you - Chess Academy"
    )
