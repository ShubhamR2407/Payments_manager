"""SendGrid email utilities."""
import logging
from decouple import config

logger = logging.getLogger(__name__)


def send_trainer_credentials(email, full_name, username, password):
    """Send login credentials to a newly created trainer via SendGrid."""
    api_key = config('SENDGRID_API_KEY', default='')
    from_email = config('SENDGRID_FROM_EMAIL', default='noreply@chessacademy.com')
    from_name = config('SENDGRID_FROM_NAME', default='Chess Academy')

    if not api_key:
        logger.warning("SENDGRID_API_KEY not set — skipping credential email for %s", username)
        return {'success': False, 'error': 'SendGrid not configured'}

    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To, Content

        subject = f"Welcome to Chess Academy — Your Login Credentials"
        body = (
            f"Hi {full_name},\n\n"
            f"Your trainer account has been created.\n\n"
            f"Username: {username}\n"
            f"Password: {password}\n\n"
            f"Please log in and change your password after the first login.\n\n"
            f"— Chess Academy Admin"
        )

        message = Mail(
            from_email=Email(from_email, from_name),
            to_emails=To(email),
            subject=subject,
            plain_text_content=Content("text/plain", body),
        )

        sg = sendgrid.SendGridAPIClient(api_key=api_key)
        response = sg.send(message)
        return {'success': response.status_code in (200, 202), 'status_code': response.status_code}
    except Exception as e:
        logger.error("SendGrid error: %s", e)
        return {'success': False, 'error': str(e)}
